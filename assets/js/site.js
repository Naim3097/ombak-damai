/* Shared config and helpers for Ombak Damai Penarik.
   Everything an owner needs to change lives in OD below. */

const OD = {
  // WhatsApp number in international format, digits only.
  phone: "601169805737",

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
  addons: [
    { id: "redang", label: "Redang turtle snorkelling trip", note: "Day trip by boat from Merang jetty", seasonal: true },
    { id: "fishing", label: "Fishing trip by boat", note: "River or sea, with a local boatman" },
    { id: "bbq", label: "BBQ and bonfire night", note: "In the courtyard, under the stars" },
  ],
};

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
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function odFmtFull(d) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function odRM(n) {
  return "RM " + n.toLocaleString("en-MY");
}

function odPlural(n, word) {
  return n + " " + word + (n === 1 ? "" : "s");
}

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
    breakdown: odPlural(nights, "night") + " x " + odPlural(rooms, "room") + " x " + odRM(OD.rate),
  };
}

function odRoomsLabel(rooms) {
  return rooms === OD.rooms ? "Whole roomstay, " + OD.rooms + " rooms" : odPlural(rooms, "room");
}

function odAddonLabels(ids) {
  return OD.addons.filter((a) => ids.indexOf(a.id) !== -1).map((a) => a.label);
}

function odWaLink(text) {
  return "https://wa.me/" + OD.phone + (text ? "?text=" + encodeURIComponent(text) : "");
}

/* The number as printed: "011-6980 5737" locally, "+60 11-6980 5737" abroad. */
function odPhone(intl) {
  const rest = OD.phone.replace(/^60/, "");
  const head = rest.slice(0, 2); // operator prefix, after the leading zero
  const tail = rest.slice(2);
  return (intl ? "+60 " : "0") + head + "-" + tail.slice(0, -4) + " " + tail.slice(-4);
}

/* Fill in the configured number, rate and room count wherever a page asks for them. */
document.addEventListener("DOMContentLoaded", () => {
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
});
