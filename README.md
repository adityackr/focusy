# Focusy

**Focusy turns YouTube videos and playlists into calm, course-style classrooms — no recommendations, no Shorts, no comments, no autoplay rabbit holes. Just the lessons you chose, in order.**

Paste a video link and Focusy splits it into chapter-based lessons using its timestamps, or paste a playlist link (or ID) and it imports every video — titles, thumbnails, order, channel info — then lets you watch it like a proper online course, with a collapsible lesson sidebar, per-video progress tracking, favorites, and recents. **Focusy Studio** adds a coding workspace to that experience, so you can follow a programming tutorial and practice its code without switching tabs. Library data, projects, and progress stay in your browser: no account, no tracking, no server-side watch history.

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
  - [Focusy Studio](#focusy-studio)
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
- **Backup & restore**: downloads everything in this browser (playlists, videos, folders, watch progress, timestamped Markdown notes, and Studio projects with their files and dependencies) as one `focusy-backup-YYYY-MM-DD.json`, and restores such a file, either **replacing** this browser's data or **merging** into it (new items are added, local ones are never removed, and the newest watch progress and notes win per note), with the file's contents previewed, the mode chosen and confirmed before anything changes. Backup format **version 3** carries per-video note buckets; version 1 and 2 files remain readable, with their legacy notes adopted as untimed notes on restore. The library page nudges you when new playlists or videos have landed since a backup that is already over a week old, or when the library has never been backed up at all. Older backups without Studio data remain compatible. The API key and player preferences are intentionally left out, since they're per-device settings. This is the no-server way to move data between browsers and devices (`shared/lib/backup.ts`).

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

### Smart learning notes (notes sheet + `/notes`)

- **Timestamped notes while watching.** Both playlist lessons and courses have a notes trigger that opens a right-side sheet (three-quarters width on desktop, full width on mobile); `Shift+N` opens it too. Saving stamps the note with the player's current video time.
- **Markdown and code.** Notes are written in a Tiptap editor with official Markdown support, so headings, lists, links, quotes and fenced code blocks survive a refresh and render in the notes panel, search results, and exported backups.
- **Jump back to the moment.** Timed notes link to `/watch/<playlistId>/<videoId>?t=<seconds>` or `/course/<courseId>?t=<seconds>`; untimed notes open the lesson from the start. A note can switch chapters because the course player resolves the timestamp exactly.
- **Search across the library.** `/notes` lists every note newest-edit-first, searches note Markdown plus lesson/playlist/course titles, filters by playlists or courses, and shows the source, timestamp, edited date and jump action. The sidebar shows a live notes count.
- **Storage and migration.** Notes live under `focustube:notes:v2:<videoId>` (one bucket per video, so a video keeps its notes wherever it appears). Legacy `focustube:note:<videoId>` entries are adopted once as untimed `legacy:<videoId>` notes; the old key is intentionally left in place so older builds and files keep reading it.

### Focusy Studio

- **Watch and practice together.** Every video, course, and playlist lesson gets a Studio launcher. It opens the workspace in a **full-size sheet**, keeping the player and lesson page intact behind it.
- **Monaco editor** with syntax highlighting, line numbers, bracket matching, find/replace, light/dark themes, editor font sizing, word wrap, and language detection for HTML, CSS, JavaScript, TypeScript, JSX, TSX, and JSON. The editor can expand to a distraction-free **full-screen mode**.
- **File explorer** for creating, switching, renaming, and deleting files and derived folders. Changes save automatically with debounced IndexedDB writes; an in-flight edit is flushed when switching files, projects, or lessons.
- **Live Sandpack preview** with runtime status, refresh/restart controls, and a console for runtime and compilation errors. Supported starters: HTML/CSS/JS, Vanilla JS, Vanilla TS, React JS, React TS, Express JS, and Express TS.
- **Project management** for creating, switching, renaming, deleting, and replacing a project's template. Template replacement warns before overwriting files. Explicit **New project** creates another project even when the current lesson already has one; ordinary lesson navigation still reuses saved projects instead of creating duplicates.
- **Linked workspaces**: standalone videos get a workspace, course chapters share the course workspace, and each playlist lesson keeps its own workspace. Every project restores its files, active file, and dependencies after a refresh or when you return to the lesson.
- **Package manager** for adding, updating, and removing public npm dependencies through Sandpack's `customSetup.dependencies`. Input is validated and dependency state is saved with the project.
- **Local-first persistence**: lightweight project metadata lives in Zustand/localStorage, while file contents and dependencies live in IndexedDB. Invalid or missing project data is reported without crashing the app.
- **Backup integration**: Studio projects, files, dependencies, and lesson associations are included in the existing Focusy backup/restore flow.
- **Runtime disclosure**: previews run through Sandpack's hosted bundler and public npm resolution, so network access is required and project source is processed by that external runtime. Studio is not offline and does not execute code in Focusy's application context. The runtime supports browser-oriented projects and public npm packages, not arbitrary Node.js, native binaries, or shell commands. Express projects run in Sandpack's Node environment; Express TS starts through a small JavaScript bootstrap that transpiles `index.ts` at startup. Next.js App Router is not included because Sandpack's bundled Next template is the older Pages Router.

### Cross-cutting

- **Dark / light mode** with system support (`next-themes`), honey-amber brand theme.
- **Toast feedback** (Sonner) for imports, deletes, and errors.
- **Loading skeletons** on Library, Recent, Favorites, sidebar, and watch pages — no flashing empty states.
- **Delete confirmations** everywhere via a shared alert dialog (no native `confirm()`).
- Fully **TypeScript**, fully **responsive**.
- **Installable PWA**: web app manifest (`app/manifest.ts`) with generated icon set, plus a hand-rolled service worker (`public/sw.js`) that cache-firsts the hashed `/_next/static` bundles, network-firsts navigations (offline fallback to the cached shell) and stale-while-revalidates thumbnails. Registered in production only via `ServiceWorkerRegister`. Playback/imports still need the network — that's YouTube, not the app.

---

## Tech stack

| Technology                                                       | Version              | Role                                                                                                             |
| ---------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [Next.js](https://nextjs.org/) (App Router)                      | 16                   | Framework, routing, image optimization                                                                           |
| [React](https://react.dev/)                                      | 19                   | UI                                                                                                               |
| [TypeScript](https://www.typescriptlang.org/)                    | 5                    | Type safety                                                                                                      |
| [Tailwind CSS](https://tailwindcss.com/)                         | 4 (CSS-first config) | Styling + `shadcn` theme tokens in `app/globals.css`                                                              |
| [shadcn/ui](https://ui.shadcn.com/) (New York)                   | vendored             | `button, card, dialog, alert-dialog, sheet, input, badge, skeleton, separator` in `shared/ui/`                    |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/)      | 0.57                 | Studio code editor (`@monaco-editor/react`)                                                                      |
| [Sandpack](https://sandpack.codesandbox.io/)                     | 2.20                 | Studio previews, compilation/runtime errors, and dependency resolution (`@codesandbox/sandpack-react`)           |
| IndexedDB                                                        | browser API          | Studio project files and dependencies; metadata stays in Zustand/localStorage                                     |
| [Zustand](https://zustand.docs.pmnd.rs/) + `persist`             | 5                    | Library and Studio metadata stores persisted to `localStorage`                                                   |
| [dnd-kit](https://dndkit.com/) (`core`, `sortable`, `utilities`) | 6 / 10               | Drag-and-drop playlist reordering                                                                                |
| [Lucide](https://lucide.dev/)                                    | —                    | Icons (including the custom `LogoMark` SVG in `features/shell/components/logo.tsx`)                              |
| [Sonner](https://sonner.emilkowal.ski/)                          | 1                    | Toasts                                                                                                           |
| [next-themes](https://github.com/pacocoursey/next-themes)        | 0.4                  | Dark/light mode                                                                                                  |
| [YouTube Data API v3](https://developers.google.com/youtube/v3)  | —                    | Playlist metadata + video lists (client-side, key entered in Settings)                                           |
| [Bun](https://bun.sh/)                                           | —                    | Package manager, runtime, and test runner                                                                        |
| Testing Library + jsdom                                          | dev-only             | Component/hook tests (`bun test`)                                                                                |

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

Open Studio (a lesson's "Open Studio" button)
  → sourceKeyForSource() links a project to a video, course, or playlist lesson
  → workspace metadata comes from Zustand/localStorage
  → files and dependencies come from IndexedDB
  → Monaco edits update workspace state → debounced IndexedDB save
  → Sandpack rebuilds the preview from the same files and dependencies
```

- **IDs accepted**: raw IDs (`PL…`), `youtube.com/playlist?list=…` / `watch?v=…&list=…`, `youtu.be/…?list=…`.
- **No server proxy**: both fetch paths run in the browser with the user's own key (entered in Settings); there is no env var and no API route.
- **Watch progress** (`features/playlists/hooks/use-watch-progress.ts`) stores `{ watched[], lastWatched, completedChapters[], positions{} }` per playlist in `localStorage`. Mutations go through a ref mirror so mount-time auto-marking can never clobber previously saved progress (this exact race is covered by a regression test). Playback position per video is reported by the player every ~5s, so reopening a lesson cues it where you left off — an explicit `?t=` deep link wins, and watching to the end drops the resume point.
- **Studio projects** are keyed by `sourceKeyForSource()` for videos, courses, and playlist lessons. A project's metadata is indexed in `localStorage`; its files and dependencies live in IndexedDB. The lesson route opens the workspace in a full-size sheet. Opening a lesson restores its project without creating a new one; using **New project** explicitly creates another project linked to the same lesson.

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
| `/notes`                        | Static + client | Search, filter and jump back to every note       |
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
│   │   ├── favorites/page.tsx    # → FavoritesView
│   │   └── notes/page.tsx        # → NotesView (features/notes)
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
│   ├── settings/                 # User-provided API key
│   │   ├── index.ts              # SettingsView
│   │   ├── components/           # settings-view (key form + tutorial)
│   │   └── lib/                  # actions-client (key test helper)
│   └── studio/                   # Watch-and-practice coding workspaces
│       ├── index.ts              # StudioLessonPanel and backup API
│       ├── components/           # workspace view, Monaco editor, file explorer,
│       │                         # Sandpack preview, console, package manager,
│       │                         # project toolbar/form, full-size lesson sheet
│       ├── hooks/                # workspace lifecycle/persistence, packages
│       ├── lib/                  # templates, file/path helpers, IndexedDB,
│       │                         # workspace validation, backup, Sandpack/Monaco
│       ├── store/                # workspace metadata + editor preferences
│       └── types/                # Studio types
│
├── shared/                       # Cross-feature infrastructure
│   ├── ui/                       # Dependency-free primitives (button, card,
│   │                             # dialog, alert-dialog, alert, input, textarea,
│   │                             # label, checkbox, progress, tabs, badge,
│   │                             # skeleton, separator, page-header, sheet)
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
- **Logo**: custom inline-SVG `LogoMark` (tide-blue gradient squircle + white stylized "F"), also served as the favicon via `app/icon.svg` and as the master artwork for the PWA icon set (`scripts/generate-pwa-icons.mjs`). Two-tone wordmark: _Focus_ in foreground, _y_ in primary.
- **Primitives**: dependency-free shadcn-style components (New York, `zinc` base, CSS variables, `rounded-xl` radius). Icon-only buttons use `ghost` + `size="icon"`; destructive actions use the shared `DeletePlaylistButton` / `DeleteCourseButton` alert dialogs.

---

## Testing

`bun test` runs the suite (jsdom preloaded via `bunfig.toml`):

- `shared/store/library.test.ts` — playlist + course ordering (prepend, dedupe, manual order, storage round-trip, legacy fallback), removal cleanup, favorites, and the Chapterly course migration.
- `features/playlists/hooks/use-watch-progress.test.tsx` — mount-merge without wiping stored progress, the full _watch → next → refresh_ scenario, and toggle on/off persistence.
- `shared/lib/chapters.test.ts` — chapter parsing from descriptions (both line orders, sorting, end-time chaining), timestamp formatting, description cleanup, memoization.
- `features/playlists/components/watch/video-list.test.tsx` — nested chapter lists: auto-expand of the active lesson, expand/collapse, in-place seek vs `?t=` deep links, current-chapter highlight.
- `features/playlists/components/watch/now-playing.test.tsx` — custom player chrome renders, chapters surface in the player menu, timestamp lines stripped from the description.
- `features/studio/lib/workspaces.test.ts` — project creation, linked-source reuse, explicit duplicate projects, rename/delete, template replacement, and IndexedDB round-trips.
- `features/studio/hooks/use-studio-workspace.test.tsx` — lesson restoration, switching sources without leaking files, flush-before-switch, rename/change/delete, and fallback to another project.
- `shared/lib/backup.test.ts` — backup v3 round-trips timestamped notes and sources, counts them in previews, adopts notes from v1/v2 files, replaces stale note buckets, and merges the newest copy per note.
- `features/notes/lib/note-search.test.ts` — note source/link inference, legacy-note lookup, full-text search and playlist/course filters.
- `features/notes/components/notes-view.test.tsx` — the `/notes` page renders search results, filters, empty states and exact jump links.
- `features/studio/lib/studio-backup.test.ts` — Studio backup collection and replace/merge restore, including multiple projects sharing one lesson.
- `features/studio/components/studio-lesson-panel.test.tsx` — the full-size sheet, first-visit form, closing without leaving the lesson, and restoring the right workspace per lesson.

---

## Deployment

The app deploys as a standard Next.js app (e.g. Vercel):

1. Import the repository.
2. No required environment variables — each user adds their own YouTube API key in the app under Settings. Set `NEXT_PUBLIC_SITE_URL` to your custom domain so canonical URLs, `sitemap.xml` and social cards point at it.
3. Build command `bun run build` (or `next build`), output served with `bun start`.

No database or additional services required. Studio previews use Sandpack's hosted bundler and public npm resolution, so they need network access and are not described as offline; self-hosting that runtime is outside the current scope.
