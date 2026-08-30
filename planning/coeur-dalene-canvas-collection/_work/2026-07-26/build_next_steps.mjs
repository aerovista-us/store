import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:\\Users\\trcam\\Downloads\\outputs\\cda_collection_20260726";
const outputPath = `${outputDir}\\coeur_dalene_collection_next_steps.xlsx`;
await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const dashboard = workbook.worksheets.add("Launch Dashboard");
const audit = workbook.worksheets.add("Catalog Audit");
const actions = workbook.worksheets.add("Action Plan");
const pricing = workbook.worksheets.add("Pricing & Margins");
const sources = workbook.worksheets.add("Source Notes");

const colors = {
  navy: "#17324D",
  blue: "#2F6690",
  lake: "#3A7CA5",
  paleBlue: "#E8F1F7",
  gold: "#D9A441",
  paleGold: "#F8EFD9",
  green: "#2F855A",
  paleGreen: "#E7F4EC",
  red: "#B5473C",
  paleRed: "#FBE9E7",
  gray: "#667085",
  paleGray: "#F2F4F7",
  white: "#FFFFFF",
  border: "#CFD8E3",
  text: "#1F2937",
};

function titleBand(sheet, title, subtitle, endColumn) {
  sheet.showGridLines = false;
  sheet.getRange(`A1:${endColumn}1`).merge();
  sheet.getRange("A1").values = [[title]];
  sheet.getRange(`A1:${endColumn}1`).format = {
    fill: colors.navy,
    font: { bold: true, color: colors.white, fontSize: 18, typeface: "Verdana" },
    verticalAlignment: "center",
  };
  sheet.getRange(`A2:${endColumn}2`).merge();
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange(`A2:${endColumn}2`).format = {
    fill: colors.paleBlue,
    font: { color: colors.navy, fontSize: 10, italic: true, typeface: "Verdana" },
    verticalAlignment: "center",
    wrapText: true,
  };
  sheet.getRange("A1").format.rowHeight = 30;
  sheet.getRange("A2").format.rowHeight = 30;
}

function styleHeader(range) {
  range.format = {
    fill: colors.blue,
    font: { bold: true, color: colors.white, fontSize: 10, typeface: "Verdana" },
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "outside", style: "thin", color: colors.border },
  };
  range.format.rowHeight = 32;
}

function styleBody(range) {
  range.format = {
    font: { color: colors.text, fontSize: 9, typeface: "Verdana" },
    verticalAlignment: "top",
    wrapText: true,
    borders: {
      insideHorizontal: { style: "thin", color: colors.border },
      bottom: { style: "thin", color: colors.border },
    },
  };
}

titleBand(
  dashboard,
  "Coeur d’Alene Canvas Collection — Launch Dashboard",
  "Catalog reconciliation and execution priorities based on the July 25, 2026 plan and July 26, 2026 Square catalog export.",
  "H",
);

dashboard.getRange("A4:B4").merge();
dashboard.getRange("A4").values = [["Collection snapshot"]];
dashboard.getRange("A4:B4").format = {
  fill: colors.gold,
  font: { bold: true, color: colors.navy, typeface: "Verdana" },
};

dashboard.getRange("A5:A10").values = [
  ["Planned catalog records"],
  ["Catalog records matched"],
  ["Missing catalog records"],
  ["Critical controls"],
  ["Open actions"],
  ["Completed actions"],
];
dashboard.getRange("B5:B10").formulas = [
  ["=COUNTA('Catalog Audit'!A5:A14)"],
  ["=COUNTIF('Catalog Audit'!H5:H14,\"Yes\")+COUNTIF('Catalog Audit'!H5:H14,\"Likely\")"],
  ["=COUNTIF('Catalog Audit'!H5:H14,\"No\")"],
  ["=COUNTIF('Catalog Audit'!N5:N14,\"Critical\")"],
  ["=COUNTA('Action Plan'!A5:A34)-COUNTIF('Action Plan'!G5:G34,\"Completed\")"],
  ["=COUNTIF('Action Plan'!G5:G34,\"Completed\")"],
];
dashboard.getRange("A5:A10").format = {
  fill: colors.paleGray,
  font: { bold: true, color: colors.text, typeface: "Verdana" },
  borders: { preset: "outside", style: "thin", color: colors.border },
};
dashboard.getRange("B5:B10").format = {
  fill: colors.white,
  font: { bold: true, color: colors.navy, fontSize: 14, typeface: "Verdana" },
  horizontalAlignment: "center",
  borders: { preset: "outside", style: "thin", color: colors.border },
};

