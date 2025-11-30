// RSVP Types
export interface RSVPGuest {
  id: string;
  name: string;
  email: string;
  attending: boolean | null;
  mealChoice: MealChoice | null;
  dietaryRestrictions: string | null;
  songRequest: string | null;
  plusOne: boolean;
  plusOneName: string | null;
  plusOneMealChoice: MealChoice | null;
  message: string | null;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type MealChoice = 'chicken' | 'beef' | 'fish' | 'vegetarian' | 'vegan';

export interface RSVPFormData {
  name: string;
  email: string;
  attending: boolean;
  mealChoice?: MealChoice;
  dietaryRestrictions?: string;
  songRequest?: string;
  hasPlusOne: boolean;
  plusOneName?: string;
  plusOneMealChoice?: MealChoice;
  message?: string;
}

// Event Types
export interface WeddingEvent {
  id: string;
  name: string;
  date: Date;
  startTime: string;
  endTime?: string;
  venue: Venue;
  description: string;
  dressCode?: string;
}

export interface Venue {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  phone?: string;
  website?: string;
}

// Gallery Types
export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  width: number;
  height: number;
  category?: 'engagement' | 'couple' | 'family' | 'venue';
}

// FAQ Types
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

// Timeline Types
export interface TimelineEvent {
  date: Date;
  title: string;
  description: string;
  icon?: string;
}

// Navigation Types
export interface NavItem {
  name: string;
  href: string;
  external?: boolean;
}

// Form Types
export interface FormState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}
