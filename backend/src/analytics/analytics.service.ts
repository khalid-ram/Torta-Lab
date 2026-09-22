import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { cairoDayEnd, cairoDayStart, cairoTodayDateString, shiftCairoDate } from '../common/utils/cairo-time';
import { StartSessionDto } from './dto/start-session.dto';
import { SessionHeartbeatDto } from './dto/session-heartbeat.dto';
import { TrackEventDto } from './dto/track-event.dto';
import { AnalyticsOverviewQueryDto } from './dto/overview-query.dto';

// Engaged vs Bounced boundary agreed in the V1 spec: strictly more than
// 10 accumulated ACTIVE seconds is Engaged, 10 or fewer is Bounced. One
// unambiguous boundary so Engaged % + Bounced % always sums to ~100%.
const ENGAGED_THRESHOLD_SECONDS = 10;

export interface AnalyticsOverview {
  period: { from: string; to: string };
  sessions: {
    total: number;
    engaged: { count: number; percent: number };
    bounced: { count: number; percent: number };
    avgActiveSeconds: number;
  };
  funnel: {
    customizeClicked: number;
    completed: number;
    completionRate: number;
    whatsappOrders: number;
    conversionRate: number;
  };
  business: {
    registeredUsers: number;
    bakedCakes: { total: number; active: number; paused: number };
  };
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async startSession(dto: StartSessionDto, userId: string | null): Promise<void> {
    const client = this.supabaseService.getClient();
    // Idempotent create: a retried request (network blip, duplicate tab
    // init) must never reset an already-running session's progress.
    const { error } = await client
      .from('analytics_sessions')
      .upsert({ id: dto.id, visitor_id: dto.visitorId, user_id: userId }, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      this.logger.error(`Failed to start analytics session: ${error.message}`);
      throw new InternalServerErrorException('Unable to start session.');
    }
  }

  async heartbeat(sessionId: string, dto: SessionHeartbeatDto): Promise<void> {
    const client = this.supabaseService.getClient();
    const { error } = await client.rpc('increment_session_active_seconds', {
      p_session_id: sessionId,
      p_delta: dto.activeSecondsDelta,
    });

    if (error) {
      this.logger.error(`Failed to record heartbeat for session ${sessionId}: ${error.message}`);
      throw new InternalServerErrorException('Unable to record activity.');
    }
  }

  async trackEvent(dto: TrackEventDto): Promise<void> {
    const client = this.supabaseService.getClient();
    // Deduplicated at the database level (see migration 0008's
    // unique(attempt_id, event_name)) — a repeated send for the same
    // attempt + event type is silently ignored, not an error.
    const { error } = await client.from('analytics_events').upsert(
      {
        session_id: dto.sessionId,
        event_name: dto.eventName,
        attempt_id: dto.attemptId,
        metadata: dto.metadata ?? null,
      },
      { onConflict: 'attempt_id,event_name', ignoreDuplicates: true },
    );

    if (error) {
      this.logger.error(`Failed to record analytics event ${dto.eventName}: ${error.message}`);
      throw new InternalServerErrorException('Unable to record event.');
    }
  }

