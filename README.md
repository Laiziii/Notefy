# Notefy

Simple, comfortable notes for university classes.

## Run it on your computer

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

## Accounts and sync (step 2)

Turned on by adding two environment variables (see "Connect your Supabase
project" below). Until then the app works exactly as in step 1, saving only
to this browser.

- Continue as a guest (no email), sign in with an email link, or sign in
  with an email and password.
- A guest account can add an email and password later to turn into a real
  account, from the account button (top right of the home screen) — this
  keeps the same notes, it does not start over.
- Notes already saved in a browser are copied into whichever account first
  signs in from that browser.
- Changes sync to your other signed-in devices live.

### Connect your Supabase project

1. In your Supabase project, open the **SQL Editor** and run everything in
   `supabase/schema.sql` from this repo. It creates the notebooks, topics
   and notes tables with row-level security, so each account only ever
   sees its own data.
2. Open **Authentication → Sign In / Providers** and turn on:
   - **Anonymous sign-ins** (for guest accounts)
   - **Allow manual linking** (lets a guest add an email later without
     losing their notes)
   Email sign-in is already on by default.
3. Open **Authentication → URL Configuration** and set the **Site URL** to
   your live link, `https://notefy-silk.vercel.app`. If you want to test
   locally too, add `http://localhost:3000` under **Additional Redirect
   URLs**.
4. Open **Project Settings → API Keys** and copy the **Project URL** and
   the public key (shown as **anon public** or **Publishable key**,
   depending on your project).
5. In Vercel, open the Notefy project → **Settings → Environment
   Variables**, and add:
   - `NEXT_PUBLIC_SUPABASE_URL` — the Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the public key
   Then redeploy (Vercel usually offers a **Redeploy** button right after
   you save the variables).

To run it locally with accounts on, copy `.env.local.example` to
`.env.local` and fill in the same two values.

## What works so far (step 1)

- Home screen: your notebooks in a list, search across everything, a small + to create a notebook (blank or from a template).
- Notebook: class name, professor, room, time and email at the top; your own topics with notes inside.
- Note: one toolbar (fonts, size, bold, italic, underline, strikethrough, headings, lists, colours, highlights, line spacing) above two panels: your notes on the left, AI summary on the right. Drag the bar between them to resize, close the AI side to focus, and open the Source tab on the right edge when you need it. On a phone the panels become three tabs.
- Everything saves automatically, on the device you are using.
- Light and dark mode.

## Coming next

3. Block editor (drag handles, slash commands, block menu)
4. Sources (PDF, Word, photos, pasted text)
5. AI note maker
6. Lecture recording and transcripts
7. Search, templates and phone polish

## Where things are

- `app/` – the screens (home, notebook, note) and the styles in `globals.css`
- `components/` – shared pieces (toolbar, editor, dialogs, icons, light/dark switch)
- `lib/fonts.ts` – the font list and colour palette
- `lib/store.ts` – where notes are saved, either to this browser or to Supabase
- `lib/auth.tsx` – signing in, out, and guest-to-account upgrades
- `lib/supabase.ts` – the Supabase client
- `supabase/schema.sql` – the database tables and security rules to run in Supabase
