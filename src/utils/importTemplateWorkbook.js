import * as XLSX from "xlsx";
import { getTranslations } from "../translations";

function triggerDownload(wb, filename) {
  XLSX.writeFile(wb, filename);
}

/**
 * Excel template with headers in the current UI language (en / ar / fr).
 */
export function downloadStudentImportTemplate(language) {
  const t = getTranslations(language);
  const headers = [
    t.fullName,
    t.level,
    t.section,
    t.dob,
    t.gender,
    t.phone,
    t.email,
    t.guardianName,
    t.guardianPhone,
  ];
  const example = [
    language === "ar" ? "مثال — تلميذ" : language === "fr" ? "Exemple — élève" : "Example — student",
    "", "", "", "", "", "", "", "",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example, [], []]);
  ws["!cols"] = headers.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t.importExcelSheetStudents || "Students");
  const notes = [
    [t.importStudentTemplateNotes || t.importStudentsHint || ""],
    [""],
    [t.importExcelOnlyNameRequired || ""],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(notes), t.importExcelSheetNotes || "Notes");
  const fname =
    language === "ar"
      ? "نموذج-استيراد-التلاميذ.xlsx"
      : language === "fr"
        ? "modele-import-eleves.xlsx"
        : "student-import-template.xlsx";
  triggerDownload(wb, fname);
}

export function downloadTeacherImportTemplate(language) {
  const t = getTranslations(language);
  const headers = [t.fullName, t.phone, t.email];
  const example = [
    language === "ar" ? "مثال — أستاذ" : language === "fr" ? "Exemple — enseignant" : "Example — teacher",
    "",
    "",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example, [], []]);
  ws["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 28 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t.importExcelSheetTeachers || "Teachers");
  const notes = [
    [t.importTeacherTemplateNotes || t.importTeachersHint || ""],
    [""],
    [t.importExcelOnlyTeacherNameRequired || ""],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(notes), t.importExcelSheetNotes || "Notes");
  const fname =
    language === "ar"
      ? "نموذج-استيراد-الأساتذة.xlsx"
      : language === "fr"
        ? "modele-import-enseignants.xlsx"
        : "teacher-import-template.xlsx";
  triggerDownload(wb, fname);
}
