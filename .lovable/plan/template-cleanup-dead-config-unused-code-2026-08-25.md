# Template cleanup: dead config + unused code

Fix 1 from the audit (meta tags) is already applied — `index.html` now carries the "To Do List App Template | Lovable" title, description, OG and Twitter tags. That leaves fixes 2 and 3.

## Fix 2 — Remove the dark mode dead config

The Tailwind config declares `darkMode: ["class"]`, but `src/index.css` defines no `.dark` token block and nothing in the app ever toggles a dark class. The config promises a feature the UI does not have.

- Remove `darkMode: ["class"]` from `tailwind.config.ts`.
- Rewrite `src/components/ui/sonner.tsx` to drop its `next-themes` `useTheme()` call (it resolves to "system" and does nothing here) and render the toaster with the light theme only.
- Remove the `next-themes` dependency.

No visual change: the app already renders only the light palette.

## Fix 3 — Prune unused components and dependencies

Delete the 37 shadcn files under `src/components/ui/` that nothing imports (accordion, alert, aspect-ratio, avatar, badge, breadcrumb, card, carousel, chart, checkbox, collapsible, command, drawer, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, progress, radio-group, resizable, scroll-area, separator, sheet, sidebar, skeleton, slider, switch, table, tabs, textarea, toggle, toggle-group).

Kept because they are in active use (directly or as a dependency of a used file): alert-dialog, button, calendar, context-menu, dialog, dropdown-menu, popover, select, sonner, toast, toaster, tooltip, use-toast.

Then remove the npm packages that only those deleted files needed:

- UI libs: `recharts`, `embla-carousel-react`, `vaul`, `react-resizable-panels`, `cmdk`, `input-otp`, `next-themes`
- Forms/validation (entirely unused): `react-hook-form`, `@hookform/resolvers`, `zod`
- Dev: `@tailwindcss/typography`
- Radix primitives backing deleted components: accordion, aspect-ratio, avatar, checkbox, collapsible, hover-card, label, menubar, navigation-menu, progress, radio-group, scroll-area, separator, slider, switch, tabs, toggle, toggle-group

Also drop the unused `@dnd-kit/modifiers` import in `src/components/app/TaskList.tsx` (imported, never applied) and remove that package.

## Verification

- Run the full Vitest suite — all 77 tests must still pass.
- Run a production build to confirm no dangling imports.
