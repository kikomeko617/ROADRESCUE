import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
import { Suspense } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ScrollEffects from "@/components/ScrollEffects";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: { default: "ROADRESCUE - roadside help in one tap", template: "%s | ROADRESCUE" },
  description: "Order a verified mechanic, a tow or a driver to wherever you are in Kampala, at a fixed price you see first.",
  icons: { icon: "/logo.svg" },
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#0a1631", colorScheme: "dark" };

// Pages read the login cookie, so render them fresh on every request.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <div className="demo-banner" role="note">
          <strong>Prototype:</strong> all people, cars and payments here are fictitious. Payments are simulated - never enter a real PIN.
        </div>
        <Header />
        <main id="main" tabIndex={-1}>
          <div className="container">{children}</div>
        </main>
        <footer className="site-footer">
          <div className="container footer-inner">
            <div className="footer-brand">
              <img src="/logo.svg" alt="" width="28" height="28" />
              <span>
                <strong>ROADRESCUE</strong>
                <span className="tiny">Break down. Get moving. Get your car back.</span>
              </span>
            </div>
            <nav className="footer-links" aria-label="Footer">
              <Link href="/services">Services</Link>
              <Link href="/#nearby">Helpers near you</Link>
              <Link href="/privacy">Privacy and data use</Link>
            </nav>
            <p className="tiny footer-note">
              © 2026 ROADRESCUE · MGT3151 E-Commerce prototype · Uganda Christian University. Map data © OpenStreetMap contributors. Photos from Unsplash, Pexels, Pixabay and a friend of the team, for illustration only.
            </p>
          </div>
        </footer>
        <Suspense fallback={null}>
          <ScrollEffects />
        </Suspense>
        <Analytics />
      </body>
    </html>
  );
}
