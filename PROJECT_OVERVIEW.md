# Taskly Project Overview

## Overview

This repository contains a polished TypeScript-based to-do application called Taskly, built as a modern React single-page app with Vite, Tailwind CSS, and a component-driven UI. The app focuses on task management, productivity tracking, personalization, and daily planning in a single desktop-friendly interface.

The project is structured as a front-end application with local persistence, smart task lists, drag-and-drop organization, custom wallpapers, and an email drafting workflow that opens the user’s own mail client rather than sending email from the app.

## Project intent

The app is designed to help users:

- Create and manage personal tasks
- Organize tasks by list and date
- Track completion and starred items
- Keep a daily or upcoming view of important work
- Customize the workspace visually
- Draft task-related emails without requiring an in-app email backend

## Key features

### 1. Smart task organization
The main task experience is centered around a set of smart collections:

- Inbox
- Today
- Upcoming
- Starred

These views are implemented in the task list logic and let users filter tasks based on relevance, date, and priority.

### 2. Custom lists and task grouping
Users can create their own named lists, assign tasks to a list, and manage list-level actions such as rename, emoji assignment, and deletion.

This is handled by the app state model and sidebar list controls, with support for contextual menus and dropdown actions.

### 3. Date-based planning and filters
Tasks support due dates, and the app calculates logical date groupings such as:

- Today
- Tomorrow
- This week
- Later
- No date

This is implemented via date bucket logic and used both in grouping and in filter pills for task discovery.

### 4. Drag-and-drop task ordering
The app uses `@dnd-kit` to support task reordering within a list, making the task manager feel more interactive and closer to a productivity tool than a static checklist.

### 5. Productivity insights
The project includes productivity-related logic for streaks and summaries, with components such as:

- `WeeklySummary`
- productivity utilities
- streak calculation logic

These components help surface momentum and task completion trends without needing a dedicated backend.

### 6. Daily planning
A `DailyPlanner` component is included and is wired into the sidebar. This suggests a planning workflow for setting daily intentions or reviewing tasks for the day.

### 7. Wallpaper personalization
The app supports custom background wallpapers, including:

- built-in wallpapers
- device-selected wallpapers
- storage-safe resizing and local persistence

This follows the architecture decision in `AGENTS.md`: wallpapers are converted to data URLs and stored locally on-device, with a capacity safeguard before selection.

### 8. Email drafting
The app includes a shared email composer that prepares a task as an email draft and opens the user’s default mail client via a `mailto:` link.

This is a deliberate product choice: the project does not have an in-app mail sender because there is no verified sender domain configured.

### 9. Command palette and settings
The sidebar exposes command and settings surfaces, including a command palette and settings dialog, improving discoverability and app customization.

## Architecture highlights

### Front-end stack
The project uses:

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui style components and Radix primitives
- React Router
- TanStack Query

This makes the app a modern client-side application with a component library foundation.

### State management
Application state is centralized in `src/context/AppContext.tsx`.

Key responsibilities:

- task CRUD and updates
- list creation and deletion
- active list and active task selection
- search and date filtering
- wallpaper changes
- language selection
- sidebar visibility
- email composer open/prefill state

The state is persisted to browser `localStorage`, with a deliberate `persistable()` filter that strips ephemeral UI state such as:

- composer visibility
- composer prefill content

This ensures a page reload does not re-open a half-written email draft.

### Main application layout
The root app shell is defined in:

- `src/App.tsx`
- `src/pages/Index.tsx`

The app renders a full-screen layout with:

- wallpaper layers
- sidebar
- main task list area
- detail panel for the active task
- global email composer overlay

### Component structure
Important UI modules include:

- `src/components/app/Sidebar.tsx` — navigation, lists, search, planner, settings, and summary controls
- `src/components/app/TaskList.tsx` — list rendering, filters, date grouping, and drag-and-drop behavior
- `src/components/app/TaskDetailPanel.tsx` — detailed task editing surface
- `src/components/app/EmailComposer.tsx` — mail draft workflow
- `src/components/ui/*` — shared UI primitives used throughout the app

