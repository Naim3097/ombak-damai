/* Shared config and helpers for Ombak Damai Penarik.
   Everything an owner needs to change lives in OD below. */

const OD = {
  // WhatsApp number in international format, digits only.
  phone: "60107648227",

  rooms: 4,          // rooms in the roomstay
  guestsPerRoom: 4,  // two double beds in each room
  rate: 150,         // RM per room, per night
  depositRate: 0.5,  // share of the total paid to confirm

  // Rooms already taken, by night: "YYYY-MM-DD": rooms booked that night.
  // A night with every room taken cannot be chosen.
  booked: {},

  // Island trips pause for the monsoon. Months are 1 to 12, both included.
  islandSeason: { from: 3, to: 10 },

  // Extras a guest can ask about. Prices are settled on WhatsApp.
  // The Malay wording for each one is in lang-ms.js, under "addon.<id>".
  addons: [
    { id: "redang", label: "Redang turtle snorkelling trip", note: "Day trip by boat from Merang jetty", seasonal: true },
    { id: "fishing", label: "Fishing trip by boat", note: "River or sea, with a local boatman" },
    { id: "bbq", label: "BBQ and bonfire night", note: "In the courtyard, under the stars" },
  ],
};

/* ---------- language ----------
   English is written in the pages. Malay comes from lang-ms.js and is
   swapped in for anything marked with a data-i18n attribute. The choice is
   remembered, and ?lang=ms or ?lang=en in a link sets it. */

const OD_LANGS = ["en", "ms"];

// Some browsers block site storage. The choice then travels in the links instead.
const odCanStore = (function () {
  try {
    localStorage.setItem("od-probe", "1");
    localStorage.removeItem("od-probe");
    return true;
  } catch (e) {
    return false;
  }
})();

function odRemember(lang) {
  try { localStorage.setItem("od-lang", lang); } catch (e) {}
}

function odDetectLang() {
  const fromUrl = new URLSearchParams(location.search).get("lang");
  if (OD_LANGS.indexOf(fromUrl) !== -1) {
    odRemember(fromUrl); // a link in one language keeps that language on the next page
    return fromUrl;
  }
  try {
    const saved = localStorage.getItem("od-lang");
    if (OD_LANGS.indexOf(saved) !== -1) return saved;
  } catch (e) {}
  return /^ms\b/i.test(navigator.language || "") ? "ms" : "en";
}

let odLang = odDetectLang();

function odLocale() {
  return odLang === "ms" ? "ms-MY" : "en-GB";
}

/* Text for the current language. `english` is used as written; the Malay is
   looked up by key. {name} tokens are filled from `vars`. */
function odT(key, english, vars) {
  let text = english;
  if (odLang === "ms" && typeof OD_MS !== "undefined" && OD_MS[key] != null) text = OD_MS[key];
  if (vars && typeof text === "string") {
    Object.keys(vars).forEach((name) => { text = text.split("{" + name + "}").join(vars[name]); });
  }
  return text;
}

// Which attribute each marker fills. "text" and "html" fill the element itself.
const OD_I18N = {
  "data-i18n": "text",
  "data-i18n-html": "html",
  "data-i18n-alt": "alt",
  "data-i18n-aria": "aria-label",
  "data-i18n-placeholder": "placeholder",
  "data-i18n-content": "content",
  "data-i18n-title": "title",
};

function odApplyLang() {
  document.documentElement.lang = odLang;
  Object.keys(OD_I18N).forEach((marker) => {
    const target = OD_I18N[marker];
    document.querySelectorAll("[" + marker + "]").forEach((el) => {
      const read = () => (target === "text" ? el.textContent : target === "html" ? el.innerHTML : el.getAttribute(target));
      const write = (value) => {
        if (target === "text") el.textContent = value;
        else if (target === "html") el.innerHTML = value;
        else el.setAttribute(target, value);
      };
      const slot = "odEn:" + marker;
      if (el[slot] === undefined) el[slot] = read(); // keep the English to switch back to
      write(odT(el.getAttribute(marker), el[slot]));
    });
  });
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.setAttribute("aria-pressed", btn.getAttribute("data-lang") === odLang ? "true" : "false");
  });
}

function odSetLang(lang) {
  if (OD_LANGS.indexOf(lang) === -1 || lang === odLang) return;
  odLang = lang;
  odRemember(lang);
  const url = new URL(location.href);
  if (url.searchParams.has("lang")) {
    url.searchParams.set("lang", lang);
    history.replaceState(null, "", url);
  }
  odApplyLang();
  odBind();
  document.dispatchEvent(new CustomEvent("od:lang"));
}

/* ---------- dates, money, counts ---------- */

function odToISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function odParseISO(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || "")) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}

