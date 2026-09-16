import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Outcome Based Education (OBE) Management System',
  description: 'Production-Ready Enterprise OBE Attainment & Accreditation Management Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">{children}</body>
    </html>
  );
}