dashboard.getRange("D4:H4").merge();
dashboard.getRange("D4").values = [["Recommended decisions"]];
dashboard.getRange("D4:H4").format = {
  fill: colors.gold,
  font: { bold: true, color: colors.navy, typeface: "Verdana" },
};
dashboard.getRange("D5:E8").values = [
  ["Expansion", "Prioritize the 72 MP panorama as the next new image; do not broaden the full size matrix yet."],
  ["Harbor listing", "Confirm the catalog item is 30″ × 40″ at $495, then add the missing 24″ × 32″ option at $345."],
  ["360° listings", "Keep candidates hidden until full-resolution review, stitching QA, print masters, and physical proofs are complete."],
  ["Editions", "Defer signed and limited editions until the flagship open-edition products show real demand."],
];
dashboard.getRange("D5:D8").format = {
  fill: colors.paleGold,
  font: { bold: true, color: colors.navy, typeface: "Verdana" },
  borders: { preset: "outside", style: "thin", color: colors.border },
};
dashboard.getRange("E5:H8").merge(true);
dashboard.getRange("E5:H8").format = {
  fill: colors.white,
  font: { color: colors.text, typeface: "Verdana", fontSize: 9 },
  wrapText: true,
  verticalAlignment: "top",
  borders: { preset: "outside", style: "thin", color: colors.border },
};
dashboard.getRange("D5:H8").format.rowHeight = 38;

dashboard.getRange("A12:H12").merge();
dashboard.getRange("A12").values = [["Immediate control actions"]];
dashboard.getRange("A12:H12").format = {
  fill: colors.red,
  font: { bold: true, color: colors.white, typeface: "Verdana" },
};
dashboard.getRange("A13:H17").values = [
  ["1", "Hide or gate proofing-required listings", "CDA-CAN-005 / 006 / 007", "Now", "Visible in catalog although plan status is Draft / proofing required", "", "", ""],
  ["2", "Resolve Harbor size and price", "CDA-CAN-003", "Now", "Catalog price is $495; plan primary listing is $345 and large format is $495", "", "", ""],
  ["3", "Create or verify the $749 bundle", "CDA-SET-001", "Now", "No Lake City Autumn Collection record found", "", "", ""],
  ["4", "Protect fulfillment integration", "All catalog items", "Before SKU changes", "Do not replace current Square/fulfillment SKUs until the integration behavior is confirmed", "", "", ""],
  ["5", "Proof the next flagship panorama", "DJI_20231008155121_0002_D.JPG", "Next release", "72 MP exact 2:1 image is the plan’s highest-priority panorama", "", "", ""],
];
dashboard.getRange("E13:H17").merge(true);
dashboard.getRange("A13:A17").format = {
  fill: colors.paleRed,
  font: { bold: true, color: colors.red, typeface: "Verdana" },
  horizontalAlignment: "center",
};
dashboard.getRange("B13:H17").format = {
  font: { color: colors.text, typeface: "Verdana", fontSize: 9 },
  wrapText: true,
  verticalAlignment: "top",
  borders: {
    insideHorizontal: { style: "thin", color: colors.border },
    bottom: { style: "thin", color: colors.border },
  },
};
dashboard.getRange("B13:B17").format.font = { bold: true, color: colors.navy, typeface: "Verdana" };

