import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const indexPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "store", "index.html");
let html = fs.readFileSync(indexPath, "utf8");

const block = [
  '          <div class="chips" aria-label="Category filters" hidden style="display:none">',
  '            <div class="chip active" data-cat="all">All</div>',
  '            <div class="chip" data-cat="hoodies">Hoodies</div>',
  '            <div class="chip" data-cat="crewnecks">Crewnecks</div>',
  `            <div class="chip" data-cat="tees">T\u2011shirts</div>`,
  '            <div class="chip" data-cat="hats">Hats</div>',
  '            <div class="chip" data-cat="stickers">Stickers</div>',
  "          </div>",
  '          <div id="tagChips" class="chips mt-2" aria-label="Tag filters" style="margin-top:8px"></div>',
  "",
].join("\n");

if (!html.includes(block)) {
  console.error("block not found");
  process.exit(1);
}

html = html.replace(block, "\n");
fs.writeFileSync(indexPath, html);
console.log("removed hero chips block");
