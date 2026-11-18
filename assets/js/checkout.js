/* Summary, guest details and WhatsApp handover for checkout.html */

(function () {
  const params = new URLSearchParams(location.search);
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem("od-stay") || "null"); } catch (e) {}

  const pick = (key) => params.get(key) || (saved && saved[key]) || "";
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

  const q = odQuote(checkIn, checkOut, rooms);
  const addonLabels = odAddonLabels(addonIds);

  // Summary panel
  document.getElementById("s-in").textContent = odFmtLong(checkIn);
  document.getElementById("s-out").textContent = odFmtLong(checkOut);
  document.getElementById("s-nights").textContent = odPlural(q.nights, "night");
  document.getElementById("s-rooms").textContent = odRoomsLabel(rooms);
  document.getElementById("s-guests").textContent = odPlural(guests, "guest");
  document.getElementById("s-breakdown").textContent = q.breakdown;
  document.getElementById("s-total").textContent = odRM(q.total);
  document.getElementById("s-deposit").textContent = odRM(q.deposit);

  const extrasRow = document.getElementById("s-addons-row");
  if (addonLabels.length) {
    document.getElementById("s-addons").textContent = addonLabels.join(", ");
  } else {
    extrasRow.hidden = true;
  }

  const back = { in: inStr, out: outStr, rooms: String(rooms), guests: String(guests) };
  if (addonIds.length) back.addons = addonIds.join(",");
  document.getElementById("change-dates").href = "booking.html?" + new URLSearchParams(back).toString();

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

    const lines = [
      "Salam Ombak Damai, saya ingin menempah. / I would like to book.",
      "",
      "Reference: " + ref,
      "Check-in: " + odFmtLong(checkIn),
      "Check-out: " + odFmtLong(checkOut),
      "Nights: " + q.nights,
      "Rooms: " + odRoomsLabel(rooms),
      "Guests: " + guests,
      "Total: " + odRM(q.total) + " (" + q.breakdown + ")",
      "Deposit (" + Math.round(OD.depositRate * 100) + "%): " + odRM(q.deposit),
    ];
    if (addonLabels.length) lines.push("Also interested in: " + addonLabels.join(", "));
    lines.push("", "Name: " + name, "Phone: " + phone);
    if (email) lines.push("Email: " + email);
    if (notes) lines.push("Notes: " + notes);

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
