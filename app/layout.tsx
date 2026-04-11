import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AutoFlow — Lead Scraper',
  description: 'Scrape leads from Facebook, Instagram, Justdial, Indiamart',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
