import type { ReactNode } from "react";

function Svg({ children, size = 20 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const PlusIcon = () => (
  <Svg>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const BackIcon = () => (
  <Svg>
    <path d="M15 18l-6-6 6-6" />
  </Svg>
);
export const ChevronIcon = () => (
  <Svg size={18}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);
export const CaretIcon = () => (
  <Svg size={14}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);
export const SearchIcon = () => (
  <Svg>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Svg>
);
export const TrashIcon = () => (
  <Svg>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" />
  </Svg>
);
export const PencilIcon = () => (
  <Svg>
    <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />
  </Svg>
);
export const CloseIcon = () => (
  <Svg>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const SunIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
  </Svg>
);
export const MoonIcon = () => (
  <Svg>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </Svg>
);
export const SourceIcon = () => (
  <Svg size={18}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </Svg>
);
export const UserIcon = () => (
  <Svg>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" />
  </Svg>
);
export const SparkIcon = () => (
  <Svg size={18}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16v4M17 18h4" />
  </Svg>
);
export const BulletsIcon = () => (
  <Svg>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1" fill="currentColor" />
    <circle cx="4.5" cy="12" r="1" fill="currentColor" />
    <circle cx="4.5" cy="18" r="1" fill="currentColor" />
  </Svg>
);
export const NumbersIcon = () => (
  <Svg>
    <path d="M10 6h10M10 12h10M10 18h10M4 4.5l1.5-.8V9M3.8 14.5c.3-.9 2.7-1 2.7.4 0 1-1.6 1.700-2.700 3.100h2.900" />
  </Svg>
);
export const UndoIcon = () => (
  <Svg>
    <path d="M8 5L4 9l4 4M4 9h10a6 6 0 0 1 0 12h-3" />
  </Svg>
);
export const RedoIcon = () => (
  <Svg>
    <path d="M16 5l4 4-4 4M20 9H10a6 6 0 0 0 0 12h3" />
  </Svg>
);
export const SpacingIcon = () => (
  <Svg>
    <path d="M11 6h9M11 12h9M11 18h9M5 5v14M2.500 7.500L5 5l2.500 2.500M2.500 16.500L5 19l2.500-2.500" />
  </Svg>
);
export const HighlightIcon = () => (
  <Svg>
    <path d="M9 14l-3 3v2h3l2-2M9 14l7-9 4 3-7 9zM13 9l4 3" />
  </Svg>
);
