import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'CORE Performance OS',
        short_name: 'CORE',
        description: 'Track your habits, mental state, finances and workouts. Build better habits, achieve more.',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        prefer_related_applications: false,
        icons: [
            {
                src: '/icon.svg',
                sizes: '192x192',
                type: 'image/svg+xml',
                purpose: 'maskable'
            },
            {
                src: '/icon.svg',
                sizes: '512x512',
                type: 'image/svg+xml',
                purpose: 'any'
            }
        ],
    }
}
