# Stack Overview & Process Optimizations

## 1. Stack Summary

| Layer | Technology | Notes |
|-------|------------|--------|
| **UI** | React 18, TypeScript | Strict TS (`noUnusedLocals`, `noUnusedParameters`) |
| **Build** | Vite 5 | `tsc && vite build`; target ES2020 |
| **Routing** | react-router-dom v7 | BrowserRouter, no data loaders |
| **Data / Backend** | Supabase (PostgreSQL) | **Direct client** from browser via `@supabase/supabase-js`; no serverless API layer |
| **Auth / Wallet** | @solana/kit | Wallet connect; `useWallet`, `useAuth` |
| **Prices** | CoinGecko API | SOL price in `useBalances`; 60s refresh |
| **Hosting** | Vercel | Static frontend only (no `/api` folder in repo) |
| **Env** | `VITE_SUPABASE_*` | Exposed to client; set in Vercel for deploys |

So: **single frontend app** that talks to **Supabase** and **CoinGecko** from the browser. No Node server or Vercel functions in the current codebase.

---

## 2. Process Structure

### 2.1 Entry & shell

- **Entry:** `index.html` → `src/main.tsx` → `App.tsx` (wrapped in `Router`).
- **Dev:** `npm run dev` → Vite on port 3000; or `vercel dev` (README/SETUP mention this for “API routes”, but there are no API routes in the repo).
- **Build:** `npm run build` → `tsc` (type-check only, `noEmit: true`) then `vite build` → `dist/`.
- **Deploy:** Vercel runs `vercel build` → `npm run build`; static assets from `dist/`; env from Vercel (e.g. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

### 2.2 Data flow (high level)

- **Wallet:** `useWallet()` in `AppContent` → `walletAddress`, `isConnected`, `connect`, `disconnect`. Single source for “who is connected”.
- **Profile:** `useProfile(false, walletAddress)` is called in **three places**: `App.tsx`, `ProfilePage`, `AccountPage`. Each call is an independent hook instance → **no shared cache** → duplicate Supabase fetches when navigating (e.g. Dashboard vs Account).
- **Escrows:** `useEscrows(walletAddress)` in `EscrowsPage` and `ProfilePage` (dashboard). Each page has its own instance; no module-level cache → refetch when switching between /dashboard and /escrows.
- **Contacts:** `useContacts()` uses a **module-level in-memory cache** (`contactsCache`) + optional localStorage; good pattern to reuse.
- **Profiles (bulk):** `useProfilesCache(walletAddresses)` used by `EscrowsSection` and `NotificationsPanel`; has shared cache + deduped in-flight requests.
- **Balances / Notifications:** `useBalances`, `useNotifications` are used where needed; no shared cache (balances are per-page).

### 2.3 Where data lives

- **Supabase:** Source of truth for profiles, escrows, contacts, contact_requests, notifications (if you use those tables).
- **localStorage:** Wallet preference, theme, and fallback/cache for some data (e.g. contacts, escrows when Supabase fails or for legacy support).

---

## 3. Optimizations (by impact / effort)

### High impact, low effort

1. **Single profile source (remove duplicate `useProfile`)** ✅ *Done*  
   - **Issue:** `App`, `ProfilePage`, and `AccountPage` each call `useProfile()`. When on Dashboard or Account, the same profile was fetched twice (App + page).  
   - **Change:** Profile is fetched once in `App`; `profileData`, `statistics`, `updateProfile`, and `checkUsernameAvailability` are passed as props to `ProfilePage` and `AccountPage`. Those pages no longer call `useProfile()`.  
   - **Result:** Fewer Supabase requests, one source of truth for profile, simpler mental model.

2. **Align docs with reality (README / SETUP)**  
   - **Issue:** README references “Vercel serverless functions in `/api`” and SETUP says use `vercel dev` for “API routes”; there is no `/api` in the repo and the app uses Supabase directly.  
   - **Change:** Update README “Architecture” and “Project structure” to say the app talks to Supabase from the client; remove or qualify references to API routes. In SETUP, clarify that `npm run dev` is enough for local dev unless you add serverless functions later.  
   - **Result:** Fewer confusion and wrong expectations for new contributors.

### Medium impact, medium effort

3. **Cache escrows per wallet (optional)**  
   - **Issue:** Navigating between Dashboard (ProfilePage with escrows) and Escrows page causes a new `useEscrows()` run and refetch.  
   - **Change:** Add a module-level cache (e.g. by `walletAddress`) with a short TTL or invalidate on create/update/cancel, similar to `useContacts` / `useProfilesCache`.  
   - **Result:** Smoother navigation, fewer duplicate Supabase reads.

4. **SOL price: single global fetch** ✅ *Done*  
   - **Issue:** `useBalances` is used on ProfilePage; if you use balances elsewhere, each instance runs its own 60s CoinGecko interval.  
   - **Change:** One global subscription or small context that fetches SOL price and exposes it; components only consume.  
   - **Result:** One CoinGecko request per 60s instead of one per hook instance.  
   - **Implementation:** `SOLPriceProvider` in `src/contexts/SOLPriceContext.tsx` wraps the app; `useBalances` uses `useSOLPrice()` for `solPrice`/`priceLoading`. Any future component can call `useSOLPrice()` without adding another interval.

### Lower priority / later

5. **Vite config cleanup**  
   - `vite.config.ts` marks `id.includes('/api/')` etc. as external; no `/api` in the project. Safe to remove that `external` block unless you plan to add serverless routes.

6. **Explicit Node / npm version for Vercel**  
   - Add an `engines` field in `package.json` (e.g. `"node": ">=18"`) and, if needed, set Node version in Vercel project settings so builds are reproducible.

7. **Environment parity**  
   - Use the same env names locally (e.g. `.env` with `VITE_SUPABASE_*`) as in Vercel so “works on my machine” matches production.

---

## 4. Quick reference: who calls what

| Hook | Used in | Caching |
|------|--------|--------|
| `useWallet` | App | N/A (single place) |
| `useProfile` | App only (profile passed as props to ProfilePage, AccountPage) | None (single fetch) |
| `useEscrows` | EscrowsPage, ProfilePage | None |
| `useContacts` | (likely ContactsSection / modals) | In-memory + localStorage |
| `useProfilesCache` | EscrowsSection, NotificationsPanel | In-memory + request dedup |
| `useBalances` | ProfilePage | None |
| `useNotifications` | ProfilePage | None |

Implementing **#1 (single profile source)** and **#2 (doc updates)** gives the best clarity and fewer redundant requests with minimal code change. If you want, we can do #1 next (prop or context API and remove duplicate `useProfile` in ProfilePage and AccountPage).
