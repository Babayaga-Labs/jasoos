import type { Metadata } from 'next';
import { Inter, Cinzel, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { Header } from '@/components/layout/Header';
import { PostHogProvider } from '@/components/providers/PostHogProvider';

const inter = Inter({ subsets: ['latin'] });
const cinzel = Cinzel({ 
  subsets: ['latin'],
  variable: '--font-cinzel',
  weight: ['400', '500', '600', '700'],
});
const cormorant = Cormorant_Garamond({ 
  subsets: ['latin'],
  variable: '--font-cormorant',
  weight: ['300', '400', '500', '600'],
});

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
      <body className={`${inter.className} ${cinzel.variable} ${cormorant.variable} bg-slate-950 text-slate-100 min-h-screen`}>
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
