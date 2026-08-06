// Fetch per-country visitor stats from our Flag Counter details page
// and write data/visitors.json. No dependencies (Node 18+).
import { writeFileSync } from "node:fs";

const URL = "https://s01.flagcounter.com/countries/UpWw/";
const res = await fetch(URL, { headers: { "User-Agent": "Mozilla/5.0" } });
if (!res.ok) throw new Error("fetch failed: " + res.status);
const html = await res.text();

const rows = [];
const re = /\/factbook\/([a-z]{2})\/UpWw[^>]*><u>([^<]+)<\/u><\/a><\/font><\/td><td width=1%><font[^>]*>([\d,]+)<\/font>/g;
let m;
while ((m = re.exec(html)) !== null) {
  rows.push({ code: m[1], name: m[2].trim(), count: parseInt(m[3].replace(/,/g, ""), 10) });
}
if (!rows.length) throw new Error("no countries parsed — page structure may have changed");

writeFileSync(
  "data/visitors.json",
  JSON.stringify({ updated: new Date().toISOString().slice(0, 10), countries: rows })
);
console.log("wrote data/visitors.json:", rows.map(r => r.code + ":" + r.count).join(", "));
