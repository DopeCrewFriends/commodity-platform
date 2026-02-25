# Resetting platform data

To reset all platform data (contacts, escrow history, and users):

## 1. Reset the database (Supabase)

1. Open **Supabase Dashboard** → your project → **SQL Editor**.
2. Open **`reset-platform-data.sql`** from this folder (or paste its contents).
3. Run the script. It will:
   - Delete all **escrows**
   - Delete all **contact_requests**
   - Delete all **contacts**
   - Delete all **profiles**

That's all that's required for the backend. The app will show empty lists on next load/refresh.

## 2. Clear client-side escrow cache (after DB reset)

If you ran the SQL reset but **escrow history still appears**, the app is showing cached data from localStorage.

### Option A: Cache-wipe URL (recommended)

1. Open your app with **`?clearEscrowCache=1`** (e.g. `https://your-app.com/?clearEscrowCache=1`).
2. The app clears all escrow localStorage and reloads. Escrow history will be empty.

### Option B: Manual

- DevTools → Application → Local Storage → remove keys like `user_<walletAddress>_escrows`, or clear all `user_*` keys for the site.

For contacts and other data, keys look like `user_<walletAddress>_<dataType>`.

## Summary

| What you want        | Action                                              |
|----------------------|-----------------------------------------------------|
| Wipe DB only         | Run `reset-platform-data.sql` in Supabase SQL Editor |
| Wipe DB + local UI   | Run the SQL script, then open app with `?clearEscrowCache=1` or clear localStorage |
