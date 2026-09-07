/**
 * DOCU: Global Design Tokens — Financial Services / Back-Office Standard.
 * Minimalist, high-contrast dark typography, Springer Capital emerald & chartreuse palette.
 * Last Updated Date: September 8, 2026
 * @author Keith
 */
export const tokens = {
  colors: {
    brand: {
      primary: "hsl(142, 65%, 42%)",          /* #269a56 - Springer Emerald */
      primaryHover: "hsl(142, 65%, 36%)",
      accent: "hsl(84, 65%, 50%)",            /* #7dbb22 - Springer Chartreuse */
      forest: "hsl(125, 40%, 42%)",           /* #438639 - Deep Brand Forest */
      canvasDark: "hsl(240, 10%, 4%)",        /* #090a0f - Deep Obsidian */
      cardDark: "hsl(240, 10%, 7%)",          /* #111218 - Elevated Dark Card */
    },
    status: {
      pending: {
        bg: "hsl(42, 60%, 11%)",
        text: "hsl(42, 90%, 68%)",
        border: "hsl(42, 55%, 26%)",
      },
      approved: {
        bg: "hsl(150, 50%, 10%)",
        text: "hsl(142, 70%, 65%)",
        border: "hsl(142, 50%, 25%)",
      },
      needsRevision: {
        bg: "hsl(28, 65%, 12%)",
        text: "hsl(28, 90%, 68%)",
        border: "hsl(28, 60%, 28%)",
      },
      rejected: {
        bg: "hsl(0, 60%, 12%)",
        text: "hsl(0, 85%, 72%)",
        border: "hsl(0, 50%, 28%)",
      },
      inReview: {
        bg: "hsl(217, 40%, 12%)",
        text: "hsl(217, 85%, 72%)",
        border: "hsl(217, 45%, 26%)",
      },
    },
    neutral: {
      bg: "hsl(240, 10%, 4%)",
      card: "hsl(240, 10%, 7%)",
      border: "hsl(240, 6%, 16%)",
      text: "hsl(0, 0%, 98%)",
      subtext: "hsl(240, 5%, 65%)",
      muted: "hsl(240, 5%, 14%)",
    },
  },
  radius: {
    sm: "0.25rem",   /* 4px */
    md: "0.375rem",  /* 6px standard */
    lg: "0.5rem",    /* 8px max */
    full: "9999px",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    drawer: 40,
    modal: 50,
    toast: 100,
  },
} as const;
