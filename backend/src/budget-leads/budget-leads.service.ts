import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { escapeIlikeTerm } from '../common/utils/postgrest-search';
import { cairoDayStart, cairoDayEnd } from '../common/utils/cairo-time';
import { AuthService, AuthenticatedUser } from '../auth/auth.service';
import type { SessionTokens } from '../auth/session-cookies';
import { normalizeAndValidatePhone } from './phone-validation';
import { SubmitBudgetLeadDto } from './dto/submit-budget-lead.dto';
import { ListBudgetLeadsQueryDto } from './dto/list-budget-leads-query.dto';
import type { LeadStatus } from './dto/update-lead-status.dto';

export interface RecommendationExtra {
  id: string;
  kind: 'filling' | 'decoration';
  nameEn: string;
  nameAr: string;
  price: number;
  priceType: 'fixed' | 'starting';
}

export interface Recommendation {
  category: 'best_value' | 'best_taste' | 'best_design' | 'nearest';
  priceOptionId: string;
  sizeCm: number;
  layers: number;
  servings: number | null;
  basePrice: number;
  extra: RecommendationExtra | null;
  totalPrice: number;
  isStartingPrice: boolean;
  remainingBudget: number | null;
  exceedsBudgetBy: number | null;
}

interface PriceOptionRow {
  id: string;
  size_cm: number;
  layers: number;
  approved_selling_price: number;
  servings: number | null;
}

interface ExtraPriceRow {
  id: string;
  size_cm: number | null;
  extra_price: number;
  price_type: 'fixed' | 'starting';
  cake_extra_options: { kind: 'filling' | 'decoration'; name_en: string; name_ar: string; status: string };
}

@Injectable()
export class BudgetLeadsService {
  private readonly logger = new Logger(BudgetLeadsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly authService: AuthService,
  ) {}

