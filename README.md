# CruiseFlow

A mobile-first companion app for cruise vacations. Plan your daily schedule, capture memories,
browse ship venues by deck, and keep the whole family in sync — all offline-first so it keeps
working when the ship's Wi-Fi doesn't.

CruiseFlow runs as a Progressive Web App on any modern browser and ships as a native iOS app
through Capacitor.

---

## Highlights

- **Daily Schedule** with category-coded events, live "happening now" status, conflict warnings,
  reminders, and inline photos
- **Memories** journal that spans every cruise you've taken — filter, sort, search, view on a
  map, browse "On This Day," and export a PDF recap
- **Ship Info** browser with venues organized by category or deck, sourced from a curated
  catalog (NCL Prima ships with ~85 venues across 9 decks; Oasis of the Seas with full deck
  plans; more ships easily added)
- **Family Dashboard** showing each member's day at a glance — current activity, what's next,
  what's done
- **Multi-cruise** support: switch between trips, keep their data isolated, and browse memories
  across all of them
- **AI Concierge** (optional) — bring your own Google Gemini API key for a chat assistant that
  can answer questions about your itinerary
- **Offline-first**: all data lives on-device. iOS builds add iCloud sync across your own
  devices via CloudKit
- **Themeable**: dark / light / system, with safe-area aware layouts for notched iPhones

---

## Tech stack

| Layer | Choice |
|---|---|
| UI framework | React 19 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS 4 (via `@tailwindcss/vite`) |
| Routing | React Router 7 (browser router on web, hash router on native) |
| State | Zustand (`src/stores/appStore.ts`) — persisted to `localStorage` |
| Web storage | Dexie / IndexedDB |
| Native storage | `@capacitor-community/sqlite` |
| Native shell | Capacitor 8 (`@capacitor/ios`, `camera`, `filesystem`, `preferences`) |
| Icons | `lucide-react` |
| Dates | `date-fns` |
| Maps | Leaflet (Memories map view) |
| PWA | `vite-plugin-pwa` (web build only — disabled for native) |

---

## Project layout

```
src/
├── app/                  # Root app shell + route table
│   ├── App.tsx           # Migration, theme, active-cruise fallback
│   └── routes.tsx        # Route definitions (browser vs hash router)
├── components/
│   ├── events/           # Event card, form, detail UI
│   ├── family/           # Member avatar, color/emoji picker
│   ├── layout/           # AppShell, BottomNav
│   ├── memories/         # Lightbox, map view, PDF export, story viewer
│   ├── ships/            # Ship picker / autocomplete
│   └── ui/               # Generic primitives (Sheet, Button, Card, …)
├── db/
│   ├── database.ts       # Dexie schema (versioned)
│   ├── seed.ts           # Per-ship venue seeder + version migration
│   └── shipCatalog.ts    # Canonical ship names + aliases
├── hooks/                # useCruise, useEvents, useFamily, useVenues, …
├── pages/                # One file per route
├── platform/             # Web vs native abstraction
│   ├── index.ts          # Singleton dispatcher
│   ├── types.ts          # Platform interface
│   ├── web.ts            # Dexie-backed implementation
│   ├── native.ts         # SQLite + filesystem implementation
│   └── usePlatformQuery.ts
├── stores/appStore.ts    # Zustand global store
├── types/index.ts        # Cruise, CruiseEvent, FamilyMember, Venue, …
├── utils/                # haptics, time, gemini client
├── main.tsx              # Entry point + viewport-height fix for iOS Safari
└── index.css             # Tailwind + CSS custom properties
```

---

## Routes

| Path | Page | Notes |
|---|---|---|
| `/onboarding` | `Onboarding` | First-launch flow |
| `/concierge` | `Concierge` | Gemini-powered chat assistant |
| `/` | `DailySchedule` | Default home (inside `AppShell`) |
| `/memories` | `Memories` | Cross-cruise photo journal |
| `/ship` | `ShipInfo` | Venue browser by category / deck |
| `/family` | `FamilyDashboard` | Family schedule overview |
| `/settings` | `Settings` | Cruises, family, theme, API key, backup |
| `/event/new` | `AddEditEvent` | Create event |
| `/event/:id` | `EventDetail` | View event |
| `/event/:id/edit` | `AddEditEvent` | Edit event |

---

## Architecture notes

### Platform abstraction

`src/platform/types.ts` defines a `Platform` interface with a `db` adapter. At runtime,
`src/platform/index.ts` checks `Capacitor.isNativePlatform()` and exports either the web or
native implementation. Pages and hooks only ever talk to `platform.db.*`, so the same UI code
works in both environments.

| | Web | Native (iOS) |
|---|---|---|
| Local DB | Dexie / IndexedDB | SQLite (`@capacitor-community/sqlite`) |
| Photos | Inline base64 in DB | Filesystem (`@capacitor/filesystem`) |
| Sync | None | iCloud / CloudKit |

### Reactive queries

