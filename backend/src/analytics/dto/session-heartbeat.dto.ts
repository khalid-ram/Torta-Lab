import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class SessionHeartbeatDto {
  // The client sends the INCREMENT since its last flush, not a running
  // total — the server adds it atomically (see
  // increment_session_active_seconds in migration 0008). Capped well
  // above any real heartbeat interval as a sanity bound, not a real
  // limit.
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3600)
  activeSecondsDelta!: number;
}
