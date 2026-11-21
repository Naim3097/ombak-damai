/* Summary, guest details and WhatsApp handover for checkout.html */

(function () {
  const params = new URLSearchParams(location.search);
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem("od-stay") || "null"); } catch (e) {}

  // A link that names its own dates is read on its own; the saved stay is only
  // for arriving here without one.
  const source = params.has("in") ? Object.fromEntries(params) : (saved || {});
  const pick = (key) => source[key] || "";
  const inStr = pick("in");
  const outStr = pick("out");

  const checkIn = odParseISO(inStr);
  const checkOut = odParseISO(outStr);
  const rooms = parseInt(pick("rooms"), 10);
  const guests = parseInt(pick("guests"), 10);
  let addonIds = pick("addons").split(",").filter((id) => OD.addons.some((a) => a.id === id));

  const main = document.getElementById("checkout-main");
  const empty = document.getElementById("empty-state");

  const valid =
    checkIn && checkOut && checkOut > checkIn && checkIn >= odToday() &&
    rooms >= 1 && rooms <= odRoomsLeftForStay(checkIn, checkOut) &&
    guests >= 1 && guests <= rooms * OD.guestsPerRoom;

  if (!valid) {
    main.hidden = true;
    empty.hidden = false;
    return;
  }

  // Island trips cannot be requested for a stay that falls wholly in the monsoon.
  if (!odStayHasIslandDay(checkIn, checkOut)) {
    addonIds = addonIds.filter((id) => !OD.addons.find((a) => a.id === id).seasonal);
  }

  // Summary panel. Run again whenever the language is switched.
  function fillSummary() {
    const q = odQuote(checkIn, checkOut, rooms);
    const addonLabels = odAddonLabels(addonIds);

    document.getElementById("s-in").textContent = odFmtLong(checkIn);
    document.getElementById("s-out").textContent = odFmtLong(checkOut);
    document.getElementById("s-nights").textContent = odCount(q.nights, "night");
    document.getElementById("s-rooms").textContent = odRoomsLabel(rooms);
    document.getElementById("s-guests").textContent = odCount(guests, "guest");
    document.getElementById("s-breakdown").textContent = q.breakdown;
    document.getElementById("s-total").textContent = odRM(q.total);
    document.getElementById("s-deposit").textContent = odRM(q.deposit);

    document.getElementById("s-addons-row").hidden = addonLabels.length === 0;
    document.getElementById("s-addons").textContent = addonLabels.join(", ");

    const back = { in: inStr, out: outStr, rooms: String(rooms), guests: String(guests) };
    if (addonIds.length) back.addons = addonIds.join(",");
    back.lang = odLang;
    document.getElementById("change-dates").href = "booking.html?" + new URLSearchParams(back).toString();
  }

  fillSummary();
  document.addEventListener("od:lang", fillSummary);

  // Form
  const form = document.getElementById("guest-form");
  const fields = {
    name: document.getElementById("f-name"),
    phone: document.getElementById("f-phone"),
    email: document.getElementById("f-email"),
    notes: document.getElementById("f-notes"),
  };

  function setInvalid(input, bad) {
    input.closest(".field").classList.toggle("invalid", bad);
    input.setAttribute("aria-invalid", bad ? "true" : "false");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = fields.name.value.trim();
    const phone = fields.phone.value.trim();
    const email = fields.email.value.trim();
    const notes = fields.notes.value.trim();

    const nameBad = name.length < 2;
    const phoneBad = !/^[0-9+\-\s()]{7,}$/.test(phone);
    const emailBad = email !== "" && !/^\S+@\S+\.\S+$/.test(email);

    setInvalid(fields.name, nameBad);
    setInvalid(fields.phone, phoneBad);
    setInvalid(fields.email, emailBad);

    if (nameBad || phoneBad || emailBad) {
      (nameBad ? fields.name : phoneBad ? fields.phone : fields.email).focus();
      return;
    }

    const ref = "OD-" + Date.now().toString(36).toUpperCase().slice(-6);
    const q = odQuote(checkIn, checkOut, rooms);
    const addonLabels = odAddonLabels(addonIds);

    // The request is written in the language the guest is reading.
    const lines = [
      odT("m.greeting", "Salam Ombak Damai, saya ingin menempah. / I would like to book."),
      "",
      odT("m.ref", "Reference") + ": " + ref,
      odT("m.in", "Check-in") + ": " + odFmtLong(checkIn),
      odT("m.out", "Check-out") + ": " + odFmtLong(checkOut),
      odT("m.nights", "Nights") + ": " + q.nights,
      odT("m.rooms", "Rooms") + ": " + odRoomsLabel(rooms),
      odT("m.guests", "Guests") + ": " + guests,
      odT("m.total", "Total") + ": " + odRM(q.total) + " (" + q.breakdown + ")",
      odT("m.deposit", "Deposit") + " (" + Math.round(OD.depositRate * 100) + "%): " + odRM(q.deposit),
    ];
    if (addonLabels.length) lines.push(odT("m.also", "Also interested in") + ": " + addonLabels.join(", "));
    lines.push("", odT("m.name", "Name") + ": " + name, odT("m.phone", "Phone") + ": " + phone);
    if (email) lines.push(odT("m.email", "Email") + ": " + email);
    if (notes) lines.push(odT("m.notes", "Notes") + ": " + notes);

    const link = odWaLink(lines.join("\n"));

    // Show confirmation state
    document.getElementById("form-side").hidden = true;
    const done = document.getElementById("confirm-state");
    done.hidden = false;
    document.getElementById("ref-code").textContent = ref;
    document.getElementById("wa-again").href = link;

    window.open(link, "_blank", "noopener");
    done.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
