var FALLBACK = require("./fallback.js");

var BASE = "https://kuenmaoshe.github.io/";
var CACHE_KEY = "shk_weapp_data_v1";

function abs(p) {
  if (!p) return "";
  if (/^https?:/.test(p)) return p;
  return BASE + p.replace(/^\//, "");
}

function splitList(v) {
  return String(v || "")
    .split(/[,，]/)
    .map(function (x) { return x.trim(); })
    .filter(Boolean);
}

function parseBirth(v) {
  var t = String(v || "").trim();
  if (!t) return null;
  var m = t.match(/(\d{4})[-/.年](\d{1,2})(?:[-/.月](\d{1,2}))?/);
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +(m[3] || 1) };
}

function monthsSince(b) {
  if (!b) return null;
  var now = new Date();
  var months = (now.getFullYear() - b.y) * 12 + (now.getMonth() + 1 - b.m);
  if (now.getDate() < b.d) months -= 1;
  return Math.max(0, months);
}

function parseSheets(js) {
  var raw = js[js.__first];
  if (!raw) return null;
  var kittens = [];
  for (var i = 1; i < raw.length; i++) {
    var r = raw[i];
    if (!r || !String(r[0] || "").trim() || !String(r[2] || "").trim()) continue;
    var status = (function (v) {
      return v === "是" || v === "预定" || v === "已预订" || v === "已预定" ? "sold" : "available";
    })(String(r[3] || "").trim());
    kittens.push({
      color: String(r[0]).trim(),
      gender: String(r[1] || "").trim(),
      imgs: splitList(r[2]).map(abs),
      status: status,
      birth: parseBirth(r[4]),
      home: String(r[5] || "").trim(),
      dad: String(r[6] || "").trim(),
      mom: String(r[7] || "").trim(),
      name: String(r[8] || "").trim()
    });
  }
  var parents = [];
  var praw = js["种猫"];
  if (praw) {
    for (var p = 1; p < praw.length; p++) {
      var pr = praw[p];
      if (!pr || !String(pr[0] || "").trim()) continue;
      parents.push({
        name: String(pr[0]).trim(),
        role: String(pr[1] || "").trim(),
        color: String(pr[2] || "").trim(),
        media: splitList(pr[3]).map(abs)
      });
    }
  }
  var faqs = [];
  var qraw = js["常见问题"];
  if (qraw) {
    for (var y = 1; y < qraw.length; y++) {
      if (qraw[y] && String(qraw[y][0] || "").trim() && String(qraw[y][1] || "").trim())
        faqs.push({ q: String(qraw[y][0]).trim(), a: String(qraw[y][1]).trim(), open: false });
    }
  }
  var settings = {};
  var sraw = js["设置"];
  if (sraw) {
    for (var z = 1; z < sraw.length; z++) {
      if (sraw[z] && String(sraw[z][0] || "").trim())
        settings[String(sraw[z][0]).trim()] = String(sraw[z][1] || "").trim();
    }
  }
  return kittens.length ? { kittens: kittens, parents: parents, faqs: faqs, settings: settings } : null;
}

function loadData(cb, onError) {
  var cached = null;
  try { cached = wx.getStorageSync(CACHE_KEY) || null; } catch (e) {}
  if (cached) cb(cached, true);
  wx.request({
    url: BASE + "data/sheets.json",
    timeout: 12000,
    success: function (res) {
      if (res.statusCode !== 200 || !res.data) {
        if (cached) return;
        var off1 = parseSheets(FALLBACK);
        if (off1) { cb(off1, true); return; }
        if (onError) onError("数据服务暂时不可用");
        return;
      }
      var data = parseSheets(res.data);
      if (!data) {
        if (!cached && onError) onError("数据格式有误");
        return;
      }
      try { wx.setStorageSync(CACHE_KEY, data); } catch (e) {}
      cb(data, false);
    },
    fail: function () {
      if (cached) return;
      // 网络不可用时用内置数据，保证页面完整（审核环境同样适用）
      var offline = parseSheets(FALLBACK);
      if (offline) { cb(offline, true); return; }
      if (onError) onError("网络连接失败，请检查网络后重试");
    }
  });
}

module.exports = {
  BASE: BASE,
  abs: abs,
  loadData: loadData,
  monthsSince: monthsSince
};