### Data and utilities
The repository includes shared logic in `src/lib`:

- `email.ts` — mailto helper logic
- `productivity.ts` — productivity and streak calculations
- `device-wallpaper.ts` — local wallpaper handling
- `cloud-wallpapers.ts` — wallpaper sources
- `utils.ts` — common helpers

## Data model
The app state is driven around two primary domain entities:

### Task
A task includes:

- id
- title
- dueDate
- starred
- completed
- completedAt
- listId
- notes
- links
- images
- createdAt

### TaskList
A list includes:

- id
- name
- emoji
- createdAt

This is a lightweight, in-browser model designed for a personal productivity app rather than a full multi-user backend workflow.

## Integration notes

### Supabase presence
The repo includes `supabase/` configuration and a functions directory, indicating some backend or edge-function integration potential. However, the app’s primary user-facing workflow is still front-end driven and local-state based.

### Daily planning integration
The project has a note in `AGENTS.md` describing a daily planning workflow that runs through authenticated Lovable Edge Function credentials and a server-only AI gateway. The UI receives plain text output, and sensitive planning logic remains off the browser.

This is an architectural decision that keeps secrets and planning logic server-side while preserving a simple client experience.

## File structure overview

```text
.
├── AGENTS.md
├── README.md
├── about.md
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── src/
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   ├── main.tsx
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── hooks/
│   ├── i18n/
│   ├── integrations/
│   ├── lib/
│   ├── pages/
│   └── test/
├── supabase/
├── public/
├── drizzle/
├── components.json
└── ...
```

## Development workflow

### Local scripts
The project scripts in `package.json` include:

- `npm run dev` — start the Vite development server
- `npm run build` — create a production build
- `npm run preview` — preview the production build
- `npm test` — run the Vitest test suite
- `npm run lint` — lint the project

### Typical local setup

```bash
git clone <repository-url>
cd to-do-list-app
npm install
npm run dev
```

## Testing and quality
The repo includes test files such as:

- `src/pages/Index.test.tsx`
- `src/lib/email.test.ts`
- `src/lib/productivity.test.ts`

This indicates a testing mindset around both the UI and key business logic, especially around email generation, productivity calculations, and rendering behavior.

## Architectural decisions captured in AGENTS.md
The repository includes explicit architectural guidance in `AGENTS.md`, including:

- Daily planning uses server-side edge credentials rather than browser-executed AI logic.
- Wallpapers stay local as optimized data URLs and are checked for storage limits before use.
- Email composition intentionally opens the user’s personal mail client instead of sending through an app-managed endpoint.
- Ephemeral composer state is stripped before persistence so reloads do not restore draft UI state unexpectedly.

These rules help keep personal data, browser state, and app behavior aligned with privacy and user trust concerns.

## Summary

Taskly is a productivity-focused to-do app that blends elegant UI design, local state persistence, smart list management, date-based task logic, and personalized workspace features. It is built as a modern TypeScript React app with a strong emphasis on UX quality, offline local persistence, and privacy-aware handling of user data.

It is best understood as a personal task manager with thoughtful UX decisions rather than a general-purpose multi-user product backend. Its architecture favors a smooth, self-contained experience on the client, while intentionally keeping sensitive planning and email-sending functionality outside the app when those services are not configured.

## Relevant files

- `README.md`
- `AGENTS.md`
- `src/context/AppContext.tsx`
- `src/pages/Index.tsx`
- `src/components/app/Sidebar.tsx`
- `src/components/app/TaskList.tsx`
- `src/lib/email.ts`
- `src/lib/productivity.ts`
- `package.json`

This document is intended as a practical overview for contributors, reviewers, and anyone trying to understand the project’s structure and design goals.
