// Shared public-price display rules for Baked Cakes (homepage card,
// video gallery, and anywhere else the Recommended Selling Price shows
// up publicly). null means "no price entered" (render nothing); 0 is a
// deliberate "Free" price, never shown as "0 EGP". Only ever pass the
// Recommended Selling Price in here — Cost and Actual Selling Price
// never reach the public UI.

function formatAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function formatPublicPrice(recommendedSellingPrice: number | null, lang: "en" | "ar"): string | null {
  if (recommendedSellingPrice === null) return null;
  if (recommendedSellingPrice === 0) return lang === "ar" ? "مجانًا" : "Free";
  return lang === "ar" ? `${formatAmount(recommendedSellingPrice)} ج.م` : `${formatAmount(recommendedSellingPrice)} EGP`;
}
