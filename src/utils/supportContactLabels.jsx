import React from "react";
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from "../constants/supportContact";

/** RTL-safe: Arabic/French/English prefix + phone in an isolated LTR span (avoids bidi reordering). */
export function SupportPhoneInline({ t }) {
  const template = t.expiredCallSupport || "Call support: {phone}";
  const prefix = template.split("{phone}")[0].replace(/\s+$/u, "");
  return (
    <>
      {prefix}
      {" "}
      <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
        {SUPPORT_PHONE_DISPLAY}
      </span>
    </>
  );
}

/** Contact tile: localized label, em dash, email in LTR span (RTL-safe). */
export function SupportEmailTileLabel({ t }) {
  const lab = t.expiredEmailButton || "Email";
  return (
    <>
      {lab}
      {" — "}
      <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
        {SUPPORT_EMAIL}
      </span>
    </>
  );
}
