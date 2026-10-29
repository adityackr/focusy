# Focusy

**Focusy turns YouTube videos and playlists into calm, course-style classrooms — no recommendations, no Shorts, no comments, no autoplay rabbit holes. Just the lessons you chose, in order.**

Paste a video link and Focusy splits it into chapter-based lessons using its timestamps, or paste a playlist link (or ID) and it imports every video — titles, thumbnails, order, channel info — then lets you watch it like a proper online course, with a collapsible lesson sidebar, per-video progress tracking, favorites, and recents. Everything lives in your browser: no account, no tracking, no server-side watch history.

---

## Table of contents

- [Focusy](#focusy)
  - [Table of contents](#table-of-contents)
  - [Why this exists](#why-this-exists)
  - [Features](#features)
  - [Landing page (`/`)](#landing-page-)
  - [Library (`/library`), Recent (`/recent`), Favorites (`/favorites`)](#library-library-recent-recent-favorites-favorites)
  - [Adding videos (`/add`) — from the Chapterly app](#adding-videos-add--from-the-chapterly-app)
  - [Settings (`/settings`) — user-provided API key](#settings-settings--user-provided-api-key)
  - [App sidebar](#app-sidebar)
  - [Watch pages (`/watch/[playlistId]`, `/watch/[playlistId]/[videoId]`)](#watch-pages-watchplaylistid-watchplaylistidvideoid)
  - [Course pages (`/course/[id]`) — the Chapterly player, exact port](#course-pages-courseid--the-chapterly-player-exact-port)
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
  - [Scripts](#scripts)
  - [Design system](#design-system)
  - [Testing](#testing)
  - [Deployment](#deployment)

---

## Why this exists

YouTube's watch page is engineered to keep you watching — recommended videos, Shorts, comments, autoplay. That's the opposite of what you want when you're working through a tutorial series, a lecture playlist, or a course someone shared with you.

Focusy solves exactly one problem: **watch YouTube start-to-finish without getting sidetracked.** It behaves like the video player on a course platform (Udemy, Coursera): one focused player, one clean lesson list, progress tracking, nothing else.

---

## Features

### Landing page (`/`)

Marketing-style homepage with a hero (live-feel classroom mock), stats, feature grid, a two-card "two ways to learn" spotlight (video→course vs playlist→classroom), 3-step "how it works", an FAQ, and a call-to-action panel with footer links — all in small section components under `features/landing/components/`.

### Library (`/library`), Recent (`/recent`), Favorites (`/favorites`)

- **Two tabs on every page — Videos and Playlists** — each with its own grid, counts, and empty state.
- Playlist grid: channel, lesson count, and hover play overlay.
- **Drag-and-drop reordering** via a grip handle on each card (mouse, touch, and keyboard accessible). The order persists across reloads and is mirrored in the sidebar.
- Video cards show lesson count, per-course progress (`done/lessons`, %), favorite and delete actions (delete always confirms through a shared alert dialog).
- Add playlists through a dialog that accepts a raw playlist ID, a `youtube.com` URL, or a `youtu.be` URL; add videos through the Add video page.
- Favorite (heart) and delete actions per card on both tabs.

### Adding videos (`/add`) — from the Chapterly app

- Paste any YouTube URL (`watch`, `youtu.be`, Shorts, embed, `/live/`) or raw 11-character video ID.
- **Auto-fetch chapters**: with a key set in Settings, the title, thumbnail, description and duration are fetched and every timestamp is parsed into lessons.
- **Manual mode**: skip the API entirely and paste the chapter list yourself (`00:00 Intro` — works with zero setup).
- Tolerant timestamp parser, chapter warnings (< 3 chapters, first not at `00:00`), live lesson preview, then **Save as course →**.

### Settings (`/settings`) — user-provided API key

- **No API key lives in env vars or on the server.** The key is entered in the app, stored only in that browser's `localStorage`, and used directly from the client against the YouTube Data API.
- Step-by-step tutorial with links (Cloud Console → enable API → create key → restrict → paste), a **Test key** button, and quota notes.

### App sidebar

Available on Library / Recent / Favorites. Collapses to a slim icon rail, works as a slide-in drawer on mobile, and contains:

- Navigation (Library, Recent, Favorites with a combined count badge, Settings).
- Two CTAs: **Add video** (opens `/add`) and **Playlist** (opens the import dialog).
- A **Videos / Playlists toggle** above the list — search and the list itself switch between the two content types.
- Rows in your manual order (titles, thumbnails, lesson counts), each opening its player, with hover-reveal favorite/delete actions (rendered as a floating chip so rows stay compact).
- Skeleton rows while the library is loading.

### Watch pages (`/watch/[playlistId]`, `/watch/[playlistId]/[videoId]`)

- **Playlist overview**: cinematic hero with thumbnail, lesson count, description, and a "Start watching" button.
- **Custom course player** (ported from the chapterly app): a chrome over the YouTube IFrame API with native controls hidden — segmented seekbar with chapter dividers, hover preview (thumbnail + time + chapter), floating now-playing chip, keyboard shortcuts (Space/K, J/L, arrows, M, C, F), speed/quality/captions menus, and fullscreen. Lesson counter, completion badge, "Next lesson" button, title and description around it.
- **Nested chapters in the lesson sidebar**: videos whose description contains YouTube timestamps (`00:00 Intro`) get a collapsible chapter list nested right under the lesson row — click a chapter to seek inside the current video, or jump straight to another lesson deep-linked at that timestamp (`?t=`). The chapter currently playing is highlighted; lesson search matches chapter titles too.
- **Collapsible lesson sidebar**: progress bar, lesson search, per-lesson watched toggles, active-lesson highlight. Collapses to a single "Show N lessons" button on desktop; a full list below the player on mobile.
- **Watch progress**: opening a video marks it watched; checkmarks toggle manually. Progress survives refreshes (stored per playlist in `localStorage`).
- Opening a shared `/watch/…` link for a playlist you don't have yet **auto-imports** it.
- Loading skeletons for both the hydrating and importing states; a proper not-found card otherwise.

### Course pages (`/course/[id]`) — the Chapterly player, exact port

- **Segment playback**: lessons are virtual chapters — each plays only its own segment of one YouTube video, with chapter-end enforcement and optional auto-advance.
- **Custom chrome** (`features/videos/components/player/video-player.tsx`): native controls hidden; segmented seekbar with chapter dividers, hover preview (thumbnail + time + chapter), now-playing chip, ±10s nudges, prev/next chapter, speed menu (real available rates), captions toggle, fullscreen, auto-hiding controls, keyboard shortcuts (`Space`/`K`, `J`/`L`, `←`/`→`, `↑`/`↓`, `M`, `C`, `F`).
- **Progress & resume** with the exact Chapterly rules: forward jumps auto-complete skipped lessons, backward never does, scrubbing follows you, and resume points are dropped once a lesson completes.
- **Lesson editor**: rename, retime, add, delete, reorder chapters (with derived end times).
- Footer with `auto-advance` toggle, overall `%`, and the cleaned video description (timestamp lines stripped, links auto-linked).
- Chapterly's progress and sidebar state keys (`yt-course:*`) are kept so existing Chapterly users keep their data after the merge.

### Cross-cutting

- **Dark / light mode** with system support (`next-themes`), honey-amber brand theme.
- **Toast feedback** (Sonner) for imports, deletes, and errors.
- **Loading skeletons** on Library, Recent, Favorites, sidebar, and watch pages — no flashing empty states.
- **Delete confirmations** everywhere via a shared alert dialog (no native `confirm()`).
- Fully **TypeScript**, fully **responsive**.
- **Installable PWA**: web app manifest (`app/manifest.ts`) with generated icon set, plus a hand-rolled service worker (`public/sw.js`) that cache-firsts the hashed `/_next/static` bundles, network-firsts navigations (offline fallback to the cached shell) and stale-while-revalidates thumbnails. Registered in production only via `ServiceWorkerRegister`. Playback/imports still need the network — that's YouTube, not the app.

---

## Tech stack

| Technology                                                       | Version              | Role                                                                                    |
| ---------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------- | --- | --------------------------------------------------------------- | --- | ---------------------------------------------------------------------- |
| [Next.js](https://nextjs.org/) (App Router)                      | 16                   | Framework, routing, API routes, image optimization                                      |
| [React](https://react.dev/)                                      | 19                   | UI                                                                                      |
| [TypeScript](https://www.typescriptlang.org/)                    | 5                    | Type safety                                                                             |
| [Tailwind CSS](https://tailwindcss.com/)                         | 4 (CSS-first config) | Styling + `shadcn` theme tokens in `app/globals.css`                                    |
| [shadcn/ui](https://ui.shadcn.com/) (New York)                   | vendored             | `button, card, dialog, alert-dialog, input, badge, skeleton, separator` in `shared/ui/` |
| [Zustand](https://zustand.docs.pmnd.rs/) + `persist`             | 5                    | Client store (library, order, favorites, recents) persisted to `localStorage`           |
| [dnd-kit](https://dndkit.com/) (`core`, `sortable`, `utilities`) | 6 / 10               | Drag-and-drop playlist reordering                                                       |
| [Lucide](https://lucide.dev/)                                    | —                    | Icons (including the custom `LogoMark` SVG in `features/shell/components/logo.tsx`)     |
| [Sonner](https://sonner.emilkowal.ski/)                          | 1                    | Toasts                                                                                  |
| [next-themes](https://github.com/pacocoursey/next-themes)        | 0.4                  | Dark/light mode                                                                         |
| [Bun](https://bun.sh/)                                           | —                    | Package manager, runtime, and test runner                                               |
| Testing Library + jsdom                                          | dev-only             | Component/hook tests (`bun test`)                                                       |     | [YouTube Data API v3](https://developers.google.com/youtube/v3) | —   | Playlist metadata + video lists (client-side, key entered in Settings) |

---

## Getting started

### Prerequisites

- [Bun](https://bun.sh/) installed.

### 1. Clone

```sh
git clone https://github.com/adityackr/focustube.git
cd focustube
```

### 2. Configure environment

None required — the app runs out of the box. Two optional values:

- **`NEXT_PUBLIC_SITE_URL`** — the production origin used for SEO ( `metadataBase`, canonical URLs, `sitemap.xml`, `robots.txt`, OpenGraph links). Defaults to the deployed Vercel domain; set it when you attach a custom domain.
- The YouTube Data API v3 key is entered by the user in the app under **Settings** (`/settings`) and stored only in that browser's `localStorage` — never in env vars.

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
Add a video (/add)
  → parseVideoId() extracts the 11-char ID
  → shared/lib/youtube.ts fetchVideoMeta() uses the key from Settings
      (localStorage) against /videos?part=snippet,contentDetails
  → parseChapters(description, duration) turns timestamps into lessons
  → course saved in the Zustand library store → persisted to localStorage
  → course player opens at /course/[id]

Add a playlist (dialog)
  → shared/lib/utils.ts `parsePlaylistInput()` extracts the playlist ID
  → store `fetchPlaylist()` reads the key from Settings (localStorage)
  → shared/lib/youtube.ts fetchPlaylistFromYouTube() uses
      /playlists (metadata) + /playlistItems (all pages), client-side
  → playlist saved to Zustand store → persisted to localStorage
  → classroom opens at /watch/[playlistId]
```

- **IDs accepted**: raw IDs (`PL…`), `youtube.com/playlist?list=…` / `watch?v=…&list=…`, `youtu.be/…?list=…`.
- **No server proxy**: both fetch paths run in the browser with the user's own key (entered in Settings); there is no env var and no API route.
- **Watch progress** (`features/playlists/hooks/use-watch-progress.ts`) stores `{ watched[], lastWatched, completedChapters[], positions{} }` per playlist in `localStorage`. Mutations go through a ref mirror so mount-time auto-marking can never clobber previously saved progress (this exact race is covered by a regression test). Playback position per video is reported by the player every ~5s, so reopening a lesson cues it where you left off — an explicit `?t=` deep link wins, and watching to the end drops the resume point.

---

## Routes

| Route                           | Type            | Description                                      |
| ------------------------------- | --------------- | ------------------------------------------------ |
| `/`                             | Static          | Landing page (hero, features, how-it-works, CTA) |
| `/robots.txt`                   | Static          | Crawler rules (`app/robots.ts`) — app-local routes are disallowed |
| `/sitemap.xml`                  | Static          | Indexable routes only (`app/sitemap.ts`)         |
| `/opengraph-image`, `/twitter-image` | Static      | Generated 1200×630 social cards (`next/og`)      |
| `/library`                      | Static + client | Videos + Playlists tabs, drag-to-reorder grids   |
| `/recent`                       | Static + client | Last opened videos & playlists (up to 12 each)   |
| `/favorites`                    | Static + client | Pinned videos & playlists                        |
| `/add`                          | Static + client | Add a video: fetch chapters or paste manually    |
| `/settings`                     | Static + client | User-provided YouTube API key + tutorial         |
| `/course/[id]`                  | Dynamic         | Chapter-based course player (Chapterly port)     |
| `/watch/[playlistId]`           | Dynamic         | Playlist overview + lesson list                  |
| `/watch/[playlistId]/[videoId]` | Dynamic         | Focused player + lesson sidebar                  |

`/library`, `/recent`, `/favorites` share the `(app)` route group layout with the collapsible sidebar. The watch, course, add and settings routes use a minimal top-bar layout.

---

## Project structure

Feature-Driven Development (FDD): `app/` holds **thin routes only** (metadata + layout shells); every feature lives in `features/<name>/` behind a public `index.ts` barrel; cross-cutting code lives in `shared/`. Features only import from `@/features/<other>` barrels and `@/shared/*` — never from another feature's internals — so a new feature can be added (or removed) without breaking anything.

```
├── app/                          # Next.js App Router — thin routes only
│   ├── page.tsx                  # → LandingPage (features/landing)
│   ├── layout.tsx                # Root layout: fonts, theme, toaster, metadata
│   ├── globals.css               # Tailwind v4 + Tide theme tokens
│   ├── icon.svg                  # Favicon (App Router file convention)
│   ├── not-found.tsx             # Global 404
│   ├── (app)/                    # Route group: pages with the app sidebar
│   │   ├── layout.tsx            # → AppShell (features/shell)
│   │   ├── library/page.tsx      # → LibraryView (features/library)
│   │   ├── recent/page.tsx       # → RecentView
│   │   └── favorites/page.tsx    # → FavoritesView
│   ├── add/                      # /add → AddVideoView (features/videos)
│   ├── settings/                 # /settings → SettingsView (features/settings)
│   ├── course/[id]/              # → CoursePlayerView (features/videos)
│   └── watch/                    # → WatchView (features/playlists)
│
├── features/
│   ├── shell/                    # App chrome
│   │   ├── index.ts              # AppShell, TopBar, SiteHeader, LogoMark
│   │   └── components/           # app-shell, app-sidebar, top-bar,
│   │                             # site-header, logo
│   ├── landing/                  # Marketing page
│   │   ├── index.ts              # LandingPage
│   │   └── components/           # landing-page (composer), hero, features,
│   │                             # spotlight, how-it-works, faq, cta,
│   │                             # section-heading, reveal
│   ├── library/                  # /library /recent /favorites (tabs over both
│   │   │                         # content types)
│   │   ├── index.ts              # LibraryView, RecentView, FavoritesView
│   │   └── components/           # library-view (+test), recent-view,
│   │                             # favorites-view
│   ├── playlists/                # Playlist domain: import, cards, classroom
│   │   ├── index.ts              # AddPlaylistButton/Dialog, PlaylistGrid,
│   │   │                         # SortablePlaylistGrid, PlaylistGridSkeleton,
│   │   │                         # DeletePlaylistButton, WatchView
│   │   ├── components/           # add-playlist-dialog, playlist-card,
│   │   │                         # playlist-grid, playlist-grid-skeleton,
│   │   │                         # sortable-playlist-grid, delete-playlist-dialog
│   │   ├── components/watch/     # watch-view, watch-topbar, now-playing (+test),
│   │   │                         # video-player, playlist-overview,
│   │   │                         # lesson-sidebar, video-list (+test),
│   │   │                         # playlist-not-found, watch-skeleton
│   │   └── hooks/                # use-video-player (whole-video chrome),
│   │                             # use-watch-progress (+test)
│   ├── videos/                   # Video→course domain (Chapterly port)
│   │   ├── index.ts              # AddVideoView, CoursePlayerView, CourseCard,
│   │   │                         # CourseGrid, SortableCourseGrid, DeleteCourseButton
│   │   ├── components/           # course-card, course-grid,
│   │   │                         # sortable-course-grid, delete-course-dialog
│   │   ├── components/add/       # add-video-view (fetch/manual chapter flow)
│   │   ├── components/player/    # course-player-view, player-section,
│   │   │                         # lessons-sidebar, course-footer, skeleton,
│   │   │                         # not-found, video-player (segment chrome),
│   │   │                         # chapter-sidebar, chapter-editor
│   │   └── hooks/                # use-add-video, use-course-player,
│   │                             # use-video-player (segment-aware),
│   │                             # use-chapter-editor
│   └── settings/                 # User-provided API key
│       ├── index.ts              # SettingsView
│       ├── components/           # settings-view (key form + tutorial)
│       └── lib/                  # actions-client (key test helper)
│
├── shared/                       # Cross-feature infrastructure
│   ├── ui/                       # Dependency-free primitives (button, card,
│   │                             # dialog, alert-dialog, alert, input, textarea,
│   │                             # label, checkbox, progress, tabs, badge,
│   │                             # skeleton, separator, page-header)
│   ├── components/               # video-description (rich, linkified — used
│   │                             # by both watch features)
│   ├── player/                   # iframe-api (one loader + YTPlayer type),
│   │                             # chrome (ChromeButton/MenuCard/MenuItem/Kbd),
│   │                             # chapter-at (chapterAtTime/clamp01)
│   ├── lib/                      # types, chapters (+test), youtube, storage,
│   │                             # utils
│   ├── store/                    # library.ts — Zustand store: playlists +
│   │                             # courses, orders, favorites, recents
│   │                             # (+test, migrations)
│   └── providers.tsx             # next-themes ThemeProvider
│
├── public/                       # Static assets
├── components.json               # shadcn config (New York, zinc, CSS vars)
├── bunfig.toml                   # Bun test preload (jsdom setup)
└── test-setup.ts                 # jsdom globals for bun test
```

**Conventions**: routes in `app/` are one-liner delegations; each feature exposes exactly one `index.ts` public API; one component per file (kebab-case); co-located tests (`*.test.ts(x)`); server components by default with `"use client"` only where interactivity/state demands it; shared selectors (`selectPlaylistList`, `selectCourseList`) consumed via `useShallow`. To add a feature: create `features/<name>/{index.ts,components,hooks,lib}`, add thin routes under `app/`, and import only through the barrel — nothing else changes.

---

## Scripts

| Command         | Purpose                                                                            |
| --------------- | ---------------------------------------------------------------------------------- |
| `bun dev`       | Development server (Turbopack)                                                     |
| `bun run build` | Production build                                                                   |
| `bun start`     | Serve the production build                                                         |
| `bun test`      | Unit/component tests (bun test + jsdom)                                            |
| `bun scripts/generate-pwa-icons.mjs` | Regenerate `public/icons/*.png` from `app/icon.svg` (needs `sharp`) |
| `bun run lint`  | Lint (note: `next lint` was removed in Next 16 — no ESLint config is wired up yet) |

---

## Design system

- **Brand**: Focusy — **Tide** theme: deep-blue primary (`oklch(0.55 0.2 262)`, ≈ `#3E5CEB`) over cool foam-white surfaces in light mode and deep-navy ocean surfaces in dark mode. All brand color flows from `--primary` / `--ring` in `app/globals.css`.
- **Logo**: custom inline-SVG `LogoMark` (tide-blue gradient squircle + white play triangle), also served as the favicon via `app/icon.svg` and as the master artwork for the PWA icon set (`scripts/generate-pwa-icons.mjs`). Two-tone wordmark: _Focus_ in foreground, _y_ in primary.
- **Primitives**: dependency-free shadcn-style components (New York, `zinc` base, CSS variables, `rounded-xl` radius). Icon-only buttons use `ghost` + `size="icon"`; destructive actions use the shared `DeletePlaylistButton` / `DeleteCourseButton` alert dialogs.

---

## Testing

`bun test` runs the suite (jsdom preloaded via `bunfig.toml`):

- `shared/store/library.test.ts` — playlist + course ordering (prepend, dedupe, manual order, storage round-trip, legacy fallback), removal cleanup, favorites, and the Chapterly course migration.
- `features/playlists/hooks/use-watch-progress.test.tsx` — mount-merge without wiping stored progress, the full _watch → next → refresh_ scenario, and toggle on/off persistence.
- `shared/lib/chapters.test.ts` — chapter parsing from descriptions (both line orders, sorting, end-time chaining), timestamp formatting, description cleanup, memoization.
- `features/playlists/components/watch/video-list.test.tsx` — nested chapter lists: auto-expand of the active lesson, expand/collapse, in-place seek vs `?t=` deep links, current-chapter highlight.
- `features/playlists/components/watch/now-playing.test.tsx` — custom player chrome renders, chapters surface in the player menu, timestamp lines stripped from the description.

---

## Deployment

The app deploys as a standard Next.js app (e.g. Vercel):

1. Import the repository.
2. No required environment variables — each user adds their own YouTube API key in the app under Settings. Set `NEXT_PUBLIC_SITE_URL` to your custom domain so canonical URLs, `sitemap.xml` and social cards point at it.
3. Build command `bun run build` (or `next build`), output served with `bun start`.

No database or additional services required.
