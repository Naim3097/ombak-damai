/* Shared config and helpers for Ombak Damai.
   Everything an owner needs to change lives in OD below. */

const OD = {
  // WhatsApp number in international format, digits only. REPLACE before launch.
  phone: "60123456789",

  rates: {
    weeknight: 480, // Sunday to Thursday nights, RM
    weekend: 580,   // Friday and Saturday nights, RM
  },

  maxGuests: 8,

  // Dates already booked, as "YYYY-MM-DD" check-in nights. Guests cannot select these.
  unavailable: [],
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

function odFmtShort(d) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function odRM(n) {
  return "RM " + n.toLocaleString("en-MY");
}

function odIsWeekendNight(d) {
  const day = d.getDay();
  return day === 5 || day === 6; // Friday and Saturday nights
}

/* Quote for a stay. checkIn and checkOut are Date objects, checkOut exclusive. */
function odQuote(checkIn, checkOut) {
  const nights = Math.round((checkOut - checkIn) / 86400000);
  if (nights < 1) return null;
  let weeknights = 0;
  let weekends = 0;
  const cur = new Date(checkIn.getTime());
  for (let i = 0; i < nights; i++) {
    if (odIsWeekendNight(cur)) weekends++;
    else weeknights++;
    cur.setDate(cur.getDate() + 1);
  }
  const total = weeknights * OD.rates.weeknight + weekends * OD.rates.weekend;
  return {
    nights,
    weeknights,
    weekends,
    total,
    deposit: Math.round(total / 2),
  };
}

function odWaLink(text) {
  return "https://wa.me/" + OD.phone + (text ? "?text=" + encodeURIComponent(text) : "");
}

/* Point the floating button at the configured number. */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-wa]").forEach((el) => {
    const msg = el.getAttribute("data-wa") || "";
    el.href = odWaLink(msg);
  });
});
