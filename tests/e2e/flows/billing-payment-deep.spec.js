import { test, expect } from "@playwright/test";
import { loginAsE2EUser } from "../helpers/auth.js";
import { addDaysYmd, seedPresentSessionForGroup } from "../helpers/api.js";

const uniq = () => String(Date.now());

/** Matches DataGrid / receipt formatting in the app (`Intl` default locale). */
function moneyUi(n) {
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

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

async function masterData(page, id) {
  const go = async (hashPath) => {
    await page.goto(`/#/${hashPath}`);
    await page.waitForURL(new RegExp(`#\\/${hashPath}`));
  };

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
}

test.describe("billing payment (attendance-first dues)", () => {
  test("monthly: session + présence → billing → confirm plan → receipt → solde à zéro", async ({ page }) => {
    test.setTimeout(240_000);
    const id = uniq();
    const sessionDate = addDaysYmd(1);
    const monthlyFee = 3500;
    const studentName = `ElevePay ${id}`;
    const groupName = `PayM-${id}`;
    const expectedTotal = moneyUi(monthlyFee);

    await loginAsE2EUser(page, { language: "fr" });
    await masterData(page, id);

    await page.goto("/#/groups");
    await page.waitForURL(/#\/groups/);
    await page.getByTestId("groups-add").click();
    const gDialog = page.getByTestId("groups-dialog");
    await gDialog.getByTestId("groups-name").fill(groupName);
    await gDialog.getByTestId("groups-academicYear").fill("2025-2026");
    await pickGroupRelations(gDialog, page, id);
    await gDialog.getByTestId("groups-capacity").fill("10");
    await gDialog.getByRole("combobox", { name: /Mod[eè]le de facturation|Billing model/i }).click();
    await page.getByRole("option", { name: /Mensuel|Monthly/i }).click();
    await gDialog.getByTestId("groups-monthlyFee").fill(String(monthlyFee));
    await gDialog.getByTestId("groups-sessionsPerMonth").fill("1");
    await gDialog.getByRole("combobox", { name: /Type de part enseignant|Teacher share type/i }).click();
    await page.getByRole("option", { name: /%/ }).click();
    await gDialog.getByTestId("groups-teacherShareValue").fill("25");
    await gDialog.getByTestId("groups-save").click();
    await expect(page.getByTestId("groups-dialog")).toBeHidden();

    await page.goto("/#/students");
    await page.waitForURL(/#\/students/);
    await page.getByTestId("students-add").click();
    const sDialog = page.getByTestId("students-dialog");
    await sDialog.getByTestId("students-fullName").fill(studentName);
    await sDialog.getByRole("combobox", { name: /Levels|Niveaux/i }).click();
    await page.getByRole("option", { name: new RegExp(`Niveau ${id}`) }).click();
    const sectionCombo = sDialog.getByRole("combobox", { name: /Sections/i });
    await expect(sectionCombo).toBeEnabled({ timeout: 15_000 });
    await sectionCombo.click();
    await page.getByRole("option", { name: new RegExp(`Section ${id}`) }).click();
    await sDialog.getByRole("heading").click();
    await sDialog.getByTestId("students-save").click();
    await expect(page.getByTestId("students-dialog")).toBeHidden();

    await page.goto("/#/enrollment");
    await page.waitForURL(/#\/enrollment/);
    await page.getByTestId("enrollments-add").click();
    const eDialog = page.getByTestId("enrollments-dialog");
    await eDialog.getByTestId("enrollments-student-input").fill(studentName);
    await page.getByRole("option", { name: new RegExp(studentName) }).click();
    await eDialog.getByRole("combobox", { name: /^Groupe|^Group$/i }).click();
    await page.getByRole("option", { name: new RegExp(groupName) }).click();
    await eDialog.getByRole("heading").click();
    await eDialog.getByTestId("enrollments-save").click();

    const { studentId } = await seedPresentSessionForGroup(page, {
      groupNameSubstring: groupName,
      studentNameSubstring: studentName,
      roomNameSubstring: `Salle ${id}`,
      sessionDate,
    });

    await page.goto("/#/finances/billing");
    await page.waitForURL(/#\/finances\/billing/);
    await page.getByTestId("billing-search-input").fill(studentName);
    await expect(page.getByTestId(`billing-pay-${studentId}`)).toBeVisible({ timeout: 60_000 });
    await page.getByTestId(`billing-pay-${studentId}`).click();
    await page.waitForURL(new RegExp(`#/finances/pay/${studentId}`));

    await expect(page.getByText(groupName)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(expectedTotal).first()).toBeVisible();

    await page.getByRole("button", { name: /Sélectionner|Select/i }).first().click();
    const payBtn = page.getByTestId("payment-pay-print");
    await payBtn.scrollIntoViewIfNeeded();
    await expect(payBtn).toBeEnabled({ timeout: 15_000 });
    await payBtn.click();

    const confirm = page.getByTestId("payment-confirm-dialog");
    await expect(confirm).toBeVisible();
    await expect(confirm.getByText(expectedTotal, { exact: false }).first()).toBeVisible();

    await page.getByTestId("payment-confirm-submit").click();

    await expect(page.getByTestId("receipt-dialog")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("receipt-total-amount")).toHaveText(expectedTotal);
    await expect(page.getByTestId("receipt-dialog")).toContainText(groupName);

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("receipt-dialog")).toBeHidden();

    await page.getByRole("button", { name: /Rafraîchir|Refresh/i }).click();
    const paidCycleRow = page.locator('[role="row"]').filter({ hasText: groupName });
    await expect(paidCycleRow.getByText(/Payé|Paid/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test("per-session + fixed teacher share: paie = coût séance", async ({ page }) => {
    test.setTimeout(240_000);
    const id = uniq();
    const sessionDate = addDaysYmd(2);
    const sessionCost = 888;
    const studentName = `EleveS ${id}`;
    const groupName = `PayS-${id}`;
    const expectedTotal = moneyUi(sessionCost);

    await loginAsE2EUser(page, { language: "fr" });
    await masterData(page, id);

    await page.goto("/#/groups");
    await page.waitForURL(/#\/groups/);
    await page.getByTestId("groups-add").click();
    let gDialog = page.getByTestId("groups-dialog");
    await gDialog.getByTestId("groups-name").fill(groupName);
    await gDialog.getByTestId("groups-academicYear").fill("2025-2026");
    await pickGroupRelations(gDialog, page, id);
    await gDialog.getByTestId("groups-capacity").fill("10");
    await gDialog.getByRole("combobox", { name: /Mod[eè]le de facturation|Billing model/i }).click();
    await page.getByRole("option", { name: /séance|session/i }).click();
    await gDialog.getByTestId("groups-sessionCost").fill(String(sessionCost));
    await gDialog.getByRole("combobox", { name: /Type de part enseignant|Teacher share type/i }).click();
    await page.getByRole("option", { name: /^Fixed amount$/i }).click();
    await gDialog.getByTestId("groups-teacherShareValue").fill("100");
    await gDialog.getByTestId("groups-save").click();
    await expect(page.getByTestId("groups-dialog")).toBeHidden();

    await page.goto("/#/students");
    await page.waitForURL(/#\/students/);
    await page.getByTestId("students-add").click();
    const sDialog = page.getByTestId("students-dialog");
    await sDialog.getByTestId("students-fullName").fill(studentName);
    await sDialog.getByRole("combobox", { name: /Levels|Niveaux/i }).click();
    await page.getByRole("option", { name: new RegExp(`Niveau ${id}`) }).click();
    const sectionCombo = sDialog.getByRole("combobox", { name: /Sections/i });
    await expect(sectionCombo).toBeEnabled({ timeout: 15_000 });
    await sectionCombo.click();
    await page.getByRole("option", { name: new RegExp(`Section ${id}`) }).click();
    await sDialog.getByRole("heading").click();
    await sDialog.getByTestId("students-save").click();
    await expect(page.getByTestId("students-dialog")).toBeHidden();

    await page.goto("/#/enrollment");
    await page.waitForURL(/#\/enrollment/);
    await page.getByTestId("enrollments-add").click();
    const eDialog = page.getByTestId("enrollments-dialog");
    await eDialog.getByTestId("enrollments-student-input").fill(studentName);
    await page.getByRole("option", { name: new RegExp(studentName) }).click();
    await eDialog.getByRole("combobox", { name: /^Groupe|^Group$/i }).click();
    await page.getByRole("option", { name: new RegExp(groupName) }).click();
    await eDialog.getByRole("heading").click();
    await eDialog.getByTestId("enrollments-save").click();

    const { studentId } = await seedPresentSessionForGroup(page, {
      groupNameSubstring: groupName,
      studentNameSubstring: studentName,
      roomNameSubstring: `Salle ${id}`,
      sessionDate,
    });

    await page.goto(`/#/finances/pay/${studentId}`);
    await page.waitForURL(new RegExp(`#/finances/pay/${studentId}`));

    await expect(page.getByText(groupName)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(expectedTotal).first()).toBeVisible();

    await page.getByRole("button", { name: /Sélectionner|Select/i }).first().click();
    const payBtnS = page.getByTestId("payment-pay-print");
    await payBtnS.scrollIntoViewIfNeeded();
    await expect(payBtnS).toBeEnabled({ timeout: 15_000 });
    await payBtnS.click();
    await expect(page.getByTestId("payment-confirm-dialog")).toBeVisible();
    await page.getByTestId("payment-confirm-submit").click();

    await expect(page.getByTestId("receipt-dialog")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("receipt-total-amount")).toHaveText(expectedTotal);
    await expect(page.getByTestId("receipt-dialog")).toContainText(/Par s|Per session/i);
  });

  test("per-hour: paie = coût horaire × durée (90 min)", async ({ page }) => {
    test.setTimeout(240_000);
    const id = uniq();
    const sessionDate = addDaysYmd(3);
    const hourly = 800;
    const durationMin = 90;
    const due = (hourly * durationMin) / 60;
    const studentName = `EleveH ${id}`;
    const groupName = `PayH-${id}`;
    const expectedTotal = moneyUi(due);

    await loginAsE2EUser(page, { language: "fr" });
    await masterData(page, id);

    await page.goto("/#/groups");
    await page.waitForURL(/#\/groups/);
    await page.getByTestId("groups-add").click();
    const gDialog = page.getByTestId("groups-dialog");
    await gDialog.getByTestId("groups-name").fill(groupName);
    await gDialog.getByTestId("groups-academicYear").fill("2025-2026");
    await pickGroupRelations(gDialog, page, id);
    await gDialog.getByTestId("groups-capacity").fill("10");
    await gDialog.getByRole("combobox", { name: /Mod[eè]le de facturation|Billing model/i }).click();
    await page.getByRole("option", { name: /heure|hour/i }).click();
    await gDialog.getByTestId("groups-hourlyCost").fill(String(hourly));
    await gDialog.getByTestId("groups-sessionDurationMin").fill(String(durationMin));
    await gDialog.getByRole("combobox", { name: /Type de part enseignant|Teacher share type/i }).click();
    await page.getByRole("option", { name: /^Fixed amount$/i }).click();
    await gDialog.getByTestId("groups-teacherShareValue").fill("50");
    await gDialog.getByTestId("groups-save").click();
    await expect(page.getByTestId("groups-dialog")).toBeHidden();

    await page.goto("/#/students");
    await page.waitForURL(/#\/students/);
    await page.getByTestId("students-add").click();
    const sDialog = page.getByTestId("students-dialog");
    await sDialog.getByTestId("students-fullName").fill(studentName);
    await sDialog.getByRole("combobox", { name: /Levels|Niveaux/i }).click();
    await page.getByRole("option", { name: new RegExp(`Niveau ${id}`) }).click();
    const sectionCombo = sDialog.getByRole("combobox", { name: /Sections/i });
    await expect(sectionCombo).toBeEnabled({ timeout: 15_000 });
    await sectionCombo.click();
    await page.getByRole("option", { name: new RegExp(`Section ${id}`) }).click();
    await sDialog.getByRole("heading").click();
    await sDialog.getByTestId("students-save").click();
    await expect(page.getByTestId("students-dialog")).toBeHidden();

    await page.goto("/#/enrollment");
    await page.waitForURL(/#\/enrollment/);
    await page.getByTestId("enrollments-add").click();
    const eDialog = page.getByTestId("enrollments-dialog");
    await eDialog.getByTestId("enrollments-student-input").fill(studentName);
    await page.getByRole("option", { name: new RegExp(studentName) }).click();
    await eDialog.getByRole("combobox", { name: /^Groupe|^Group$/i }).click();
    await page.getByRole("option", { name: new RegExp(groupName) }).click();
    await eDialog.getByRole("heading").click();
    await eDialog.getByTestId("enrollments-save").click();

    const { studentId } = await seedPresentSessionForGroup(page, {
      groupNameSubstring: groupName,
      studentNameSubstring: studentName,
      roomNameSubstring: `Salle ${id}`,
      sessionDate,
    });

    await page.goto(`/#/finances/pay/${studentId}`);
    await page.waitForURL(new RegExp(`#/finances/pay/${studentId}`));

    await expect(page.getByText(groupName)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(expectedTotal).first()).toBeVisible();

    await page.getByRole("button", { name: /Sélectionner|Select/i }).first().click();
    const payBtnH = page.getByTestId("payment-pay-print");
    await payBtnH.scrollIntoViewIfNeeded();
    await expect(payBtnH).toBeEnabled({ timeout: 15_000 });
    await payBtnH.click();
    await page.getByTestId("payment-confirm-submit").click();

    await expect(page.getByTestId("receipt-dialog")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("receipt-total-amount")).toHaveText(expectedTotal);
  });
});
