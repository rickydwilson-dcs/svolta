import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — Svolta | Before & After Photo Alignment for Fitness Coaches',
  description:
    'Choose the right Svolta plan. Free tier with watermark or Pro for unlimited professional before/after photo comparisons. 30-day money-back guarantee.',
  openGraph: {
    title: 'Svolta Pricing — Professional Before & After Photos',
    description:
      'Remove watermarks and export unlimited professional before/after comparisons. Plans starting free.',
    url: 'https://www.svolta.app/upgrade',
    siteName: 'Svolta',
    type: 'website',
  },
  alternates: {
    canonical: 'https://www.svolta.app/upgrade',
  },
};

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
