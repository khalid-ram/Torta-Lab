import type { Metadata } from "next";
import { Poppins, Markazi_Text, IBM_Plex_Sans_Arabic } from "next/font/google";
import { AuthProvider } from "@/lib/auth/auth-context";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-poppins" });
const markazi = Markazi_Text({ subsets: ["arabic"], weight: ["500", "600", "700"], variable: "--font-markazi" });
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["300", "400", "500", "600", "700"], variable: "--font-plex-arabic" });

export const metadata: Metadata = {
  title: "Custom Cakes | Made for Your Celebration",
  description: "Design your own custom cake for birthdays, weddings, engagements and special occasions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${poppins.variable} ${markazi.variable} ${plexArabic.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
