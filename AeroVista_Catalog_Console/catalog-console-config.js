/**
 * Catalog Console v2 runtime config — synced to public/console/.
 * NOT the same as AVCC (AeroVista Command Center @ avcc.aerocoreos.com).
 */
window.CATALOG_CONSOLE_CONFIG = {
  version: 2,
  bridge: "AV Store Static Bridge",
  commandCenterUrl: "https://avcc.aerocoreos.com/",
  shopUrl: "https://gear.aerovista.us/",
  consoleUrl: "https://store-console.aerocoreos.com/",
  apiUrl: "https://api.aerovista.us/",
  apiBootstrapPath: "/api/square/bootstrap",
  manifestPaths: [
    "../public/build-source-manifest.json",
    "/public/build-source-manifest.json",
    "build-source-manifest.json",
  ],
  deployLocalUrl: "http://127.0.0.1:5199",
  collectionLanes: [
    { value: "Core", lane: "core", hint: "Home lane — Core" },
    { value: "Shadow Wear", lane: "shadow", hint: "Home lane — Shadow Wear" },
    { value: "Apex Pattern", lane: "shadow", hint: "Shadow lane (pattern line)" },
    { value: "Apex", lane: "apex", hint: "Home lane — Apex" },
    { value: "Glitch Line", lane: "glitch", hint: "Home lane — Glitch" },
    { value: "Glitch", lane: "glitch", hint: "Home lane — Glitch" },
    { value: "Architect", lane: "architect", hint: "Home lane — Architect" },
    { value: "Draft Series", lane: "architect", hint: "Architect lane" },
    { value: "DockLife", lane: "docklife", hint: "Home lane — DockLife (harbor / lake)" },
    { value: "Accessories", lane: "accessories", hint: "Home lane — Accessories (sleeves / coolers / cases)" },
    { value: "Gear", lane: "accessories", hint: "Accessories lane alias (hard goods)" },
    { value: "Wave Mark", lane: null, hint: "Tag-only collection" },
    { value: "Orbit Mark", lane: null, hint: "Tag-only collection" },
    { value: "Powder Peaks", lane: null, hint: "Tag-only collection" },
    { value: "Vespera", lane: null, hint: "Tag-only collection" },
    { value: "Services", lane: null, hint: "Internal / non-lane" },
  ],
};

/** @deprecated Use CATALOG_CONSOLE_CONFIG — AVCC is AeroVista Command Center (separate app). */
window.AVCC_CONFIG = window.CATALOG_CONSOLE_CONFIG;
