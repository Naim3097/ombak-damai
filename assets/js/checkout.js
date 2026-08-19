/* Summary, guest details and WhatsApp handover for checkout.html */

(function () {
  const params = new URLSearchParams(location.search);
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem("od-stay") || "null"); } catch (e) {}

  const inStr = params.get("in") || (saved && saved.in);
  const outStr = params.get("out") || (saved && saved.out);
  const guestsStr = params.get("guests") || (saved && saved.guests);

  const checkIn = odParseISO(inStr);
  const checkOut = odParseISO(outStr);
  let guests = parseInt(guestsStr, 10);

  const main = document.getElementById("checkout-main");
  const empty = document.getElementById("empty-state");

  const valid =
    checkIn && checkOut && checkOut > checkIn && checkIn >= odToday() &&
    guests >= 1 && guests <= OD.maxGuests;

  if (!valid) {
    main.hidden = true;
    empty.hidden = false;
    return;
  }

  const q = odQuote(checkIn, checkOut);

  // Summary panel
  document.getElementById("s-in").textContent = odFmtLong(checkIn);
  document.getElementById("s-out").textContent = odFmtLong(checkOut);
  document.getElementById("s-nights").textContent = q.nights + (q.nights === 1 ? " night" : " nights");
  document.getElementById("s-guests").textContent = guests + (guests === 1 ? " guest" : " guests");
  const parts = [];
  if (q.weeknights) parts.push(q.weeknights + " x " + odRM(OD.rates.weeknight));
  if (q.weekends) parts.push(q.weekends + " x " + odRM(OD.rates.weekend));
  document.getElementById("s-breakdown").textContent = parts.join("  +  ");
  document.getElementById("s-total").textContent = odRM(q.total);
  document.getElementById("s-deposit").textContent = odRM(q.deposit);

  document.getElementById("change-dates").href =
    "booking.html?" + new URLSearchParams({ in: inStr, out: outStr, guests: guests }).toString();

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
      "Guests: " + guests,
      "Total: " + odRM(q.total),
      "Deposit (50%): " + odRM(q.deposit),
      "",
      "Name: " + name,
      "Phone: " + phone,
    ];
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
