import ar from "./ar";
import en from "./en";
import fr from "./fr";

const translations = { ar, en, fr };

export default translations;

export function getTranslations(language = "fr") {
  return translations[language] || translations.fr;
}

export function labelForMenu(code, t) {
  if (t?.menu?.[code]) return t.menu[code];

  const short = String(code).replace(/^MENU:/, "").replace(/:/g, " � ");
  return short
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export function translateBillingStatus(value, t) {
  const normalized = String(value || "").toUpperCase();
  const labels = {
    ALL: t?.all || "All",
    UNPAID: t?.unpaid || "Unpaid",
    PARTIAL: t?.partial || "Partial",
    PAID: t?.paid || "Paid",
    PENDING_ATTENDANCE: t?.pendingAttendance || "Pending attendance",
  };
  return labels[normalized] || value || "";
}

export function translateBillingModel(value, t) {
  const normalized = String(value || "").toUpperCase();
  const perSession = t?.perSession || t?.per_session || "Per session";
  const monthly = t?.monthly || "Monthly";
  const perHour = t?.perHour || "Per hour";
  const labels = {
    PER_SESSION: perSession,
    MONTHLY: monthly,
    PER_HOUR: perHour,
  };
  return labels[normalized] || value || "";
}

