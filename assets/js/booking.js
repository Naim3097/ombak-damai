/* Dates, rooms, guests and extras with a live quote for booking.html */

(function () {
  const monthsEl = document.getElementById("months");
  const prevBtn = document.getElementById("cal-prev");
  const nextBtn = document.getElementById("cal-next");
  const hintEl = document.getElementById("cal-hint");
  const roomsSel = document.getElementById("rooms");
  const guestsSel = document.getElementById("guests");
  const roomsNote = document.getElementById("rooms-note");
  const addonsEl = document.getElementById("addons");
  const continueBtn = document.getElementById("continue");

  const out = {
    checkin: document.getElementById("q-in"),
    checkout: document.getElementById("q-out"),
    nights: document.getElementById("q-nights"),
    breakdown: document.getElementById("q-breakdown"),
    total: document.getElementById("q-total"),
    deposit: document.getElementById("q-deposit"),
  };

  const today = odToday();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selIn = null;
  let selOut = null;
  let rooms = 1;
  let guests = 2;
  const picked = new Set(); // add-on ids

  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  // Prefill from URL if coming back from checkout
  const params = new URLSearchParams(location.search);
  const pIn = odParseISO(params.get("in"));
  const pOut = odParseISO(params.get("out"));
  if (pIn && pOut && pOut > pIn && pIn >= today && odRoomsLeftForStay(pIn, pOut) > 0) {
    selIn = pIn;
    selOut = pOut;
    viewYear = pIn.getFullYear();
    viewMonth = pIn.getMonth();
  }
  const pRooms = parseInt(params.get("rooms"), 10);
  if (pRooms >= 1 && pRooms <= OD.rooms) rooms = pRooms;
  const pGuests = parseInt(params.get("guests"), 10);
  if (pGuests >= 1) guests = pGuests;
  (params.get("addons") || "").split(",").forEach((id) => {
    if (OD.addons.some((a) => a.id === id)) picked.add(id);
  });

  // A fully booked night can still be the morning a guest leaves.
  function canCheckOutOn(date) {
    return selIn && !selOut && date > selIn && odRoomsLeftForStay(selIn, date) > 0;
  }

  function monthGrid(year, month, extraClass) {
    const wrapper = document.createElement("div");
    wrapper.className = "month " + extraClass;

    const h = document.createElement("h3");
    h.textContent = MONTH_NAMES[month] + " " + year;
    wrapper.appendChild(h);

    const dowRow = document.createElement("div");
    dowRow.className = "dow-row";
    dowRow.setAttribute("aria-hidden", "true");
    DOW.forEach((d) => {
      const c = document.createElement("div");
      c.className = "dow";
      c.textContent = d;
      dowRow.appendChild(c);
    });
    wrapper.appendChild(dowRow);

    const grid = document.createElement("div");
    grid.className = "day-grid";

    const first = new Date(year, month, 1);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < lead; i++) {
      const blank = document.createElement("span");
      blank.className = "day blank";
      grid.appendChild(blank);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "day";
      btn.textContent = d;
      btn.dataset.date = odToISO(date);

      const left = odRoomsLeft(date);
      const isPast = date < today;
      const isIn = selIn && date.getTime() === selIn.getTime();
      const isOut = selOut && date.getTime() === selOut.getTime();
      const inRange = selIn && selOut && date > selIn && date < selOut;
      const states = [];

      if (left === 0) {
        btn.classList.add("full");
        states.push("fully booked");
      } else if (left < OD.rooms && !isPast) {
        btn.classList.add("few");
        states.push(odPlural(left, "room") + " left");
      }

      if (isPast || (left === 0 && !canCheckOutOn(date) && !isOut)) {
        btn.disabled = true;
      } else {
        btn.addEventListener("click", () => pick(date));
      }

      if (isIn || isOut) btn.classList.add("edge");
      if (inRange) btn.classList.add("inrange");
      if (isIn) states.unshift("check-in");
      if (isOut) states.unshift("check-out");
      if (inRange) states.unshift("in your stay");
      btn.setAttribute("aria-pressed", isIn || isOut || inRange ? "true" : "false");
      btn.setAttribute("aria-label", odFmtFull(date) + (states.length ? ", " + states.join(", ") : ""));

      grid.appendChild(btn);
    }

    wrapper.appendChild(grid);
    return wrapper;
  }

  function render() {
    monthsEl.innerHTML = "";
    monthsEl.appendChild(monthGrid(viewYear, viewMonth, "m1"));
    const next = new Date(viewYear, viewMonth + 1, 1);
    monthsEl.appendChild(monthGrid(next.getFullYear(), next.getMonth(), "m2"));

    prevBtn.disabled = viewYear === today.getFullYear() && viewMonth === today.getMonth();
    syncChoices();
    updatePanel();
  }

  function pick(date) {
    if (selIn && !selOut && canCheckOutOn(date)) {
      selOut = date;
    } else if (odRoomsLeft(date) > 0) {
      selIn = date;
      selOut = null;
    } else {
      return;
    }
    render();
    const again = monthsEl.querySelector('.day[data-date="' + odToISO(date) + '"]');
    if (again) again.focus({ preventScroll: true });
    // On small screens the quote panel sits below the calendar; bring it into
    // view once both dates are chosen so the total is not missed.
    if (selIn && selOut && window.matchMedia("(max-width: 1020px)").matches) {
      document.querySelector(".panel").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function fillSelect(sel, max, value, labelFor) {
    sel.innerHTML = "";
    for (let n = 1; n <= max; n++) {
      const opt = document.createElement("option");
      opt.value = n;
      opt.textContent = labelFor(n);
      sel.appendChild(opt);
    }
    sel.value = String(value);
  }

  // Keep rooms, guests and extras within what the chosen dates allow.
  function syncChoices() {
    const hasDates = selIn && selOut;
    const maxRooms = hasDates ? odRoomsLeftForStay(selIn, selOut) : OD.rooms;
    rooms = Math.min(Math.max(rooms, 1), maxRooms);
    fillSelect(roomsSel, maxRooms, rooms, odRoomsLabel);

    const maxGuests = rooms * OD.guestsPerRoom;
    guests = Math.min(Math.max(guests, 1), maxGuests);
    fillSelect(guestsSel, maxGuests, guests, (n) => odPlural(n, "guest"));

    roomsNote.textContent = hasDates && maxRooms < OD.rooms
      ? "Only " + odPlural(maxRooms, "room") + " left on these dates."
      : "Each room has two double beds and sleeps up to " + OD.guestsPerRoom + ".";

    const islandOff = hasDates && !odStayHasIslandDay(selIn, selOut);
    addonsEl.querySelectorAll("input").forEach((box) => {
      const addon = OD.addons.find((a) => a.id === box.value);
      const off = addon.seasonal && islandOff;
      if (off) picked.delete(addon.id);
      box.disabled = off;
      box.checked = picked.has(addon.id);
      box.closest(".addon").classList.toggle("off", off);
      box.closest(".addon").querySelector(".addon-note").textContent = off
        ? "Island trips pause for the monsoon and run again from " + MONTH_NAMES[OD.islandSeason.from - 1] + "."
        : addon.note;
    });
  }

  function updatePanel() {
    out.checkin.textContent = selIn ? odFmtLong(selIn) : "Select a date";
    out.checkout.textContent = selOut ? odFmtLong(selOut) : "Select a date";

    if (selIn && !selOut) {
      hintEl.textContent = "Now choose the day you leave.";
    } else if (selIn && selOut) {
      hintEl.textContent = "Dates chosen. Pick again to change them.";
    } else {
      hintEl.textContent = "Choose the day you arrive.";
    }

    const q = selIn && selOut ? odQuote(selIn, selOut, rooms) : null;
    if (q) {
      out.nights.textContent = odPlural(q.nights, "night");
      out.breakdown.textContent = q.breakdown;
      out.total.textContent = odRM(q.total);
      out.deposit.textContent = odRM(q.deposit) + " deposit to confirm";
      continueBtn.disabled = false;
    } else {
      out.nights.textContent = "0";
      out.breakdown.textContent = odRM(OD.rate) + " a room, a night";
      out.total.textContent = "RM 0";
      out.deposit.textContent = "";
      continueBtn.disabled = true;
    }
  }

  // Extras
  OD.addons.forEach((addon) => {
    const label = document.createElement("label");
    label.className = "addon";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.value = addon.id;
    box.addEventListener("change", () => {
      if (box.checked) picked.add(addon.id); else picked.delete(addon.id);
    });
    const text = document.createElement("span");
    const name = document.createElement("span");
    name.className = "addon-name";
    name.textContent = addon.label;
    const note = document.createElement("span");
    note.className = "addon-note";
    note.textContent = addon.note;
    text.appendChild(name);
    text.appendChild(note);
    label.appendChild(box);
    label.appendChild(text);
    addonsEl.appendChild(label);
  });

  roomsSel.addEventListener("change", () => {
    rooms = parseInt(roomsSel.value, 10);
    syncChoices();
    updatePanel();
  });

  guestsSel.addEventListener("change", () => {
    guests = parseInt(guestsSel.value, 10);
  });

  prevBtn.addEventListener("click", () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    render();
  });

  nextBtn.addEventListener("click", () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    render();
  });

  continueBtn.addEventListener("click", () => {
    if (!selIn || !selOut) return;
    const stay = {
      in: odToISO(selIn),
      out: odToISO(selOut),
      rooms: String(rooms),
      guests: String(guests),
    };
    if (picked.size) stay.addons = Array.from(picked).join(",");
    try { sessionStorage.setItem("od-stay", JSON.stringify(stay)); } catch (e) {}
    location.href = "checkout.html?" + new URLSearchParams(stay).toString();
  });

  render();
})();
