import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "BusBatao — Bus ka haal, pehle se pata.",
  description: "Community transport observations and route information for Hyderabad and Jamshoro.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Brand />
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link href="/routes">Explore routes</Link><Link href="/updates">Updates</Link><Link href="/map">Map</Link><Link href="/compare">Compare</Link><Link href="/about">About</Link>
          </nav>
          <Link className="button button-small header-report" href="/report">Report an update <span aria-hidden="true">↗</span></Link>
        </header>
        <main>{children}</main>
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <Link href="/">Home</Link><Link href="/routes">Routes</Link><Link href="/report">Report</Link><Link href="/updates">Updates</Link><Link href="/map">Map</Link>
        </nav>
        <footer className="site-footer"><Brand compact /><span>Passenger observations are not official service announcements.</span></footer>
      </body>
    </html>
  );
}
