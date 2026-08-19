/* Date selection and live quote for booking.html */

(function () {
  const monthsEl = document.getElementById("months");
  const prevBtn = document.getElementById("cal-prev");
  const nextBtn = document.getElementById("cal-next");
  const hintEl = document.getElementById("cal-hint");
  const guestsSel = document.getElementById("guests");
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

  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  // Guests options
  for (let g = 1; g <= OD.maxGuests; g++) {
    const opt = document.createElement("option");
    opt.value = g;
    opt.textContent = g + (g === 1 ? " guest" : " guests");
    guestsSel.appendChild(opt);
  }
  guestsSel.value = "2";

  // Prefill from URL if coming back from checkout
  const params = new URLSearchParams(location.search);
  const pIn = odParseISO(params.get("in"));
  const pOut = odParseISO(params.get("out"));
  const pGuests = parseInt(params.get("guests"), 10);
  if (pIn && pOut && pOut > pIn && pIn >= today) {
    selIn = pIn;
    selOut = pOut;
    viewYear = pIn.getFullYear();
    viewMonth = pIn.getMonth();
  }
  if (pGuests >= 1 && pGuests <= OD.maxGuests) guestsSel.value = String(pGuests);

  function isUnavailable(d) {
    return OD.unavailable.indexOf(odToISO(d)) !== -1;
  }

  function rangeHasUnavailable(a, b) {
    const cur = new Date(a.getTime());
    while (cur < b) {
      if (isUnavailable(cur)) return true;
      cur.setDate(cur.getDate() + 1);
    }
    return false;
  }

  function monthGrid(year, month, extraClass) {
    const wrapper = document.createElement("div");
    wrapper.className = "month " + extraClass;

    const h = document.createElement("h3");
    h.textContent = MONTH_NAMES[month] + " " + year;
    wrapper.appendChild(h);

    const dowRow = document.createElement("div");
    dowRow.className = "dow-row";
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
      const blank = document.createElement("button");
      blank.className = "day blank";
      blank.disabled = true;
      blank.tabIndex = -1;
      grid.appendChild(blank);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "day";
      btn.textContent = d;
      btn.dataset.date = odToISO(date);

      if (odIsWeekendNight(date)) btn.classList.add("wknd");

      const isPast = date < today;
      if (isPast || isUnavailable(date)) {
        btn.disabled = true;
      } else {
        btn.addEventListener("click", () => pick(date));
      }

      if (selIn && date.getTime() === selIn.getTime()) btn.classList.add("edge");
      if (selOut && date.getTime() === selOut.getTime()) btn.classList.add("edge");
      if (selIn && selOut && date > selIn && date < selOut) btn.classList.add("inrange");

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
    updatePanel();
  }

  function pick(date) {
    if (!selIn || (selIn && selOut)) {
      selIn = date;
      selOut = null;
    } else if (date > selIn) {
      if (rangeHasUnavailable(selIn, date)) {
        selIn = date;
        selOut = null;
      } else {
        selOut = date;
      }
    } else {
      selIn = date;
      selOut = null;
    }
    render();
    // On small screens the quote panel sits below the calendar; bring it into
    // view once both dates are chosen so the total is not missed.
    if (selIn && selOut && window.matchMedia("(max-width: 1020px)").matches) {
      document.querySelector(".panel").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function updatePanel() {
    out.checkin.textContent = selIn ? odFmtLong(selIn) : "Select a date";
    out.checkout.textContent = selOut ? odFmtLong(selOut) : (selIn ? "Select a date" : "Select a date");

    if (selIn && !selOut) {
      hintEl.textContent = "Now choose your check-out day.";
    } else if (selIn && selOut) {
      hintEl.textContent = "Dates chosen. You can pick again to change them.";
    } else {
      hintEl.textContent = "Choose your check-in day to begin.";
    }

    if (selIn && selOut) {
      const q = odQuote(selIn, selOut);
      out.nights.textContent = q.nights + (q.nights === 1 ? " night" : " nights");
      const parts = [];
      if (q.weeknights) parts.push(q.weeknights + " x " + odRM(OD.rates.weeknight));
      if (q.weekends) parts.push(q.weekends + " x " + odRM(OD.rates.weekend));
      out.breakdown.textContent = parts.join("  +  ");
      out.total.textContent = odRM(q.total);
      out.deposit.textContent = odRM(q.deposit) + " deposit to confirm";
      continueBtn.disabled = false;
    } else {
      out.nights.textContent = "0";
      out.breakdown.textContent = "Select your dates";
      out.total.textContent = "RM 0";
      out.deposit.textContent = "";
      continueBtn.disabled = true;
    }
  }

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
      guests: guestsSel.value,
    };
    try { sessionStorage.setItem("od-stay", JSON.stringify(stay)); } catch (e) {}
    location.href = "checkout.html?" + new URLSearchParams(stay).toString();
  });

  render();
})();