  async submit(
    dto: SubmitBudgetLeadDto,
    authenticatedUser: AuthenticatedUser | null,
  ): Promise<{ leadId: string; recommendations: Recommendation[]; session: SessionTokens | null }> {
    // Logged-in: use the account's own name/phone, never what the
    // (possibly tampered) request body claims — skip the name/phone/
    // privacy fields entirely, there's nothing left to ask for.
    let name: string;
    let phoneE164: string;
    if (authenticatedUser) {
      name = authenticatedUser.name;
      const normalized = normalizeAndValidatePhone(authenticatedUser.phone);
      // The account's own stored phone is already known-valid from
      // signup; this only guards against a future format mismatch.
      phoneE164 = normalized ?? authenticatedUser.phone;
    } else {
      if (!dto.name?.trim()) {
        throw new BadRequestException('Please enter your name.');
      }
      if (dto.privacyAcknowledged !== true) {
        throw new BadRequestException('Please acknowledge the privacy notice to continue.');
      }
      const normalized = dto.phone ? normalizeAndValidatePhone(dto.phone) : null;
      if (!normalized) {
        throw new BadRequestException('Please enter a valid mobile number.');
      }
      name = dto.name.trim();
      phoneE164 = normalized;
    }

    const client = this.supabaseService.getClient();

    // Idempotency: a retried submission (double-click, client retry
    // after a timeout) resends the same key — return what was already
    // created instead of generating a second lead.
    const { data: existing, error: existingError } = await client
      .from('budget_leads')
      .select('id, recommendations')
      .eq('idempotency_key', dto.idempotencyKey)
      .maybeSingle();
    if (existingError) {
      this.logger.error(`Failed to check idempotency key: ${existingError.message}`);
      throw new InternalServerErrorException('Unable to submit your request. Please try again.');
    }
    if (existing) {
      return { leadId: existing.id, recommendations: existing.recommendations as Recommendation[], session: null };
    }

    // A real account is created (and signed in) only for a logged-out
    // visitor whose phone number doesn't already belong to anyone — and
    // the uniqueness check happens here, server-side, before any
    // account is touched. This is the one thing that keeps this safe:
    // an existing phone NEVER results in a sign-in, since a submitted
    // phone number is not proof of ownership. Non-Egyptian numbers
    // aren't auto-enrolled either — public.users only supports Egyptian
    // phone numbers today (see common/utils/normalize.ts), a pre-existing
    // constraint this flow doesn't attempt to widen.
    let session: SessionTokens | null = null;
    if (!authenticatedUser) {
      const { data: existingAccount } = await client.from('users').select('id').eq('phone', phoneE164).maybeSingle();
      if (!existingAccount && phoneE164.startsWith('+20')) {
        try {
          const created = await this.authService.createAccountFromTrustedSource({ name, phone: phoneE164 });
          session = created.session;
        } catch (err) {
          // Non-fatal: the lead itself must still be captured even if
          // account creation fails for some reason (e.g. a last-moment
          // unique-constraint race) — log and continue as a prospect.
          this.logger.error(`Failed to auto-create account for budget lead: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // Never queries/touches public.users for the prospect/lead
    // bookkeeping itself — that part always runs regardless of whether
    // an account was linked above.
    const { data: prospect, error: prospectError } = await client
      .from('budget_prospects')
      .upsert({ name, phone_e164: phoneE164 }, { onConflict: 'phone_e164' })
      .select('id')
      .single();
    if (prospectError || !prospect) {
      this.logger.error(`Failed to upsert budget prospect: ${prospectError?.message}`);
      throw new InternalServerErrorException('Unable to submit your request. Please try again.');
    }

    const recommendations = await this.computeRecommendations(dto.budgetEgp);

    const { data: lead, error: leadError } = await client
      .from('budget_leads')
      .insert({
        prospect_id: prospect.id,
        customer_name: name,
        phone_e164: phoneE164,
        budget_egp: dto.budgetEgp,
        recommendations,
        idempotency_key: dto.idempotencyKey,
      })
      .select('id')
      .single();

    if (leadError) {
      // A concurrent retry of the exact same submission can race this
      // insert and lose the unique-constraint race — that's fine, the
      // winner's row is the one we return either way.
      if (leadError.code === '23505') {
        const { data: raced } = await client
          .from('budget_leads')
          .select('id, recommendations')
          .eq('idempotency_key', dto.idempotencyKey)
          .maybeSingle();
        if (raced) return { leadId: raced.id, recommendations: raced.recommendations as Recommendation[], session };
      }
      this.logger.error(`Failed to create budget lead: ${leadError.message}`);
      throw new InternalServerErrorException('Unable to submit your request. Please try again.');
    }

    return { leadId: lead.id, recommendations, session };
  }

  private async computeRecommendations(budgetEgp: number): Promise<Recommendation[]> {
    const client = this.supabaseService.getClient();

    const { data: priceOptions, error: priceError } = await client
      .from('cake_price_options')
      .select('id, size_cm, layers, approved_selling_price, servings')
      .eq('price_status', 'approved')
      .order('approved_selling_price', { ascending: true });
    if (priceError) {
      this.logger.error(`Failed to load price options: ${priceError.message}`);
      throw new InternalServerErrorException('Unable to compute recommendations.');
    }

    const options = (priceOptions ?? []) as PriceOptionRow[];
    if (options.length === 0) return [];

    const eligible = options.filter((o) => o.approved_selling_price <= budgetEgp);

    if (eligible.length === 0) {
      // Nothing fits — show the nearest (cheapest) option with the
      // shortfall clearly stated, never silently hidden.
      const cheapest = options[0];
      return [
        {
          category: 'nearest',
          priceOptionId: cheapest.id,
          sizeCm: cheapest.size_cm,
          layers: cheapest.layers,
          servings: cheapest.servings,
          basePrice: cheapest.approved_selling_price,
          extra: null,
          totalPrice: cheapest.approved_selling_price,
          isStartingPrice: false,
          remainingBudget: null,
          exceedsBudgetBy: Math.round((cheapest.approved_selling_price - budgetEgp) * 100) / 100,
        },
      ];
    }

    const { data: extraPrices, error: extrasError } = await client
      .from('cake_extra_option_prices')
      .select('id, size_cm, extra_price, price_type, cake_extra_options(kind, name_en, name_ar, status)')
      .not('extra_price', 'is', null);
    if (extrasError) {
      this.logger.error(`Failed to load extras pricing: ${extrasError.message}`);
      throw new InternalServerErrorException('Unable to compute recommendations.');
    }

    const activeExtras = ((extraPrices ?? []) as unknown as ExtraPriceRow[]).filter(
      (e) => e.cake_extra_options.status === 'active',
    );

    const recommendations: Recommendation[] = [];

    // Best Value: the largest approved base that fits the budget, no extras.
    const bestValueBase = eligible[eligible.length - 1];
    recommendations.push(this.toRecommendation('best_value', bestValueBase, null, budgetEgp));

    // Best Taste: maximize the filling upgrade's price across every
    // affordable (base + filling) combination — may pick a smaller
    // base than Best Value if that's what affords the better filling.
    const bestTaste = this.pickBestCombo(
      eligible,
      activeExtras.filter((e) => e.cake_extra_options.kind === 'filling' && e.price_type === 'fixed'),
      budgetEgp,
    );
    if (bestTaste) recommendations.push(this.toRecommendation('best_taste', bestTaste.base, bestTaste.extra, budgetEgp));

    // Best Design: same idea for decorations. Only a starting price
    // whose floor still fits the remaining budget is ever offered, and
    // it's always flagged isStartingPrice so the frontend never shows
    // it as a guaranteed final total.
    const bestDesign = this.pickBestCombo(
      eligible,
      activeExtras.filter((e) => e.cake_extra_options.kind === 'decoration'),
      budgetEgp,
    );
    if (bestDesign) recommendations.push(this.toRecommendation('best_design', bestDesign.base, bestDesign.extra, budgetEgp));

    return recommendations;
  }

  private pickBestCombo(
    bases: PriceOptionRow[],
    extras: ExtraPriceRow[],
    budgetEgp: number,
  ): { base: PriceOptionRow; extra: ExtraPriceRow } | null {
    let best: { base: PriceOptionRow; extra: ExtraPriceRow } | null = null;
    for (const base of bases) {
      const remaining = budgetEgp - base.approved_selling_price;
      const sizeMatched = extras.filter((e) => e.size_cm === base.size_cm || e.size_cm === null);
      for (const extra of sizeMatched) {
        if (extra.extra_price > remaining) continue;
        if (!best || extra.extra_price > best.extra.extra_price) {
          best = { base, extra };
        }
      }
    }
    return best;
  }

  private toRecommendation(
    category: Recommendation['category'],
    base: PriceOptionRow,
    extra: ExtraPriceRow | null,
    budgetEgp: number,
  ): Recommendation {
    const totalPrice = base.approved_selling_price + (extra?.extra_price ?? 0);
    return {
      category,
      priceOptionId: base.id,
      sizeCm: base.size_cm,
      layers: base.layers,
      servings: base.servings,
      basePrice: base.approved_selling_price,
      extra: extra
        ? {
            id: extra.id,
            kind: extra.cake_extra_options.kind,
            nameEn: extra.cake_extra_options.name_en,
            nameAr: extra.cake_extra_options.name_ar,
            price: extra.extra_price,
            priceType: extra.price_type,
          }
        : null,
      totalPrice,
      isStartingPrice: extra?.price_type === 'starting',
      remainingBudget: Math.round((budgetEgp - totalPrice) * 100) / 100,
      exceedsBudgetBy: null,
    };
  }

  async list(query: ListBudgetLeadsQueryDto) {
    const client = this.supabaseService.getClient();
    let builder = client.from('budget_leads').select('*', { count: 'exact' });

    if (query.status !== 'all') builder = builder.eq('status', query.status);
    if (query.minBudget !== undefined) builder = builder.gte('budget_egp', query.minBudget);
    if (query.maxBudget !== undefined) builder = builder.lte('budget_egp', query.maxBudget);
    if (query.fromDate) builder = builder.gte('created_at', cairoDayStart(query.fromDate).toISOString());
    if (query.toDate) builder = builder.lte('created_at', cairoDayEnd(query.toDate).toISOString());
    if (query.search?.trim()) {
      const term = escapeIlikeTerm(query.search.trim());
      builder = builder.or(`customer_name.ilike."%${term}%",phone_e164.ilike."%${term}%"`);
    }

    const from = (query.page - 1) * query.limit;
    const to = from + query.limit - 1;
    const { data, error, count } = await builder.order('created_at', { ascending: false }).range(from, to);

    if (error) {
      this.logger.error(`Failed to list budget leads: ${error.message}`);
      throw new InternalServerErrorException('Unable to load budget leads.');
    }

    const total = count ?? 0;
    return {
      data: data ?? [],
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async updateStatus(id: string, status: LeadStatus) {
    const client = this.supabaseService.getClient();
    const { data, error } = await client.from('budget_leads').update({ status }).eq('id', id).select().maybeSingle();
    if (error) {
      this.logger.error(`Failed to update lead ${id} status: ${error.message}`);
      throw new InternalServerErrorException('Unable to update lead status.');
    }
    return data;
  }

  async metrics() {
    const client = this.supabaseService.getClient();
    const [totalRes, newRes, contactedRes, convertedRes, avgRes] = await Promise.all([
      client.from('budget_leads').select('*', { count: 'exact', head: true }),
      client.from('budget_leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      client.from('budget_leads').select('*', { count: 'exact', head: true }).eq('status', 'contacted'),
      client.from('budget_leads').select('*', { count: 'exact', head: true }).eq('status', 'converted'),
      client.from('budget_leads').select('budget_egp'),
    ]);
    for (const res of [totalRes, newRes, contactedRes, convertedRes, avgRes]) {
      if (res.error) {
        this.logger.error(`Failed to compute budget lead metrics: ${res.error.message}`);
        throw new InternalServerErrorException('Unable to load metrics.');
      }
    }
    const budgets = (avgRes.data ?? []).map((r) => r.budget_egp as number);
    const averageBudget = budgets.length ? Math.round((budgets.reduce((a, b) => a + b, 0) / budgets.length) * 100) / 100 : 0;

    return {
      totalLeads: totalRes.count ?? 0,
      newLeads: newRes.count ?? 0,
      contactedLeads: contactedRes.count ?? 0,
      convertedLeads: convertedRes.count ?? 0,
      averageBudget,
    };
  }
}
