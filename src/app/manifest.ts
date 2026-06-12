import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SHELA - イベント実績分析',
    short_name: 'SHELA',
    description: '携帯ショップ外販イベント実績分析システム',
    start_url: '/',
    display: 'standalone',
    background_color: '#DCEDC8',
    theme_color: '#22211A',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
