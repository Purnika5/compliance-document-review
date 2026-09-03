/**
 * Global Design Tokens — Financial Services / Back-Office Standard
 * Rule: Minimalist, desaturated, high-contrast typography, strict 6px radius.
 */
export const tokens = {
  colors: {
    brand: {
      primary: "hsl(153, 47%, 20%)",      /* #1b4332 - Institutional Forest Green */
      primaryHover: "hsl(153, 50%, 15%)",
      accent: "hsl(153, 20%, 92%)",
      slateDark: "hsl(222.2, 47%, 11.2%)",
    },
    status: {
      pending: {
        bg: "hsl(45, 90%, 96%)",
        text: "hsl(35, 90%, 28%)",
        border: "hsl(40, 60%, 86%)",
      },
      approved: {
        bg: "hsl(150, 40%, 96%)",
        text: "hsl(153, 50%, 24%)",
        border: "hsl(150, 30%, 86%)",
      },
      needsRevision: {
        bg: "hsl(35, 80%, 96%)",
        text: "hsl(28, 85%, 32%)",
        border: "hsl(30, 50%, 86%)",
      },
      rejected: {
        bg: "hsl(0, 50%, 97%)",
        text: "hsl(0, 65%, 38%)",
        border: "hsl(0, 40%, 88%)",
      },
      inReview: {
        bg: "hsl(210, 20%, 95%)",
        text: "hsl(215, 25%, 30%)",
        border: "hsl(214, 20%, 86%)",
      },
    },
    neutral: {
      bg: "hsl(210, 20%, 98%)",
      card: "hsl(0, 0%, 100%)",
      border: "hsl(214.3, 28%, 88%)",
      text: "hsl(222.2, 47%, 11.2%)",
      subtext: "hsl(215.4, 16.3%, 42%)",
      muted: "hsl(210, 16%, 94%)",
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
