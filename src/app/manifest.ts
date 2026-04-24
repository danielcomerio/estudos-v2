import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'estudos-v2',
    short_name: 'estudos',
    description: 'Preparação MP-ES — Cientista de Dados (FGV)',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#0f172a',
    background_color: '#0f172a',
    icons: [
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    shortcuts: [
      { name: 'Praticar', short_name: 'Praticar', url: '/praticar' },
      { name: 'Simulado', short_name: 'Simulado', url: '/simulado' },
      { name: 'Revisar', short_name: 'Revisar', url: '/revisar' },
    ],
  };
}
