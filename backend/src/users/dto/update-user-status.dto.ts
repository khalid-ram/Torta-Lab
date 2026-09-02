import { IsBoolean } from 'class-validator';

// Only field an admin may edit in this phase. Anything else in the
// request body is stripped by the global ValidationPipe's whitelist.
export class UpdateUserStatusDto {
  @IsBoolean()
  is_active!: boolean;
}
