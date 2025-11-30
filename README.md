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
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SITE_PASSWORD=your_site_password
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
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SITE_PASSWORD`

## Supabase Setup

To enable RSVP functionality, create a table in Supabase:

```sql
CREATE TABLE rsvp_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  attending BOOLEAN,
  meal_choice TEXT,
  dietary_restrictions TEXT,
  plus_one BOOLEAN DEFAULT FALSE,
  plus_one_name TEXT,
  plus_one_meal_choice TEXT,
  song_request TEXT,
  message TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting
CREATE POLICY "Allow anonymous inserts" ON rsvp_responses
  FOR INSERT TO anon
  WITH CHECK (true);
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## License

MIT License - See [LICENSE](LICENSE) for details.

---

Made with love for Nate & Blake's wedding 10.31.27
