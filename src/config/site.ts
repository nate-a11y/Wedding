export const siteConfig = {
  // Couple Information
  couple: {
    person1: {
      firstName: 'Nate',
      lastName: 'Bullock',
      fullName: 'Nate Bullock',
    },
    person2: {
      firstName: 'Blake',
      lastName: 'Moore',
      fullName: 'Blake Moore',
    },
  },

  // Wedding Details
  wedding: {
    date: new Date('2027-10-31T00:00:00'),
    displayDate: 'October 31, 2027',
    venue: {
      ceremony: {
        name: 'TBD',
        address: 'TBD',
        city: 'TBD',
        state: 'TBD',
        time: 'TBD',
      },
      reception: {
        name: 'TBD',
        address: 'TBD',
        city: 'TBD',
        state: 'TBD',
        time: 'TBD',
      },
    },
  },

  // Key Dates
  milestones: {
    met: new Date('2023-10-31'),
    engaged: new Date('2025-10-31'),
    wedding: new Date('2027-10-31'),
  },

  // Wedding Party
  weddingParty: {
    flowerGirl: {
      name: 'Honey',
      title: 'Flower Girl',
      description: 'The goodest girl',
      isHuman: false,
    },
  },

  // Site Metadata
  metadata: {
    title: 'Nate & Blake Say I Do',
    description: 'Join us in celebrating our wedding on October 31, 2027',
    url: 'https://nateandblake.com', // Update with actual URL
  },

  // Navigation
  navigation: [
    { name: 'Home', href: '/' },
    { name: 'Our Story', href: '/our-story' },
    { name: 'Events', href: '/events' },
    { name: 'Dress Code', href: '/dress-code' },
    { name: 'Travel', href: '/travel' },
    { name: 'Gallery', href: '/gallery' },
    { name: 'Photo Booth', href: '/photos' },
    { name: 'RSVP', href: '/rsvp' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Guest Book', href: '/guestbook' },
    { name: 'Registry', href: '/registry' },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
