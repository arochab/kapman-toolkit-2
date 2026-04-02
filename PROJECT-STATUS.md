# PROJECT STATUS

## Current state
Platform baseline complete. Core product flywheel is live.

## Stack
- Svelte 5 (Runes: `$state`, `$derived`, `$effect`)
- Vite 6 + `@sveltejs/vite-plugin-svelte` v6
- Tailwind CSS v4 (theme in `src/app.css @theme`, no config file)
- TypeScript 5 (`moduleResolution: bundler`, `skipLibCheck: true`)
- Supabase (`@supabase/supabase-js` v2, email OTP auth)

## Features implemented
- Recipe library (20 recipes, search + filters by category/tag/favorites)
- Audio analyzer (FFT: peak, RMS, LUFS, true-peak, phase, 64-band spectrum)
- Mix diagnostics (5 issue types with severity, beginner + expert guidance)
- **Analyzer → recipe bridge** (tag-overlap scoring surfaces top 3 recipes per diagnosis)
- User favorites and notes (Supabase-persisted, atomic upsert)
- Projects CRUD + checklist + comments + member invites
- Email OTP authentication

## Audit findings (2026-04-01)
Top 7 issues identified, first 3 addressed:
1. [x] Analyzer → recipes gap — implemented tag-overlap suggestion engine
2. [x] Missing `.hero-actions` CSS class — home page CTA buttons now flex-row
3. [x] RecipeCard category pill only activated on "mixing" — all categories now styled

Remaining backlog (ranked):
4. [x] Save-analysis-to-project — snapshot posted as a project comment (verdict, metrics, issues, recipes)
5. [x] No user-visible error states — global toast system added (toast.svelte.ts + Toast.svelte), all silent catch blocks now surface errors; note save + add-to-project also show success confirmation
6. [ ] No post-auth first-step guidance — user lands on home after login with no next step
7. [ ] Recipes hardcoded — can't grow library without a code deploy

## Build setup
- `package.json` — Svelte 5 + Vite 6 + Tailwind v4 + Supabase
- `vite.config.ts` — Tailwind plugin before Svelte plugin
- `tsconfig.json` — strict, bundler resolution, skipLibCheck
- `svelte.config.js` — vitePreprocess
- `index.html` — Vite entry point
- `.env.example` — VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY

## Shipping log
- 2026-04-02: feat/toast-errors closed. Global toast system added. All silent Supabase failures now surface to the user. Build: 317kB JS, 1.38s. check: 0 errors.
- 2026-04-02: feat/save-analysis closed. Analyzer now saves snapshots to project comments. Build: 314kB JS, 1.82s. check: 0 errors.
- 2026-04-01: feat/bootstrap-v2 merged to main, pushed to origin. Build: 311kB JS, 1.29s. check: 0 errors. Deployment config missing — see next step below.

## Deployment status
**BLOCKED**: No Cloudflare Pages project is connected to this repo yet. No wrangler.toml, no GitHub Actions workflow, no Pages integration found. Manual setup required (see below).

## Next phase audit (top 5)
1. **No production deploy path** — CF Pages not connected; site is not live yet.
2. ~~No save-analysis-to-project~~ — DONE (2026-04-02)
3. **Silent failure states** — Supabase errors fail invisibly; user sees nothing.
4. **No post-auth onboarding** — user lands on home after login with zero next-step guidance.
5. **Recipes hardcoded** — library can only grow via code deploy; no CMS or admin layer.

**Highest-leverage next improvement**: Connect Cloudflare Pages → deploy → then tackle save-analysis-to-project (closes the product flywheel: diagnose → recipe → save to project).

## To run
```bash
npm install
cp .env.example .env   # fill in Supabase credentials
npm run dev
```

## Type check / build
```bash
npm run check   # svelte-check: 161 files, 0 errors
npm run build   # vite build: 311 kB JS, 1.3s
```
