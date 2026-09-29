import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const employeeWorkbook = path.resolve(
    currentDirectory,
    "../../backend/uploads/Employees_Dataset_500_Records.xlsx",
);

test.describe("Visual Plotify workbook journey", () => {
    test("uploads a workbook, previews it, visualizes it, and exports the chart", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByText("Backend: OK")).toBeVisible();

        await page.locator('input[type="file"]').setInputFiles(employeeWorkbook);
        await expect(page.getByText("Employees_Dataset_500_Records.xlsx")).toBeVisible();
        await page.getByRole("button", { name: "Upload", exact: true }).click();

        await expect(page.getByText("Upload successful.")).toBeVisible();
        await expect(page.getByText("Dataset Preview")).toBeVisible();
        await expect(page.locator("p").filter({ hasText: "Total Rows: 500" })).toBeVisible();
        await expect(page.locator("p").filter({ hasText: "Selected sheet: Employees" })).toBeVisible();

        await page.getByRole("button", { name: "Try Employee Name + Employee ID" }).click();
        await page.getByRole("button", { name: "Visualize", exact: true }).click();

        await expect(page.getByRole("heading", { name: "Generated chart" })).toBeVisible();
        await expect(page.locator("canvas").last()).toBeVisible();

        const chartTypeSelect = page.locator(".MuiFormControl-root").filter({ hasText: "Chart type" }).getByRole("combobox");
        await chartTypeSelect.click();
        await page.getByRole("option", { name: "Pie chart" }).click();
        await expect(chartTypeSelect).toHaveText("Pie chart");

        await page.getByRole("button", { name: "Export", exact: true }).click();
        const download = page.waitForEvent("download");
        await page.getByRole("menuitem", { name: "Export as PNG" }).click();
        expect((await download).suggestedFilename()).toMatch(/employee-id-by-employee-name\.png/);
    });
});