dashboard.getRange("A19:H19").merge();
dashboard.getRange("A19").values = [["Catalog facts"]];
dashboard.getRange("A19:H19").format = {
  fill: colors.lake,
  font: { bold: true, color: colors.white, typeface: "Verdana" },
};
dashboard.getRange("A20:H24").values = [
  ["Available canvases aligned", "Autumn Over Coeur d’Alene and The Road to the Lake are visible at $395.", "", "", "", "", "", ""],
  ["Harbor ambiguity", "A Harbor at the Heart item is visible at $495, but its export row does not state a size.", "", "", "", "", "", ""],
  ["Draft exposure", "Fairways Along the Lake, Lake, Links, and the Floating Green, and The Clock at Resort Circle are visible.", "", "", "", "", "", ""],
  ["Missing records", "A Window Through the Pines, Where Downtown Opens to the Lake, and the Lake City Autumn Collection were not found.", "", "", "", "", "", ""],
  ["SKU system", "The catalog uses existing alphanumeric fulfillment SKUs; plan SKUs should be added only after integration review.", "", "", "", "", "", ""],
];
dashboard.getRange("A20:A24").format = {
  fill: colors.paleBlue,
  font: { bold: true, color: colors.navy, typeface: "Verdana" },
};
dashboard.getRange("B20:H24").merge(true);
dashboard.getRange("B20:H24").format = {
  font: { color: colors.text, typeface: "Verdana", fontSize: 9 },
  wrapText: true,
  verticalAlignment: "top",
  borders: {
    insideHorizontal: { style: "thin", color: colors.border },
    bottom: { style: "thin", color: colors.border },
  },
};
dashboard.getRange("A1:H24").format.verticalAlignment = "top";
dashboard.getRange("A:A").format.columnWidth = 24;
dashboard.getRange("B:B").format.columnWidth = 22;
dashboard.getRange("C:C").format.columnWidth = 18;
dashboard.getRange("D:D").format.columnWidth = 18;
dashboard.getRange("E:H").format.columnWidth = 18;
dashboard.getRange("A13:H17").format.rowHeight = 52;
dashboard.getRange("A20:H24").format.rowHeight = 44;
dashboard.freezePanes.freezeRows(2);

titleBand(
  audit,
  "Catalog Audit",
  "Plan-to-catalog reconciliation. Catalog row numbers reference the Items sheet in 1149XBNG8C8ZE_catalog-2026-07-26-0801.xlsx.",
  "P",
);
audit.getRange("A4:P4").values = [[
  "Plan SKU",
  "Product",
  "Variant / Size",
  "Plan Status",
  "Source File",
  "Plan Price",
  "Catalog Item",
  "Catalog Match",
  "Catalog Row",
  "Catalog Price",
  "Price Delta",
  "Visibility",
  "Current Catalog SKU",
  "Control",
  "Primary Gap",
  "Recommended Next Action",
]];
styleHeader(audit.getRange("A4:P4"));

