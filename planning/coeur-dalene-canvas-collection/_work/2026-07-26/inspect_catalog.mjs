import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:\\Users\\trcam\\Downloads\\1149XBNG8C8ZE_catalog-2026-07-26-0801.xlsx";
const workDir = "C:\\Users\\trcam\\Downloads\\codex_cda_work";
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const overview = await workbook.inspect({
  kind: "workbook,sheet,table,drawing",
  include: "id,name",
  maxChars: 5000,
  tableMaxRows: 5,
  tableMaxCols: 10,
});
console.log("OVERVIEW");
console.log(overview.ndjson);

const sheets = workbook.worksheets.items;
for (const sheet of sheets) {
  const used = sheet.getUsedRange();
  console.log(`SHEET\t${sheet.name}\t${used?.address ?? "blank"}`);
  if (used && sheet.name === "Component Inventory") {
    const region = await workbook.inspect({
      kind: "region",
      sheetId: sheet.name,
      range: used.address,
      include: "values,formulas",
      maxChars: 18000,
      tableMaxRows: 40,
      tableMaxCols: 30,
      tableMaxCellChars: 180,
    });
    console.log(region.ndjson);
  }
  const renderRange = sheet.name === "Items" ? "A1:AL25" : used?.address;
  const preview = await workbook.render({
    sheetName: sheet.name,
    range: renderRange,
    scale: 1,
    format: "png",
  });
  const safe = sheet.name.replace(/[<>:"/\\|?*]/g, "_");
  await fs.writeFile(`${workDir}\\preview_${safe}.png`, new Uint8Array(await preview.arrayBuffer()));
}

const searchTerms = [
  "Coeur d'Alene",
  "Coeur d’Alene",
  "Autumn Over",
  "Road to the Lake",
  "Harbor at the Heart",
  "Lake City Autumn",
  "CDA-CAN-",
  "20×40",
  "20 x 40",
  "24×32",
  "24 x 32",
];
for (const term of searchTerms) {
  const matches = await workbook.inspect({
    kind: "match",
    searchTerm: term,
    sheetId: "Items",
    options: { matchCase: false, matchEntireCell: false, maxResults: 100 },
    maxChars: 12000,
  });
  console.log(`MATCH\t${term}`);
  console.log(matches.ndjson);
}
