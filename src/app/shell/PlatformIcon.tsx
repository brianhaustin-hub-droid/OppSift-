export type PlatformIconName =
  | "admin"
  | "alerts"
  | "applications"
  | "analytics"
  | "brand"
  | "categories"
  | "collapse"
  | "commercial"
  | "funding"
  | "globe"
  | "government"
  | "help"
  | "intelligence"
  | "menu"
  | "moon"
  | "overview"
  | "profile"
  | "saved"
  | "search"
  | "settings"
  | "sun"
  | "team"
  | "workspace"
  | "close";

const paths: Record<PlatformIconName, string> = {
  admin: "M12 3 19 6v5c0 4.4-2.8 7.8-7 10-4.2-2.2-7-5.6-7-10V6l7-3Zm-2.5 9 1.7 1.7 3.4-3.5",
  alerts:
    "M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4",
  applications:
    "M8 5h8l2 2h3v13H3V7h3l2-2Zm0 7h8m-8 4h5M8 5V3h8v2",
  analytics:
    "M4 19V5m0 14h17M8 15l3-4 3 2 5-7m0 0h-4m4 0v4",
  brand:
    "M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4l8-4.6Zm0 4.8v4.4m8-4.6-4.6 2.7M20 16.6l-4.7-2.7M12 21.2v-4.6M4 16.6l4.7-2.7M4 7.4l4.6 2.7",
  categories:
    "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
  collapse: "M14 5 7 12l7 7M7 12h13",
  commercial:
    "M3 20h18M5 20V8l7-4 7 4v12M9 10h.01M15 10h.01M9 14h.01M15 14h.01M11 20v-3h2v3",
  funding:
    "M12 3v18m5-14.5c-.7-1-2.2-1.5-4-1.5-2.5 0-4 1.2-4 3s1.5 2.7 4 3.2 4 1.2 4 3.2-1.6 3.6-4.2 3.6c-2 0-3.7-.7-4.8-1.9",
  globe:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3.5 12h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
  government:
    "m3 9 9-6 9 6H3Zm2 2v7m4-7v7m6-7v7m4-7v7M3 21h18M2 18h20",
  help: "M12 18h.01M9.1 9a3 3 0 1 1 5.2 2c-1.1 1.1-2.3 1.3-2.3 3m10-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  intelligence:
    "M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  menu: "M4 6h16M4 12h16M4 18h16",
  moon: "M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z",
  overview:
    "M3 3h8v8H3V3Zm10 0h8v5h-8V3Zm0 7h8v11h-8V10ZM3 13h8v8H3v-8Z",
  profile:
    "M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  saved: "M6 4h12v17l-6-4-6 4V4Z",
  search: "m20 20-4.5-4.5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
  settings:
    "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0-5v2m0 13v2m9-8h-2m-14 0H3m15.4-6.4-1.4 1.4M7 17l-1.4 1.4m12.8 0L17 17M7 7 5.6 5.6",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v2m0 16v2m10-10h-2M4 12H2m17.1-7.1-1.4 1.4M6.3 17.7l-1.4 1.4m14.2 0-1.4-1.4M6.3 6.3 4.9 4.9",
  team:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.9m-1-12.1a4 4 0 0 1 0 7.8",
  workspace:
    "M4 7h16v13H4V7Zm4 0V4h8v3m-8 6h8",
  close: "m5 5 14 14M19 5 5 19",
};

export function PlatformIcon({ name }: { name: PlatformIconName }) {
  return (
    <svg
      aria-hidden="true"
      className="platform-icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d={paths[name]} />
      {name === "brand" && (
        <circle className="platform-icon__brand-core" cx="12" cy="12" r="2" />
      )}
    </svg>
  );
}