const auditRows = [
  ["CDA-CAN-001-20X40-OE", "Autumn Over Coeur d’Alene", "20″ × 40″", "Available", "Confirm exact filename", 395, "Autumn Over Coeur d’Alene -Lake City in Color", "Yes", 166, 395, null, "visible", "6A654A4D9263E_19312", "Ready", "Source filename and production economics missing", "Confirm filename; save print master; record production, shipping, URL, and checkout evidence."],
  ["CDA-CAN-002-20X40-OE", "The Road to the Lake", "20″ × 40″", "Available", "Confirm exact filename", 395, "The Road to the Lake -Autumn in Coeur d’Alene", "Yes", 331, 395, null, "visible", "6A65534A3A86E_19312", "Ready", "Source filename and production economics missing", "Confirm filename; save print master; record production, shipping, URL, and checkout evidence."],
  ["CDA-CAN-003-24X32-OE", "Harbor at the Heart", "24″ × 32″", "Available", "DJI_20230923161411_0006_D - Copy.JPG", 345, "No distinct 24″ × 32″ catalog variation found", "No", null, null, null, null, null, "Critical", "Primary $345 size appears absent", "Confirm current item size; create the 24″ × 32″ variation at $345 if absent."],
  ["CDA-CAN-003-30X40-OE", "Harbor at the Heart — Large Format", "30″ × 40″", "Planned", "DJI_20230923161411_0006_D - Copy.JPG", 495, "Harbor at the Heart -The Coeur d’Alene Resort and Marina", "Likely", 239, 495, null, "visible", "6A65A829A4D4E_19323", "Review", "Catalog row has no size; $495 matches planned large format", "Confirm row 239 is 30″ × 40″; label size explicitly before keeping it live."],
  ["CDA-CAN-004-20X40-OE", "A Window Through the Pines", "20″ × 40″", "Draft / proofing required", "DJI_20240913092904_0016_D.JPG", 395, null, "No", null, null, null, null, null, "Hold", "Not listed; location and proofing still open", "Confirm location, review full-resolution file, prepare wrap preview and proof before listing."],
  ["CDA-CAN-005-24X48-OE", "Fairways Along the Lake", "24″ × 48″", "Draft / proofing required", "DJI_20241022141108_0043_D.JPG", 495, "Fairways Along the Lake -The Coeur d’Alene Resort Golf Course in 360°", "Yes", 229, 525, null, "visible", "6A65B1DB8CB92_19317", "Critical", "Visible before proofing; price is $30 above plan", "Hide/gate listing, complete panorama QA and proofing, then resolve price to $495 or document a new decision."],
  ["CDA-CAN-006-24X48-OE", "Lake, Links, and the Floating Green", "24″ × 48″", "Draft / proofing required", "DJI_20241022141253_0044_D.JPG", 525, "Lake, Links, and the Floating Green -The Coeur d’Alene Resort Golf Course in 360°", "Yes", 242, 525, null, "visible", "6A65B415A97A5_19317", "Critical", "Visible before proofing", "Hide/gate listing; inspect highlights, seams, and horizon; create print master and order proof."],
  ["CDA-CAN-007-24X48-OE", "The Clock at Resort Circle", "24″ × 48″", "Draft / proofing required", "DJI_20241025153448_0056_D.JPG", 525, "The Clock at Resort Circle -A 360° View of Downtown Coeur d’Alene", "Yes", 330, 525, null, "visible", "6A65B8ADCD01D_19317", "Critical", "Visible before proofing", "Hide/gate listing; inspect building and clock distortion; create centered mockup and order proof."],
  ["CDA-CAN-008-24X48-OE", "Where Downtown Opens to the Lake", "24″ × 48″", "Draft / proofing required", "DJI_20241025153913_0059_D.JPG", 525, null, "No", null, null, null, null, null, "Hold", "Not listed; proofing required", "Complete full-resolution and stitch review; lead broad-recognition 360° launch after proof."],
  ["CDA-SET-001-20X40-OE", "Lake City Autumn Collection", "Two 20″ × 40″ canvases", "Available", "CDA-CAN-001 + CDA-CAN-002", 749, null, "No", null, null, null, null, null, "Critical", "Bundle not found in catalog", "Create or verify the $749 bundle and test bundle checkout end to end."],
];
audit.getRange("A5:P14").values = auditRows;
audit.getRange("K5").formulas = [["=IF(OR(F5=\"\",J5=\"\"),\"\",J5-F5)"]];
audit.getRange("K5:K14").fillDown();
styleBody(audit.getRange("A5:P14"));
audit.getRange("F5:F14").format.numberFormat = "$#,##0";
audit.getRange("J5:K14").format.numberFormat = "$#,##0;[Red]-$#,##0";
audit.getRange("H5:H14").format.horizontalAlignment = "center";
audit.getRange("I5:I14").format.numberFormat = "0";
audit.getRange("N5:N14").conditionalFormats.add("containsText", {
  text: "Critical",
  format: { fill: colors.paleRed, font: { bold: true, color: colors.red } },
});
audit.getRange("N5:N14").conditionalFormats.add("containsText", {
  text: "Ready",
  format: { fill: colors.paleGreen, font: { bold: true, color: colors.green } },
});
audit.getRange("A4:P14").format.rowHeight = 46;
audit.getRange("A:A").format.columnWidth = 25;
audit.getRange("B:B").format.columnWidth = 30;
audit.getRange("C:C").format.columnWidth = 22;
audit.getRange("D:D").format.columnWidth = 22;
audit.getRange("E:E").format.columnWidth = 35;
audit.getRange("F:F").format.columnWidth = 12;
audit.getRange("G:G").format.columnWidth = 40;
audit.getRange("H:H").format.columnWidth = 14;
audit.getRange("I:I").format.columnWidth = 12;
audit.getRange("J:K").format.columnWidth = 13;
audit.getRange("L:L").format.columnWidth = 14;
audit.getRange("M:M").format.columnWidth = 24;
audit.getRange("N:N").format.columnWidth = 14;
audit.getRange("O:O").format.columnWidth = 36;
audit.getRange("P:P").format.columnWidth = 54;
audit.freezePanes.freezeRows(4);
audit.freezePanes.freezeColumns(2);
const auditTable = audit.tables.add("A4:P14", true, "CatalogAuditTable");
auditTable.style = "TableStyleMedium2";

