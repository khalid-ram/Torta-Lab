// The Hero section (app/page.tsx) is the visual source of truth for the
// homepage's horizontal content boundary. The Navbar must line up with
// it exactly, so both import this one class string instead of each
// guessing their own max-width/padding — see the desktop nav/hero
// alignment fix in PublicNavbar.
export const PUBLIC_CONTAINER_CLASS = "mx-auto px-6 sm:px-10 md:px-16 max-w-[1800px]";
