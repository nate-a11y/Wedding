# Nate & Blake Say I Do

A modern, elegant wedding website for Nate Bullock and Blake Moore's wedding on October 31, 2027.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (guest, admin, vendor, and wedding-day operations)
- **Animations**: Framer Motion
- **Deployment**: Vercel

## Features

- Password-protected guest access
- Countdown timer to the wedding date
- Our Story timeline
- Event details and schedule
- Travel & accommodations information
- Photo gallery with admin-curated photos and lightbox viewer
- RSVP form with Supabase integration
- Guestbook and song requests
- Wedding-day live hub, announcements, livestream, and web push
- Admin planning and operations controls
- Vendor magic-link portals
- FAQ section
- Registry page with retailer links and honeymoon fund
- Livestream page with admin go-live controls and push notifications
- Per-event add-to-calendar (Google, Apple, Outlook)
- Fully responsive design
- Elegant animations and transitions
- WCAG accessible

## Design System

### Colors
- **Olive Green**: `#808000` - Primary brand color
- **Gold**: `#d4af37` - Accent color
- **Black**: `#000000` / Charcoal: `#1a1a1a`
- **White**: `#ffffff` / Cream: `#faf9f6`

### Typography
- **Heading**: Cormorant Garamond (serif)
- **Body**: Montserrat (sans-serif)
- **Accent**: Great Vibes (script)

## Getting Started

### Prerequisites

- Node.js 22, 23, or 24
- npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Wedding
```

2. Install dependencies:
```bash
npm ci
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your values:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Site Authentication
SITE_PASSWORD=your_site_password

# Resend (for email notifications)
RESEND_API_KEY=your_resend_api_key
RESEND_WEBHOOK_SECRET=your_resend_webhook_secret
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (main)/            # Main layout group (with header/footer)
│   │   ├── page.tsx       # Home page
│   │   ├── our-story/     # Our Story page
│   │   ├── events/        # Events page
│   │   ├── travel/        # Travel & Stay page
│   │   ├── gallery/       # Photo gallery
│   │   ├── rsvp/          # RSVP form
│   │   ├── faq/           # FAQ page
│   │   └── registry/      # Registry page
│   ├── login/             # Password login page
│   ├── api/               # API routes
│   │   └── auth/          # Authentication endpoint
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles & design tokens
├── components/
│   ├── ui/                # Reusable UI components
│   ├── layout/            # Layout components (Header, Footer)
│   └── sections/          # Page sections (Hero, Countdown)
├── config/                # Site configuration
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
└── types/                 # TypeScript types
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Set these in your Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-only Supabase service role key for API routes; never expose this client-side
- `SITE_PASSWORD` - Password for guest access
- `RESEND_API_KEY` - API key from Resend for email notifications
- `RESEND_WEBHOOK_SECRET` - Webhook secret for Resend email events
- `GOOGLE_ADDRESS_VALIDATION_API_KEY` - Server-only key restricted to the Google Address Validation API; never prefix with `NEXT_PUBLIC_`

US addresses in `/address` and `/rsvp` are validated through Google Address Validation with USPS CASS enabled. Guests confirm suggested corrections before saving. Validation failures are shown explicitly, with an option to continue using the original address. `/privacy` documents the data sharing and Google terms. Raw Google responses and validation metadata are not stored.

Use a dedicated API-restricted wedding key, not a shared Google Workspace service-account key. The API must be enabled with billing attached; Google's recurring free allowance is shared at the billing-account level and is not a spending cap. The endpoint uses the existing shared rate limiter (five attempts per IP per minute); configure Google quotas separately if a hard provider-side usage ceiling is needed, without unexpectedly limiting other apps in a shared project.

## Supabase Setup

The database schema is managed via SQL files in the `supabase/` directory:

1. **Initial schema**: Run `supabase/schema.sql` to create the base `rsvps` table
2. **Migrations**: Apply migrations in order from `supabase/migrations/`

### Database Tables

The application uses the following tables:
- `rsvps` - Wedding guest RSVP responses
- `guestbook` - Guest book messages
- `photos` - Photo gallery items
- `guest_addresses` - Mailing addresses for invitations
- `emails` - Email tracking for notifications

### Quick Setup

```bash
# Using Supabase CLI
supabase db push

# Or manually run the SQL files in your Supabase dashboard
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run strict TypeScript checks
- `npm test` - Run the smoke Playwright suite
- `npm run audit` - Audit production dependencies
- `npm run verify` - Run the complete local verification gate

## License

All Rights Reserved - See [LICENSE](LICENSE) for details.

---

Made with love for Nate & Blake's wedding 10.31.27
