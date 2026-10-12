import { Transform } from 'class-transformer';
import { Equals, IsNumber, IsString, IsUUID, Length, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SubmitBudgetLeadDto {
  @Transform(trim)
  @IsString()
  @Length(1, 120)
  name!: string;

  // Raw input as typed/selected by the customer — normalized and
  // validated server-side in the service, never trusted as-is.
  @Transform(trim)
  @IsString()
  @Length(1, 30)
  phone!: string;

  @IsNumber()
  @Min(200)
  budgetEgp!: number;

  // Generated once by the client when the lead form opens, resent on
  // every retry — the actual duplicate-submission guard (see
  // budget_leads.idempotency_key's unique constraint).
  @IsUUID()
  idempotencyKey!: string;

  // Must literally be true — the backend rejects a submission that
  // doesn't explicitly carry this, never assumes consent.
  @Equals(true)
  privacyAcknowledged!: boolean;
}