  async getOverview(query: AnalyticsOverviewQueryDto): Promise<AnalyticsOverview> {
    const { start, end, fromLabel, toLabel } = this.resolveRange(query);
    const client = this.supabaseService.getClient();

    const { data: sessionRows, error: sessionsError } = await client
      .from('analytics_sessions')
      .select('active_seconds')
      .gte('started_at', start.toISOString())
      .lte('started_at', end.toISOString());

    if (sessionsError) {
      this.logger.error(`Failed to load sessions for overview: ${sessionsError.message}`);
      throw new InternalServerErrorException('Unable to load analytics overview.');
    }

    const sessions = (sessionRows ?? []) as { active_seconds: number }[];
    const total = sessions.length;
    const engagedCount = sessions.filter((s) => s.active_seconds > ENGAGED_THRESHOLD_SECONDS).length;
    const bouncedCount = total - engagedCount;
    const totalActiveSeconds = sessions.reduce((sum, s) => sum + s.active_seconds, 0);
    const avgActiveSeconds = total > 0 ? totalActiveSeconds / total : 0;

    const [customizeClicked, completed, whatsappOrders, registeredUsers, cakeTotals] = await Promise.all([
      this.countEvents(client, 'customize_started', start, end),
      this.countEvents(client, 'customization_completed', start, end),
      this.countEvents(client, 'customization_whatsapp_clicked', start, end),
      this.countRegisteredUsers(client),
      this.countBakedCakes(client),
    ]);

    return {
      period: { from: fromLabel, to: toLabel },
      sessions: {
        total,
        engaged: { count: engagedCount, percent: percentOf(engagedCount, total) },
        bounced: { count: bouncedCount, percent: percentOf(bouncedCount, total) },
        avgActiveSeconds: Math.round(avgActiveSeconds),
      },
      funnel: {
        customizeClicked,
        completed,
        completionRate: percentOf(completed, customizeClicked),
        whatsappOrders,
        conversionRate: percentOf(whatsappOrders, customizeClicked),
      },
      business: {
        registeredUsers,
        bakedCakes: cakeTotals,
      },
    };
  }

  // Each (attempt_id, event_name) pair is unique by constraint, so a
  // plain row count for an event name already IS a distinct-attempt
  // count — no separate DISTINCT query needed.
  private async countEvents(
    client: ReturnType<SupabaseService['getClient']>,
    eventName: string,
    start: Date,
    end: Date,
  ): Promise<number> {
    const { count, error } = await client
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', eventName)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (error) {
      this.logger.error(`Failed to count ${eventName}: ${error.message}`);
      throw new InternalServerErrorException('Unable to load analytics overview.');
    }
    return count ?? 0;
  }

  // Lifetime totals, not affected by the date filter (the Admin UI
  // labels these explicitly as totals — see the V1 spec).
  private async countRegisteredUsers(client: ReturnType<SupabaseService['getClient']>): Promise<number> {
    const { count, error } = await client.from('users').select('*', { count: 'exact', head: true }).eq('role', 'buyer');
    if (error) {
      this.logger.error(`Failed to count registered users: ${error.message}`);
      throw new InternalServerErrorException('Unable to load analytics overview.');
    }
    return count ?? 0;
  }

  private async countBakedCakes(
    client: ReturnType<SupabaseService['getClient']>,
  ): Promise<{ total: number; active: number; paused: number }> {
    const [totalRes, activeRes, pausedRes] = await Promise.all([
      client.from('baked_cakes').select('*', { count: 'exact', head: true }),
      client.from('baked_cakes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      client.from('baked_cakes').select('*', { count: 'exact', head: true }).eq('status', 'paused'),
    ]);
    for (const res of [totalRes, activeRes, pausedRes]) {
      if (res.error) {
        this.logger.error(`Failed to count baked cakes: ${res.error.message}`);
        throw new InternalServerErrorException('Unable to load analytics overview.');
      }
    }
    return { total: totalRes.count ?? 0, active: activeRes.count ?? 0, paused: pausedRes.count ?? 0 };
  }

  private resolveRange(query: AnalyticsOverviewQueryDto): { start: Date; end: Date; fromLabel: string; toLabel: string } {
    const today = cairoTodayDateString();

    if (query.period === 'custom') {
      if (!query.from || !query.to) {
        throw new BadRequestException('from and to are required for a custom range.');
      }
      if (query.from > query.to) {
        throw new BadRequestException('from must not be after to.');
      }
      return { start: cairoDayStart(query.from), end: cairoDayEnd(query.to), fromLabel: query.from, toLabel: query.to };
    }

    if (query.period === 'today') {
      return { start: cairoDayStart(today), end: cairoDayEnd(today), fromLabel: today, toLabel: today };
    }

    const daysBack = query.period === 'last7' ? 6 : 29; // inclusive of today => 7 or 30 calendar days total
    const from = shiftCairoDate(today, -daysBack);
    return { start: cairoDayStart(from), end: cairoDayEnd(today), fromLabel: from, toLabel: today };
  }
}

function percentOf(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10; // one decimal place
}
