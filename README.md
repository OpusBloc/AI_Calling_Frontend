# Opus Bloc Admin — starter

A slim copy of `admin\fractionalization-Admin-Frontend` for building a new
feature on its own. It has the **same packages, folder layout, login flow,
role gating, CSS tokens and UI kit**, but none of the existing dashboard tabs.
Every shared file sits at the **same path** as in the main repo, so finished
work can be copied straight back.

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
```

`.env.local` was copied from the main repo (the old private-key line was left
out). `.env.example` lists the variable names.

## What's included

| Area | Files | Same as main repo? |
|---|---|---|
| Packages / config | `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `next-i18next.config.ts` | Yes, identical |
| CSS / theme | `src/app/globals.css`, `src/app/layout.tsx` (fonts, dark mode) | Yes |
| Login flow | `src/app/auth/*` (login, signup, OTP, forgot password, logout), `src/components/auth/AuthGuard.tsx`, `src/lib/auth.ts`, `src/hooks/useAuth.ts` | Yes |
| API | `src/lib/api.ts` (`api` + `channelPartnerApi`), `src/constant.ts` | Yes |
| UI kit | `src/components/ui/*` (`Card`, `Button`, `Badge`, `Stat`, `Select`, …) | Yes |
| Navbar / layout | `Navbar.tsx`, `LayoutShell.tsx`, live socket + support chat alerts | Yes |
| Helpers | `src/lib/*`, `src/hooks/*`, `src/types/*`, `src/utils/*`, `src/locales/*` | Yes |
| **Dashboard shell** | `src/components/HeroSection.tsx` | **No, starter only** |
| **Example tab** | `src/components/profile/ExampleTab.tsx` | **No, a template** |

### Roles (same rules as the main repo)

- **ADMIN** sees every tab.
- **ADMINISTRATIVE** sees the same tabs, read-only: the tab gets `readOnly={true}`.
- **SUPPORT** sees only tabs that list `"SUPPORT"` in `roles`.

Log in with a real admin or support account. It uses the same backend as the
main repo.

## Building a new tab

1. Copy `src/components/profile/ExampleTab.tsx` to
   `src/components/profile/MyFeatureTab.tsx` and build it there.
2. Add it to `TABS` at the top of `src/components/HeroSection.tsx`, giving its
   `tab` key, label, icon and `roles`.
3. Render it in `<main>`:
   `{activeTab === "my-feature" && <MyFeatureTab readOnly={isReadOnly} />}`

Rules carried over from the main repo:
- import with `@/…`, never `../`;
- use `api` for the main backend and `channelPartnerApi` for `/channel-partner/*`, never raw axios;
- put `apiErrorMessage(e, "…")` in every `catch`;
- build UI from `@/components/ui` and the colour tokens (`bg-surface`, `text-heading`, `text-muted`, `bg-accent-bg`, …), not new hex colours;
- start every interactive file with `"use client"`.

## Merging back into the main repo

1. **Copy** your new files to the same paths in
   `admin\fractionalization-Admin-Frontend`, e.g.
   `src/components/profile/MyFeatureTab.tsx`, plus any new `src/app/<route>/`,
   `src/lib/…` or `src/hooks/…` files.
2. **Do not copy** `src/components/HeroSection.tsx` or `ExampleTab.tsx`.
   Instead, in the main repo's `HeroSection.tsx`:
   - import the tab;
   - add its key to the `Tab` union and to `allowedTabs`, including the SUPPORT
     list if support should see it;
   - add a `SidebarItem` (or `SidebarSubItem` inside a group);
   - add the `activeTab === "my-feature" && …` render line.
3. If you **changed a shared file** (`globals.css`, `ui/*`, `lib/*`, …), compare
   it with the main repo's copy instead of overwriting it. The main repo may
   have moved on since this starter was made, so merge only your lines.
4. If you **added a package**, run `npm install <pkg>` in the main repo too,
   rather than copying `package.json`.
5. Run `npm run build` in the main repo.

Git is set up here with a first commit of the starter as it was created, so
`git status` and `git diff` show exactly what you added or changed.

## Note

This folder is on the OneDrive Desktop, like the main repo. If `npm run dev`
fails with `os error 362` or a `.next … readlink` error: stop the server,
delete `.next`, and either right-click `.next` → "Always keep on this device"
or move this folder out of OneDrive (e.g. `C:\dev\admin-starter`).