titleBand(
  actions,
  "Action Plan",
  "Sequenced work queue. Update Status, Owner, Due Date, and Evidence Link as work progresses.",
  "J",
);
actions.getRange("A4:J4").values = [[
  "ID",
  "Priority",
  "Phase",
  "Product / Asset",
  "Action",
  "Owner",
  "Status",
  "Due Date",
  "Evidence / Link",
  "Notes",
]];
styleHeader(actions.getRange("A4:J4"));
const actionRows = [
  ["CDA-001", "P0", "Catalog control", "CDA-CAN-005 / 006 / 007", "Hide or gate proofing-required listings until release criteria are complete.", "", "Not Started", null, "", "Catalog export shows all three as visible."],
  ["CDA-002", "P0", "Catalog control", "CDA-CAN-003", "Confirm whether catalog row 239 is the 30″ × 40″ $495 canvas.", "", "Not Started", null, "", "Size is not recorded in the export row."],
  ["CDA-003", "P0", "Catalog control", "CDA-CAN-003", "Create the 24″ × 32″ Harbor variation at $345 if it is absent.", "", "Not Started", null, "", "Do not duplicate if row 239 is actually the primary size."],
  ["CDA-004", "P0", "Catalog control", "CDA-SET-001", "Create or verify the Lake City Autumn Collection at $749.", "", "Not Started", null, "", "Bundle not found in export."],
  ["CDA-005", "P0", "Checkout", "CDA-CAN-001 / 002 / 003 / SET-001", "Test individual and bundle checkout, shipping, delivery estimate, pickup, tax, and confirmation email.", "", "Not Started", null, "", "Record evidence links or screenshots."],
  ["CDA-006", "P1", "Source control", "CDA-CAN-001", "Confirm and record exact source filename.", "", "Not Started", null, "", ""],
  ["CDA-007", "P1", "Source control", "CDA-CAN-002", "Confirm and record exact source filename.", "", "Not Started", null, "", ""],
  ["CDA-008", "P1", "Print prep", "CDA-CAN-001", "Save final master crop and mirrored/extended wrap preview.", "", "Not Started", null, "", ""],
  ["CDA-009", "P1", "Print prep", "CDA-CAN-002", "Save final master crop and mirrored/extended wrap preview.", "", "Not Started", null, "", ""],
  ["CDA-010", "P1", "Economics", "Current products", "Record production cost, shipping subsidy, platform fees, and delivery estimate.", "", "Not Started", null, "", "Enter costs on Pricing & Margins."],
  ["CDA-011", "P1", "Storefront", "Current products", "Record live URLs and save storefront screenshots.", "", "Not Started", null, "", ""],
  ["CDA-012", "P1", "Creative", "Current products", "Create branded product mockups.", "", "Not Started", null, "", ""],
  ["CDA-013", "P1", "Creative", "Lake City Autumn Collection", "Create collection banner and social-launch graphics.", "", "Not Started", null, "", ""],
  ["CDA-014", "P1", "Product review", "DJI_20231008155121_0002_D.JPG", "Review the 72 MP 2:1 panorama at 100%; select title and reserve the next SKU.", "", "Not Started", null, "", "Recommended next new-image release."],
  ["CDA-015", "P1", "Print prep", "CDA-CAN-003 30×40", "Prepare the 30″ × 40″ large-format print master and wrap.", "", "Not Started", null, "", ""],
  ["CDA-016", "P1", "Proofing", "CDA-CAN-003 30×40", "Order and inspect physical proof before confirming availability.", "", "Not Started", null, "", ""],
  ["CDA-017", "P1", "Image QA", "CDA-CAN-005", "Review stitching, horizon curvature, sky transitions, and top/bottom seam at full size.", "", "Not Started", null, "", ""],
  ["CDA-018", "P1", "Image QA", "CDA-CAN-006", "Review stitching, horizon, seams, and highlight detail around the sun reflection.", "", "Not Started", null, "", ""],
  ["CDA-019", "P1", "Image QA", "CDA-CAN-007", "Review distortion around buildings, roads, and clock; confirm centered composition.", "", "Not Started", null, "", ""],
  ["CDA-020", "P1", "Image QA", "CDA-CAN-008", "Review sun highlights, stitched sky transitions, and architectural curvature.", "", "Not Started", null, "", ""],
  ["CDA-021", "P2", "Product definition", "CDA-CAN-004", "Confirm exact location and complete full-resolution image review.", "", "Not Started", null, "", ""],
  ["CDA-022", "P2", "Product definition", "DJI_20231014111331_0018_D.JPG", "Review image and develop title options.", "", "Not Started", null, "", ""],
  ["CDA-023", "P2", "Archive review", "DJI_0304 / DJI_0305", "Review for smaller-format or historical releases.", "", "Not Started", null, "", ""],
  ["CDA-024", "P2", "Operations", "All products", "Create the standard archive folder structure and one folder per print SKU.", "", "Not Started", null, "", ""],
  ["CDA-025", "P2", "Proofing", "CDA-CAN-005 / 006 / 007 / 008", "Create print masters and order physical proofs before release.", "", "Not Started", null, "", ""],
  ["CDA-026", "P3", "Brand system", "All products", "Create certificate-of-authenticity design.", "", "Not Started", null, "", "Needed only if signed/limited editions proceed."],
  ["CDA-027", "P3", "Strategy", "Collection", "Revisit signed or limited editions after demand data is available.", "", "Deferred", null, "", "Current recommendation: defer."],
  ["CDA-028", "P2", "Catalog data", "All CDA products", "Decide where plan SKU should live without replacing active fulfillment SKUs.", "", "Not Started", null, "", "Protect integration before editing Square SKU field."],
  ["CDA-029", "P2", "Performance", "Available products", "Start launch-date, views, cart, sales, revenue, cost, fee, and net-profit tracking.", "", "Not Started", null, "", ""],
  ["CDA-030", "P2", "Local service", "Available products", "Verify local pickup copy and decide whether delivery/installation remains planned.", "", "Not Started", null, "", ""],
];
actions.getRange("A5:J34").values = actionRows;
styleBody(actions.getRange("A5:J34"));
actions.getRange("G5:G34").dataValidation = {
  rule: { type: "list", values: ["Not Started", "In Progress", "Blocked", "Completed", "Deferred"] },
};
actions.getRange("B5:B34").dataValidation = {
  rule: { type: "list", values: ["P0", "P1", "P2", "P3"] },
};
actions.getRange("H5:H34").format.numberFormat = "yyyy-mm-dd";
actions.getRange("B5:B34").conditionalFormats.add("containsText", {
  text: "P0",
  format: { fill: colors.paleRed, font: { bold: true, color: colors.red } },
});
actions.getRange("G5:G34").conditionalFormats.add("containsText", {
  text: "Completed",
  format: { fill: colors.paleGreen, font: { bold: true, color: colors.green } },
});
actions.getRange("G5:G34").conditionalFormats.add("containsText", {
  text: "Blocked",
  format: { fill: colors.paleRed, font: { bold: true, color: colors.red } },
});
actions.getRange("A4:J34").format.rowHeight = 38;
actions.getRange("A:A").format.columnWidth = 12;
actions.getRange("B:B").format.columnWidth = 10;
actions.getRange("C:C").format.columnWidth = 20;
actions.getRange("D:D").format.columnWidth = 28;
actions.getRange("E:E").format.columnWidth = 58;
actions.getRange("F:F").format.columnWidth = 18;
actions.getRange("G:G").format.columnWidth = 16;
actions.getRange("H:H").format.columnWidth = 14;
actions.getRange("I:I").format.columnWidth = 30;
actions.getRange("J:J").format.columnWidth = 40;
actions.freezePanes.freezeRows(4);
actions.freezePanes.freezeColumns(2);
const actionsTable = actions.tables.add("A4:J34", true, "ActionPlanTable");
actionsTable.style = "TableStyleMedium2";

