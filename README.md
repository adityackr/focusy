# FocusTube

**FocusTube turns any YouTube playlist into a calm, course-style classroom — no recommendations, no Shorts, no comments, no autoplay rabbit holes. Just the videos you chose, in order.**

Paste a playlist link (or ID) and FocusTube imports every video — titles, thumbnails, order, channel info — then lets you watch it like a proper online course, with a collapsible lesson sidebar, per-video progress tracking, favorites, and recents. Everything lives in your browser: no account, no tracking, no server-side watch history.

---

## Table of contents

- [FocusTube](#focustube)
  - [Table of contents](#table-of-contents)
  - [Why this exists](#why-this-exists)
  - [Features](#features)
    - [Landing page (`/`)](#landing-page-)
    - [Library (`/library`)](#library-library)
    - [Collapsible app sidebar](#collapsible-app-sidebar)
    - [Watch pages (`/watch/[playlistId]`, `/watch/[playlistId]/[videoId]`)](#watch-pages-watchplaylistid-watchplaylistidvideoid)
    - [Cross-cutting](#cross-cutting)
  - [Tech stack](#tech-stack)
  - [Getting started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [1. Clone](#1-clone)
    - [2. Configure environment](#2-configure-environment)
    - [3. Install \& run](#3-install--run)
    - [4. Build \& start](#4-build--start)
    - [5. Test](#5-test)
  - [How it works](#how-it-works)
  - [Routes](#routes)
  - [Project structure](#project-structure)
  - [State \& persistence](#state--persistence)
  - [Scripts](#scripts)
  - [Design system](#design-system)
  - [Testing](#testing)
  - [Deployment](#deployment)

---

## Why this exists

YouTube's watch page is engineered to keep you watching — recommended videos, Shorts, comments, autoplay. That's the opposite of what you want when you're working through a tutorial series, a lecture playlist, or a course someone shared with you.

FocusTube solves exactly one problem: **watch a YouTube playlist start-to-finish without getting sidetracked.** It behaves like the video player on a course platform (Udemy, Coursera): one focused player, one clean lesson list, progress tracking, nothing else.

---

## Features

### Landing page (`/`)

Marketing-style homepage with a hero (live-feel classroom mock), stats, feature grid, 3-step "how it works", and a call-to-action panel — all in small section components under `components/landing/`.

### Library (`/library`)

- Grid of all saved playlists with channel, lesson count, and hover play overlay.
- **Drag-and-drop reordering** via a grip handle on each card (mouse, touch, and keyboard accessible). The order persists across reloads and is mirrored in the sidebar.
- Add playlists through a dialog that accepts a raw playlist ID, a `youtube.com` URL, or a `youtu.be` URL.
- Favorite (heart) and delete actions per card. Deleting always asks for confirmation through a shadcn-style alert dialog.

### Collapsible app sidebar

Available on Library / Recent / Favorites. Collapses to a slim icon rail, works as a slide-in drawer on mobile, and contains:

- Navigation (Library, Recent, Favorites with a count badge).
- Search across playlist titles and channels.
- The full playlist list in your manual order, each row opening its classroom, with hover-reveal favorite/delete actions (rendered as a floating chip so rows stay compact).
- Skeleton rows while the library is loading.

### Watch pages (`/watch/[playlistId]`, `/watch/[playlistId]/[videoId]`)

- **Playlist overview**: cinematic hero with thumbnail, lesson count, description, and a "Start watching" button.
- **Custom course player** (ported from the chapterly app): a chrome over the YouTube IFrame API with native controls hidden — segmented seekbar with chapter dividers, hover preview (thumbnail + time + chapter), floating now-playing chip, keyboard shortcuts (Space/K, J/L, arrows, M, C, F), speed/quality/captions menus, and fullscreen. Lesson counter, completion badge, "Next lesson" button, title and description around it.
- **Nested chapters in the lesson sidebar**: videos whose description contains YouTube timestamps (`00:00 Intro`) get a collapsible chapter list nested right under the lesson row — click a chapter to seek inside the current video, or jump straight to another lesson deep-linked at that timestamp (`?t=`). The chapter currently playing is highlighted; lesson search matches chapter titles too.
- **Collapsible lesson sidebar**: progress bar, lesson search, per-lesson watched toggles, active-lesson highlight. Collapses to a single "Show N lessons" button on desktop; a full list below the player on mobile.
- **Watch progress**: opening a video marks it watched; checkmarks toggle manually. Progress survives refreshes (stored per playlist in `localStorage`).
- Opening a shared `/watch/…` link for a playlist you don't have yet **auto-imports** it.
- Loading skeletons for both the hydrating and importing states; a proper not-found card otherwise.

### Cross-cutting

- **Dark / light mode** with system support (`next-themes`), honey-amber brand theme.
- **Toast feedback** (Sonner) for imports, deletes, and errors.
- **Loading skeletons** on Library, Recent, Favorites, sidebar, and watch pages — no flashing empty states.
- **Delete confirmations** everywhere via a shared alert dialog (no native `confirm()`).
- Fully **TypeScript**, fully **responsive**.

---

## Tech stack

| Technology                                                       | Version              | Role                                                                                        |
| ---------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| [Next.js](https://nextjs.org/) (App Router)                      | 16                   | Framework, routing, API routes, image optimization                                          |
| [React](https://react.dev/)                                      | 19                   | UI                                                                                          |
| [TypeScript](https://www.typescriptlang.org/)                    | 5                    | Type safety                                                                                 |
| [Tailwind CSS](https://tailwindcss.com/)                         | 4 (CSS-first config) | Styling + `shadcn` theme tokens in `app/globals.css`                                        |
| [shadcn/ui](https://ui.shadcn.com/) (New York)                   | vendored             | `button, card, dialog, alert-dialog, input, badge, skeleton, separator` in `components/ui/` |
| [Zustand](https://zustand.docs.pmnd.rs/) + `persist`             | 5                    | Client store (library, order, favorites, recents) persisted to `localStorage`               |
| [dnd-kit](https://dndkit.com/) (`core`, `sortable`, `utilities`) | 6 / 10               | Drag-and-drop playlist reordering                                                           |
| [Lucide](https://lucide.dev/)                                    | —                    | Icons (including the custom `LogoMark` SVG in `components/logo.tsx`)                        |
| [Sonner](https://sonner.emilkowal.ski/)                          | 1                    | Toasts                                                                                      |
| [next-themes](https://github.com/pacocoursey/next-themes)        | 0.4                  | Dark/light mode                                                                             |
| [Bun](https://bun.sh/)                                           | —                    | Package manager, runtime, and test runner                                                   |
| Testing Library + jsdom                                          | dev-only             | Component/hook tests (`bun test`)                                                           |
| [YouTube Data API v3](https://developers.google.com/youtube/v3)  | —                    | Playlist metadata + video lists (server-side only)                                          |

---

## Getting started

### Prerequisites

- [Bun](https://bun.sh/) installed.
- A **YouTube Data API v3 key** — create one at [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) and enable the _YouTube Data API v3_ for your project.

### 1. Clone

```sh
git clone https://github.com/adityackr/focustube.git
cd focustube
```

### 2. Configure environment

```sh
cp .env.example .env.local
```

Then set your key in `.env.local`:

```sh
YOUTUBE_API_KEY=your_youtube_data_api_v3_key
```

The key is **server-only** (plain `YOUTUBE_API_KEY`, never `NEXT_PUBLIC_*`) — it is used exclusively inside the `/api/playlists` route and never reaches the browser.

### 3. Install & run

```sh
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Build & start

```sh
bun run build
bun start
```

### 5. Test

```sh
bun test
```

---

## How it works

```
Paste link/ID
  → lib/utils.ts `parsePlaylistInput()` extracts the playlist ID
  → store `fetchPlaylist()` calls GET /api/playlists?playlistId=…
  → app/api/playlists/route.ts uses YOUTUBE_API_KEY against
      /playlists (metadata) + /playlistItems (all pages) via lib/youtube.ts
  → playlist saved to Zustand store → persisted to localStorage
  → classroom opens at /watch/[playlistId]
```

- **IDs accepted**: raw IDs (`PL…`), `youtube.com/playlist?list=…` / `watch?v=…&list=…`, `youtu.be/…?list=…`.
- **API route** caches responses at the edge (`s-maxage=300`) and returns clean 400/404/502 JSON errors.
- **Watch progress** (`hooks/use-watch-progress.ts`) stores `{ watched[], lastWatched, completedChapters[], positions{} }` per playlist in `localStorage`. Mutations go through a ref mirror so mount-time auto-marking can never clobber previously saved progress (this exact race is covered by a regression test). Playback position per video is reported by the player every ~5s, so reopening a lesson cues it where you left off — an explicit `?t=` deep link wins, and watching to the end drops the resume point.

---

## Routes

| Route                           | Type            | Description                                      |
| ------------------------------- | --------------- | ------------------------------------------------ |
| `/`                             | Static          | Landing page (hero, features, how-it-works, CTA) |
| `/library`                      | Static + client | Saved playlists, drag-to-reorder grid            |
| `/recent`                       | Static + client | Last opened playlists (up to 12)                 |
| `/favorites`                    | Static + client | Pinned playlists                                 |
| `/watch/[playlistId]`           | Dynamic         | Playlist overview + lesson list                  |
| `/watch/[playlistId]/[videoId]` | Dynamic         | Focused player + lesson sidebar                  |
| `/api/playlists?playlistId=…`   | Route handler   | Server-side YouTube fetching                     |

`/library`, `/recent`, `/favorites` share the `(app)` route group layout with the collapsible sidebar. The watch routes have their own minimal header layout.

---

## Project structure

```
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page (composes components/landing/*)
│   ├── layout.tsx                # Root layout: fonts, theme provider, toaster, metadata
│   ├── globals.css               # Tailwind v4 + shadcn theme tokens (brand colors here)
│   ├── icon.svg                  # Favicon (App Router file convention)
│   ├── not-found.tsx             # Global 404
│   ├── (app)/                    # Route group: pages with the app sidebar
│   │   ├── layout.tsx            # Wraps children in <AppShell>
│   │   ├── library/page.tsx      # Sortable library grid
│   │   ├── recent/page.tsx       # Recent playlists
│   │   └── favorites/page.tsx    # Favorite playlists
│   ├── watch/
│   │   ├── layout.tsx            # Minimal header for watch pages
│   │   └── [playlistId]/
│   │       ├── page.tsx          # Playlist overview route
│   │       └── [videoId]/page.tsx# Focused player route
│   └── api/playlists/route.ts    # Server-only YouTube Data API proxy
│
├── components/
│   ├── ui/                       # shadcn primitives (button, card, dialog,
│   │                             # alert-dialog, input, badge, skeleton, separator)
│   ├── landing/                  # Landing sections: hero, features,
│   │                             # how-it-works, cta, section-heading
│   ├── app/                      # App shell: app-shell, app-sidebar
│   ├── playlists/                # playlist-card, playlist-grid (+skeleton),
│   │                             # sortable-playlist-grid, delete-playlist-dialog
│   ├── watch/                    # watch-view (orchestrator) + watch-topbar,
│   │                             # now-playing (custom VideoPlayer), video-player,
│   │                             # playlist-overview, lesson-sidebar,
│   │                             # video-list (+ nested chapters), playlist-not-found,
│   │                             # watch-skeleton
│   ├── add-playlist-dialog.tsx   # Import-by-link/ID dialog + trigger button
│   ├── logo.tsx                  # FocusTube LogoMark (inline SVG)
│   ├── site-header.tsx           # Landing header
│   └── providers.tsx             # next-themes ThemeProvider
│
├── lib/
│   ├── types.ts                  # Playlist, PlaylistVideo, Thumbnail, Chapter
│   ├── chapters.ts               # Chapter parsing from descriptions + formatting
│   ├── youtube.ts                # Server-side YouTube Data API client (pagination)
│   └── utils.ts                  # cn() + parsePlaylistInput()
│
├── store/
│   ├── library.ts                # Zustand store: playlists, order, favorites,
│   │                             # recents (+ selectPlaylistList selector)
│   └── library.test.ts           # Ordering/persistence tests
│
├── hooks/
│   ├── use-video-player.ts       # YouTube IFrame API player state (custom chrome)
│   ├── use-watch-progress.ts     # Per-playlist watched tracking (localStorage)
│   └── use-watch-progress.test.tsx
│
├── public/                       # Static assets
├── components.json               # shadcn config (New York, zinc, CSS vars)
├── bunfig.toml                   # Bun test preload (jsdom setup)
└── test-setup.ts                 # jsdom globals for bun test
```

**Conventions**: one component per file, co-located tests (`*.test.ts(x)`), server components by default with `"use client"` only where interactivity/state demands it, and shared selectors (`selectPlaylistList`) consumed via `useShallow` to keep snapshots referentially stable.

---

## State & persistence

No backend, no accounts. Two browser-persisted slices:

| Key                                   | Owner                                  | Contents                                           |
| ------------------------------------- | -------------------------------------- | -------------------------------------------------- |
| `focustube-library`               | Zustand `persist` (`store/library.ts`) | `playlists`, manual `order`, `favorites`, `recent` |
| `focustube:progress:<playlistId>` | `use-watch-progress`                   | `watched[]`, `lastWatched`, `completedChapters[]`, `positions{}` per playlist |

Upgrading from Clean YouTube? Data stored under the old `clean-youtube-*` keys is adopted automatically on first load (and the old keys removed). Clearing site storage resets the app to a fresh state.

---

## Scripts

| Command         | Purpose                                 |
| --------------- | --------------------------------------- |
| `bun dev`       | Development server (Turbopack)          |
| `bun run build` | Production build                        |
| `bun start`     | Serve the production build              |
| `bun test`      | Unit/component tests (bun test + jsdom) |
| `bun run lint`  | Next.js lint                            |

---

## Design system

- **Brand**: FocusTube — honey-amber primary (`oklch(0.68 0.13 64)`) with deep warm-charcoal foreground, dusty-rose-free gradients, working in both light and dark themes. All brand color flows from `--primary` / `--ring` in `app/globals.css`.
- **Logo**: custom inline-SVG `LogoMark` (amber-gradient squircle + rounded charcoal play triangle), also served as the favicon via `app/icon.svg`. Two-tone wordmark: _Focus_ in foreground, _Tube_ in primary.
- **Primitives**: shadcn New York style, `zinc` base, CSS variables, `rounded-xl` radius. Icon-only buttons use `ghost` + `size="icon"`; destructive actions use the shared `DeletePlaylistButton` alert dialog.

---

## Testing

`bun test` runs the suite (jsdom preloaded via `bunfig.toml`):

- `store/library.test.ts` — ordering (prepend, dedupe, manual `setOrder`, storage round-trip, legacy fallback) and removal cleanup.
- `hooks/use-watch-progress.test.tsx` — mount-merge without wiping stored progress, the full _watch → next → refresh_ scenario, and toggle on/off persistence.
- `lib/chapters.test.ts` — chapter parsing from descriptions (both line orders, sorting, end-time chaining), timestamp formatting, description cleanup, memoization.
- `components/watch/video-list.test.tsx` — nested chapter lists: auto-expand of the active lesson, expand/collapse, in-place seek vs `?t=` deep links, current-chapter highlight.
- `components/watch/now-playing.test.tsx` — custom player chrome renders, chapters surface in the player menu, timestamp lines stripped from the description.

---

## Deployment

The app deploys as a standard Next.js app (e.g. Vercel):

1. Import the repository.
2. Set the `YOUTUBE_API_KEY` environment variable.
3. Build command `bun run build` (or `next build`), output served with `bun start`.

No database or additional services required.
