import { IsIn } from 'class-validator';

export const LEAD_STATUSES = ['new', 'contacted', 'interested', 'converted', 'not_interested'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export class UpdateLeadStatusDto {
  @IsIn(LEAD_STATUSES)
  status!: LeadStatus;
}
