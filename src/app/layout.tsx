import type { Metadata, Viewport } from "next";
// Fonts are bundled via @fontsource — no CDN, no runtime network requests.
// Pixelify Sans by Eiyob — SIL Open Font License 1.1
// Press Start 2P by CodeMan38 — SIL Open Font License 1.1
import "@fontsource/pixelify-sans/400.css";
import "@fontsource/pixelify-sans/500.css";
import "@fontsource/pixelify-sans/600.css";
import "@fontsource/pixelify-sans/700.css";
import "@fontsource/press-start-2p/400.css";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const SITE_URL = "https://joris-decombe.github.io/piano_lessons";

export const metadata: Metadata = {
  title: "Piano Lessons — Interactive Waterfall Piano Trainer",
  description:
    "Learn piano with a Guitar Hero-style falling-note waterfall. Free, open-source trainer supporting MIDI, ABC notation, and MusicXML with real Salamander piano samples.",
  keywords: [
    "piano",
    "learn piano",
    "piano trainer",
    "MIDI player",
    "waterfall piano",
    "music education",
    "interactive piano",
    "sheet music",
    "MusicXML",
    "ABC notation",
    "open source piano",
  ],
  authors: [{ name: "joris-decombe", url: "https://github.com/joris-decombe" }],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Piano Lessons",
    title: "Piano Lessons — Interactive Waterfall Piano Trainer",
    description:
      "Guitar Hero-style falling-note piano trainer. Play along with MIDI, ABC notation, or MusicXML files. Free and open source.",
    images: [
      {
        url: `${SITE_URL}/icon-512.png`,
        width: 512,
        height: 512,
        alt: "Piano Lessons app icon",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Piano Lessons — Interactive Waterfall Piano Trainer",
    description:
      "Free open-source piano trainer with Guitar Hero-style falling notes. MIDI, ABC, and MusicXML support.",
    images: [`${SITE_URL}/icon-512.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#0f172a",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Piano Lessons",
  description:
    "Free, open-source interactive piano trainer with Guitar Hero-style falling-note waterfall. Supports MIDI, ABC notation, and MusicXML.",
  url: SITE_URL,
  applicationCategory: "MusicApplication",
  operatingSystem: "Web",
  browserRequirements: "Requires a modern browser with Web Audio API support",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  codeRepository: "https://github.com/joris-decombe/piano_lessons",
  license: "https://opensource.org/licenses/MIT",
  creator: {
    "@type": "Person",
    name: "joris-decombe",
    url: "https://github.com/joris-decombe",
  },
  featureList: [
    "MIDI file playback",
    "ABC notation support",
    "MusicXML support",
    "Falling-note waterfall visualization",
    "Speed control",
    "Loop sections",
    "Left/right hand color coding",
    "Multiple visual themes",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'self';"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
