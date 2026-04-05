import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Generation Studio',
  description: 'Генерация изображений, видео и озвучки через fal.ai + ElevenLabs',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
