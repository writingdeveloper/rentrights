import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RentRights',
    short_name: 'RentRights',
    description: 'Estimate your Los Angeles renter rights and rent-increase cap from your address — free, no sign-up.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0C111A',
    theme_color: '#0C111A',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
