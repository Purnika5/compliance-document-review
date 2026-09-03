# Springer Capital - Frontend Portal

A modern, high-performance web application built with **Next.js 16**, **React 19**, **Tailwind CSS v4**, and **shadcn-inspired UI design system** for Springer Capital's document management and authentication platform.

---

## 🚀 Features

- **Role-Based Workflow**: Distinct interfaces and capabilities tailored for **Advisors** and **Officers**.
- **Document Queue Management**: Filterable tables, tabs for status navigation (`Pending`, `Approved`, `Needs Revision`, `Rejected`), and real-time status badges.
- **Document Upload Modal**: Interactive modal with client-side Zod schema validation.
- **Authentication System**: Login & Signup flows with mocked/backend fallback state management via Zustand-style `authStore`.
- **Shadcn UI System**: Sleek, clean, accessible UI components with consistent design tokens, dark/light compatibility, and responsive layouts.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript 5
- **UI Library & Styling**: Tailwind CSS v4 + `clsx` + `tailwind-merge` + `lucide-react`
- **Design System**: shadcn/ui inspired primitives (`Button`, `Card`, `Input`, `Badge`, `Dialog`, `Table`, `Tabs`, `RadioGroup`, `Alert`)
- **Validation**: Zod 4
- **State Management**: Client-side auth store (`auth-store.ts`)

---

## 📁 Folder Structure

```text
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/                 # Login and Signup pages
│   │   ├── (dashboard)/            # Dashboard, Queue, Submissions, Document details
│   │   ├── globals.css             # Global Tailwind v4 CSS configuration
│   │   ├── layout.tsx              # Root app layout
│   │   └── page.tsx                # Home page redirect
│   ├── components/
│   │   ├── layouts/                # Header, Navbar, Sidebar
│   │   └── ui/                     # shadcn UI components (Button, Input, Card, Dialog, etc.)
│   ├── features/
│   │   └── documents/              # Document queue table, upload modal, detail views
│   ├── lib/
│   │   ├── actions/                # Server & async client orchestration actions
│   │   ├── api/                    # API client wrappers & endpoint calls
│   │   ├── auth/                   # Client auth store
│   │   ├── validation/             # Zod schemas (auth, document)
│   │   └── utils.ts                # Class merge utility (cn)
│   ├── styles/                     # Token definitions & themes
│   └── types/                      # TypeScript definitions (auth.types.ts)
├── package.json
└── tsconfig.json
```

---

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ or 20+
- npm or pnpm

### Installation

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running Development Server

Start the Next.js development server with Turbopack:

```bash
npm run dev
```

Open [http://localhost:3003](http://localhost:3003) with your browser to view the portal.

---

## 📐 UI Components & Naming Conventions

All reusable UI components located in `src/components/ui/` follow **shadcn UI** patterns:

- Interfaces follow clean TypeScript typing (`IButtonProps`, `IDialogProps`, `IBadgeProps`, `IInputProps`, `ITabsProps`, `IRadioGroupProps`, `IAlertProps`).
- Single source of truth for shared domain types in `src/lib/validation/` and `src/types/`.
- Accessible focus rings, smooth transitions, and clean micro-interactions.

---

## 📝 License

Internal Proprietary Project - Springer Capital.
