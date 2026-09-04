import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Maritime SIH2026',
  description:
    'Forensic maritime oil spill source attribution platform with Lagrangian backtrack drift modeling, standard leeway windage physics, candidate AIS harvesting, and INCOIS/MOSDAC operational readiness.',
  openGraph: {
    title: 'Maritime SIH2026',
    description:
      'Forensic maritime oil spill source attribution platform with Lagrangian backtrack drift modeling, standard leeway windage physics, candidate AIS harvesting, and INCOIS/MOSDAC operational readiness.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
