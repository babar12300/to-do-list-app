# Project Overview for Contributors

## Purpose

Taskly is a TypeScript React application for managing personal tasks in a highly interactive, visually polished workflow. It is designed as a client-side productivity app with smart lists, custom organization, date-aware task logic, local persistence, wallpaper personalization, and lightweight productivity insights.

## Product goals

The project aims to provide a task manager that feels modern and efficient without requiring a full backend or multi-user infrastructure. The main goals are:

- capture tasks quickly
- help users focus on what matters today
- make task organization easy through lists and filters
- support daily planning workflows
- keep user data local when possible
- provide a polished UI using a component-library architecture

## Stack and architecture

### Front-end stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Radix UI / shadcn-style component primitives
- React Router
- TanStack Query
- DnD Kit for drag-and-drop
- date-fns for date logic

### State model

The app state lives in `src/context/AppContext.tsx` and is organized around a reducer-based store. The state tracks:

- tasks
- lists
- active list selection
- active task selection
- search state
- date filter state
- wallpaper selection
- sidebar visibility
- language selection
- composer visibility and prefill values

The state is saved to `localStorage` as a serialized object, with an explicit `persistable()` function removing ephemeral UI state to avoid rehydrating stale drafts.

## Core feature areas

### Tasks and lists

The core domain model includes:

- `Task`
- `TaskList`

Each task supports properties such as:

- title
- dueDate
- starred status
- completion state
- list assignment
- notes
- links
- images
- timestamps

Tasks can be grouped into custom lists and smart views such as Inbox, Today, Upcoming, and Starred.

### Smart list behavior

The filtering and grouping logic is implemented in `src/components/app/TaskList.tsx` and `src/components/app/Sidebar.tsx`.

Important behaviors:

- date bucket classification for “today,” “tomorrow,” “this week,” etc.
- task grouping by due-date categories
- search filtering
- completed/incomplete sections
- drag-and-drop reordering

### Styling and UX

The project uses Tailwind to create a polished product feel with:

- glassmorphism or translucent overlays
- wallpaper-driven visual layers
- contextual menus and dropdown actions
- custom list actions and rename flows
- settings and command palette surfaces

UI structure is split into reusable app modules and shared primitives in `src/components/ui`.

## Notable implementation details

### Local persistence

`AppProvider` loads state from `localStorage` and persists changes with a debounced save. It also flushes state on `pagehide` to reduce data-loss risk during quick reloads.

### Wallpaper system

Wallpapers are treated as a user personalization feature. Helpers include:

- `src/lib/device-wallpaper.ts`
- `src/lib/cloud-wallpapers.ts`

These utilities convert wallpaper sources into local-safe browser-compatible URLs and store them without creating an unbounded memory burden.

### Email workflow

The app provides a task-to-email drafting flow in `src/lib/email.ts`. It builds a `mailto:` URL and preserves a clean separation between app state and external email transport.

This pattern intentionally avoids shipping an app-managed sender system because there is no configured sender domain.

### Productivity logic

The productivity module includes functions for streak tracking and summary logic, which feed the sidebar’s summary UI. It is intentionally designed to support lightweight behavioral insights without depending on a data-heavy backend.

## Files to know

High-value files for contributors:

- `src/context/AppContext.tsx` — root data model and reducer
- `src/components/app/Sidebar.tsx` — navigation and list controls
- `src/components/app/TaskList.tsx` — task rendering, grouping, filters, drag-and-drop
- `src/pages/Index.tsx` — app shell and wallpaper layout
- `src/lib/email.ts` — compose-to-mail logic
- `src/lib/productivity.ts` — streak and summary calculation
- `AGENTS.md` — repo-specific architectural constraints and product rules

## Testing and quality

The repository includes tests such as:

- `src/pages/Index.test.tsx`
- `src/lib/email.test.ts`
- `src/lib/productivity.test.ts`

This suggests a focus on correctness for both user-facing behavior and utility-level logic.

## Architectural constraints and product decisions

The repository includes explicit product guidance in `AGENTS.md`:

- daily planning logic is intentionally server-side when required
- wallpaper storage is local and guarded against overuse
- email is redirected to the user’s mail app, not an app-owned sender
- ephemeral composer state is not persisted across reloads

These trade-offs keep the app simple, local-first, and user-trusting.

## Contribution recommendations

If you are contributing to this project, begin with:

1. state model in `AppContext.tsx`
2. rendering logic in `TaskList.tsx`
3. sidebar actions and navigation behavior
4. utility files for dates, productivity, and wallpapers
5. shared UI patterns in `src/components/ui`

## Summary

This repository is a modern, local-first productivity app built with React and TypeScript. It is a good example of a front-end-driven product where the UX is polished, the domain model is intentionally small, and architecture decisions prioritize user experience, privacy, and practical simplicity over backend complexity.
