import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { Header } from '@/components/layout/Header';
import { PostHogProvider } from '@/components/providers/PostHogProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Murder Verse',
  description: 'AI-powered detective game - interrogate suspects to solve mysteries',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-900 text-white min-h-screen`}>
        <PostHogProvider>
          <AuthProvider>
            <Header />
            {children}
          </AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
