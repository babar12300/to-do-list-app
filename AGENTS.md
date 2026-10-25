# AGENTS.md

## Architecture decisions
- Device wallpapers are resized to bitmap data URLs and retained in local app preferences, with a storage-capacity check before selection, so personal photos stay on the device and remain selectable after reload.
- Email feature: the email composer hands drafts to the user's own mail client via a `mailto:` URL (`src/lib/email.ts`, `EmailComposer.tsx`). There is no in-app send path because no email sender domain is connected; if a verified sender domain is added later, replace `openMailto` with a per-feature Edge Function send (managed email templates) — never a generic accept-anything send endpoint.
- Composer visibility (`composerOpen`, `composerPrefill`) is ephemeral UI state in `AppState` and is stripped before every localStorage write (`persistable()` in AppContext.tsx), so reloading the page never reopens a half-written email.