titleBand(
  pricing,
  "Pricing & Margins",
  "Enter production cost, shipping subsidy, and platform fees. Estimated profit and margin calculate automatically.",
  "J",
);
pricing.getRange("A4:J4").values = [[
  "Plan SKU",
  "Product",
  "Size",
  "Retail Price",
  "Production Cost",
  "Shipping Subsidy",
  "Platform Fees",
  "Estimated Net Profit",
  "Gross Margin %",
  "Notes",
]];
styleHeader(pricing.getRange("A4:J4"));
const pricingRows = [
  ["CDA-CAN-001-20X40-OE", "Autumn Over Coeur d’Alene", "20″ × 40″", 395, null, null, null, null, null, "Available"],
  ["CDA-CAN-002-20X40-OE", "The Road to the Lake", "20″ × 40″", 395, null, null, null, null, null, "Available"],
  ["CDA-CAN-003-24X32-OE", "Harbor at the Heart", "24″ × 32″", 345, null, null, null, null, null, "Primary size"],
  ["CDA-CAN-003-30X40-OE", "Harbor at the Heart", "30″ × 40″", 495, null, null, null, null, null, "Planned large format"],
  ["CDA-SET-001-20X40-OE", "Lake City Autumn Collection", "Two 20″ × 40″", 749, null, null, null, null, null, "Bundle savings: $41"],
  ["CDA-CAN-004-20X40-OE", "A Window Through the Pines", "20″ × 40″", 395, null, null, null, null, null, "Draft"],
  ["CDA-CAN-005-24X48-OE", "Fairways Along the Lake", "24″ × 48″", 495, null, null, null, null, null, "Draft; catalog currently $525"],
  ["CDA-CAN-006-24X48-OE", "Lake, Links, and the Floating Green", "24″ × 48″", 525, null, null, null, null, null, "Draft"],
  ["CDA-CAN-007-24X48-OE", "The Clock at Resort Circle", "24″ × 48″", 525, null, null, null, null, null, "Draft"],
  ["CDA-CAN-008-24X48-OE", "Where Downtown Opens to the Lake", "24″ × 48″", 525, null, null, null, null, null, "Draft"],
];
pricing.getRange("A5:J14").values = pricingRows;
pricing.getRange("H5").formulas = [["=IF(OR(D5=\"\",E5=\"\"),\"\",D5-E5-IF(F5=\"\",0,F5)-IF(G5=\"\",0,G5))"]];
pricing.getRange("H5:H14").fillDown();
pricing.getRange("I5").formulas = [["=IF(H5=\"\",\"\",H5/D5)"]];
pricing.getRange("I5:I14").fillDown();
styleBody(pricing.getRange("A5:J14"));
pricing.getRange("D5:H14").format.numberFormat = "$#,##0.00";
pricing.getRange("I5:I14").format.numberFormat = "0.0%";
pricing.getRange("E5:G14").format.fill = colors.paleGold;
pricing.getRange("A4:J14").format.rowHeight = 36;
pricing.getRange("A:A").format.columnWidth = 25;
pricing.getRange("B:B").format.columnWidth = 38;
pricing.getRange("C:C").format.columnWidth = 22;
pricing.getRange("D:I").format.columnWidth = 17;
pricing.getRange("J:J").format.columnWidth = 32;
pricing.freezePanes.freezeRows(4);
const pricingTable = pricing.tables.add("A4:J14", true, "PricingMarginsTable");
pricingTable.style = "TableStyleMedium2";

