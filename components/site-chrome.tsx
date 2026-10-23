"use client";

import Link from "next/link";
import { Brand } from "@/components/brand";

export function SiteHeader() {
  return <header className="site-header"><Brand />
    <nav className="desktop-nav" aria-label="Main navigation"><Link href="/">Home</Link><Link href="/history">History</Link><Link href="/feedback">Feedback</Link></nav>
  </header>;
}

export function SiteFooter() {
  return <footer className="site-footer"><Brand compact /><span>Passenger observations are not official service announcements.</span></footer>;
}

export function MobileNavigation() {
  return <nav className="mobile-nav" aria-label="Main navigation"><Link href="/">Home</Link><Link href="/history">History</Link><Link href="/feedback">Feedback</Link></nav>;
}
