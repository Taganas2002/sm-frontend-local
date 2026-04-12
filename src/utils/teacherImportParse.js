import * as XLSX from "xlsx";
import {
  getTeacherImportHeaderMap,
  getTeacherImportSheetTitles,
  localizedTeacherNameHeaders,
  normHeader,
  resolveTeacherImportHeader,
} from "./importHeaderRegistry";

const asOptionalString = (v) => {
  if (v == null) return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return String(v).trim();
};

function pickTeacherSheet(workbook) {
  const names = workbook.SheetNames || [];
  const titles = getTeacherImportSheetTitles();
  const found = names.find((n) => titles.has(normHeader(n)));
  return found || names[0];
}

function buildTeacherPayload(obj, fullName) {
  const payload = {
    fullName,
    phone: asOptionalString(obj.phone) || null,
    email: asOptionalString(obj.email) || null,
  };
  Object.keys(payload).forEach((k) => {
    if (k !== "fullName" && (payload[k] === "" || payload[k] == null)) delete payload[k];
  });
  return payload;
}

/**
 * @returns {{ rows: Array<{ sheetRow: number, fullName: string, payload: object, skipReason?: string }>, errors: string[] }}
 */
export function parseTeacherImportWorkbook(workbook) {
  const errors = [];
  const name = pickTeacherSheet(workbook);
  if (!name) {
    errors.push("emptyWorkbook");
    return { rows: [], errors };
  }
  getTeacherImportHeaderMap();
  const sheet = workbook.Sheets[name];
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
  if (!aoa.length) {
    errors.push("emptySheet");
    return { rows: [], errors };
  }

  const headerRow = aoa[0];
  const colKeys = (headerRow || []).map((h) => resolveTeacherImportHeader(h));
  const fullNameColIdx = colKeys.findIndex((k) => k === "fullName");
  const nameHeaders = localizedTeacherNameHeaders();
  const rows = [];

  if (fullNameColIdx >= 0) {
    for (let r = 1; r < aoa.length; r++) {
      const line = aoa[r];
      if (!line || !line.length) continue;
      const obj = {};
      colKeys.forEach((key, c) => {
        if (!key) return;
        obj[key] = line[c];
      });
      const fullName = asOptionalString(obj.fullName);
      if (!fullName) {
        const allEmpty = line.every((c) => asOptionalString(c) === "");
        if (!allEmpty) rows.push({ sheetRow: r + 1, fullName: "", skipReason: "missingName", payload: null });
        continue;
      }
      rows.push({
        sheetRow: r + 1,
        fullName,
        payload: buildTeacherPayload(obj, fullName),
        skipReason: null,
      });
    }
  } else {
    for (let r = 0; r < aoa.length; r++) {
      const line = aoa[r];
      const cell = line && line[0];
      const fullName = asOptionalString(cell);
      if (!fullName) continue;
      const looksLikeHeader = r === 0 && nameHeaders.has(normHeader(fullName));
      if (looksLikeHeader) continue;
      rows.push({
        sheetRow: r + 1,
        fullName,
        payload: buildTeacherPayload({ fullName }, fullName),
        skipReason: null,
      });
    }
  }

  if (!rows.length) errors.push("noRows");
  return { rows, errors };
}

export function readTeacherImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        resolve(parseTeacherImportWorkbook(workbook));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("readFailed"));
    reader.readAsArrayBuffer(file);
  });
}
