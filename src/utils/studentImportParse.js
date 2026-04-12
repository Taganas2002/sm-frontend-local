import * as XLSX from "xlsx";
import {
  getStudentImportSheetTitles,
  localizedStudentNameHeaders,
  normHeader,
  resolveStudentImportHeader,
} from "./importHeaderRegistry";

const excelSerialToYMD = (serial) => {
  if (serial == null || serial === "") return "";
  const n = Number(serial);
  if (!Number.isFinite(n)) return String(serial).trim();
  const utc = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(utc);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const asOptionalString = (v) => {
  if (v == null) return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return String(v).trim();
};

const asOptionalLong = (v) => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
};

const asOptionalDate = (v) => {
  if (v == null || v === "") return "";
  if (typeof v === "number") return excelSerialToYMD(v);
  const s = String(v).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
};

function pickStudentSheet(workbook) {
  const names = workbook.SheetNames || [];
  const titles = getStudentImportSheetTitles();
  const found = names.find((n) => titles.has(normHeader(n)));
  return found || names[0];
}

/**
 * @returns {{ rows: Array<{ sheetRow: number, fullName: string, payload: object, skipReason?: string }>, errors: string[] }}
 */
export function parseStudentImportWorkbook(workbook) {
  const errors = [];
  const name = pickStudentSheet(workbook);
  if (!name) {
    errors.push("emptyWorkbook");
    return { rows: [], errors };
  }
  const sheet = workbook.Sheets[name];
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
  if (!aoa.length) {
    errors.push("emptySheet");
    return { rows: [], errors };
  }

  const headerRow = aoa[0];
  const colKeys = (headerRow || []).map((h) => resolveStudentImportHeader(h));
  const fullNameColIdx = colKeys.findIndex((k) => k === "fullName");
  const rows = [];
  const nameHeaders = localizedStudentNameHeaders();

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
      const payload = buildPayload(obj, fullName);
      rows.push({ sheetRow: r + 1, fullName, payload, skipReason: null });
    }
  } else {
    for (let r = 0; r < aoa.length; r++) {
      const line = aoa[r];
      const cell = line && line[0];
      const fullName = asOptionalString(cell);
      if (!fullName) continue;
      const looksLikeHeader = r === 0 && nameHeaders.has(normHeader(fullName));
      if (looksLikeHeader) continue;
      const payload = buildPayload({ fullName }, fullName);
      rows.push({ sheetRow: r + 1, fullName, payload, skipReason: null });
    }
  }

  if (!rows.length) errors.push("noRows");
  return { rows, errors };
}

function buildPayload(obj, fullName) {
  const levelId = asOptionalLong(obj.levelId);
  const sectionId = asOptionalLong(obj.sectionId);
  const payload = {
    fullName,
    levelId,
    sectionId,
    dob: asOptionalDate(obj.dob) || null,
    gender: asOptionalString(obj.gender) || null,
    phone: asOptionalString(obj.phone) || null,
    email: asOptionalString(obj.email) || null,
    address: asOptionalString(obj.address) || null,
    guardianName: asOptionalString(obj.guardianName) || null,
    guardianPhone: asOptionalString(obj.guardianPhone) || null,
    enrollmentDate: asOptionalDate(obj.enrollmentDate) || null,
    medicalNotes: asOptionalString(obj.medicalNotes) || null,
    photoUrl: asOptionalString(obj.photoUrl) || null,
  };
  const schoolId = asOptionalLong(obj.schoolId);
  if (schoolId) payload.schoolId = schoolId;

  Object.keys(payload).forEach((k) => {
    if (payload[k] === "" || payload[k] === null || payload[k] === undefined) {
      if (k !== "fullName") delete payload[k];
    }
  });

  return payload;
}

export function readStudentImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        resolve(parseStudentImportWorkbook(workbook));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("readFailed"));
    reader.readAsArrayBuffer(file);
  });
}
