# Dogfood — Taskly (fresh-start-forge-72)

## FINAL RESULT (local environment, Playwright headless)

38/38 e2e steps PASS · 76/76 unit tests PASS · tsc clean · build passes ·
zero console errors across the whole run.

Bugs found by EXECUTION (beyond the source-predicted ones below):
7. NotFound page logged console.error by design → downgraded to console.warn.
8. TIMEZONE BUG: Today/Upcoming smart lists compared `toISOString()` (UTC) date
   strings against locally-formatted dueDates — in any timezone east of UTC the
   Today list missed every task actually due today, and the sidebar badge used
   a THIRD formula that disagreed with the list after midnight. Both now use
   local `format(date, 'yyyy-MM-dd')`.
9. DATA-LOSS WINDOW: saves are debounced 300ms with no unload flush — deleting
   a task then reloading within 300ms silently lost the change. Added a
   synchronous flush on `pagehide`.
10. Visual (mobile 375): the fixed hamburger overlapped the list-title chip →
   header now clears it (`pl-10 md:pl-0`); "Next 7 Days" pill wrapped to three
   lines → pills are single-line with tighter mobile padding.

Not verified end-to-end (coverage gaps, per the verification-levels rule):
- Lovable Cloud preview environment: NOT tested — all changes live only in the
  local clone; the Lovable project still has the pre-dogfood code. The cloud
  pass (Step 5 of the skill) requires pushing to GitHub/gitsync first.
- Drag-to-reorder (dnd-kit): not driven in the e2e run (synthetic drag against
  PointerSensor is unreliable headless) — covered by unit tests of
  REORDER_TASKS only. STATIC.
- Storage-full toast: not driven (requires quota exhaustion). STATIC.
- account-menu house rule: NOT APPLICABLE — no auth, no signed-in person
  (no ProtectedRoute, no user/session in state). Evidence in House rules table.
- Screenshots of populated views catch the 0.2s entry animation mid-flight and
  look faint; verified separately that rows settle to opacity 1.

Visual adjudication (Phase 4.5) run on p1/p2/p4 screenshots at 1440 and 375:
findings were the two mobile items in bug 10 (both fixed and re-measured:
no overlap, no horizontal overflow, pill bar 34px single line).

## Fixes applied during this dogfood (source-predicted, before execution)

