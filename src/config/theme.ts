/**
 * Design System Theme Configuration
 * Colors: Olive Green (#536537), Black, White, Gold Accents
 * Style: Elegant, Modern, Luxurious
 */

export const theme = {
  colors: {
    // Primary palette
    olive: {
      50: '#f4f6f2',
      100: '#e4e9e0',
      200: '#c5d0bc',
      300: '#a5b697',
      400: '#7c9469',
      500: '#536537', // Main olive
      600: '#45532e',
      700: '#374225',
      800: '#28311b',
      900: '#1a2011',
    },
    gold: {
      50: '#fffdf0',
      100: '#fef9c3',
      200: '#fef08a',
      300: '#fde047',
      400: '#facc15',
      500: '#d4af37', // Classic gold
      600: '#b8960c',
      700: '#92750a',
      800: '#6b5607',
      900: '#453804',
    },
    // Neutrals
    black: '#000000',
    white: '#ffffff',
    cream: '#faf9f6',
    charcoal: '#1a1a1a',
  },

  // Typography
  fonts: {
    heading: 'var(--font-heading)', // Elegant serif
    body: 'var(--font-body)', // Clean sans-serif
    accent: 'var(--font-accent)', // Script/decorative for accents
  },

  // Spacing scale
  spacing: {
    section: {
      sm: '4rem',
      md: '6rem',
      lg: '8rem',
    },
  },

  // Animation
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  // Breakpoints (matching Tailwind defaults)
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

export type Theme = typeof theme;
