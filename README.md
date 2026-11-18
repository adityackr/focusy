# Focusy

**Focusy turns YouTube videos and playlists into calm, course-style classrooms — no recommendations, no Shorts, no comments, no autoplay rabbit holes. Just the lessons you chose, in order.**

Paste a video link and Focusy splits it into chapter-based lessons using its timestamps, or paste a playlist link (or ID) and it imports every video — titles, thumbnails, order, channel info — then lets you watch it like a proper online course, with a collapsible lesson sidebar, per-video progress tracking, favorites, and recents. Save links you're not ready for in the **Learning Inbox**, bookmark exact moments while watching, attach PDFs, reference links, code snippets or downloads to a course or lesson, and get optional local reminders for unfinished lessons and daily goals. **Focusy Studio** adds a coding workspace to that experience, so you can follow a programming tutorial and practice its code without switching tabs. Library data, projects, progress, notes, bookmarks, attachments and saved links stay in your browser: no account, no tracking, no server-side watch history.

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
  - [Global search](#global-search)
  - [Player pages (`/watch/[id]`, `/watch/[id]/[videoId]`)](#player-pages-watchid-watchidvideoid)
  - [Course playback on `/watch/[id]` — the Chapterly player, exact port](#course-playback-on-watchid--the-chapterly-player-exact-port)
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

Marketing-style homepage with a hero (live-feel classroom mock), stats, feature grid, a learning-toolkit section (notes, inbox, analytics, reminders, certificates and course attachments), a two-card "two ways to learn" spotlight (video→course vs playlist→classroom), 3-step "how it works", an FAQ, and a call-to-action panel with footer links — all in small section components under `features/landing/components/`.

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
- **Backup & restore**: downloads everything in this browser (playlists, videos, folders, watch progress, timestamped Markdown notes, Studio projects with their files and dependencies, learning history, saved inbox links, timestamped lesson bookmarks, course and lesson attachments with their uploaded files, saved certificates — including certificates whose course or playlist was deleted — and the certificate name) as one `focusy-backup-YYYY-MM-DD.json`, and restores such a file, either **replacing** this browser's data or **merging** into it (new items are added, local ones are never removed, and the newest watch progress and notes win per note), with the file's contents previewed, the mode chosen and confirmed before anything changes. Backup format **version 3** carries per-video note buckets and an optional `resources` section (attachments with base64 file contents); version 1 and 2 files remain readable, with their legacy notes adopted as untimed notes on restore. The library page nudges you daily when new playlists, videos, Studio projects or attachments have landed since a backup taken at least a day ago, or when the library has never been backed up at all. Older backups without Studio, attachment or archived-certificate data remain compatible; restoring one leaves the local attachments and archived certificates it does not mention untouched. The API key, player preferences and reminder settings are intentionally left out, since they're per-device settings. This is the no-server way to move data between browsers and devices (`shared/lib/backup.ts`).
- **Learning reminders** and **data & storage**: optional browser notifications and a read-only storage/backup dashboard, both described below under Features.

### App sidebar

Available on every sidebar page (the `(app)` route group). Collapses to a slim icon rail, works as a slide-in drawer on mobile, remembers whether you left it expanded or collapsed, and contains:

- Navigation (Library, Inbox, Recent, Notes, Bookmarks, Analytics, Certificates, Categories, Favorites and Settings), with live count badges for the inbox, notes, bookmarks and favorites.
- Two CTAs: **Add video** (opens `/add`) and **Playlist** (opens the import dialog).
- A **Search everything** button (also `⌘K` / `Ctrl+K`) that opens global search from any page.
- A **Videos / Playlists toggle** above the list — search and the list itself switch between the two content types. This filter is separate from global search and only narrows the sidebar list.
- Rows in your manual order (titles, thumbnails, lesson counts), each opening its player, with hover-reveal favorite/delete actions (rendered as a floating chip so rows stay compact).
- Skeleton rows while the library is loading.

### Global search

One command palette for the whole library — no dedicated route.

- **Open it anywhere** with `⌘K` / `Ctrl+K` or the sidebar trigger. It is mounted once in the app shell, so every page (and the mobile drawer) can reach it.
- **Searches all six content types at once**: saved videos (courses), playlists, lessons (course chapters and playlist videos), note text plus lesson metadata, course/playlist bookmarks, and Studio projects.
- Every search word must match somewhere, and exact/prefix title hits rank first. Results are grouped, with a per-group cap and a full match count so one big category cannot bury the others.
- **Keyboard-first**: type to search, `↑` / `↓` to move, `↵` to open, `Esc` to close. Mouse and touch work too.
- Links go straight to the right spot: chapters jump with `?t=`, playlist lessons open `/watch/<id>/<videoId>`, notes keep their recorded lesson/timestamp, and Studio projects open the lesson where they're linked. Standalone projects (no associated lesson) are shown but not navigable.
- Matching/ranking is pure and tested (`features/search/lib/global-search.ts`), independent of the dialog and storage.

### Player pages (`/watch/[id]`, `/watch/[id]/[videoId]`)

Videos and playlists now share one `/watch` entry point. A saved course and a playlist are both keyed by id, so `/watch/<id>` picks the course player or the playlist overview from your library; `/watch/<id>/<videoId>` opens a playlist lesson directly. Old `/course/<id>` links redirect to `/watch/<id>` with the timestamp intact.

- **Playlist overview**: cinematic hero with thumbnail, lesson count, description, and a "Start watching" button.
- **Custom course player** (ported from the chapterly app): a chrome over the YouTube IFrame API with native controls hidden — segmented seekbar with chapter dividers, hover preview (thumbnail + time + chapter), floating now-playing chip, keyboard shortcuts (Space/K, J/L, arrows, M, C, F), speed/quality/captions menus, and fullscreen. Lesson counter, completion badge, "Next lesson" button, title and description around it.
- **Nested chapters in the lesson sidebar**: videos whose description contains YouTube timestamps (`00:00 Intro`) get a collapsible chapter list nested right under the lesson row — click a chapter to seek inside the current video, or jump straight to another lesson deep-linked at that timestamp (`?t=`). The chapter currently playing is highlighted; lesson search matches chapter titles too.
- **Collapsible lesson sidebar**: progress bar, lesson search, per-lesson watched toggles, active-lesson highlight. Collapses to a single "Show N lessons" button on desktop; a full list below the player on mobile. Its expanded/collapsed choice is saved in `localStorage` and survives navigation and reloads.
- **Watch progress**: opening a video marks it watched; checkmarks toggle manually. Progress survives refreshes (stored per playlist in `localStorage`).
- Opening a shared `/watch/…` link for a playlist you don't have yet **auto-imports** it.
- Loading skeletons for both the hydrating and importing states; a proper not-found card otherwise.

### Course playback on `/watch/[id]` — the Chapterly player, exact port

- **One player route.** Courses and playlists share `/watch/<id>`; old `/course/<id>` player links redirect there, keeping `?t=` deep links working for existing notes, bookmarks and shares. Course certificates still live at `/course/<id>/certificate`.
- **Segment playback**: lessons are virtual chapters — each plays only its own segment of one YouTube video, with chapter-end enforcement and optional auto-advance.
- **Custom chrome** (`features/videos/components/player/video-player.tsx`): native controls hidden; segmented seekbar with chapter dividers, hover preview (thumbnail + time + chapter), now-playing chip, ±10s nudges, prev/next chapter, speed menu (real available rates), captions toggle, fullscreen, auto-hiding controls, keyboard shortcuts (`Space`/`K`, `J`/`L`, `←`/`→`, `↑`/`↓`, `M`, `C`, `F`).
- **Progress & resume** with the exact Chapterly rules: forward jumps auto-complete skipped lessons, backward never does, scrubbing follows you, and resume points are dropped once a lesson completes.
- **Lesson editor**: rename, retime, add, delete, reorder chapters (with derived end times).
- Footer with `auto-advance` toggle, overall `%`, and the cleaned video description (timestamp lines stripped, links auto-linked).
- **Completion certificates.** Finishing every lesson unlocks a certificate from the course footer or its library card, with the course, optional locally saved name, lesson total, completion date and a stable local reference. Download landscape or portrait PNGs (SVG fallback), print cleanly, or save a PDF through the browser dialog; nothing is uploaded or publicly verified. The `/certificates` gallery lists every completed course, and the chosen name is included in backups and their contents preview.
- Chapterly's progress and sidebar state keys (`yt-course:*`) are kept so existing Chapterly users keep their data after the merge.

### Smart learning notes (notes sheet + `/notes`)

- **Timestamped notes while watching.** Both playlist lessons and courses have a notes trigger that opens a right-side sheet (three-quarters width on desktop, full width on mobile); `Shift+N` opens it too. Saving stamps the note with the player's current video time.
- **Markdown and code.** Notes are written in a Tiptap editor with official Markdown support, so headings, lists, links, quotes and fenced code blocks survive a refresh and render in the notes panel, search results, and exported backups.
- **Jump back to the moment.** Timed notes link to `/watch/<playlistId>/<videoId>?t=<seconds>` or `/watch/<courseId>?t=<seconds>`; untimed notes open the lesson from the start. A note can switch chapters because the course player resolves the timestamp exactly.
- **Search across the library.** `/notes` lists every note newest-edit-first, searches note Markdown plus lesson/playlist/course titles, filters by playlists or courses, and shows the source, timestamp, edited date and jump action. The sidebar shows a live notes count.
- **Storage and migration.** Notes live under `focustube:notes:v2:<videoId>` (one bucket per video, so a video keeps its notes wherever it appears). Legacy `focustube:note:<videoId>` entries are adopted once as untimed `legacy:<videoId>` notes; the old key is intentionally left in place so older builds and files keep reading it.

### Learning analytics (`/analytics`)

- **A local, honest picture of your learning.** Four summary cards (total learning time, lessons completed, courses completed, current streak), a GitHub-style 12-month activity heatmap, and interactive 7-day → 12-month trends with period-over-period comparisons.
- **Actual activity, not visits.** A shared one-second tracker counts only running video playback, open-and-active Studio/notes sheets and note reviewing, never paused video or hidden tabs. Overlapping activities are attributed to one activity only. A study day needs 5 minutes of active learning.
- **Course progress and Studio practice.** Every saved video course and playlist shows completion and status, with filters and sorting, and links straight to its player. Studio reports projects, files, languages and coding sessions from the data it already stores.
- **Optional goals and subtle achievements.** Daily/weekly time, weekly lessons, monthly courses and Studio targets, plus six quiet milestone badges.
- **Continue learning and a timeline.** Resume the last lesson at its saved position, or jump back into the last Studio project; recent lesson, note, course and Studio events form a chronological timeline.
- **Everything stays in this browser.** History lives under `focusy-analytics:v1`, survives course deletion, is included in backups, and is validated defensively so corrupt or missing data never blocks the app.

### Learning inbox (`/inbox`)

- **Save a link without committing to the library.** Paste any YouTube URL or 11-character video ID; duplicates are rejected by video ID. The title and channel are fetched automatically — through your API key when one is set, otherwise YouTube's keyless oEmbed endpoint — and the title, tags and note can be edited before or after saving.
- **Tags and notes for triage.** Each link can carry up to 10 normalized tags and a short note, both editable later. Tag chips across the page filter the list, and search matches titles, channels, notes and tags (every query word must match).
- **To watch / Watched.** Status tabs with live counts; mark a link watched or move it back to the queue. Links open on YouTube in a new tab — the inbox is for deciding what to watch, not a second player.
- **Local and portable.** The sidebar shows the queued count, items live under `focusy-inbox:v1`, and inbox links are included in backups, restore and the backup preview (`features/inbox/`).

### Timestamped bookmarks (player + `/bookmarks`)

- **Bookmark the exact moment.** Both the playlist and course players have a **Bookmarks** button; saving captures the current playback second with a short description (up to 280 characters). No manual timestamp entry, no scrubbing.
- **Jump, edit, delete.** The in-player panel lists the lesson's bookmarks and seeks in place when you pick one; descriptions can be edited and deletion always confirms first. Each bookmark remembers its lesson source so it can reopen the right player.
- **A library of moments.** `/bookmarks` groups every bookmark by lesson, shows a course/playlist badge, searches descriptions and lesson titles, and deep-links each timestamp with `?t=` (or opens the lesson from the start). The sidebar carries a live bookmark count.
- **Local and portable.** Bookmarks live under `focusy-bookmarks:v1`, survive library changes (orphaned sources are shown but not navigable), and are included in backup/restore and the preview (`features/bookmarks/`).

### Course & lesson resources (player)

- **Everything the lesson needs, attached.** The course player has a **Resources** button beside Notes and Bookmarks. Add a PDF, reference link, code snippet, documentation page or downloadable file, and choose whether it belongs to the whole course or just the current lesson.
- **Read, open, download, delete.** The right-side panel groups course-wide and lesson attachments, opens links in a new tab, opens or downloads uploaded files, copies snippets, and confirms before deleting.
- **Local storage, split by size.** Metadata lives under `focusy-resources:v1`; uploaded file bytes live in IndexedDB (`focusy-resources` / `files`, keyed by resource id) so PDFs of a few MB fit. Uploads are capped at 25 MB and links must be HTTP(S).
- **Portable with your backup.** Attachments are embedded in the backup as an optional `resources` section with base64 file contents. Merge keeps local copies on id conflicts and adds only new resources; restoring an older backup without that section leaves local attachments untouched. Every restored file can be opened or downloaded again (`features/resources/`).

### Learning reminders

- **Optional, local browser notifications** for unfinished lessons and an unmet daily study goal. Nothing is pushed from a server and no account is needed; the card lives in Settings below Backup & restore (`features/reminders/`).
- **Pick a time and what to include.** Enable reminders, choose a local `HH:MM` time, and toggle **Unfinished lessons** (playlists and courses with lessons left, linking straight to the resume point) and **Today's study goal** (only while the Analytics daily-minute goal is unmet, linking to `/analytics`).
- **At most one per day.** While a Focusy tab is open, the reminder is checked every minute after the chosen time; it is delivered only when there is something worth saying, and the day is recorded after a successful notification. Closing every tab pauses reminders — there is no push subscription or background reminder service.
- **Honest permission UI.** The card requests notification permission when enabled, shows Allowed / Blocked / Not asked / Unsupported, explains how to unblock, and offers a test notification once allowed. These preferences are per-device and stay out of backups.

### Data storage manager

- **See what Focusy is using.** The Settings card reports origin storage usage against the browser quota from `navigator.storage.estimate()`, with a usage bar, percent and persistent-storage status (`features/settings/lib/storage-usage.ts`).
- **localStorage by feature.** A key/byte breakdown for Library, watch progress, notes, bookmarks, course attachments, inbox, analytics, Studio metadata, preferences/API key, backup metadata and unrecognized keys — no values are displayed.
- **IndexedDB usage.** Enumerates databases with `indexedDB.databases()` and reports each database's stores, record counts and approximate bytes, including the `focusy-studio` workspace contents and uploaded course attachments in `focusy-resources`. Browsers that don't expose per-database sizes say so instead of guessing.
- **Backup status and refresh.** Compares the last recorded backup (`focustube:last-backup`) with the current library item count to show *Nothing saved yet*, *No backup yet*, *No new items* or *N new items*, plus the backup age and exact time. Everything is read-only, measured on mount and refreshable in place.

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
| IndexedDB                                                        | browser API          | Studio project files/dependencies and uploaded course attachments; metadata stays in localStorage                 |
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
  → course player opens at /watch/[id]

Add a playlist (dialog)
  → shared/lib/utils.ts `parsePlaylistInput()` extracts the playlist ID
  → store `fetchPlaylist()` reads the key from Settings (localStorage)
  → shared/lib/youtube.ts fetchPlaylistFromYouTube() uses
      /playlists (metadata) + /playlistItems (all pages), client-side
  → playlist saved to Zustand store → persisted to localStorage
  → classroom opens at /watch/[id]

Open Studio (a lesson's "Open Studio" button)
  → sourceKeyForSource() links a project to a video, course, or playlist lesson
  → workspace metadata comes from Zustand/localStorage
  → files and dependencies come from IndexedDB
  → Monaco edits update workspace state → debounced IndexedDB save
  → Sandpack rebuilds the preview from the same files and dependencies

Attach a course resource (player → Resources)
  → metadata saved to localStorage under focusy-resources:v1
  → uploaded PDFs/downloads saved as ArrayBuffers in IndexedDB
      (focusy-resources / files, keyed by resource id)
  → backup export base64-encodes each file into the optional resources section
  → restore rebuilds both the metadata and the IndexedDB file records
```

- **IDs accepted**: raw IDs (`PL…`), `youtube.com/playlist?list=…` / `watch?v=…&list=…`, `youtu.be/…?list=…`.
- **No server proxy**: both fetch paths run in the browser with the user's own key (entered in Settings); there is no env var and no API route.
- **Watch progress** (`features/playlists/hooks/use-watch-progress.ts`) stores `{ watched[], lastWatched, completedChapters[], positions{} }` per playlist in `localStorage`. Mutations go through a ref mirror so mount-time auto-marking can never clobber previously saved progress (this exact race is covered by a regression test). Playback position per video is reported by the player every ~5s, so reopening a lesson cues it where you left off — an explicit `?t=` deep link wins, and watching to the end drops the resume point.
- **Studio projects** are keyed by `sourceKeyForSource()` for videos, courses, and playlist lessons. A project's metadata is indexed in `localStorage`; its files and dependencies live in IndexedDB. The lesson route opens the workspace in a full-size sheet. Opening a lesson restores its project without creating a new one; using **New project** explicitly creates another project linked to the same lesson.
- **Course resources** are split the same way: small metadata (kind, scope, title, description, link or snippet) lives in `localStorage`, while uploaded file bytes live in IndexedDB keyed by resource id. A resource belongs to a course and may also point at one lesson (`chapterId`). Deleting a resource removes both records, and restore validates every entry before writing.

---

## Routes

| Route                           | Type            | Description                                      |
| ------------------------------- | --------------- | ------------------------------------------------ |
| `/`                             | Static          | Landing page (hero, features, how-it-works, CTA) |
| `/robots.txt`                   | Static          | Crawler rules (`app/robots.ts`) — app-local routes are disallowed |
| `/sitemap.xml`                  | Static          | Indexable routes only (`app/sitemap.ts`)         |
| `/opengraph-image`, `/twitter-image` | Static      | Generated 1200×630 social cards (`next/og`)      |
| `/library`                      | Static + client | Videos + Playlists tabs, drag-to-reorder grids   |
| `/inbox`                        | Static + client | Learning Inbox: save YouTube links, tags, watched status |
| `/recent`                       | Static + client | Last opened videos & playlists (up to 12 each)   |
| `/favorites`                    | Static + client | Pinned videos & playlists                        |
| `/notes`                        | Static + client | Search, filter and jump back to every note       |
| `/analytics`                    | Static + client | Local learning analytics dashboard               |
| `/bookmarks`                    | Static + client | Every bookmark grouped by lesson, with deep links |
| `/certificates`                 | Static + client | Gallery of completed course certificates         |
| `/categories`                   | Static + client | Folder overview for videos and playlists         |
| `/categories/[id]`              | Dynamic         | One category's videos, playlists and dialogs     |
| `/add`                          | Static + client | Add a video: fetch chapters or paste manually    |
| `/settings`                     | Static + client | API key, backup & restore, reminders, data & storage |
| `/watch/[id]`                   | Dynamic         | Course player or playlist overview, chosen from the library |
| `/watch/[id]/[videoId]`         | Dynamic         | Playlist lesson player + lesson sidebar          |
| `/watch/[id]/certificate`       | Dynamic         | Playlist completion certificate                  |
| `/course/[id]`                  | Dynamic         | Legacy course player URL → redirects to `/watch/[id]` |
| `/course/[id]/certificate`      | Dynamic         | Course completion certificate                    |

`/library`, `/inbox`, `/recent`, `/notes`, `/bookmarks`, `/analytics`, `/certificates`, `/categories` and `/favorites` share the `(app)` route group layout with the collapsible sidebar. The watch, legacy course, add and settings routes use a minimal top-bar layout.

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
│   │   ├── inbox/page.tsx        # → InboxView (features/inbox)
│   │   ├── recent/page.tsx       # → RecentView
│   │   ├── notes/page.tsx        # → NotesView (features/notes)
│   │   ├── bookmarks/page.tsx    # → BookmarksView (features/bookmarks)
│   │   ├── analytics/page.tsx    # → AnalyticsView (features/analytics)
│   │   ├── certificates/page.tsx # → CertificatesGalleryView
│   │   ├── categories/           # → CategoriesView, CategoryView
│   │   ├── favorites/page.tsx    # → FavoritesView
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
│   ├── certificates/             # Local printable course certificates
│   │   ├── index.ts              # CourseCertificateView + certificate helpers
│   │   ├── components/           # printable certificate, gallery, locked/not-found
│   │   └── lib/                  # completion check, reference code, local name
│   ├── analytics/                # Local learning analytics dashboard
│   │   ├── index.ts              # AnalyticsView + tracking/backup API
│   │   ├── components/           # summary, calendar, trends, progress,
│   │   │                         # breakdown, Studio, goals, insights, timeline
│   │   ├── hooks/                # reactive snapshot, presence tracking,
│   │   │                         # Studio summary
│   │   ├── lib/                  # activity tracker, persistence store,
│   │   │                         # aggregation selectors, progress/timeline
│   │   │                         # snapshots, backup
│   │   └── types/                # analytics types
│   ├── notes/                     # /notes: search, filters and jump links
│   │   ├── index.ts               # NotesView + note helpers
│   │   ├── components/            # notes-view (+test)
│   │   └── lib/                   # note-search (+test)
│   ├── inbox/                     # /inbox: saved YouTube links
│   │   ├── index.ts               # InboxView + store/backup API
│   │   ├── components/            # inbox-view, add form, item card, dialogs
│   │   └── lib/                   # inbox helpers (+test), store, backup, metadata
│   ├── bookmarks/                 # Timestamped lesson moments
│   │   ├── index.ts               # BookmarksView, BookmarksPanel + store/backup API
│   │   ├── components/            # bookmarks-view, bookmarks-panel
│   │   └── lib/                   # bookmark helpers (+test), store, backup
│   ├── resources/                 # Course & lesson attachments (player sheet)
│   │   ├── index.ts               # ResourcesPanel + store/backup API
│   │   ├── components/            # resources-panel
│   │   └── lib/                   # resource helpers (+test), store, IndexedDB, backup
│   ├── reminders/                 # Optional local learning reminders
│   │   ├── index.ts               # RemindersCard + AppShell hook
│   │   ├── components/            # reminders-card
│   │   ├── hooks/                 # use-learning-reminders
│   │   └── lib/                   # reminder rules (+test), store, notifications
│   ├── categories/               # /categories: folders over videos + playlists
│   │   ├── index.ts              # CategoriesView, CategoryView
│   │   └── components/           # categories-view, category-view, dialogs
│   ├── settings/                  # Settings: API key, backup, storage, reminders
│   │   ├── index.ts               # SettingsView
│   │   ├── components/            # settings-view, backup-card, storage-card
│   │   └── lib/                   # actions-client, storage-usage (+test)
│   ├── search/                   # Global search palette (⌘K)
│   │   ├── index.ts              # GlobalSearchDialog + open event
│   │   ├── components/           # global-search-dialog (command palette)
│   │   └── lib/                  # global-search (+test) matching/ranking
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
- `shared/lib/backup.test.ts` — backup v3 round-trips timestamped notes, sources and the certificate name, counts them in previews, adopts notes from v1/v2 files, replaces stale note buckets, and merges the newest copy per note.
- `features/notes/lib/note-search.test.ts` — note source/link inference, legacy-note lookup, full-text search and playlist/course filters.
- `features/notes/components/notes-view.test.tsx` — the `/notes` page renders search results, filters, empty states and exact jump links.
- `features/studio/lib/studio-backup.test.ts` — Studio backup collection and replace/merge restore, including multiple projects sharing one lesson.
- `features/studio/components/studio-lesson-panel.test.tsx` — the full-size sheet, first-visit form, closing without leaving the lesson, and restoring the right workspace per lesson.
- `features/analytics/lib/analytics.test.ts` — activity aggregation, streaks, period comparison, goals, insights, progress snapshots, persistence, and backup merge/replace.
- `features/analytics/lib/activity-tracker.test.ts` — active-second tracking, hidden-tab exclusion, session thresholds, duplicate-event prevention, and overlap rules.
- `features/certificates/lib/certificate.test.ts` — certificate completion checks, stable local references, landscape/portrait image generation, escaping, file names, name backup/restore, and the locally saved name.
- `features/certificates/components/certificates-gallery-view.test.tsx` — the gallery lists only completed courses, links each certificate, and has an empty state.
- `features/inbox/lib/inbox.test.ts` — tag normalization, every-word search and status/tag filters, newest-first saves with duplicate rejection, watched/edit/remove round-trips, corrupt-data tolerance, and inbox backup round-trip/merge/preview.
- `features/bookmarks/lib/bookmark.test.ts` — deep links for playlist and course moments, grouping/sorting, search, validation and corrupt-data tolerance, store edits, and bookmark backup round-trip/merge/newest-copy-wins.
- `features/resources/lib/resource.test.ts` — resource validation (uploads, sizes, links, snippets), add/remove/merge, and a backup round-trip that restores a PDF's exact bytes; older backups without the section leave local attachments alone.
- `features/reminders/lib/reminders.test.ts` — settings normalization and persistence, the once-a-day/after-the-chosen-time schedule, include toggles, today's activity totals, and reminder messages for lessons, goals, both or neither.
- `features/settings/lib/storage-usage.test.ts` — byte formatting, localStorage feature grouping, quota percentages, backup-state transitions (empty/never/current/changed), and IndexedDB record/byte measurement with `fake-indexeddb`.

---

## Deployment

The app deploys as a standard Next.js app (e.g. Vercel):

1. Import the repository.
2. No required environment variables — each user adds their own YouTube API key in the app under Settings. Set `NEXT_PUBLIC_SITE_URL` to your custom domain so canonical URLs, `sitemap.xml` and social cards point at it.
3. Build command `bun run build` (or `next build`), output served with `bun start`.

No database or additional services required. Studio previews use Sandpack's hosted bundler and public npm resolution, so they need network access and are not described as offline; self-hosting that runtime is outside the current scope.
