import { IsString, IsUUID, Length } from 'class-validator';

export class StartSessionDto {
  // Client-generated (see lib/analytics/session.ts) — a fresh session
  // id is itself the client's "is this a new session" decision, made
  // from the 30-minute inactivity rule.
  @IsUUID()
  id!: string;

  @IsString()
  @Length(1, 200)
  visitorId!: string;
}
