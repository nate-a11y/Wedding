# Wedding Website Requirements

## Project Overview
A modern, elegant wedding website for Nate Bullock and Blake Moore's wedding on October 31, 2027.

## Technical Stack
- **Frontend Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5.9.3
- **Styling**: Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **Animations**: Framer Motion
- **Email**: Resend API
- **Hosting**: Vercel
- **Analytics**: Vercel Analytics

## Core Features

### 1. Authentication & Access Control
- [x] Password-protected guest access
- [x] Simple password-based authentication (no user accounts)
- [x] Session management with cookies
- [ ] Optional: Role-based access (admin vs guest)

### 2. Home Page
- [x] Hero section with couple's names and wedding date
- [x] Countdown timer to wedding date (October 31, 2027)
- [x] Navigation to all sections
- [x] Elegant animations and transitions
- [x] Responsive design

### 3. Our Story
- [x] Timeline of relationship milestones
- [x] Photos from key moments
- [x] Narrative text about the couple's journey
- [x] Responsive timeline layout

### 4. Events & Schedule
- [x] Ceremony details (time, location, dress code)
- [x] Reception details
- [x] Pre-wedding events (if applicable)
- [x] Timeline of wedding day events
- [ ] Interactive map integration
- [ ] Calendar export (.ics file)

### 5. Travel & Accommodations
- [x] Hotel recommendations with details
- [x] Transportation information
- [x] Local attractions and things to do
- [x] Directions to venues
- [ ] Hotel booking links
- [ ] Group rate codes

### 6. Photo Gallery
- [x] Grid layout for photos
- [x] Responsive image display
- [ ] Image upload functionality
- [ ] Lightbox view for full-size images
- [ ] Photo albums/categories
- [ ] Guest photo submissions

### 7. RSVP System
- [x] RSVP form with guest information
- [x] Dietary restrictions field
- [x] Plus-one handling
- [x] Supabase integration for data storage
- [x] Form validation
- [ ] Email confirmations for submissions
- [ ] RSVP deadline enforcement
- [ ] Edit/update existing RSVP
- [ ] Guest lookup by confirmation code

### 8. Guest Address Collection
- [x] Mailing address form
- [x] International address support
- [x] Supabase storage
- [ ] CSV export for addresses
- [ ] Address validation
- [ ] Duplicate detection

### 9. Guestbook
- [x] Basic guestbook structure
- [ ] Message submission form
- [ ] Message moderation
- [ ] Rich text editor for messages
- [ ] Photo attachments to messages
- [ ] Display approved messages

### 10. FAQ Section
- [x] Common questions and answers
- [x] Accordion-style layout
- [x] Searchable/filterable
- [ ] Admin interface to add/edit FAQs

### 11. Registry
- [ ] Registry page with links to stores
- [ ] Gift tracking system
- [ ] Thank you note tracking
- [ ] Multiple registry integrations

### 12. Admin Dashboard
- [ ] View all RSVPs
- [ ] Search and filter guests
- [ ] Export guest list
- [ ] View address submissions
- [ ] Seating chart management
- [ ] Email notifications dashboard
- [ ] Analytics (RSVP rate, attendance count)

### 13. Seating Chart
- [ ] Table management (create/edit tables)
- [ ] Drag-and-drop guest assignment
- [ ] Visual seating layout
- [ ] Export seating chart
- [ ] Conflict detection (dietary restrictions)

### 14. Email Notifications
- [ ] New RSVP notifications to couple
- [ ] RSVP confirmation to guests
- [ ] Reminder emails for RSVPs
- [ ] Updates and announcements
- [ ] Resend API integration

### 15. Accessibility
- [x] Keyboard navigation
- [x] ARIA labels
- [x] Semantic HTML
- [x] Color contrast compliance (WCAG AA)
- [x] Screen reader compatible
- [ ] Skip navigation links
- [ ] Focus indicators
- [ ] Alt text for all images

## Design System

### Colors
- **Primary**: Olive Green (#808000)
- **Accent**: Gold (#d4af37)
- **Neutral Dark**: Black (#000000) / Charcoal (#1a1a1a)
- **Neutral Light**: White (#ffffff) / Cream (#faf9f6)

### Typography
- **Headings**: Cormorant Garamond (serif) - elegant, traditional
- **Body Text**: Montserrat (sans-serif) - clean, readable
- **Accents**: Great Vibes (script) - romantic, decorative

### Layout
- **Mobile-first**: Responsive design starting from 320px
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Max Width**: 1400px for content container
- **Spacing**: Consistent 8px grid system

### Animations
- **Transitions**: Smooth, subtle (0.2-0.3s duration)
- **Hover Effects**: Scale, color change, underline
- **Page Transitions**: Fade in, slide up
- **Interactive Elements**: Framer Motion for complex animations

## Database Schema

### Tables
1. **rsvps** - Guest RSVP responses
   - id, created_at, name, email, attending, plus_one, dietary_restrictions, message

2. **guestbook** - Guest messages
   - id, created_at, guest_name, message, approved, photo_url

3. **photos** - Gallery photos
   - id, created_at, url, caption, album, uploaded_by

4. **guest_addresses** - Mailing addresses
   - id, created_at, name, address_line1, address_line2, city, state_province, postal_code, country

5. **seating_tables** - Table definitions
   - id, table_number, capacity, location

6. **seating_assignments** - Guest-to-table assignments
   - id, guest_name, table_id, seat_number

7. **emails** - Email notification tracking
   - id, created_at, recipient, subject, status, sent_at

## Non-Functional Requirements

### Performance
- [ ] Page load time < 3 seconds
- [ ] Lighthouse score > 90
- [ ] Optimized images (WebP, lazy loading)
- [ ] Code splitting for faster initial load
- [ ] Edge caching where possible

### Security
- [x] Environment variables for secrets
- [x] Supabase Row Level Security (RLS)
- [ ] Rate limiting for form submissions
- [ ] CSRF protection
- [ ] Input sanitization
- [ ] SQL injection prevention (via Supabase)

### SEO & Social
- [ ] Meta tags (title, description)
- [ ] Open Graph tags for social sharing
- [ ] Twitter Card tags
- [ ] Sitemap.xml
- [ ] robots.txt
- [ ] Favicon and touch icons

### Browser Support
- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)
- Mobile Safari (iOS 14+)
- Mobile Chrome (Android 10+)

### Monitoring
- [x] Vercel Analytics integrated
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring
- [ ] Performance monitoring

## Future Enhancements
- [ ] Multi-language support (English/Spanish)
- [ ] Live streaming integration
- [ ] Wedding day live updates
- [ ] Post-wedding photo sharing
- [ ] Anniversary reminders
- [ ] Gift registry thank-you tracking
- [ ] Music request functionality
- [ ] Dietary restriction icons/badges
- [ ] Weather forecast widget
- [ ] Social media wall

## Success Criteria
- All guests can easily find event information
- RSVP process is simple and mobile-friendly
- Website loads quickly on all devices
- Accessible to users with disabilities
- Zero downtime during peak usage
- Positive guest feedback
- Simplifies wedding planning tasks for the couple
