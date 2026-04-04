import { test, expect } from "@playwright/test";
import { loginAsE2EUser } from "../helpers/auth.js";

const uniq = () => String(Date.now());

/** Relations: same teacher / subject / level / section labels created in setup. */
async function pickGroupRelations(gDialog, page, id) {
  await gDialog.getByRole("combobox", { name: /^Enseignant \*|^Teacher \*/i }).click();
  await page.getByRole("option", { name: new RegExp(`Prof ${id}`) }).click();
  await gDialog.getByRole("combobox", { name: /^Mati[eè]re \*|^Subject \*/i }).click();
  await page.getByRole("option", { name: new RegExp(`Math ${id}`) }).click();
  await gDialog.getByRole("combobox", { name: /^Niveau \*|^Level \*/i }).click();
  await page.getByRole("option", { name: new RegExp(`Niveau ${id}`) }).click();
  await gDialog.getByRole("combobox", { name: /^Section \*/i }).click();
  await page.getByRole("option", { name: new RegExp(`Section ${id}`) }).click();
}

test("groups: create MONTHLY, PER_SESSION, PER_HOUR × (PERCENT + FIXED teacher share)", async ({ page }) => {
  test.setTimeout(300_000);
  const id = uniq();

  await loginAsE2EUser(page, { language: "fr" });

  const go = async (hashPath) => {
    await page.goto(`/#/${hashPath}`);
    await page.waitForURL(new RegExp(`#\\/${hashPath}`));
  };

  // ---- master data (class → … → section) ----
  await go("classes");
  await page.getByTestId("classes-add").click();
  await page.getByTestId("classes-roomName").fill(`Salle ${id}`);
  await page.getByTestId("classes-capacity").fill("20");
  await page.getByTestId("classes-save").click();
  await expect(page.getByTestId("classes-dialog")).toBeHidden();

  await go("teachers");
  await page.getByTestId("teachers-add").click();
  await page.getByTestId("teachers-fullName").fill(`Prof ${id}`);
  await page.getByTestId("teachers-phone").fill(`06${id.slice(-8)}`.slice(0, 10));
  await page.getByTestId("teachers-email").fill(`prof_${id}@local.test`);
  await page.getByTestId("teachers-save").click();
  await expect(page.getByTestId("teachers-dialog")).toBeHidden();

  await go("subjects");
  await page.getByTestId("subjects-add").click();
  await page.getByTestId("subjects-name").fill(`Math ${id}`);
  await page.getByTestId("subjects-code").fill(`M${id.slice(-5)}`);
  await page.getByTestId("subjects-save").click();
  await expect(page.getByTestId("subjects-dialog")).toBeHidden();

  await go("levels");
  await page.getByTestId("levels-add").click();
  await page.getByTestId("levels-name").fill(`Niveau ${id}`);
  await page.getByTestId("levels-save").click();
  await expect(page.getByTestId("levels-dialog")).toBeHidden();

  await go("sections");
  await page.getByTestId("sections-add").click();
  await page.getByTestId("sections-name").fill(`Section ${id}`);
  await page.getByTestId("sections-save").click();
  await expect(page.getByTestId("sections-dialog")).toBeHidden();

  await go("groups");

  // ---- Group 1: MONTHLY + % share ----
  await page.getByTestId("groups-add").click();
  let gDialog = page.getByTestId("groups-dialog");
  await gDialog.getByTestId("groups-name").fill(`Groupe-M-${id}`);
  await gDialog.getByTestId("groups-academicYear").fill("2025-2026");
  await pickGroupRelations(gDialog, page, id);
  await gDialog.getByTestId("groups-capacity").fill("10");
  await gDialog.getByRole("combobox", { name: /Mod[eè]le de facturation|Billing model/i }).click();
  await page.getByRole("option", { name: /Mensuel|Monthly/i }).click();
  await gDialog.getByTestId("groups-monthlyFee").fill("2000");
  await gDialog.getByRole("combobox", { name: /Type de part enseignant|Teacher share type/i }).click();
  await page.getByRole("option", { name: /%/ }).click();
  await gDialog.getByTestId("groups-teacherShareValue").fill("30");
  await gDialog.getByTestId("groups-save").click();
  await expect(page.getByTestId("groups-dialog")).toBeHidden();

  // ---- Group 2: PER_SESSION + % share ----
  await page.getByTestId("groups-add").click();
  gDialog = page.getByTestId("groups-dialog");
  await gDialog.getByTestId("groups-name").fill(`Groupe-S-${id}`);
  await gDialog.getByTestId("groups-academicYear").fill("2025-2026");
  await pickGroupRelations(gDialog, page, id);
  await gDialog.getByTestId("groups-capacity").fill("10");
  await gDialog.getByRole("combobox", { name: /Mod[eè]le de facturation|Billing model/i }).click();
  await page.getByRole("option", { name: /séance|session/i }).click();
  await gDialog.getByTestId("groups-sessionCost").fill("500");
  await gDialog.getByRole("combobox", { name: /Type de part enseignant|Teacher share type/i }).click();
  await page.getByRole("option", { name: /%/ }).click();
  await gDialog.getByTestId("groups-teacherShareValue").fill("25");
  await gDialog.getByTestId("groups-save").click();
  await expect(page.getByTestId("groups-dialog")).toBeHidden();

  // ---- Group 3: PER_HOUR + % share ----
  await page.getByTestId("groups-add").click();
  gDialog = page.getByTestId("groups-dialog");
  await gDialog.getByTestId("groups-name").fill(`Groupe-H-${id}`);
  await gDialog.getByTestId("groups-academicYear").fill("2025-2026");
  await pickGroupRelations(gDialog, page, id);
  await gDialog.getByTestId("groups-capacity").fill("10");
  await gDialog.getByRole("combobox", { name: /Mod[eè]le de facturation|Billing model/i }).click();
  await page.getByRole("option", { name: /heure|hour/i }).click();
  await gDialog.getByTestId("groups-hourlyCost").fill("1200");
  await gDialog.getByTestId("groups-sessionDurationMin").fill("60");
  await gDialog.getByRole("combobox", { name: /Type de part enseignant|Teacher share type/i }).click();
  await page.getByRole("option", { name: /%/ }).click();
  await gDialog.getByTestId("groups-teacherShareValue").fill("20");
  await gDialog.getByTestId("groups-save").click();
  await expect(page.getByTestId("groups-dialog")).toBeHidden();

  // Names visible in grid (newest rows first in API)
  await expect(page.getByText(`Groupe-M-${id}`)).toBeVisible();
  await expect(page.getByText(`Groupe-S-${id}`)).toBeVisible();
  await expect(page.getByText(`Groupe-H-${id}`)).toBeVisible();

  // ---- Group 4: MONTHLY + FIXED (DZD) share (+ sessions/mo required) ----
  await page.getByTestId("groups-add").click();
  gDialog = page.getByTestId("groups-dialog");
  await gDialog.getByTestId("groups-name").fill(`Groupe-MF-${id}`);
  await gDialog.getByTestId("groups-academicYear").fill("2025-2026");
  await pickGroupRelations(gDialog, page, id);
  await gDialog.getByTestId("groups-capacity").fill("10");
  await gDialog.getByRole("combobox", { name: /Mod[eè]le de facturation|Billing model/i }).click();
  await page.getByRole("option", { name: /Mensuel|Monthly/i }).click();
  await gDialog.getByTestId("groups-monthlyFee").fill("2400");
  await gDialog.getByTestId("groups-sessionsPerMonth").fill("3");
  await gDialog.getByRole("combobox", { name: /Type de part enseignant|Teacher share type/i }).click();
  await page.getByRole("option", { name: /^Fixed amount$/i }).click();
  await gDialog.getByTestId("groups-teacherShareValue").fill("500");
  await gDialog.getByTestId("groups-save").click();
  await expect(page.getByTestId("groups-dialog")).toBeHidden();

  // ---- Group 5: PER_SESSION + FIXED share ----
  await page.getByTestId("groups-add").click();
  gDialog = page.getByTestId("groups-dialog");
  await gDialog.getByTestId("groups-name").fill(`Groupe-SF-${id}`);
  await gDialog.getByTestId("groups-academicYear").fill("2025-2026");
  await pickGroupRelations(gDialog, page, id);
  await gDialog.getByTestId("groups-capacity").fill("10");
  await gDialog.getByRole("combobox", { name: /Mod[eè]le de facturation|Billing model/i }).click();
  await page.getByRole("option", { name: /séance|session/i }).click();
  await gDialog.getByTestId("groups-sessionCost").fill("650");
  await gDialog.getByRole("combobox", { name: /Type de part enseignant|Teacher share type/i }).click();
  await page.getByRole("option", { name: /^Fixed amount$/i }).click();
  await gDialog.getByTestId("groups-teacherShareValue").fill("150");
  await gDialog.getByTestId("groups-save").click();
  await expect(page.getByTestId("groups-dialog")).toBeHidden();

  // ---- Group 6: PER_HOUR + FIXED share ----
  await page.getByTestId("groups-add").click();
  gDialog = page.getByTestId("groups-dialog");
  await gDialog.getByTestId("groups-name").fill(`Groupe-HF-${id}`);
  await gDialog.getByTestId("groups-academicYear").fill("2025-2026");
  await pickGroupRelations(gDialog, page, id);
  await gDialog.getByTestId("groups-capacity").fill("10");
  await gDialog.getByRole("combobox", { name: /Mod[eè]le de facturation|Billing model/i }).click();
  await page.getByRole("option", { name: /heure|hour/i }).click();
  await gDialog.getByTestId("groups-hourlyCost").fill("900");
  await gDialog.getByTestId("groups-sessionDurationMin").fill("90");
  await gDialog.getByRole("combobox", { name: /Type de part enseignant|Teacher share type/i }).click();
  await page.getByRole("option", { name: /^Fixed amount$/i }).click();
  await gDialog.getByTestId("groups-teacherShareValue").fill("200");
  await gDialog.getByTestId("groups-save").click();
  await expect(page.getByTestId("groups-dialog")).toBeHidden();

  await expect(page.getByText(`Groupe-MF-${id}`)).toBeVisible();
  await expect(page.getByText(`Groupe-SF-${id}`)).toBeVisible();
  await expect(page.getByText(`Groupe-HF-${id}`)).toBeVisible();
});
