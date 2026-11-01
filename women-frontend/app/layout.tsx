import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

// Previously used next/font/google (Geist/Geist Mono), which fetches font
// files from fonts.googleapis.com at build time. That's a real fragility:
// any environment with restricted egress (CI runners, corporate proxies,
// offline builds) fails the entire build over a font. Using the system
// font stack below removes that dependency entirely while still looking
// clean — every OS ships a high-quality default sans/mono pairing.

export const metadata: Metadata = {
  title: 'HealthHub - Women\'s Hormonal Health Prediction',
  description: 'AI-powered hormonal disease prediction for women using facial analysis and health data',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased bg-background text-foreground">
        <AuthProvider>
          {children}
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
