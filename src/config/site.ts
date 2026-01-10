export const siteConfig = {
  // Couple Information
  couple: {
    person1: {
      firstName: 'Nate',
      lastName: 'Bullock',
      fullName: 'Nate Bullock',
      phone: '(417) 380-9953',
    },
    person2: {
      firstName: 'Blake',
      lastName: 'Moore',
      fullName: 'Blake Moore',
      phone: '(816) 352-9593',
    },
  },

  // Contact Information
  contact: {
    email: 'nateandblakesayido@outlook.com',
  },

  // Wedding Details
  wedding: {
    date: new Date('2027-10-31T16:00:00-05:00'), // 4:00 PM Central Time
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
        name: 'Michael Brandt',
        role: 'Best Man',
        relation: 'Friend',
        bio: 'A great friend who will stand by Nate on this special day.',
        photo: '/images/party/michael-brandt.svg',
      },
      {
        name: 'Dawson Brandt',
        role: 'Groomsman',
        relation: 'Friend',
        bio: 'A good friend who has been there through thick and thin.',
        photo: '/images/party/dawson-brandt.svg',
      },
      {
        name: 'Jasey Brandt',
        role: 'Groomsman',
        relation: 'Friend',
        bio: 'A great friend who will celebrate this special occasion.',
        photo: '/images/party/jasey-brandt.svg',
      },
      {
        name: 'Tiffany Bullock',
        role: 'Groomswoman',
        relation: 'Sister',
        bio: "Nate's sister and a cherished member of the wedding party.",
        photo: '/images/party/tiffany-bullock.svg',
      },
    ],
    // Blake's side
    blakesSide: [
      {
        name: 'Anthony Hawkins',
        role: 'Best Man',
        relation: 'Brother',
        bio: "Blake's brother and closest confidant who will stand beside him on this special day.",
        photo: '/images/party/anthony-hawkins.svg',
      },
      {
        name: 'Bill Moore',
        role: 'Groomsman',
        relation: 'Father',
        bio: "Blake's father, honored to stand with his son on this momentous occasion.",
        photo: '/images/party/bill-moore.svg',
      },
      {
        name: 'Jamie Moore',
        role: 'Groomswoman',
        relation: 'Mother',
        bio: "Blake's mother, celebrating her son's special day with love and pride.",
        photo: '/images/party/jamie-moore.svg',
      },
      {
        name: 'Brittany Stufflebean',
        role: 'Groomswoman',
        relation: 'Sister',
        bio: "Blake's sister, thrilled to be part of this beautiful celebration.",
        photo: '/images/party/brittany-stufflebean.svg',
      },
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
        { name: 'Live Feed', href: '/live' },
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
    { name: 'Address', href: '/address' },
    { name: 'RSVP', href: '/rsvp', highlight: true },
    { name: 'Registry', href: '/registry' },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