1. FilterPills was an orphan: never mounted, and `dateFilter` state was never
   consumed. Wired: mounted under the quick-add; filtering now shares ONE
   date-bucket function with the group headers (they can't disagree).
2. Dead dark-mode state (`darkMode`, TOGGLE_DARK_MODE, `.dark` class effect)
   removed — no toggle existed and no dark CSS exists. Tests updated.
3. Orphaned `NavLink.tsx` deleted (imported nowhere).
4. List delete used native `confirm()` (inconsistent with task delete's
   AlertDialog, and undriveable by automation). Replaced with AlertDialog.
5. House rule item-component: task rows and list rows had NO menus. Added a
   ⋯ dropdown AND a right-click context menu to both, fed by one shared action
   array per item kind (`item-actions.ts`): tasks = Open / Mark complete / Star
   / — / Delete(destructive); lists = Rename / — / Delete(destructive). Open
   menu marks its row. Menu delete confirms via AlertDialog.
6. Six new action strings added to ALL 10 languages (translations parity test
   enforces this).

Result after fixes: 76/76 unit tests pass, tsc clean, build passes.

You are dogfooding this app. Fix bugs as you find them — do not skip steps.

Use Playwright. PASS/FAIL each step. Stop and fix on failure before continuing.

Read these files before writing test code:
- src/context/AppContext.tsx (entities + seed + persistence)
- src/i18n/translations.ts
- docs/design/*.md (house rules)

RULES:
- Every step has ONE action and ONE expected result.
- If a step fails, fix the bug in the source code, then re-run that step.
- Reload after every mutation batch to verify persistence (localStorage, 300ms debounce — wait for the write signal, never a fixed sleep).
- Screenshot every failure and every completed phase.
- Fail any step that produces a console.error or an unexpected 4xx/5xx network request.
- Label every step VERIFIED / INITIATED / STATIC.
- Selector order: getByTestId → getByRole({name}) → #id → getByText → CSS last.
- Real clicks only; no dispatchEvent, no page.evaluate clicks.
- No waitForTimeout; wait for elements/attributes. `networkidle` never resolves here; use domcontentloaded + a real element.

## Spec reconciliation

No plan docs exist (`docs/plans/` absent) — no-plan mode: CODE is ground truth,
visual baseline is the rendered DOM. This table records code-vs-artifacts drift:

| Surface | CODE | ARTIFACT | Verdict |
|---|---|---|---|
| Routes | `/` + `*` (NotFound) only | — | CODE |
| Task seed | 3 tasks in defaultState (`grep -c "id: '[0-9]'" src/context/AppContext.tsx` → 3) | — | CODE |
| List seed | 0 custom lists | — | CODE |
| Wallpapers | 20 (`grep -cE "https://" src/data/wallpapers.ts` → 20) | — | CODE |
| Languages | en, nl, pt | — | CODE |
| FilterPills | component + tests exist; NEVER mounted; `dateFilter` state never consumed by TaskList | TaskList.test expects it rendered | FAIL → wire it (mount + consume dateFilter) |
| darkMode | state + reducer + `.dark` effect exist; no toggle in UI; no `.dark` CSS variables | Sidebar.test asserts toggle absent | FAIL → remove dead state (+ update AppContext tests) |
| NavLink.tsx | exists; imported nowhere | — | FAIL → delete (Matrix G) |
| Toaster (shadcn) + Sonner both mounted | app code only uses sonner | — | REPORT: drop shadcn toaster or leave (starter convention) |
| 40 unused src/components/ui files | present | — | REPORT: starter convention; adjudicate before pruning |
| List delete uses native `confirm()` | task delete uses AlertDialog | — | FAIL → inconsistent destructive confirm; replace with AlertDialog |

## House rules

| Rule | Verdict | Bindings + evidence |
|---|---|---|
| account-menu.md | NOT APPLICABLE | Positive counter-evidence: no auth of any kind — App.tsx has no ProtectedRoute, no auth provider, AppState has no user/session field, settings dialog holds only language. There is no signed-in person to hang an account menu on. |
| empty-state.md | APPLIES | b1: task row area on `/` (entity Task, selector: the group/list region under quick-add). b2: zero-results via search (emptySearch message). b3: sidebar Lists section (entity TaskList, 0 seeded). |
| item-component.md | APPLIES | b1: task row (entity Task, `[role=button].group` rows on `/`). b2: custom list row (entity TaskList, sidebar rows). Both currently LACK ⋯ menus/right-click menus → checks 1–8 expected to FAIL until fixed. |

## Matrices

A. Routes: `/` (Index, no auth), `*` (NotFound).
B. Entities: Task (3 seed: "Welcome to Taskly! Click me for details" [notes],
   "Try starring this task ⭐" [starred], "Set a due date on this task"); TaskList (0).
   Persistence: localStorage key `taskly-state`, 300ms debounce.
C. Sidebar items: Inbox, Today, Upcoming, Starred (smart); dynamic custom lists;
   collapse button; search input; wallpaper trigger; settings trigger; + new list.
D. Controls: see phases — every control enumerated as a step.
E. Multiple paths: complete/star from row AND detail panel; due date from quick-add
   AND detail panel; sidebar collapse via panel button AND (collapsed) header button;
   detail close via X, Esc, AND backdrop; (after fix) task actions via row controls
   AND ⋯ menu AND right-click.
F. Public product routes: none — single-route client-side app (no auth at all).
G. Orphans: NavLink.tsx (no importer) — FAIL; FilterPills unmounted — FAIL (wire).
H. States per screen: populated / empty (all tasks deleted) / zero-results (search)
   / selection-entered (detail open, date-filter chip on) / mobile-drawer (sidebar
   overlay at 375px).
I. State machines: sidebarOpen (open↔collapsed, both directions + persistence);
   detail panel (open via row click; exits: X, Esc, backdrop; focus trap);
   popovers (calendar, wallpaper — Radix contract: Esc/outside close, data-state);
   settings dialog (Radix dialog contract); dateFilter (toggle on/off, reset on
   list switch — reducer already clears it on SET_ACTIVE_LIST).
J. Expected affordances: Task create (quick-add on `/`) ✓; TaskList create (+ in
   sidebar) ✓; Task edit+delete in detail ✓; List rename+delete on row (currently
   dbl-click + hover-trash — replaced by ⋯ menu per house rule); exit affordance
   for every enterable state (see I).
K. Data-viz: none — no charts. N/A.

---

## PHASE 1: FRESH APP (seeded onboarding state)

This template intentionally seeds 3 onboarding tasks in code (client-side
starter; no fabricated analytics involved). Fresh = cleared localStorage.

1. Clear localStorage; navigate to `/` → verify: page loads, zero console errors.
2. Verify: sidebar visible with items Inbox, Today, Upcoming, Starred, each with a colored chip icon (blue/orange/purple/yellow circles, white glyphs).
3. Verify: Inbox count badge shows 3; Starred shows 1; Today and Upcoming show no badge (0 hidden).
4. Verify: main header shows blue Inbox chip + title "Inbox" in white with shadow.
5. Verify: 3 seeded tasks render as white pill rows: "Welcome to Taskly! Click me for details", "Try starring this task ⭐" (yellow filled star at row end), "Set a due date on this task".
6. Verify: every task row and the quick-add bar share 22px border-radius (computed style).
7. Verify: quick-add composer is 40px tall, white 65%, blur 8px, inset white ring (computed styles).
8. Screenshot `/` at 1440px.
9. Navigate to `/nonexistent` → verify: NotFound page renders (no crash, no blank).
10. Navigate back to `/`.

## PHASE 2: EMPTY + POPULATE

11. Delete all 3 seed tasks (via detail panel delete + AlertDialog confirm, one per task) → verify after each: row disappears, count decrements.
12. Verify empty state: plain sentence (the Inbox empty message from translations) rendered in the row area — no floating card, no backdrop; quick-add still present above (create door); header/chrome unchanged (empty-state rule b1).
13. Screenshot empty Inbox.
14. Reload → verify: still empty (persistence of deletions).
15. Quick-add: type "Buy groceries" in composer, press Enter → verify: row appears, Inbox badge 1.
16. Quick-add: type "Book dentist", click calendar icon → verify: frosted popover opens (Radix data-state=open).
17. Pick today's date → verify: popover closes, date chip "MMM d" appears in composer.
18. Press Enter → verify: task created with date chip visible in row meta; appears under "Today" group header.
19. Quick-add: type "Plan trip", click star icon → verify: star fills yellow.
20. Press Enter → verify: task created; Starred badge 1.
21. Create custom list: click + next to "Lists" → verify: inline input appears focused.
22. Type "Errands", press Enter → verify: list row appears with 📋 emoji.
23. Open "Buy groceries" detail (click row) → verify: frosted panel slides in from right; backdrop white 85%.
24. In detail: set list to "Errands" via select → verify: select shows Errands.
25. Close detail (X) → verify: panel gone; "Buy groceries" no longer in Inbox; Errands list badge 1.
26. In detail of "Plan trip": add note "Pack passport" → verify: persists after close+reopen.
27. In detail: add link "https://example.com" → verify: link chip renders; open target responds 200.
28. In detail: add image "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200" → verify: img naturalWidth > 0 (loaded, not broken).
29. Click the image → verify: lightbox dialog opens; Esc closes it, focus returns.
30. Reload → verify: all created data persists exactly (3 tasks, 1 list, note, link, image).
31. Screenshot populated state.

## PHASE 3: EVERY REMAINING CONTROL × STATE

# Smart list navigation (one per item)
32. Click "Today" → verify: only "Book dentist" listed; header chip orange, title "Today".
33. Click "Upcoming" → verify: "Book dentist" listed (due within 7 days); header purple.
34. Click "Starred" → verify: only "Plan trip"; header yellow; star glyph filled.
35. Click "Errands" → verify: only "Buy groceries".
36. Click "Inbox" → verify: "Plan trip" + any inbox tasks; count matches badge.

# Search (input→output, then zero-results state)
37. Type "trip" in search → verify: only "Plan trip" visible; header title shows "\"trip\"".
38. Verify: quick-add hidden while searching (code renders it only when not searching).
39. Type "zzz" → verify: zero-results message with the query rendered (emptySearch), nothing floating.
40. Clear search → verify: full list returns.

# Date filter pills (AFTER wiring fix — control must transform data)
41. Verify: filter pills render (Today, Tomorrow, Next 7 Days, Later, No Date).
42. Click "Today" pill → verify: pill turns white/active AND only tasks due today remain visible.
43. Click "Today" pill again → verify: filter off, all tasks return (reversibility).
44. Click "No Date" pill → verify: only undated tasks remain.
45. Switch to another list → verify: dateFilter cleared (reducer contract).

# Task row controls (populated state)
46. Hover a row → verify: star button appears (opacity transition).
47. Click star on "Buy groceries" → verify: star fills; Starred badge increments.
48. Click star again → verify: unfilled; badge decrements (reversibility).
49. Click complete circle on "Buy groceries" → verify: check animation, then row moves to Completed section after ~500ms.
50. Expand "Completed (1)" toggle → verify: ghost row, line-through title.
51. Click complete circle on the completed row → verify: task returns to active list.
52. Drag "Plan trip" above "Welcome..." (if both in view) → verify: order changes and persists after reload.

# Item ⋯ menu + right-click (HR-item-component — after fix; one set per binding)
HR-item-b1-1. Open ⋯ on a task row → verify: the OPEN row is visually marked (computed background differs from neighbour row).
HR-item-b1-2. Verify: ⋯ menu and right-click menu show identical labels in identical order (both read one shared action array).
HR-item-b1-3. Verify: every visible task row has a ⋯ button (count rows == count ⋯), including at 390px.
HR-item-b1-4. Verify: Delete is last, styled destructive, below a separator.
HR-item-b1-5. Single click on row body opens detail; clicking star/complete/⋯ inside the row does NOT open detail AND does its own job.
HR-item-b1-6. Verify: action set covers every provider operation on Task reachable from the row context (complete, star, open, delete).
HR-item-b1-7. Menu bands in fixed order with dividers between.
HR-item-b1-8. N/A single view (no grid/list dual view) — note, don't skip silently.
HR-item-b2-1..7. Same checks on a custom list row (actions: Rename, Delete-destructive-last; ⋯ on every list row; right-click parity; open marks row).

# Detail panel state machine (exits + focus)
53. Open detail → press Esc → verify: closes.
54. Open detail → click backdrop → verify: closes.
55. Open detail → click X → verify: closes; the row that opened it still selected-highlighted until close (selection state visible while open).
56. Open detail → verify focus is trapped (Tab cycles inside panel).
57. In detail: edit title, close immediately → reload → verify: edit persisted (debounce flush on close).
58. In detail: click Delete → verify: AlertDialog opens; Cancel → nothing deleted; Delete → task gone, panel closes.

# Sidebar state machine
59. Click collapse → verify: sidebar slides out; floating menu button appears in header.
60. Click floating menu button → verify: sidebar returns.
61. Collapse, reload → verify: collapsed state persists.
62. Restore sidebar.

# List row controls
63. Rename "Errands" (via ⋯ menu after fix) → type "Chores", Enter → verify: renamed everywhere (sidebar + detail select options).
64. Rename to empty string → verify: list is deleted (code contract) OR rename rejected — single expected result per final code; assert it.
65. Delete a list with tasks in it → verify: AlertDialog (not native confirm); confirm → list gone, its tasks moved to Inbox (reducer contract), active list falls back to Inbox.

# Wallpaper picker
66. Open wallpaper popover → verify: frosted panel, 20 thumbnails, all `<img>` naturalWidth > 0.
67. Click a different wallpaper → verify: background crossfades to it; selected tile gets border ring.
68. Reload → verify: wallpaper persisted.
69. Esc closes the popover; focus returns to trigger.

# Settings dialog
70. Open settings → verify: dialog on white-85 overlay, frosted panel, language select visible.
71. Change language to "Nederlands" → verify: UI strings swap (sidebar "Lists" label, quick-add placeholder) — data change, not just the select label.
72. Reload → verify: language persisted; switch back to English.
73. Esc closes dialog; focus returns.

## PHASE 4: AUDIT

74. Console sweep: zero console.error across all above flows.
75. All images loaded on `/`: every `<img>` naturalWidth > 0.
76. Responsive 375px: no horizontal scroll (`scrollWidth <= innerWidth`); quick-add and all CTAs fully inside viewport; sidebar becomes overlay with working mobile toggle + scrim close.
77. Responsive 768px: same assertions.
78. Composite-control geometry: quick-add (plus + input + date chip + calendar + star) — no part rects intersect at 375/768/1440 WITH a date chip present.
79. Screenshots: `/` populated, `/` empty, detail open, settings open, wallpaper open, 375px view — vision pass per Phase 4.5 checklist (overlap, alignment, truncation, affordance size, orphaned controls, asset craft).
80. Not-verified list: enumerate every INITIATED/STATIC item + the account-menu rule (N/A, evidence above) in the final report.
