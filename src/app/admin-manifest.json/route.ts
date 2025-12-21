import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const isSubdomain = hostname.startsWith('admin.');

  // Adjust start_url and scope based on whether we're on subdomain
  const manifest = {
    id: 'nate-blake-wedding-planner',
    name: 'Wedding Planner - Nate & Blake',
    short_name: 'Wedding Planner',
    description: 'Wedding planning dashboard for Nate & Blake',
    start_url: isSubdomain ? '/' : '/admin',
    scope: isSubdomain ? '/' : '/admin',
    display: 'standalone',
    background_color: '#faf8f5',
    theme_color: '#536537',
    orientation: 'any',
    icons: [
      {
        src: '/icons/admin-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/admin-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/admin-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
    categories: ['productivity', 'utilities'],
    shortcuts: [
      {
        name: 'Budget',
        short_name: 'Budget',
        url: isSubdomain ? '/?tab=planning&subtab=budget' : '/admin?tab=planning&subtab=budget',
        icons: [{ src: '/icons/admin-icon.svg', sizes: 'any' }],
      },
      {
        name: 'Timeline',
        short_name: 'Timeline',
        url: isSubdomain ? '/?tab=planning&subtab=timeline' : '/admin?tab=planning&subtab=timeline',
        icons: [{ src: '/icons/admin-icon.svg', sizes: 'any' }],
      },
      {
        name: 'Tasks',
        short_name: 'Tasks',
        url: isSubdomain ? '/?tab=planning&subtab=tasks' : '/admin?tab=planning&subtab=tasks',
        icons: [{ src: '/icons/admin-icon.svg', sizes: 'any' }],
      },
      {
        name: 'Vendors',
        short_name: 'Vendors',
        url: isSubdomain ? '/?tab=planning&subtab=vendors' : '/admin?tab=planning&subtab=vendors',
        icons: [{ src: '/icons/admin-icon.svg', sizes: 'any' }],
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  });
}