`src/platform/usePlatformQuery.ts` is a small `useSyncExternalStore`-style hook that runs an
async query and re-runs it when the platform notifies of a change. Hooks like `useEvents`,
`useCruise`, `useVenues` build on it so screens automatically re-render after writes.

### Multi-cruise data isolation

Every record (event, member, venue assignment) is tagged with a `cruiseId`. The active cruise
lives in the Zustand store (`activeCruiseId`) and is also mirrored to `localStorage`
(`cruiseflow-cruise-id`). Switching cruises in **Settings** swaps the value, and every screen
re-queries automatically. Memories can opt to span all cruises.

### Ship & venue catalog

`src/db/shipCatalog.ts` holds canonical ship names plus aliases (e.g. "Norwegian Prima" →
"NCL Prima"). `src/db/seed.ts` ships per-ship venue lists keyed by canonical name. On boot,
`seedVenues()` checks `cruiseflow:venuesSeedVersion` against the in-code `VENUE_SEED_VERSION`
constant and re-seeds if outdated, so users automatically pick up refreshed catalogs without a
manual reset. Venues are reference data only — user-created events keep their venue names
verbatim, so a re-seed is non-destructive.

### Routing on native

iOS WebViews don't have a server to fall back to for HTML5 history mode, so `routes.tsx`
uses `createHashRouter` when running under Capacitor and `createBrowserRouter` on the web.

### PWA

`vite-plugin-pwa` registers a service worker for the web build and is skipped during native
builds via the `CAPACITOR_BUILD` env var.

---

## Getting started

### Prerequisites

- Node.js 20+
- npm 10+
- (iOS only) Xcode 15+, CocoaPods, an Apple developer account for device builds

### Install

```bash
npm install
```

### Run the web app in dev mode

```bash
npm run dev
```

Then open <http://localhost:5173>. Vite serves the app with hot-module reload.

### Build the web app

```bash
npm run build
```

The static bundle is written to `dist/` and is ready to deploy to any static host (Vercel,
Netlify, GitHub Pages, etc.). A `vercel.json` is included for Vercel deploys.

### Preview the production build locally

```bash
npm run preview
```

---

## iOS / native build

CruiseFlow uses Capacitor to wrap the web build as a native iOS app.

```bash
# One-shot: type-check, build for native, sync into Xcode, and open the project
npm run ios
```

That's equivalent to:

```bash
npm run build:native   # CAPACITOR_BUILD=true vite build (PWA plugin skipped)
npm run cap:sync       # Copy dist/ into ios/App
npm run cap:open       # Open Xcode
```

From Xcode you can run on the simulator or sign and archive for TestFlight / the App Store.

App identifiers and the iOS scheme live in `capacitor.config.ts`.

---

## Configuration

CruiseFlow has **no `.env` file and no required environment variables**. All user-facing
settings live in the **Settings** page and are persisted to `localStorage` (web) or Capacitor
Preferences (native):

| Key | Purpose |
|---|---|
| `cruiseflow-cruise-id` | Currently active cruise |
| `cruiseflow-selected-date` | Last-viewed day on the schedule |
| `cruiseflow-api-key` | Google Gemini API key (optional, Concierge only) |
| `cruiseflow-theme` | `system` / `dark` / `light` |
| `cruiseflow:venuesSeedVersion` | Venue catalog version (used for migrations) |

The only build-time variable is `CAPACITOR_BUILD=true`, which the `build:native` script sets
automatically to disable the PWA plugin.

### Optional: Gemini Concierge

The Concierge tab is powered by Google Gemini. To enable it, paste an API key from
[Google AI Studio](https://aistudio.google.com/) into **Settings → Gemini API key**. The key
never leaves your device.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server on `http://localhost:5173` |
| `npm run build` | Type-check and build the web bundle into `dist/` |
| `npm run preview` | Serve the built bundle locally |
| `npm run build:native` | Build for native (PWA disabled) |
| `npm run cap:sync` | `npx cap sync ios` — copy `dist/` into the Xcode project |
| `npm run cap:open` | `npx cap open ios` — open the iOS project in Xcode |
| `npm run ios` | `build:native` + `cap:sync` + `cap:open` in one go |

---

## Adding a new ship

1. Add the canonical name (and any aliases) to `src/db/shipCatalog.ts`.
2. Add the venue list as a `Omit<VenueEntry, 'shipName'>[]` in `src/db/seed.ts` and register
   it in the `SHIP_VENUES` map under the canonical key.
3. Bump `VENUE_SEED_VERSION` in `src/db/seed.ts` so existing users automatically pick up the
   new catalog on next launch.
4. Verify on `/ship` after creating a cruise that uses the new ship.

---

## Contributing

Open an issue describing what you'd like to change, or send a PR against `main`. Before
submitting:

```bash
npx tsc --noEmit   # type-check
npm run build      # production build
```

The project uses conventional, issue-tagged commit messages
(e.g. `Fix #62: stop cruise name input from losing focus on every keystroke`).

---

## License

Private project. All rights reserved.
