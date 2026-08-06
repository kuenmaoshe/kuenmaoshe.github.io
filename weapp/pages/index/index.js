var data = require("../../utils/data.js");
var app = getApp();

var AGE_BUCKETS = { u3: [0, 2], m36: [3, 6], o6: [7, 999] };

Page({
  data: {
    lang: 0, // 0 中文, 1 EN, 2 KO
    loading: true,
    loadError: "",
    kittens: [],
    filtered: [],
    parents: [],
    faqs: [],
    settings: {},
    counts: { avail: 0, sold: 0 },
    dads: [],
    moms: [],
    regions: [],
    filters: { status: "available", gender: null, months: null, dad: null, mom: null },
    envImgs: [
      { src: "assets/garden-main.jpg", cap: "户外活动区" },
      { src: "assets/indoor-main.jpg", cap: "舒适生活区" },
      { src: "assets/indoor-tower.jpg", cap: "室内活动区" },
      { src: "assets/garden-play.jpg", cap: "游乐区" },
      { src: "assets/garden-path.jpg", cap: "花园小径" }
    ],
    careImgs: {
      raw: "assets/feeding-raw.jpg",
      supp: "assets/feeding-supplements.jpg",
      litter: "assets/feeding-litter.jpg",
      bags: "assets/feeding-bags.jpg"
    },
    base: data.BASE
  },

  onLoad: function () {
    var envImgs = this.data.envImgs.map(function (e) {
      return { src: data.abs(e.src), cap: e.cap };
    });
    var care = this.data.careImgs;
    var careImgs = {};
    for (var k in care) careImgs[k] = data.abs(care[k]);
    this.setData({ envImgs: envImgs, careImgs: careImgs });
    this.fetch();
  },

  fetch: function () {
    var that = this;
    this.setData({ loading: true, loadError: "" });
    data.loadData(
      function (d) { that.applyData(d); },
      function (msg) { that.setData({ loading: false, loadError: msg }); }
    );
  },

  retry: function () {
    this.fetch();
  },

  applyData: function (d) {
    var avail = 0, sold = 0;
    var dads = [], moms = [];
    var regions = {};
    var kittens = d.kittens.map(function (r) {
      if (r.status === "available") avail++; else sold++;
      if (r.dad && dads.indexOf(r.dad) < 0) dads.push(r.dad);
      if (r.mom && moms.indexOf(r.mom) < 0) moms.push(r.mom);
      if (r.status !== "available" && r.home) regions[r.home] = (regions[r.home] || 0) + 1;
      var months = data.monthsSince(r.birth);
      var cg = (r.color || "") + (r.gender || "");
      return {
        color: r.color, gender: r.gender, status: r.status,
        dad: r.dad, mom: r.mom, home: r.home,
        imgs: r.imgs, cover: r.imgs[0],
        multi: r.imgs.length > 1 ? r.imgs.length : 0,
        title: cg + (r.name ? " · " + r.name : ""),
        months: months,
        parentsLine: [r.dad, r.mom].filter(Boolean).join(" × ")
      };
    });
    // 可预订在前、年龄小的在前
    kittens.sort(function (a, b) {
      var oa = a.status === "available" ? 0 : 1;
      var ob = b.status === "available" ? 0 : 1;
      if (oa !== ob) return oa - ob;
      if (a.months === null && b.months === null) return 0;
      if (a.months === null) return 1;
      if (b.months === null) return -1;
      return a.months - b.months;
    });
    kittens.forEach(function (k, i) {
      k.no = (i + 1 < 10 ? "0" : "") + (i + 1);
      k.uid = "k" + i;
    });
    var regionList = Object.keys(regions).map(function (k) {
      return { place: k, n: regions[k] };
    });
    this.setData({
      loading: false,
      loadError: "",
      kittens: kittens,
      parents: d.parents,
      faqs: d.faqs,
      settings: d.settings,
      counts: { avail: avail, sold: sold },
      dads: dads, moms: moms, regions: regionList
    });
    this.applyFilters();
  },

  applyFilters: function () {
    var f = this.data.filters;
    var out = this.data.kittens.filter(function (k) {
      if (f.status && k.status !== f.status) return false;
      if (f.gender && ((f.gender === "male" && k.gender !== "弟弟") || (f.gender === "female" && k.gender !== "妹妹"))) return false;
      if (f.months) {
        var b = AGE_BUCKETS[f.months];
        if (k.months === null || k.months < b[0] || k.months > b[1]) return false;
      }
      if (f.dad && k.dad !== f.dad) return false;
      if (f.mom && k.mom !== f.mom) return false;
      return true;
    });
    this.setData({ filtered: out });
  },

  onFilter: function (e) {
    var key = e.currentTarget.dataset.key;
    var val = e.currentTarget.dataset.val || null;
    var f = this.data.filters;
    f[key] = val;
    this.setData({ filters: f });
    this.applyFilters();
  },

  tapKitten: function (e) {
    var idx = e.currentTarget.dataset.idx;
    var k = this.data.filtered[idx];
    if (!k) return;
    wx.previewImage({ urls: k.imgs, current: k.imgs[0] });
  },

  tapParent: function (e) {
    var idx = e.currentTarget.dataset.idx;
    var p = this.data.parents[idx];
    if (!p || !p.media.length) return;
    var sources = p.media.map(function (u) {
      return { url: u, type: /\.mp4(\?|$)/i.test(u) ? "video" : "image" };
    });
    if (wx.previewMedia) {
      wx.previewMedia({ sources: sources });
    } else {
      wx.previewImage({ urls: p.media.filter(function (u) { return !/\.mp4/i.test(u); }) });
    }
  },

  previewEnv: function (e) {
    var src = e.currentTarget.dataset.src;
    wx.previewImage({ urls: this.data.envImgs.map(function (x) { return x.src; }), current: src });
  },

  previewCare: function (e) {
    wx.previewImage({ urls: [e.currentTarget.dataset.src] });
  },

  toggleFaq: function (e) {
    var i = e.currentTarget.dataset.idx;
    var faqs = this.data.faqs;
    faqs[i].open = !faqs[i].open;
    this.setData({ faqs: faqs });
  },





  copyWx: function () {
    wx.setClipboardData({
      data: app.globalData.WECHAT_ID,
      success: function () {
        wx.showToast({ title: "微信号已复制", icon: "success" });
      }
    });
  },

  callPhone: function () {
    wx.makePhoneCall({ phoneNumber: app.globalData.PHONE });
  },

  goGuide: function () {
    wx.navigateTo({ url: "/pages/guide/guide" });
  },

  scrollToKittens: function () {
    var q = wx.createSelectorQuery();
    q.select("#kittens").boundingClientRect();
    q.selectViewport().scrollOffset();
    q.exec(function (res) {
      if (res && res[0] && res[1]) {
        wx.pageScrollTo({ scrollTop: res[0].top + res[1].scrollTop - 10, duration: 400 });
      }
    });
  },

  onShareTimeline: function () {
    return { title: "Shakoshako 缅因猫舍 · 专注缅因猫，传承优秀血统" };
  },

  onShareAppMessage: function () {
    return { title: "Shakoshako 缅因猫舍 · 专注缅因猫，传承优秀血统", path: "/pages/index/index" };
  }
});
