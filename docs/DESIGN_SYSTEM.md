# Xentis Care Design System

## Overview

Premium ed-tech design system: colorful, clean, accessible. Built with Tailwind CSS, Poppins (headings), and Inter (body).

## Design Tokens

### Track Colors

| Track | Light | Dark |
|-------|-------|------|
| LVN/LPN | Teal (#0d9488) | Teal accent |
| RN | Cobalt blue (#2563eb) | Blue accent |
| FNP | Violet (#7c3aed) | Violet accent |
| PMHNP | Magenta (#c026d3) | Fuchsia accent |

### Typography

- **Headings:** `font-heading` (Poppins)
- **Body/UI:** `font-body` (Inter)

### Radius & Spacing

- Cards: `rounded-card` (1rem)
- Sections: `space-y-6`
- Card padding: `p-6` (default)

## Components

| Component | Usage |
|-----------|-------|
| `Card` | `variant`: default, elevated, outlined. `padding`: none, sm, md, lg |
| `Badge` | `variant`: default, track, success, warning, error, neutral. `track` for track colors |
| `Tabs` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| `ProgressBar` | `value`, `max`, `size`, `trackSlug`, `showLabel` |
| `StatBlock` | `label`, `value`, `subtext`, `icon`, `trend` |
| `ActionTile` | `href`, `title`, `description`, `icon`, `badge`, `trackColor` |
| `ExamToolButton` | `icon`, `label`, `active`, `onClick` |
| `EmptyState` | `icon`, `title`, `description`, `action` |
| `Skeleton` | Loading placeholder. `SkeletonCard`, `SkeletonStat` |
| `ThemeToggle` | Dark/light mode switch |

## Layouts

- **PublicNavbar:** Sticky header for landing, pricing, FAQ, legal
- **AppShell:** Sidebar + top nav for authenticated users
- **AppSidebar:** Collapsible on mobile, full nav (primary + admin)

## Dark Mode

- `class` strategy via `ThemeProvider`
- Toggle via `ThemeToggle` component
- CSS variables in `globals.css` for surface, border, text

## Accessibility

- Skip link: "Skip to main content"
- Focus visible: 2px indigo ring
- Semantic HTML: `main`, `nav`, `header`
- ARIA: `aria-label`, `aria-selected` on tabs