titleBand(
  sources,
  "Source Notes",
  "Inputs used for this reconciliation and the assumptions that should be resolved before catalog edits.",
  "E",
);
sources.getRange("A4:E4").values = [["Source", "Path / Reference", "Date", "Use", "Notes"]];
styleHeader(sources.getRange("A4:E4"));
sources.getRange("A5:E7").values = [
  ["Collection plan", "C:\\Users\\trcam\\Downloads\\coeur_dalene_canvas_collection_plan_v6.md", new Date("2026-07-25T12:00:00"), "Product definitions, prices, statuses, workflow, next actions", "Active v6 plan."],
  ["Square catalog export", "C:\\Users\\trcam\\Downloads\\1149XBNG8C8ZE_catalog-2026-07-26-0801.xlsx", new Date("2026-07-26T08:01:00"), "Catalog names, prices, visibility, tokens, and current SKUs", "Rows are from Items sheet; tokens and fulfillment SKUs were not modified."],
  ["Reconciliation", "Generated 2026-07-26", new Date("2026-07-26T12:00:00"), "Catalog audit and action sequencing", "Catalog matches use exact or near-exact planned product titles."],
];
styleBody(sources.getRange("A5:E7"));
sources.getRange("C5:C7").format.numberFormat = "yyyy-mm-dd";

