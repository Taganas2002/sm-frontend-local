import { test, expect } from "@playwright/test";
import { loginAsE2EUser } from "../helpers/auth.js";

const uniq = () => String(Date.now());

test("onboarding: create classroom → teacher → subject → level → section → group → student → enrollment", async ({ page }) => {
  // Full master-data + dialogs can exceed 2m on slower machines / cold backend.
  test.setTimeout(240_000);
  const id = uniq();

  await loginAsE2EUser(page, { language: "fr" });

  // helper: navigate by hash
  const go = async (hashPath) => {
    await page.goto(`/#/${hashPath}`);
    await page.waitForURL(new RegExp(`#\\/${hashPath}`));
  };

  // 1) Classes (Classroom)
  await go("classes");
  await page.getByTestId("classes-add").click();
  await page.getByTestId("classes-roomName").fill(`Salle ${id}`);
  await page.getByTestId("classes-capacity").fill("20");
  await page.getByTestId("classes-save").click();
  await expect(page.getByTestId("classes-dialog")).toBeHidden();

  // 2) Teachers
  await go("teachers");
  await page.getByTestId("teachers-add").click();
  await page.getByTestId("teachers-fullName").fill(`Prof ${id}`);
  await page.getByTestId("teachers-phone").fill(`06${id.slice(-8)}`.slice(0, 10));
  await page.getByTestId("teachers-email").fill(`prof_${id}@local.test`);
  await page.getByTestId("teachers-save").click();
  await expect(page.getByTestId("teachers-dialog")).toBeHidden();

  // 3) Subjects
  await go("subjects");
  await page.getByTestId("subjects-add").click();
  await page.getByTestId("subjects-name").fill(`Math ${id}`);
  await page.getByTestId("subjects-code").fill(`M${id.slice(-5)}`);
  await page.getByTestId("subjects-save").click();
  await expect(page.getByTestId("subjects-dialog")).toBeHidden();

  // 4) Levels
  await go("levels");
  await page.getByTestId("levels-add").click();
  await page.getByTestId("levels-name").fill(`Niveau ${id}`);
  await page.getByTestId("levels-save").click();
  await expect(page.getByTestId("levels-dialog")).toBeHidden();

  // 5) Sections
  await go("sections");
  await page.getByTestId("sections-add").click();
  await page.getByTestId("sections-name").fill(`Section ${id}`);
  await page.getByTestId("sections-save").click();
  await expect(page.getByTestId("sections-dialog")).toBeHidden();

  // 6) Groups (scope to dialog — filter bar uses same combobox labels outside the dialog)
  await go("groups");
  await page.getByTestId("groups-add").click();
  const gDialog = page.getByTestId("groups-dialog");
  await gDialog.getByTestId("groups-name").fill(`Groupe ${id}`);
  await gDialog.getByTestId("groups-academicYear").fill("2025-2026");

  await gDialog.getByRole("combobox", { name: /^Enseignant \*|^Teacher \*/i }).click();
  await page.getByRole("option", { name: new RegExp(`Prof ${id}`) }).click();

  await gDialog.getByRole("combobox", { name: /^Mati[eè]re \*|^Subject \*/i }).click();
  await page.getByRole("option", { name: new RegExp(`Math ${id}`) }).click();

  await gDialog.getByRole("combobox", { name: /^Niveau \*|^Level \*/i }).click();
  await page.getByRole("option", { name: new RegExp(`Niveau ${id}`) }).click();

  await gDialog.getByRole("combobox", { name: /^Section \*/i }).click();
  await page.getByRole("option", { name: new RegExp(`Section ${id}`) }).click();

  await gDialog.getByTestId("groups-capacity").fill("12");
  await gDialog.getByRole("combobox", { name: /Mod[eè]le de facturation|Billing model/i }).click();
  await page.getByRole("option", { name: /Mensuel|Monthly/i }).click();
  await gDialog.getByTestId("groups-monthlyFee").fill("2000");
  await gDialog.getByTestId("groups-sessionsPerMonth").fill("2");
  await gDialog.getByRole("combobox", { name: /Type de part enseignant|Teacher share type/i }).click();
  await page.getByRole("option", { name: /%/ }).click();
  await gDialog.getByTestId("groups-teacherShareValue").fill("30");
  await gDialog.getByTestId("groups-save").click();
  await expect(page.getByTestId("groups-dialog")).toBeHidden();

  // 7) Students (scope to dialog — grid filters reuse “Levels / Sections” labels)
  await go("students");
  await page.getByTestId("students-add").click();
  const sDialog = page.getByTestId("students-dialog");
  await sDialog.getByTestId("students-fullName").fill(`Eleve ${id}`);
  await sDialog.getByRole("combobox", { name: /Levels|Niveaux/i }).click();
  await page.getByRole("option", { name: new RegExp(`Niveau ${id}`) }).click();
  const sectionCombo = sDialog.getByRole("combobox", { name: /Sections/i });
  await expect(sectionCombo).toBeEnabled({ timeout: 15_000 });
  await sectionCombo.click();
  await page.getByRole("option", { name: new RegExp(`Section ${id}`) }).click();
  // Blur portaled selects (Escape would close the Mui Dialog via onClose).
  await sDialog.getByRole("heading").click();
  await sDialog.getByTestId("students-save").click();
  await expect(page.getByTestId("students-dialog")).toBeHidden();

  // 8) Enrollment
  await go("enrollment");
  await page.getByTestId("enrollments-add").click();
  const eDialog = page.getByTestId("enrollments-dialog");
  await eDialog.getByTestId("enrollments-student-input").fill(`Eleve ${id}`);
  await page.getByRole("option", { name: new RegExp(`Eleve ${id}`) }).click();
  await eDialog.getByRole("combobox", { name: /^Groupe|^Group$/i }).click();
  await page.getByRole("option", { name: new RegExp(`Groupe ${id}`) }).click();
  await eDialog.getByRole("heading").click();
  const enrollPost = page.waitForResponse(
    (r) => r.request().method() === "POST" && /\/enrollments($|\?)/.test(r.url()),
    { timeout: 60_000 }
  );
  await eDialog.getByTestId("enrollments-save").click();
  const enrollRes = await enrollPost;
  if (!enrollRes.ok()) {
    throw new Error(`create enrollment failed: HTTP ${enrollRes.status()} ${await enrollRes.text().catch(() => "")}`);
  }

  await expect(page.getByTestId("enrollments-dialog")).toBeHidden();

  // DataGrid may virtualize rows; narrow with search so the new row is mounted.
  await page.getByTestId("enrollments-search-q").fill(`Eleve ${id}`);
  await expect(page.getByRole("gridcell", { name: new RegExp(`Eleve ${id}`) })).toBeVisible({
    timeout: 30_000,
  });
});

