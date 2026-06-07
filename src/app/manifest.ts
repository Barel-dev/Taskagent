import type { MetadataRoute } from 'next'

// Web app manifest — makes TaskAgent installable as a standalone PWA.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TaskAgent — AI task manager',
    short_name: 'TaskAgent',
    description:
      'An AI task manager where specialized agents plan, execute, prioritize, and schedule your work.',
    start_url: '/today',
    display: 'standalone',
    background_color: '#0b0e1a',
    theme_color: '#0b0e1a',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
