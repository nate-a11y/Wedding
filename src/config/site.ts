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
    // Groom's side
    groomsmen: [
      {
        name: 'Best Man Name',
        role: 'Best Man',
        relation: 'Brother of the Groom',
        bio: 'Add bio here...',
        photo: '/images/party/placeholder.jpg',
      },
      // Add more groomsmen...
    ],
    // Bride's side
    bridesmaids: [
      {
        name: 'Maid of Honor Name',
        role: 'Maid of Honor',
        relation: 'Sister of the Bride',
        bio: 'Add bio here...',
        photo: '/images/party/placeholder.jpg',
      },
      // Add more bridesmaids...
    ],
    // Special roles
    special: [
      {
        name: 'Honey',
        role: 'Flower Girl',
        relation: 'The Goodest Girl',
        bio: 'A very special pup who will lead the way down the aisle.',
        photo: '/images/party/honey.jpg',
        isHuman: false,
      },
    ],
    // Parents
    parents: {
      groomParents: [
        { name: 'Parent Names', role: 'Parents of the Groom' },
      ],
      brideParents: [
        { name: 'Parent Names', role: 'Parents of the Bride' },
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
