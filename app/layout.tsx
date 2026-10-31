import type { Metadata, Viewport } from 'next'
import { Rajdhani } from 'next/font/google'
import './globals.css'

const rajdhani = Rajdhani({
  variable: '--font-rajdhani',
  subsets: ['latin'],
  weight: ['500', '600']
})

const title = "Holo Call: Jonathan Taft's AI agent"
const description =
  "Accept the call and ask Agent, Jonathan Taft's AI agent, about his skills and experience."

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : null,
  title,
  description,
  openGraph: { title, description, url: '/', type: 'website' }
}

export const viewport: Viewport = {
  interactiveWidget: 'resizes-content'
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang='en' className={`${rajdhani.variable} h-full antialiased`}>
      <body className='min-h-full flex flex-col'>{children}</body>
    </html>
  )
}
