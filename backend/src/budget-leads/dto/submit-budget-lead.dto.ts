import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// name/phone/privacyAcknowledged are optional here on purpose: when the
// request carries a valid session, the controller resolves them from
// the authenticated user instead and the service never looks at these
// fields at all. The service enforces that they're present when there
// is NO session — see budget-leads.service.ts.
export class SubmitBudgetLeadDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  name?: string;

  // Raw input as typed/selected by the customer — normalized and
  // validated server-side in the service, never trusted as-is.
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 30)
  phone?: string;

  @IsNumber()
  @Min(200)
  budgetEgp!: number;

  // Generated once by the client when the lead form opens, resent on
  // every retry — the actual duplicate-submission guard (see
  // budget_leads.idempotency_key's unique constraint).
  @IsUUID()
  idempotencyKey!: string;

  @IsOptional()
  @IsBoolean()
  privacyAcknowledged?: boolean;
}