sources.getRange("A9:E9").merge();
sources.getRange("A9").values = [["Assumptions and cautions"]];
sources.getRange("A9:E9").format = {
  fill: colors.gold,
  font: { bold: true, color: colors.navy, typeface: "Verdana" },
};
sources.getRange("A10:B14").values = [
  ["Harbor size", "The $495 Harbor catalog item likely corresponds to the planned 30″ × 40″ option, but the export row does not confirm size."],
  ["Catalog SKU", "Existing alphanumeric SKUs may be linked to fulfillment. Plan SKUs should not replace them without confirming the integration."],
  ["Draft visibility", "A visible value in the catalog export indicates storefront exposure control needs review; verify actual channel visibility in Square."],
  ["Missing records", "Not found means no title match in the supplied export; verify aliases and bundles directly in the storefront before creating duplicates."],
  ["Release control", "The plan requires full-resolution QA, print masters, and physical proofs before draft candidates become Available."],
];
sources.getRange("A10:A14").format = {
  fill: colors.paleGold,
  font: { bold: true, color: colors.navy, typeface: "Verdana" },
};
sources.getRange("B10:E14").merge(true);
sources.getRange("B10:E14").format = {
  font: { color: colors.text, fontSize: 9, typeface: "Verdana" },
  wrapText: true,
  verticalAlignment: "top",
  borders: {
    insideHorizontal: { style: "thin", color: colors.border },
    bottom: { style: "thin", color: colors.border },
  },
};
sources.getRange("A5:E7").format.rowHeight = 44;
sources.getRange("A10:E14").format.rowHeight = 44;
sources.getRange("A:A").format.columnWidth = 22;
sources.getRange("B:B").format.columnWidth = 62;
sources.getRange("C:C").format.columnWidth = 14;
sources.getRange("D:D").format.columnWidth = 45;
sources.getRange("E:E").format.columnWidth = 50;
sources.freezePanes.freezeRows(4);

const errorScanBefore = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 200 },
  summary: "formula error scan",
});
console.log("ERROR_SCAN");
console.log(errorScanBefore.ndjson);

const checks = [
  ["Launch Dashboard", "A1:H24"],
  ["Catalog Audit", "A1:P14"],
  ["Action Plan", "A1:J34"],
  ["Pricing & Margins", "A1:J14"],
  ["Source Notes", "A1:E14"],
];
for (const [sheetName, range] of checks) {
  const check = await workbook.inspect({
    kind: "table",
    sheetId: sheetName,
    range,
    include: "values,formulas",
    tableMaxRows: 40,
    tableMaxCols: 16,
    tableMaxCellChars: 90,
    maxChars: 9000,
  });
  console.log(`CHECK\t${sheetName}`);
  console.log(check.ndjson);
  const preview = await workbook.render({
    sheetName,
    range,
    scale: 1,
    format: "png",
  });
  const safe = sheetName.replace(/[<>:"/\\|?*&]/g, "_");
  await fs.writeFile(`${outputDir}\\preview_${safe}.png`, new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`OUTPUT\t${outputPath}`);
