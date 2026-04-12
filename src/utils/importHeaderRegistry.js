import { getTranslations } from "../translations";

const LANGS = ["en", "ar", "fr"];

export function normHeader(h) {
  return String(h ?? "")
    .trim()
    .replace(/\uFEFF/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function putHeader(map, label, field) {
  if (!label || !field) return;
  const k = normHeader(label);
  if (!k) return;
  map.set(k, field);
  const compact = k.replace(/ /g, "");
  if (compact && compact !== k) map.set(compact, field);
}

/** English + common aliases (technical keys, legacy templates). */
const STUDENT_STATIC_HEADERS = [
  ["fullName", "full name"],
  ["fullName", "fullname"],
  ["fullName", "name"],
  ["fullName", "nom"],
  ["fullName", "اسم الطالب"],
  ["fullName", "اسم التلميذ"],
  ["fullName", "الاسم الكامل"],
  ["levelId", "levelid"],
  ["levelId", "level id"],
  ["levelId", "level"],
  ["levelId", "levels"],
  ["sectionId", "sectionid"],
  ["sectionId", "section id"],
  ["sectionId", "section"],
  ["sectionId", "sections"],
  ["sectionId", "branch"],
  ["dob", "dob"],
  ["dob", "date of birth"],
  ["dob", "birthday"],
  ["gender", "gender"],
  ["gender", "sex"],
  ["phone", "phone"],
  ["phone", "mobile"],
  ["phone", "tel"],
  ["email", "email"],
  ["address", "address"],
  ["guardianName", "guardianname"],
  ["guardianName", "guardian name"],
  ["guardianName", "parent"],
  ["guardianName", "parent name"],
  ["guardianPhone", "guardianphone"],
  ["guardianPhone", "guardian phone"],
  ["enrollmentDate", "enrollmentdate"],
  ["enrollmentDate", "enrollment date"],
  ["medicalNotes", "medicalnotes"],
  ["photoUrl", "photourl"],
  ["schoolId", "schoolid"],
];

let studentHeaderMap = null;
export function getStudentImportHeaderMap() {
  if (studentHeaderMap) return studentHeaderMap;
  const map = new Map();
  STUDENT_STATIC_HEADERS.forEach(([field, label]) => putHeader(map, label, field));

  const fromT = (t) => {
    const pairs = [
      ["fullName", t.fullName],
      ["levelId", t.importExcelLevelId],
      ["sectionId", t.importExcelSectionId],
      ["dob", t.dob],
      ["gender", t.gender],
      ["phone", t.phone],
      ["email", t.email],
      ["address", t.address],
      ["guardianName", t.guardianName],
      ["guardianPhone", t.guardianPhone],
      ["enrollmentDate", t.enrollmentDate],
      ["medicalNotes", t.importExcelMedicalNotes || t.medicalNotes],
      ["photoUrl", t.importExcelPhotoUrl],
      ["schoolId", t.importExcelSchoolId],
    ];
    pairs.forEach(([field, label]) => putHeader(map, label, field));
  };
  LANGS.forEach((lang) => fromT(getTranslations(lang)));

  studentHeaderMap = map;
  return studentHeaderMap;
}

export function resolveStudentImportHeader(raw) {
  const k = normHeader(raw);
  if (!k) return null;
  const map = getStudentImportHeaderMap();
  return map.get(k) ?? map.get(k.replace(/ /g, "")) ?? null;
}

let studentSheetTitles = null;
export function getStudentImportSheetTitles() {
  if (studentSheetTitles) return studentSheetTitles;
  const s = new Set(["students"]);
  LANGS.forEach((lang) => {
    const t = getTranslations(lang);
    if (t.importExcelSheetStudents) s.add(normHeader(t.importExcelSheetStudents));
  });
  studentSheetTitles = s;
  return studentSheetTitles;
}

const TEACHER_STATIC_HEADERS = [
  ["fullName", "full name"],
  ["fullName", "fullname"],
  ["fullName", "name"],
  ["fullName", "nom"],
  ["fullName", "الاسم الكامل"],
  ["phone", "phone"],
  ["phone", "tel"],
  ["phone", "mobile"],
  ["email", "email"],
];

const TEACHER_HEADER_MAP_VERSION = 2;
let teacherHeaderMapVersion = 0;
let teacherHeaderMap = null;
export function getTeacherImportHeaderMap() {
  if (teacherHeaderMap && teacherHeaderMapVersion === TEACHER_HEADER_MAP_VERSION) return teacherHeaderMap;
  const map = new Map();
  TEACHER_STATIC_HEADERS.forEach(([field, label]) => putHeader(map, label, field));
  LANGS.forEach((lang) => {
    const t = getTranslations(lang);
    [
      ["fullName", t.fullName],
      ["phone", t.phone],
      ["email", t.email],
    ].forEach(([field, label]) => putHeader(map, label, field));
  });
  teacherHeaderMap = map;
  teacherHeaderMapVersion = TEACHER_HEADER_MAP_VERSION;
  return teacherHeaderMap;
}

export function resolveTeacherImportHeader(raw) {
  const k = normHeader(raw);
  if (!k) return null;
  const map = getTeacherImportHeaderMap();
  return map.get(k) ?? map.get(k.replace(/ /g, "")) ?? null;
}

let teacherSheetTitles = null;
export function getTeacherImportSheetTitles() {
  if (teacherSheetTitles) return teacherSheetTitles;
  const s = new Set(["teachers"]);
  LANGS.forEach((lang) => {
    const t = getTranslations(lang);
    if (t.importExcelSheetTeachers) s.add(normHeader(t.importExcelSheetTeachers));
    if (t.teachers) s.add(normHeader(t.teachers));
  });
  teacherSheetTitles = s;
  return teacherSheetTitles;
}

/** First-row detection for single-column name sheets */
export function localizedStudentNameHeaders() {
  const s = new Set([
    "full name", "fullname", "name", "nom", "الاسم", "اسم", "الطالب", "الاسم الكامل",
  ]);
  LANGS.forEach((lang) => {
    const t = getTranslations(lang);
    if (t.fullName) s.add(normHeader(t.fullName));
  });
  return s;
}

export function localizedTeacherNameHeaders() {
  const s = new Set(["full name", "fullname", "name", "nom", "الاسم الكامل"]);
  LANGS.forEach((lang) => {
    const t = getTranslations(lang);
    if (t.fullName) s.add(normHeader(t.fullName));
  });
  return s;
}
