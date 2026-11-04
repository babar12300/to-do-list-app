# Wallpaper sync
- [x] Private account storage for wallpapers and profile photos.
- [x] Sign-in and editable name/avatar.
- [x] Cross-device wallpaper gallery and existing-photo sync.
- [ ] Tests and signed-in end-to-end verification.

# AI daily planner
- [x] Finish task/deadline planning, validation, and error handling.
- [x] Deploy function; pass 19 planner/sidebar tests, check sign-in screen, and verify a real AI Gateway plan.
- [ ] Signed-in end-to-end planning and wallpaper verification: blocked because the app has no signed-up account; the user must sign in first.

# Account pages
- [x] Complete separate sign-in/sign-up pages and safe password recovery.
- [x] Pass 22 account/sidebar tests; verify phone/desktop links, password visibility, recovery guard, and a real authenticated session across reload.
- [ ] Verify real signup confirmation, password-reset email delivery, and provider authorization: requires completing email/provider interactions; mocked submissions are tested, but external flows are unverified.

# Account task syncing
- [ ] Add private task/list storage, existing-task import, account isolation, and offline retry.
- [ ] Test merge behavior and verify syncing across two signed-in browser sessions and reloads.
