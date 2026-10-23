import type { Metadata } from "next";
import { LanguageProvider } from "@/components/language-context";
import { MobileNavigation, SiteFooter, SiteHeader } from "@/components/site-chrome";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bus Batao | Know the crowd before you board",
  description: "Passenger observations and route information for Hyderabad and Jamshoro, Pakistan.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" dir="ltr"><body><LanguageProvider initialLanguage="English">
    <SiteHeader />
    <main>{children}</main>
    <MobileNavigation />
    <SiteFooter />
  </LanguageProvider></body></html>;
}
