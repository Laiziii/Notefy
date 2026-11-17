/*
 * The font list for the toolbar. Web fonts come from Google Fonts and are only
 * downloaded when a note actually uses them (or when the font menu is opened,
 * and then only the few letters needed to show each font's name).
 */

export type Font = { name: string; stack: string; web: boolean };
export type FontGroup = { label: string; fonts: Font[] };

const web = (fallback: string, names: string[]): Font[] =>
  names.map((name) => ({ name, stack: `"${name}", ${fallback}`, web: true }));

export const FONT_GROUPS: FontGroup[] = [
  {
    label: "Clean (sans-serif)",
    fonts: web("system-ui, sans-serif", [
      "Inter",
      "Roboto",
      "Open Sans",
      "Lato",
      "Source Sans 3",
      "Nunito",
      "Work Sans",
      "DM Sans",
      "IBM Plex Sans",
      "Poppins",
      "Montserrat",
      "Raleway",
      "Rubik",
      "Karla",
      "Manrope",
      "Figtree",
      "Atkinson Hyperlegible",
      "Lexend",
    ]),
  },
  {
    label: "Bookish (serif)",
    fonts: web("Georgia, serif", [
      "Lora",
      "Merriweather",
      "Source Serif 4",
      "EB Garamond",
      "Crimson Pro",
      "Libre Baskerville",
      "Playfair Display",
      "PT Serif",
      "Literata",
      "Newsreader",
      "Spectral",
      "Cormorant Garamond",
      "Bitter",
      "IBM Plex Serif",
    ]),
  },
  {
    label: "Handwriting",
    fonts: web("cursive", [
      "Caveat",
      "Patrick Hand",
      "Kalam",
      "Indie Flower",
      "Shadows Into Light",
      "Architects Daughter",
      "Comic Neue",
    ]),
  },
  {
    label: "Typewriter (monospace)",
    fonts: web("ui-monospace, monospace", [
      "JetBrains Mono",
      "IBM Plex Mono",
      "Source Code Pro",
      "Fira Code",
      "Space Mono",
      "Courier Prime",
    ]),
  },
  {
    label: "Already on your device",
    fonts: [
      { name: "Georgia", stack: "Georgia, serif", web: false },
      { name: "Times New Roman", stack: '"Times New Roman", Times, serif', web: false },
      { name: "Arial", stack: "Arial, Helvetica, sans-serif", web: false },
      { name: "Verdana", stack: "Verdana, sans-serif", web: false },
      { name: "Courier New", stack: '"Courier New", Courier, monospace', web: false },
    ],
  },
];

export const ALL_FONTS: Font[] = FONT_GROUPS.flatMap((g) => g.fonts);
export const fontByName = (name: string | undefined) => ALL_FONTS.find((f) => f.name === name);

/** Finds which font from the list a CSS font-family value (like `"Lora", Georgia, serif`) refers to. */
export function fontFromStack(stack: string | null | undefined): Font | undefined {
  if (!stack) return undefined;
  const first = stack.split(",")[0].trim().replace(/^["']|["']$/g, "");
  return fontByName(first);
}

const loaded = new Set<string>();

function addStylesheet(key: string, href: string) {
  if (typeof document === "undefined" || loaded.has(key)) return;
  loaded.add(key);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

const family = (name: string) => encodeURIComponent(name).replace(/%20/g, "+");

/** Downloads a web font (regular, bold, italic, bold italic) the first time it is needed. */
export function ensureFont(font: Font | undefined) {
  if (!font?.web) return;
  addStylesheet(
    `full:${font.name}`,
    `https://fonts.googleapis.com/css2?family=${family(font.name)}:ital,wght@0,400;0,700;1,400;1,700&display=swap`,
  );
}

/** Downloads just the letters of each font's own name, so the font menu can show every font as itself. */
export function ensureFontPreviews() {
  for (const font of ALL_FONTS) {
    if (!font.web || loaded.has(`full:${font.name}`)) continue;
    addStylesheet(
      `preview:${font.name}`,
      `https://fonts.googleapis.com/css2?family=${family(font.name)}&text=${encodeURIComponent(font.name)}&display=swap`,
    );
  }
}

/** Makes sure every font used inside some saved note content is downloaded. */
export function ensureFontsIn(html: string | undefined) {
  if (!html) return;
  for (const match of html.matchAll(/font-family:\s*([^;>]+)/g)) {
    ensureFont(fontFromStack(match[1].replace(/&quot;/g, '"')));
  }
}

export const FONT_SIZES = [14, 16, 18, 20, 22, 24, 28, 32, 40];
export const DEFAULT_FONT_SIZE = 18;

/** The fixed colour palette. Values are CSS variables so they stay readable in dark mode. */
export const COLOURS = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"] as const;
export const textColour = (name: string) => `var(--c-${name})`;
export const highlightColour = (name: string) => `var(--h-${name})`;
