import { IsIn, IsObject, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export const ANALYTICS_EVENT_NAMES = ['customize_started', 'customization_completed', 'customization_whatsapp_clicked'] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export class TrackEventDto {
  @IsUUID()
  sessionId!: string;

  // Correlates the 3 funnel events for one Customize attempt — see
  // migration 0008's unique(attempt_id, event_name), which is what
  // actually enforces "count once per attempt" regardless of client
  // retries.
  @IsString()
  @Length(1, 100)
  attemptId!: string;

  @IsIn(ANALYTICS_EVENT_NAMES)
  eventName!: AnalyticsEventName;

  // Deliberately tiny and optional — e.g. which public CTA triggered
  // customize_started. Never customer answers or message content (see
  // AGENTS.md privacy rules / the V1 spec).
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
