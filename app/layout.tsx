import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "optional",
});

export const metadata: Metadata = {
  title: "svolta — see change",
  description: "Professional before/after fitness photo alignment using AI pose detection. Create stunning progress comparisons with perfect alignment.",
  keywords: ["fitness", "before after", "photo alignment", "pose detection", "progress tracking", "transformation"],
  authors: [{ name: "svolta" }],
  metadataBase: new URL("https://www.svolta.app"),
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" }, // TODO: Replace placeholder with production apple-icon.png (180x180) — convert from public/apple-icon.svg
    ],
  },
  openGraph: {
    title: "svolta — see change",
    description: "Professional before/after fitness photo alignment using AI pose detection.",
    url: "https://www.svolta.app",
    siteName: "svolta",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png", // TODO: Replace placeholder with production og-image.png (1200x630) — convert from public/og-image.svg
        width: 1200,
        height: 630,
        alt: "svolta — see change",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "svolta — see change",
    description: "Professional before/after fitness photo alignment using AI pose detection.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-[var(--surface-primary)] focus:text-[var(--text-primary)] focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-pink)]"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
