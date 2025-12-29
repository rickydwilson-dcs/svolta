import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
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
      { url: "/apple-icon.svg", type: "image/svg+xml" },
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
        url: "/og-image.svg",
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
    images: ["/og-image.svg"],
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
