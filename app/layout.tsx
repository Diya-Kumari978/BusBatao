import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { Splash } from "@/components/splash";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "BusBatao — Know The Crowd Before You Board",
  description: "Passenger observations and route information for Hyderabad and Jamshoro, Pakistan.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <header className="site-header"><Brand />
      <nav className="desktop-nav" aria-label="Main navigation"><Link href="/">Home</Link></nav>
    </header>
    <main>{children}</main>
    <nav className="mobile-nav" aria-label="Mobile navigation"><Link href="/">Home</Link></nav>
    <footer className="site-footer"><Brand compact /><span>Passenger observations are not official service announcements.</span></footer>
    <Splash />
  </body></html>;
}
