# Nate & Blake Say I Do

A modern, elegant wedding website for Nate Bullock and Blake Moore's wedding on October 31, 2027.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (for RSVP management)
- **Animations**: Framer Motion
- **Deployment**: Vercel

## Features

- Password-protected guest access
- Countdown timer to the wedding date
- Our Story timeline
- Event details and schedule
- Travel & accommodations information
- Photo gallery
- RSVP form with Supabase integration
- FAQ section
- Registry page (coming soon)
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

- Node.js 18+
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Wedding
```

2. Install dependencies:
```bash
npm install
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
- `SITE_PASSWORD` - Password for guest access
- `RESEND_API_KEY` - API key from Resend for email notifications
- `RESEND_WEBHOOK_SECRET` - Webhook secret for Resend email events

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
- `seating_tables` - Table definitions for seating chart
- `seating_assignments` - Guest-to-table assignments
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

## License

All Rights Reserved - See [LICENSE](LICENSE) for details.

---

Made with love for Nate & Blake's wedding 10.31.27
