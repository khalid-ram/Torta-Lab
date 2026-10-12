import { ApiError, extractMessage, request } from "./client";

export { ApiError as BudgetLeadsApiError, NetworkError as BudgetLeadsNetworkError } from "./client";

export interface RecommendationExtra {
  id: string;
  kind: "filling" | "decoration";
  nameEn: string;
  nameAr: string;
  price: number;
  priceType: "fixed" | "starting";
}

export interface Recommendation {
  category: "best_value" | "best_taste" | "best_design" | "nearest";
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

export interface SubmitBudgetLeadInput {
  name: string;
  phone: string;
  budgetEgp: number;
  idempotencyKey: string;
  privacyAcknowledged: boolean;
}

export async function submitBudgetLead(input: SubmitBudgetLeadInput): Promise<{ leadId: string; recommendations: Recommendation[] }> {
  const res = await request("/budget-leads", { method: "POST", body: JSON.stringify(input) });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, extractMessage(body));
  return body;
}
