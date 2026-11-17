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

## What works so far (step 1)

- Home screen: your notebooks in a list, search across everything, a small + to create a notebook (blank or from a template).
- Notebook: class name, professor, room, time and email at the top; your own topics with notes inside.
- Note: two equal panels (your notes on the left, AI summary on the right) and a Source tab that slides in and away. On a phone the panels become two tabs.
- Everything saves automatically, on the device you are using.
- Light and dark mode.

## Coming next

2. Accounts and sync between iPhone and laptop
3. Block editor, toolbar and fonts
4. Sources (PDF, Word, photos, pasted text)
5. AI note maker
6. Lecture recording and transcripts
7. Search, templates and phone polish

## Where things are

- `app/` – the screens (home, notebook, note) and the styles in `globals.css`
- `components/` – small shared pieces (icons, light/dark switch)
- `lib/store.ts` – where notes are saved; the only file that changes when sync is added
