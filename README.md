# sarvin.dev — Personal Portfolio

Terminal-aesthetic personal portfolio for **Sarvin Shrivastava** — full-stack developer, AR/VR engineer, and AI/ML enthusiast. Built with Vite + React + TypeScript, content managed headlessly through Notion, deployed on Vercel.

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | React 19 + TypeScript |
| Bundler | Vite 8 |
| Styling | Tailwind CSS v4 (CSS-variable tokens) |
| Routing | react-router-dom v6 |
| Animation | framer-motion v11 |
| CMS | Notion API (headless, server-proxied) |
| Email | EmailJS |
| Hosting | Vercel (serverless API routes) |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — Hero typewriter → About → Connect |
| `/projects` | Filterable project grid (AI/ML, AR/VR, Web Dev, Tools) |
| `/my-journey` | Vertical alternating timeline |
| `/experience` | Role cards sorted newest-first |

---

## Notion Schema

All content is driven by four Notion databases. Set their IDs in `.env`:

```
VITE_NOTION_DB_ABOUT=
VITE_NOTION_DB_PROJECTS=
VITE_NOTION_DB_TIMELINE=
VITE_NOTION_DB_EXPERIENCE=
```

### About DB (single row)
| Property | Type | Notes |
|----------|------|-------|
| Bio | Rich text | |
| Roles | Multi-select | Drives Hero typewriter |
| Resume URL | URL | Powers `↓ cv` button — leave empty to hide |
| GitHub | URL | |
| LinkedIn | URL | |
| X | URL | |
| Medium | URL | |
| Email | Email | |

### Projects DB
`Name` (title) · `Description` (rich text) · `Category` (select) · `Tech Stack` (multi-select) · `GitHub URL` (url) · `Image URL` (url) · `Date` (date) · `Featured` (checkbox) · `Sort Order` (number)

### Timeline DB
`Name` (title) · `Description` (rich text) · `Date Range` (rich text) · `Category` (select: Education / Achievement / Milestone / Leadership) · `Sort Order` (number)

### Experience DB
`Name` (title) · `Role` (rich text) · `Start Date` (date) · `End Date` (date) · `Location` (rich text) · `Description` (rich text, `\n`-separated bullets) · `Tech Stack` (multi-select) · `Sort Order` (number)

---

## Environment Variables

Create `.env` at the project root (never commit this file):

```env
# Server-side only — used by Vercel function + Vite dev proxy
NOTION_API_KEY=

# Browser-safe Notion DB IDs
VITE_NOTION_DB_ABOUT=
VITE_NOTION_DB_PROJECTS=
VITE_NOTION_DB_TIMELINE=
VITE_NOTION_DB_EXPERIENCE=

# EmailJS
VITE_EMAILJS_PUBLIC_KEY=
```

For Vercel: add `NOTION_API_KEY` and `VITE_EMAILJS_PUBLIC_KEY` as environment variables in the project dashboard (the `VITE_*` Notion IDs are non-sensitive and can live in the repo if preferred).

---

## Local Development

```bash
npm install
npm run dev        # starts on http://localhost:5173
```

The Vite dev server proxies `/api/notion/*` to `api.notion.com` using `NOTION_API_KEY`, mirroring the Vercel function in production.

```bash
npm run build      # production build → dist/
npm run preview    # preview the dist build locally
npx eslint src/    # lint
npx tsc --noEmit   # type-check
```

---

## Keyboard Navigation

Press `h` anywhere to open the help overlay.

| Key | Action |
|-----|--------|
| `←` / `→` | Previous / next page |
| `j` / `↓` | Next section or element |
| `k` / `↑` | Prev section or element |
| `Enter` | Enter element mode / activate |
| `Esc` | Back / deselect |
| `d` | Toggle dark / light theme |
| `r` | Open resume in new tab |
| `/` | Focus project filter |
| `h` | Toggle keyboard help |

All shortcuts require a bare keypress — modifier combos (`cmd+r`, `ctrl+r`, etc.) are intentionally passed through to the browser.

---

## Project Structure

```
src/
├── components/
│   ├── layout/       Navbar, Footer
│   ├── sections/     Hero, About, Connect
│   └── ui/           Tag, SectionHeading, HelpOverlay
├── hooks/
│   ├── useKeyboardNav.ts
│   ├── useScrollReveal.ts
│   └── useTheme.ts
├── pages/            Home, Projects, MyJourney, Experience
├── services/
│   └── notion.ts     Fetch + 5-min localStorage cache
├── types/
│   └── index.ts
└── index.css         Design tokens + Tailwind layers
api/
└── notion/[...path].ts   Vercel serverless proxy
```

---

## Design Tokens

Defined as CSS variables in `src/index.css`, toggled via `data-theme="dark|light"` on `<html>`:

| Token | Dark | Light |
|-------|------|-------|
| `--bg` | `#0d0d0d` | `#fafafa` |
| `--bg-secondary` | `#141414` | `#f0f0f0` |
| `--accent` | `#F5A623` | `#F5A623` |
| `--text` | `#e8e8e8` | `#111111` |
| `--text-muted` | `#6b6b6b` | `#888888` |

Fonts: **JetBrains Mono** (headings / mono) · **Inter** (body)

---

## Deployment

The repo is connected to Vercel. Every push to `main` triggers a production deploy. The `api/notion/[...path].ts` serverless function keeps `NOTION_API_KEY` server-side only.

For the `production` branch: Vercel's branch-based deploy previews apply automatically.
