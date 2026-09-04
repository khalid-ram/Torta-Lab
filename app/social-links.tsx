// Official Torta Lab contact/social channels — one small config instead
// of repeating URLs/icons across JSX. No icon library exists anywhere in
// this codebase (every icon here — MenuIcon, WhatsAppIcon, PlayIcon,
// WhiskIcon, ...— is a hand-written inline SVG), so these follow the
// same established pattern rather than adding a new dependency for 5 icons.

import { WhatsAppIcon } from "@/lib/whatsapp";

export type SocialKey = "facebook" | "instagram" | "tiktok" | "whatsapp" | "email";

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 3c.4 2.2 1.9 3.9 4.1 4.3v3.1c-1.5 0-2.9-.5-4.1-1.3v6.4a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v3.2a2.4 2.4 0 1 0 1.7 2.3V3h3z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

export interface SocialLink {
  key: SocialKey;
  href: string;
  external: boolean;
  Icon: (props: { className?: string }) => React.ReactElement;
}

// URLs are the official Torta Lab destinations — never alter these.
export const SOCIAL_LINKS: SocialLink[] = [
  { key: "facebook", href: "https://www.facebook.com/profile.php?id=61594015653794", external: true, Icon: FacebookIcon },
  { key: "instagram", href: "https://www.instagram.com/tortalab2026/", external: true, Icon: InstagramIcon },
  { key: "tiktok", href: "https://www.tiktok.com/@tortalab2026", external: true, Icon: TikTokIcon },
  { key: "whatsapp", href: "https://wa.me/201148350515", external: true, Icon: WhatsAppIcon },
  { key: "email", href: "mailto:tortalab2026@gmail.com", external: false, Icon: MailIcon },
];
