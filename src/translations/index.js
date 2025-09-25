import ar from "./ar";
import fr from "./fr";

const translations = { ar, fr };
export default translations;

// Helper: get a human label for MENU:* code
export function labelForMenu(code, t) {
  // exact match if provided in translation file
  if (t?.menu?.[code]) return t.menu[code];

  // graceful fallback: derive from code
  const short = String(code).replace(/^MENU:/, "").replace(/:/g, " · ");
  // turn SNAKE_CASE into normal words
  return short
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}
