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
        name: 'The Callaway Jewel',
        address: '4910 County Rd 105',
        city: 'Fulton',
        state: 'MO',
        zip: '65251',
        time: 'TBD',
        website: 'https://www.thecallawayjewel.com/',
      },
      reception: {
        name: 'The Callaway Jewel',
        address: '4910 County Rd 105',
        city: 'Fulton',
        state: 'MO',
        zip: '65251',
        time: 'TBD',
        website: 'https://www.thecallawayjewel.com/',
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
    // Nate's side
    natesSide: [
      {
        name: 'Best Man Name',
        role: 'Best Man',
        relation: 'Brother',
        bio: 'Add bio here...',
        photo: '/images/party/placeholder.jpg',
      },
      // Add more groomsmen...
    ],
    // Blake's side
    blakesSide: [
      {
        name: 'Best Man Name',
        role: 'Best Man',
        relation: 'Best Friend',
        bio: 'Add bio here...',
        photo: '/images/party/placeholder.jpg',
      },
      // Add more groomsmen...
    ],
    // Special roles
    special: [
      {
        name: 'Honey',
        role: 'Flower Girl',
        relation: 'The Goodest Girl',
        bio: 'A very special pup who will lead the way down the aisle.',
        photo: '/20250119_000105.jpg',
        isHuman: false,
      },
    ],
    // Parents
    parents: {
      natesParents: [
        { name: 'William & the late Tonya Bullock', role: "Nate's Parents" },
      ],
      blakesParents: [
        { name: 'William and Jamie Moore', role: "Blake's Parents" },
      ],
    },
  },

  // Site Metadata
  metadata: {
    title: 'Nate & Blake Say I Do',
    description: 'Join us in celebrating our wedding on October 31, 2027',
    url: 'https://nateandblake.me',
  },

  // Navigation
  navigation: [
    { name: 'Home', href: '/' },
    {
      name: 'Our Story',
      href: '/our-story',
      children: [
        { name: 'Our Story', href: '/our-story' },
        { name: 'Wedding Party', href: '/wedding-party' },
        { name: 'Gallery', href: '/gallery' },
      ],
    },
    {
      name: 'The Day',
      href: '/events',
      children: [
        { name: 'Events', href: '/events' },
        { name: 'Dress Code', href: '/dress-code' },
        { name: 'Travel', href: '/travel' },
        { name: 'Livestream', href: '/livestream' },
      ],
    },
    {
      name: 'Celebrate',
      href: '/photos',
      children: [
        { name: 'Photo Booth', href: '/photos' },
        { name: 'Guest Book', href: '/guestbook' },
        { name: 'FAQ', href: '/faq' },
      ],
    },
    { name: 'RSVP', href: '/rsvp', highlight: true },
    { name: 'Registry', href: '/registry' },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