function odToday() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function odFmtLong(d) {
  return d.toLocaleDateString(odLocale(), { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function odFmtFull(d) {
  return d.toLocaleDateString(odLocale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function odMonthName(monthIndex) {
  return new Date(2000, monthIndex, 1).toLocaleDateString(odLocale(), { month: "long" });
}

function odRM(n) {
  return "RM " + n.toLocaleString("en-MY");
}

/* "2 nights", "1 room", "3 guests"; Malay has no plural form. */
function odCount(n, unit) {
  const english = { night: ["night", "nights"], room: ["room", "rooms"], guest: ["guest", "guests"] }[unit];
  return n + " " + odT("unit." + unit, n === 1 ? english[0] : english[1]);
}

/* ---------- rooms, seasons, prices ---------- */

/* Every night of a stay as Date objects. checkOut is the morning guests leave. */
function odNights(checkIn, checkOut) {
  const out = [];
  const cur = new Date(checkIn.getTime());
  while (cur < checkOut) {
    out.push(new Date(cur.getTime()));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function odRoomsLeft(d) {
  const taken = OD.booked[odToISO(d)] || 0;
  return Math.max(0, OD.rooms - taken);
}

/* Fewest rooms free on any night of the stay. */
function odRoomsLeftForStay(checkIn, checkOut) {
  return odNights(checkIn, checkOut).reduce((min, d) => Math.min(min, odRoomsLeft(d)), OD.rooms);
}

function odInIslandSeason(d) {
  const m = d.getMonth() + 1;
  return m >= OD.islandSeason.from && m <= OD.islandSeason.to;
}

/* True when at least one day of the stay falls in the island season. */
function odStayHasIslandDay(checkIn, checkOut) {
  return odNights(checkIn, checkOut).concat([checkOut]).some(odInIslandSeason);
}

function odQuote(checkIn, checkOut, rooms) {
  const nights = Math.round((checkOut - checkIn) / 86400000);
  if (nights < 1 || rooms < 1) return null;
  const total = nights * rooms * OD.rate;
  return {
    nights,
    rooms,
    total,
    deposit: Math.round(total * OD.depositRate),
    breakdown: odCount(nights, "night") + " x " + odCount(rooms, "room") + " x " + odRM(OD.rate),
  };
}

function odRoomsLabel(rooms) {
  return rooms === OD.rooms
    ? odT("r.whole", "Whole roomstay, {n}", { n: odCount(rooms, "room") })
    : odCount(rooms, "room");
}

function odAddonText(addon, field) {
  return odT("addon." + addon.id + "." + field, addon[field]);
}

function odAddonLabels(ids) {
  return OD.addons.filter((a) => ids.indexOf(a.id) !== -1).map((a) => odAddonText(a, "label"));
}

/* ---------- WhatsApp ---------- */

function odWaLink(text) {
  return "https://wa.me/" + OD.phone + (text ? "?text=" + encodeURIComponent(text) : "");
}

/* The number as printed: "010-764 8227" locally, "+60 10-764 8227" abroad. */
function odPhone(intl) {
  const rest = OD.phone.replace(/^60/, "");
  const head = rest.slice(0, 2); // operator prefix, after the leading zero
  const tail = rest.slice(2);
  return (intl ? "+60 " : "0") + head + "-" + tail.slice(0, -4) + " " + tail.slice(-4);
}

/* Fill in the configured number, rate and room count wherever a page asks for them. */
function odBind() {
  document.querySelectorAll("[data-wa]").forEach((el) => {
    el.href = odWaLink(el.getAttribute("data-wa") || "");
  });

  const values = {
    rate: odRM(OD.rate),
    whole: odRM(OD.rate * OD.rooms),
    rooms: String(OD.rooms),
    guests: String(OD.rooms * OD.guestsPerRoom),
    phone: odPhone(false),
    "phone-intl": odPhone(true),
    deposit: Math.round(OD.depositRate * 100) + "%",
  };
  document.querySelectorAll("[data-od]").forEach((el) => {
    const v = values[el.getAttribute("data-od")];
    if (v) el.textContent = v;
  });

  // Where the choice of language cannot be stored, carry it to the other pages.
  if (!odCanStore) {
    document.querySelectorAll("a[href]").forEach((a) => {
      const m = /^((?:index|booking|checkout)\.html)(\?[^#]*)?(#.*)?$/.exec(a.getAttribute("href"));
      if (!m) return;
      const query = new URLSearchParams(m[2] || "");
      query.set("lang", odLang);
      a.setAttribute("href", m[1] + "?" + query.toString() + (m[3] || ""));
    });
  }
}

/* This file is loaded at the end of the page, so everything above it is ready. */
odApplyLang();
odBind();
document.querySelectorAll("[data-lang]").forEach((btn) => {
  btn.addEventListener("click", () => odSetLang(btn.getAttribute("data-lang")));
});
document.documentElement.classList.remove("lang-pending");
