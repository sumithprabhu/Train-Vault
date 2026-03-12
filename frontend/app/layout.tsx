import type { Metadata, Viewport } from "next"
import { JetBrains_Mono } from "next/font/google"
import { GeistPixelGrid } from "geist/font/pixel"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/components/providers"

import "./globals.css"

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Corpus | Dataset & Model Provenance on Filecoin',
  description:
    'Upload datasets, track lineage, and anchor reproducibility hashes on-chain. Storage on Filecoin via Synapse. Treasury-backed payments, API keys, and SDK.',
  keywords: [
    'Corpus',
    'dataset provenance',
    'model provenance',
    'Filecoin storage',
    'Synapse',
    'reproducibility',
    'ML datasets',
    'on-chain storage',
  ],
  authors: [{ name: 'Corpus' }],
  creator: 'Corpus',
  publisher: 'Corpus',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'Corpus | Dataset & Model Provenance on Filecoin',
    description: 'Dataset and model provenance on Filecoin. Upload, store, version, and prove.',
    siteName: 'Corpus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Corpus | Dataset & Model Provenance on Filecoin',
    description: 'Upload datasets, track lineage, anchor hashes on-chain. Filecoin + Synapse.',
  },
  category: 'technology',
}

export const viewport: Viewport = {
  themeColor: '#F2F1EA',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${GeistPixelGrid.variable}`} suppressHydrationWarning>
      <body className="font-mono antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
