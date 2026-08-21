// Fetch per-country visitor stats from our Flag Counter details page
// and per-province (China) counters from Abacus, then write data/visitors.json.
// No dependencies (Node 18+).
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

// Province-level counters: the site increments abacus keys per CN visitor region
// (see index.html: fetch to abacus .../hit/shakoshako-cattery/prov-cn-<code>).
const PROVINCES = {
  bj: "北京", tj: "天津", he: "河北", sx: "山西", nm: "内蒙古",
  ln: "辽宁", jl: "吉林", hl: "黑龙江", sh: "上海", js: "江苏",
  zj: "浙江", ah: "安徽", fj: "福建", jx: "江西", sd: "山东",
  ha: "河南", hb: "湖北", hn: "湖南", gd: "广东", gx: "广西",
  hi: "海南", cq: "重庆", sc: "四川", gz: "贵州", yn: "云南",
  xz: "西藏", sn: "陕西", gs: "甘肃", qh: "青海", nx: "宁夏",
  xj: "新疆", tw: "台湾", hk: "香港", mo: "澳门",
};
const provinces = [];
for (const [code, name] of Object.entries(PROVINCES)) {
  await new Promise(r => setTimeout(r, 400)); // abacus rate limit: 30 req / 10 s
  try {
    const r = await fetch(`https://abacus.jasoncameron.dev/get/shakoshako-cattery/prov-cn-${code}`);
    if (r.ok) {
      const j = await r.json();
      if (j && j.value > 0) provinces.push({ code, name, count: j.value });
    }
  } catch {}
}
provinces.sort((a, b) => b.count - a.count);

writeFileSync(
  "data/visitors.json",
  JSON.stringify({ updated: new Date().toISOString().slice(0, 10), countries: rows, provinces })
);
console.log("wrote data/visitors.json:", rows.map(r => r.code + ":" + r.count).join(", "),
  "| provinces:", provinces.map(p => p.code + ":" + p.count).join(", ") || "(none yet)");
