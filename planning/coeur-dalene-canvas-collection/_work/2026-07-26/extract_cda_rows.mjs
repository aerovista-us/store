import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = "C:\\Users\\trcam\\Downloads\\1149XBNG8C8ZE_catalog-2026-07-26-0801.xlsx";
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("Items");
const headers = sheet.getRange("A2:AL2").values[0];

const plannedTitles = [
  "Autumn Over Coeur d’Alene",
  "The Road to the Lake",
  "Harbor at the Heart",
  "A Window Through the Pines",
  "Fairways Along the Lake",
  "Lake, Links, and the Floating Green",
  "The Clock at Resort Circle",
  "Where Downtown Opens to the Lake",
  "Lake City Autumn Collection",
];

for (const title of plannedTitles) {
  const matches = await workbook.inspect({
    kind: "match",
    searchTerm: title,
    sheetId: "Items",
    range: "C3:C372",
    options: { matchCase: false, matchEntireCell: false, maxResults: 10 },
    maxChars: 4000,
  });
  const records = matches.ndjson
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((record) => record.kind === "match");
  if (!records.length) {
    console.log(JSON.stringify({ title, found: false }));
    continue;
  }
  for (const record of records) {
    const rowNumber = Number(record.address.match(/\d+$/)[0]);
    const values = sheet.getRange(`A${rowNumber}:AL${rowNumber}`).values[0];
    const row = {};
    headers.forEach((header, index) => {
      if (header && values[index] !== null && values[index] !== "") {
        row[header] = values[index];
      }
    });
    console.log(JSON.stringify({ title, found: true, rowNumber, row }));
  }
}
