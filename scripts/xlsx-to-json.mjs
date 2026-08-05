import { readFileSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";
const wb = XLSX.read(readFileSync("data/kittens.xlsx"), { type: "buffer" });
const out = { __first: wb.SheetNames[0] };
for (const n of wb.SheetNames)
  out[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: "" });
writeFileSync("data/sheets.json", JSON.stringify(out));
console.log("wrote data/sheets.json");
