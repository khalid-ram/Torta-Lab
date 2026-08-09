/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#FFF9F3",
        cream: "#F8EEE5",
        surface: "#FFFCF8",
        rose: "#D96C7C",
        "rose-deep": "#C55769",
        blush: "#F3C7CC",
        cocoa: "#633B2C",
        espresso: "#33221C",
        taupe: "#79665E",
        beige: "#E8D8CC",
        gold: "#B8945F",
        whatsapp: "#25D366",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "var(--font-markazi)", "serif"],
        sans: ["var(--font-poppins)", "var(--font-plex-arabic)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
