/* The home page of version 2.

   Scrolling moves time. The stage stays put, the clock runs from first light to the stars,
   the sky (the page colour) follows the hour, and each scene's photo is uncovered in turn.
   The page opens on the real time at the roomstay.

   On a phone held upright the words are not held in place. They travel with the finger, as on
   any page, while the photo above them changes and the day is drawn as a line under it. The
   stylesheet decides when that layout applies, and tells this script with --flow.

   Smooth scrolling is Lenis; sun and moon times are SunCalc. Both are in assets/vendor. */

(function () {
  "use strict";

  const root = document.documentElement;
  const tour = root.classList.contains("tour");
  const day = document.getElementById("day");
  const stage = day.querySelector(".stage");
  const scenes = Array.from(day.querySelectorAll(".scene"));
  const N = scenes.length;
  const bar = document.getElementById("bar");
  const clockEl = document.getElementById("clock");
  const timeline = day.querySelector(".timeline");
  const rail = document.getElementById("rail");
  const railLinks = Array.from(rail.querySelectorAll("a"));
  const railNow = document.getElementById("rail-now");
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = (x) => x * x * (3 - 2 * x);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);

  /* ---------- time at the roomstay ---------- */

  const place = OD.place;
  const hm = new Intl.DateTimeFormat("en-GB", { timeZone: place.timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: place.timeZone, year: "numeric", month: "2-digit", day: "2-digit" });

  function minutesOf(date) {
    const parts = hm.formatToParts(date);
    const get = (type) => Number(parts.find((p) => p.type === type).value);
    return (get("hour") % 24) * 60 + get("minute");
  }
  function clockText(minutes) {
    const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
    return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  }
  function parseTime(text) {
    const [h, m] = text.split(":").map(Number);
    return h * 60 + m;
  }

  /* Adding ?at=21:30 to the address shows the page as it opens at that hour. Handy for a demonstration. */
  const asked = new URLSearchParams(location.search).get("at") || "";
  const pretend = /^([01]?\d|2[0-3]):[0-5]\d$/.test(asked) ? parseTime(asked) : null;
  const nowMinutes = () => (pretend !== null ? pretend : minutesOf(new Date()));

  /* Sunrise and the rest, in minutes after midnight. The fallback is a middling day at this latitude. */
  function sunToday() {
    try {
      const t = SunCalc.getTimes(new Date(), place.lat, place.lon, 0, place.utcOffset);
      return {
        dawn: minutesOf(t.dawn), sunrise: minutesOf(t.sunrise), noon: minutesOf(t.solarNoon),
        golden: minutesOf(t.goldenHour), sunset: minutesOf(t.sunset), dusk: minutesOf(t.dusk),
      };
    } catch (e) {
      return { dawn: 395, sunrise: 418, noon: 783, golden: 1105, sunset: 1148, dusk: 1170 };
    }
  }

  const PHASES = {
    night: ["v2.ph.night", "Night"],
    dawn: ["v2.ph.dawn", "First light"],
    morning: ["v2.ph.morning", "Morning"],
    midday: ["v2.ph.midday", "Midday"],
    afternoon: ["v2.ph.afternoon", "Afternoon"],
    golden: ["v2.ph.golden", "Golden hour"],
    dusk: ["v2.ph.dusk", "Dusk"],
  };
  function phaseAt(m, sun) {
    if (m < sun.dawn || m >= sun.dusk) return "night";
    if (m < sun.sunrise) return "dawn";
    if (m < sun.noon - 90) return "morning";
    if (m < sun.noon + 90) return "midday";
    if (m < sun.golden) return "afternoon";
    if (m < sun.sunset) return "golden";
    return "dusk";
  }
  const phaseName = (id) => odT(PHASES[id][0], PHASES[id][1]);

  /* ---------- the sky ----------
     The page colour for each hour: minutes after midnight, then red, green, blue.
     Dawn and dusk are placed by the real sunrise and sunset of the day, so the page turns
     dark when it really gets dark there. The hours in between are fixed. */

  function buildSky(sun) {
    const keys = [
      [0, 11, 20, 34],
      [sun.dawn - 50, 12, 22, 38],
      [sun.dawn - 15, 23, 39, 64],
      [sun.dawn + 5, 34, 52, 79],          // first light
      [sun.sunrise + 8, 217, 199, 184],
      [sun.sunrise + 60, 241, 232, 218],   // morning
      [600, 238, 241, 236], [690, 227, 239, 236], [780, 225, 238, 238],   // out at sea
      [930, 242, 235, 221], [990, 241, 230, 210],                         // afternoon at the house
      [sun.sunset - 64, 240, 222, 196],
      [sun.sunset - 9, 232, 202, 168],     // last gold
      [sun.sunset + 8, 208, 166, 150],
      [sun.dusk + 4, 96, 90, 124],
      [sun.dusk + 28, 34, 40, 70],         // blue hour
      [sun.dusk + 75, 13, 19, 32],
      [sun.dusk + 150, 11, 20, 34],        // night
      [1440, 11, 20, 34],
    ];
    for (let i = 1; i < keys.length; i++) if (keys[i][0] <= keys[i - 1][0]) keys[i][0] = keys[i - 1][0] + 1;
    return keys;
  }
  let SKY = buildSky(sunToday());

  function skyAt(minutes) {
    const m = ((minutes % 1440) + 1440) % 1440;
    let i = 0;
    while (i < SKY.length - 2 && SKY[i + 1][0] <= m) i++;
    const a = SKY[i], b = SKY[i + 1];
    const f = clamp((m - a[0]) / (b[0] - a[0]));
    return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
  }
  const mix = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  function luminance(rgb) {
    const lin = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  }

  /* While the tour scrolls, the sky is changed on every frame. Only the page's own background is
     touched then, which costs a phone almost nothing. The page-wide colour that buttons and panels
     read (--sky), and the colour of the phone's own bars, follow as soon as the scroll pauses. */
  const starsEl = day.querySelector(".stars");
  let skyKey = "";
  let lightNow = null;
  let starsNow = "";
  let restTimer = 0;
  function skyAtRest() {
    clearTimeout(restTimer);
    root.style.setProperty("--sky", skyKey);
    if (themeMeta) themeMeta.setAttribute("content", skyKey);
  }
  function setSky(rgb) {
    const parts = rgb.map((v) => Math.round(v)).join(" ");
    const css = "rgb(" + parts + ")";
    if (css === skyKey) return;
    const first = skyKey === "";
    skyKey = css;
    const lum = luminance(rgb);
    root.style.backgroundColor = css;
    // On a phone the strip under the photo is painted in the same colour, and the words pass behind it.
    if (timeline) {
      timeline.style.setProperty("--veil", css);
      timeline.style.setProperty("--veil-clear", "rgb(" + parts + " / 0)");
    }
    // Cream text on a dark sky, navy on a light one. 0.18 is where the two read equally well.
    const light = lum > 0.18;
    if (light !== lightNow) { lightNow = light; root.classList.toggle("sky-light", light); }
    const stars = clamp((0.036 - lum) / 0.022).toFixed(2);
    if (stars !== starsNow && starsEl) { starsNow = stars; starsEl.style.setProperty("--stars", stars); }
    if (first) skyAtRest();
    else { clearTimeout(restTimer); restTimer = setTimeout(skyAtRest, 140); }
  }

  /* ---------- the day ---------- */

  let flow = false;    // a phone held upright: the words travel with the scroll
  const AXIS = [360, 1350]; // the rail runs from 06:00 to 22:30
  const times = scenes.map((s, i) => (i === 0 ? null : parseTime(s.dataset.time)));
  let nowMin = nowMinutes();

  /* The stylesheet decides how far the page scrolls for each scene. It places one stop per scene
     down the height of the day, and the script only reads back where they are. On a touch
     screen the same stops are what the page comes to rest on after a swipe. */
  const stops = [];
  if (tour) {
    for (let i = 0; i < N; i++) {
      const stop = document.createElement("i");
      // a swipe does not carry on past the first scene or the last one
      stop.className = i === 1 || i === N - 1 ? "stop stop-end" : "stop";
      stop.style.setProperty("--a", Math.min(i, 1));      // the first step may be a different length
      stop.style.setProperty("--b", Math.max(i - 1, 0));  // from the rest
      day.appendChild(stop);
      stops.push(stop);
    }
  }
  let stopY = scenes.map((s, i) => i);   // how far down the day the page rests for each scene
  let holdPx = 0;
  const stepAt = (i) => stopY[i + 1] - stopY[i];
  /* Scene 2.5 is half-way between the third stop and the fourth, and so on. */
  const yOf = (p) => { const i = clamp(Math.floor(p), 0, N - 2); return stopY[i] + stepAt(i) * (p - i); };
  function pOf(y) {
    let i = 0;
    while (i < N - 2 && y >= stopY[i + 1]) i++;
    return clamp(i + (y - stopY[i]) / stepAt(i), 0, N - 1);
  }

  /* The share of a step during which a scene rests before the next begins to show. Where the
     words travel there is almost none, and none at all on the way to the first scene, which
     comes up the screen whole. */
  const holdAt = (i) => (flow ? (i < 1 ? 0 : clamp(holdPx / stepAt(i), 0, 0.5)) : 0.34);
  /* How far the change from scene i to the next has got, 0 to 1. */
  const changeAt = (P, i) => { const h = holdAt(i); return clamp((P - i - h) / (1 - h)); };
  /* The same for wherever the page is. While a scene rests, time stands still. */
  const turn = (P) => changeAt(P, Math.min(Math.floor(P), N - 2));

  function timeAt(P) {
    const i = Math.min(Math.floor(P), N - 2);
    const a = i === 0 ? nowMin : times[i];
    let b = times[i + 1];
    if (b < a) b += 1440; // from now, on to tomorrow's first light
    return a + (b - a) * turn(P);
  }
  function skyFor(P) {
    if (P < 1) return mix(skyAt(nowMin), skyAt(times[1]), ease(turn(P)));
    return skyAt(timeAt(P));
  }
  const axisAt = (m) => clamp((m - AXIS[0]) / (AXIS[1] - AXIS[0])) * 100;

  const marks = railLinks.map((a) => axisAt(parseTime(a.dataset.time)));
  railLinks.forEach((a, k) => a.parentElement.style.setProperty("--at", marks[k].toFixed(2)));

  // photos fade in as they arrive
  day.querySelectorAll(".shot img").forEach((img) => {
    const shown = () => img.classList.add("is-in");
    if (img.complete && img.naturalWidth) shown(); else { img.addEventListener("load", shown); img.addEventListener("error", shown); }
  });

  let P = 0;
  let current = -1;
  let clockShown = "";
  let stripShown = null;
  const warmed = [];
  const eager = [];

  const cueEl = day.querySelector(".cue");
  const progressEl = day.querySelector(".progress");
  const lastPut = new WeakMap();
  /* Write a value only when it has changed. */
  function put(el, name, value) {
    if (!el) return;
    let seen = lastPut.get(el);
    if (!seen) { seen = {}; lastPut.set(el, seen); }
    if (seen[name] === value) return;
    seen[name] = value;
    el.style.setProperty(name, value);
  }

  /* Fetch a scene's photo ahead of time, so it is there when the scroll reaches it. */
  function warm(i) {
    if (i < 1 || i >= N || warmed[i]) return;
    warmed[i] = true;
    const img = scenes[i].querySelector("img");
    if (!img) return;
    // the same choice of sizes as the photo itself, so a phone fetches the smaller copy
    const pre = new Image();
    if (img.sizes) pre.sizes = img.sizes;
    if (img.srcset) pre.srcset = img.srcset;
    pre.src = img.getAttribute("src");
  }

  function render() {
    const lo = Math.floor(P) - 1, hi = Math.ceil(P) + 1;
    const here = yOf(P);

    for (let i = 0; i < N; i++) {
      const s = scenes[i];
      const near = i >= lo && i <= hi;
      s.classList.toggle("is-off", !near);
      if (!near) continue;
      if (!eager[i]) { eager[i] = true; if (i > 0) s.querySelectorAll("img").forEach((img) => { img.loading = "eager"; }); }
      const arriving = i === 0 ? 1 : changeAt(P, i - 1); // how far this scene's photo has come
      let r, t;
      if (flow) {
        /* The words ride on the scroll itself: --y is how far the page still has to go to this
           scene, so they move exactly as far as the finger does. Nothing is eased, because the
           finger does the easing. The first scene's photo rides up with its words; every later
           photo is uncovered in place, at a steady pace. The words fade only where they would
           otherwise be seen out of place, far below or far above. */
        const d = i - P; // scenes away; positive while this one is still below
        r = i <= 1 ? 1 : arriving;
        if (i === 0) t = 1 - smooth(clamp((P - 0.7) / 0.3));
        else if (i === 1 && d > 0) t = 1;
        else if (d > 0) t = 1 - smooth(clamp((d - 0.85) / 0.15));
        else t = 1 - smooth(clamp((-d - 0.55) / 0.3));
        put(s, "--y", (stopY[i] - here).toFixed(1) + "px");
      } else {
        r = ease(arriving);
        const next = i === N - 1 ? 0 : ease(changeAt(P, i));
        t = (i === 0 ? 1 : smooth(clamp((r - 0.6) / 0.4))) * (1 - smooth(clamp(next / 0.3)));
      }
      put(s, "--r", r.toFixed(4));
      put(s, "--t", t.toFixed(3));
    }
    warm(hi + 1);
    warm(hi + 2);

    const best = Math.min(N - 1, Math.floor(P) + (turn(P) > 0.5 && P < N - 1 ? 1 : 0));
    if (best !== current) {
      current = best;
      scenes.forEach((s, i) => s.classList.toggle("is-current", i === current));
      scenes[0].inert = current !== 0;
      railLinks.forEach((a) => {
        if (Number(a.dataset.go) === current) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    }

    const text = clockText(timeAt(P));
    if (text !== clockShown) { clockShown = text; clockEl.textContent = text; }

    // each of these is set on the one element that uses it, so a frame restyles as little as possible
    put(timeline, "--clock", smooth(clamp((P - 0.42) / 0.4)).toFixed(2));
    if (flow) {
      // on a phone the clock and the line of the day come up the screen with the first scene
      put(timeline, "--lift", Math.max(0, stopY[1] - here).toFixed(1) + "px");
      const stripOn = P > 0;
      if (stripOn !== stripShown) { stripShown = stripOn; timeline.classList.toggle("is-on", stripOn); }
    }
    put(cueEl, "--cue", (1 - smooth(clamp(P / 0.12))).toFixed(2));
    put(progressEl, "--p", (P / (N - 1)).toFixed(4));
    const head = P < 1 ? axisAt(nowMin) + (axisAt(times[1]) - axisAt(nowMin)) * ease(turn(P)) : axisAt(timeAt(P));
    put(rail, "--head", head.toFixed(2));

    setSky(skyFor(P));
  }

  /* ---------- scrolling ---------- */

  let dayTop = 0, stageH = 0, dayEnd = 0;
  function measure() {
    const box = day.getBoundingClientRect();
    stageH = stage.getBoundingClientRect().height;
    dayTop = box.top + window.scrollY;
    dayEnd = dayTop + box.height;
    if (!tour) return;
    const at = stops.map((stop) => stop.getBoundingClientRect().top - box.top);
    // a browser that cannot work the stops out leaves them all in one place: space them plainly instead
    stopY = at.every((y, i) => i === 0 || y > at[i - 1] + 1) ? at : scenes.map((s, i) => i * stageH * 0.85);
    const style = getComputedStyle(day);
    flow = style.getPropertyValue("--flow").trim() === "1";
    holdPx = parseFloat(style.getPropertyValue("--hold")) || 0;
  }

  /* Smooth scrolling is for a mouse wheel. A finger on a touch screen already scrolls smoothly,
     and the phone does it best when nothing stands between the finger and the page. */
  const touchFirst = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  let lenis = null;
  if (tour && !touchFirst) {
    // fetched only where it is used, so a phone never downloads it
    const tag = document.createElement("script");
    tag.src = "assets/vendor/lenis.min.js";
    tag.onload = () => {
      if (!window.Lenis) return;
      lenis = new Lenis({ autoRaf: true, lerp: 0.085, wheelMultiplier: 0.95 });
      if (menu.open) lenis.stop();
    };
    document.head.appendChild(tag);
  }

  function scrollToY(y, seconds, easing) {
    if (lenis) lenis.scrollTo(y, { duration: seconds, easing: easing || ease });
    else window.scrollTo({ top: y, behavior: tour ? "smooth" : "auto" });
  }

  function goTo(i, instant) {
    const y = dayTop + yOf(clamp(i, 0, N - 1));
    if (instant) { if (lenis) lenis.scrollTo(y, { immediate: true }); else window.scrollTo(0, y); return; }
    const far = Math.abs(i - P);
    scrollToY(y, clamp(0.9 + far * 0.34, 1.1, 3.2));
  }

  function scrollToEl(el) {
    const y = el.getBoundingClientRect().top + window.scrollY - (el.id === "day" ? 0 : 24);
    scrollToY(Math.max(0, y), 1.5);
  }

  /* When scrolling stops part-way through a change of scene, glide on to whichever scene is nearer.
     On a touch screen the browser usually does this itself, coming to rest on the stops, and
     this is what is left for the browsers that do not. */
  let settleTimer = 0;
  let touching = false;
  let settledFrom = -1;
  function settle() {
    if (!tour || touching || menu.open) return;
    const y = window.scrollY - dayTop;
    if (y <= 0 || y >= stopY[N - 1]) return;
    // worked out afresh from where the page is, in case a busy phone has not drawn this frame yet
    const p = pOf(y);
    const i = Math.min(Math.floor(p), N - 2), f = p - i;
    if (flow) {
      // the words travel with the page here, so a scene is at rest only when it is exactly in place
      const to = yOf(f > 0.5 ? i + 1 : i);
      if (Math.abs(to - y) < 2) return;
      // if the page did not stay where it was sent, the browser has its own idea of rest: leave it be
      if (Math.abs(y - settledFrom) < 3) return;
      settledFrom = y;
      scrollToY(dayTop + to, 0.7, easeOut);
      return;
    }
    const hold = holdAt(i);
    if (f <= hold) return;
    const onward = (f - hold) / (1 - hold) > 0.42;
    scrollToY(dayTop + yOf(onward ? i + 1 : i + hold * 0.5), 0.9, easeOut);
  }

  let lastY = 0;
  let ticking = false;
  function frame() {
    ticking = false;
    const y = window.scrollY;
    if (tour) {
      let p = pOf(y - dayTop);
      // at rest on a scene, the clock reads its exact time and the words sit exactly in place
      const at = Math.round(p);
      if (Math.abs(yOf(at) - (y - dayTop)) < (flow ? 1.5 : 0.004 * stepAt(0))) p = at;
      if (p !== P || current === -1) { P = p; render(); }
      // the progress line belongs to the tour: it appears after the first screen and leaves with the last
      const inTour = y < dayEnd - stageH * 1.2;
      put(progressEl, "--rail", inTour ? smooth(clamp((P - 0.5) / 0.4)).toFixed(2) : "0");
    }
    // The bar floats over the tour. After it, the bar gets a background, leaves on the way down and returns on the way up.
    // Where the words travel, the tour is over as soon as the last scene starts to move off up the screen.
    const past = y > (tour ? (flow ? dayTop + stopY[N - 1] + 8 : dayEnd - 90) : 60);
    bar.classList.toggle("is-solid", past);
    if (!past) bar.classList.remove("is-away");
    else if (Math.abs(y - lastY) > 5) bar.classList.toggle("is-away", y > lastY && !menu.open);
    lastY = y;
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, 180);
  }

  /* ---------- menu ---------- */

  const menu = document.getElementById("menu");
  const menuOpen = document.getElementById("menu-open");
  const menuWindow = menu.querySelector(".menu-window");
  const calm = !tour;

  function openMenu() {
    if (menu.open) return;
    skyAtRest(); // the menu takes the colour of the sky as it is at this moment
    if (lenis) lenis.stop();
    menu.classList.remove("is-closing");
    menu.showModal();
    menuOpen.setAttribute("aria-expanded", "true");
  }
  function closeMenu(then) {
    if (!menu.open) { if (then) then(); return; }
    const done = () => {
      menu.classList.remove("is-closing");
      menu.close();
      if (lenis) lenis.start();
      menuOpen.setAttribute("aria-expanded", "false");
      if (then) then();
    };
    if (calm) { done(); return; }
    menu.classList.add("is-closing");
    setTimeout(done, 250);
  }
  menuOpen.setAttribute("aria-expanded", "false");
  menuOpen.addEventListener("click", openMenu);
  document.getElementById("menu-close").addEventListener("click", () => closeMenu());
  menu.addEventListener("cancel", (e) => { e.preventDefault(); closeMenu(); });

  if (menuWindow) {
    const preview = menuWindow.querySelector("img");
    menu.querySelectorAll(".menu-day a[data-img]").forEach((a) => {
      const show = () => {
        if (preview.getAttribute("src") === a.dataset.img) return;
        preview.setAttribute("src", a.dataset.img);
        menuWindow.classList.remove("swap");
        void menuWindow.offsetWidth; // start the reveal again
        menuWindow.classList.add("swap");
      };
      a.addEventListener("pointerenter", show);
      a.addEventListener("focus", show);
    });
  }

  /* Links to a scene or a section travel there smoothly. With the tour off they are plain links. */
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const href = a.getAttribute("href") || "";
    const inMenu = menu.contains(a);

    if (a.dataset.go && tour) {
      e.preventDefault();
      const i = Number(a.dataset.go);
      closeMenu(() => goTo(i));
      return;
    }
    if (href.charAt(0) === "#" && href.length > 1) {
      const target = document.getElementById(href.slice(1));
      if (!target) return;
      if (tour) {
        e.preventDefault();
        closeMenu(() => scrollToEl(target));
        history.replaceState(null, "", href);
      } else if (inMenu) {
        closeMenu();
      }
    }
  });

  /* On a phone the marks along the line of the day sit too close together for a finger,
     so a tap anywhere on the line goes to the nearest one. */
  rail.addEventListener("click", (e) => {
    // a key pressed on a mark has no position, and simply goes to that mark
    if (!tour || !flow || (!e.clientX && !e.clientY)) return;
    const box = rail.getBoundingClientRect();
    if (!box.width) return;
    const at = ((e.clientX - box.left) / box.width) * 100;
    let nearest = 0;
    marks.forEach((m, k) => { if (Math.abs(m - at) < Math.abs(marks[nearest] - at)) nearest = k; });
    e.preventDefault();
    goTo(Number(railLinks[nearest].dataset.go));
  });

  /* ---------- sections arrive as they come into view ---------- */

  if (tour && "IntersectionObserver" in window) {
    const seen = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        seen.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll("[data-reveal]").forEach((el) => seen.observe(el));
  } else {
    document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("in"));
  }

  /* ---------- the row of room photos: drag it with a mouse ---------- */

  const strip = document.getElementById("strip");
  if (strip) {
    let startX = 0, startLeft = 0, moved = 0, down = false;
    strip.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = 0; startX = e.clientX; startLeft = strip.scrollLeft;
    });
    window.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      if (moved > 4) { strip.classList.add("is-dragging"); strip.scrollLeft = startLeft - dx; }
    });
    const release = () => { if (down) { down = false; strip.classList.remove("is-dragging"); } };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
  }

  /* ---------- the coast: the list and the marks on the map choose each other ---------- */

  const places = document.getElementById("places");
  const pins = Array.from(document.querySelectorAll(".pin"));
  function selectPlace(id) {
    places.querySelectorAll("li[data-place]").forEach((li) => {
      const on = li.dataset.place === id;
      li.classList.toggle("is-active", on);
      li.querySelector("button").setAttribute("aria-expanded", on ? "true" : "false");
    });
    pins.forEach((pin) => {
      const on = pin.dataset.place === id;
      pin.classList.toggle("is-active", on);
      pin.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  if (places) {
    places.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-place]");
      if (li) selectPlace(li.dataset.place);
    });
    pins.forEach((pin) => {
      pin.addEventListener("click", () => selectPlace(pin.dataset.place));
      pin.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") selectPlace(pin.dataset.place); });
    });
  }

  /* ---------- live facts ---------- */

  const liveLine = document.getElementById("live-line");
  const shotNight = document.querySelector(".shot-night");
  const shotDay = document.querySelector(".shot-day");
  const out = {
    now: document.getElementById("live-now"),
    sun: document.getElementById("live-sun"),
    moon: document.getElementById("live-moon"),
    sea: document.getElementById("live-sea"),
    sky: document.getElementById("live-sky"),
    skyBox: document.getElementById("live-sky-box"),
    moonLine: document.getElementById("moon-line"),
  };

  const MOON = [
    ["v2.moon.0", "New moon"], ["v2.moon.1", "Waxing crescent"], ["v2.moon.2", "First quarter"], ["v2.moon.3", "Waxing gibbous"],
    ["v2.moon.4", "Full moon"], ["v2.moon.5", "Waning gibbous"], ["v2.moon.6", "Last quarter"], ["v2.moon.7", "Waning crescent"],
  ];

  function live() {
    const date = new Date();
    nowMin = nowMinutes();
    const sun = sunToday();
    const phase = phaseName(phaseAt(nowMin, sun));
    const time = clockText(nowMin);

    if (liveLine) liveLine.textContent = odT("v2.live.line", "Penarik now · {time} · {phase}", { time: time, phase: phase });

    // The window on the first screen shows the roomstay by day or by night, whichever it is there now.
    SKY = buildSky(sun);
    const isDay = luminance(skyAt(nowMin)) > 0.18;
    root.classList.toggle("is-day", isDay);
    const firstPhoto = isDay ? shotDay : shotNight;
    if (firstPhoto) firstPhoto.loading = "eager";

    if (out.now) out.now.textContent = time + ", " + phase.toLowerCase();
    if (out.sun) out.sun.textContent = odT("v2.live.sunv", "Rises {rise}, sets {set}", { rise: clockText(sun.sunrise), set: clockText(sun.sunset) });

    try {
      const moon = SunCalc.getMoonIllumination(date);
      const name = MOON[Math.round(moon.phase * 8) % 8];
      const text = odT("v2.live.moonv", "{phase}, {pct}% lit", { phase: odT(name[0], name[1]), pct: Math.round(moon.fraction * 100) });
      if (out.moon) out.moon.textContent = text;
      if (out.moonLine) { out.moonLine.hidden = false; out.moonLine.textContent = odT("v2.moon.line", "Tonight's moon: {moon}.", { moon: text.charAt(0).toLowerCase() + text.slice(1) }); }
    } catch (e) {
      if (out.moon) out.moon.parentElement.hidden = true;
    }

    if (out.sea) {
      const month = Number(ymd.format(date).slice(5, 7));
      const season = OD.islandSeason;
      out.sea.textContent = month >= season.from && month <= season.to
        ? odT("v2.sea.on", "Island season. The boats are running.")
        : odT("v2.sea.off", "Monsoon season. Island boats rest until {month}.", { month: odMonthName(season.from - 1) });
    }

    if (railNow) {
      railNow.hidden = false;
      rail.style.setProperty("--now", axisAt(nowMin).toFixed(2));
    }
    if (tour && P < 1) { skyKey = ""; render(); }
  }

  /* Today's forecast for Setiu from MET Malaysia. The service answers in Malay; this puts it in English too. */
  const WEATHER = { "tiada hujan": "No rain", "hujan": "Rain", "ribut petir": "Thunderstorms", "mendung": "Cloudy", "berjerebu": "Hazy", "berangin": "Windy", "panas": "Hot" };
  const SPREAD = { "di beberapa tempat": " in some places", "di kebanyakan tempat": " in most places", "di satu dua tempat": " in one or two places" };
  const WHEN = {
    "pagi": "in the morning", "petang": "in the afternoon", "malam": "at night", "sepanjang hari": "all day",
    "pagi dan petang": "morning and afternoon", "petang dan malam": "afternoon and night", "pagi dan malam": "morning and night",
  };
  function forecastText(row) {
    const what = String(row.summary_forecast || "").trim();
    const when = String(row.summary_when || "").trim();
    let line;
    if (odLang === "ms") {
      line = what + (when ? ", " + when.toLowerCase() : "");
    } else {
      let w = what.toLowerCase(), spread = "", wide = false;
      Object.keys(SPREAD).forEach((k) => { if (w.indexOf(k) !== -1) { spread = SPREAD[k]; w = w.replace(k, "").trim(); } });
      if (w.indexOf("menyeluruh") !== -1) { wide = true; w = w.replace("menyeluruh", "").trim(); }
      const base = WEATHER[w];
      if (!base) line = what + (when ? ", " + when.toLowerCase() : ""); // an unfamiliar phrase is shown as it came
      else line = (wide ? "Widespread " + base.toLowerCase() : base) + spread + (WHEN[when.toLowerCase()] ? ", " + WHEN[when.toLowerCase()] : "");
    }
    return line + ". " + odT("v2.sky.temp", "{min} to {max}°C", { min: row.min_temp, max: row.max_temp });
  }

  let forecastRow = null;
  function showForecast() {
    if (!forecastRow || !out.sky) return;
    out.sky.textContent = forecastText(forecastRow);
    const src = document.createElement("small");
    src.textContent = odT("v2.sky.src", "MET Malaysia, Setiu district");
    out.sky.appendChild(src);
    out.skyBox.hidden = false;
  }
  function loadForecast() {
    if (!OD.forecast || !out.sky || !window.fetch) return;
    const today = ymd.format(new Date());
    try {
      const kept = JSON.parse(sessionStorage.getItem("od-sky") || "null");
      if (kept && kept.date === today && kept.row) { forecastRow = kept.row; showForecast(); return; }
    } catch (e) {}
    fetch("https://api.data.gov.my/weather/forecast/?contains=" + encodeURIComponent(OD.forecastArea) + "@location__location_id&sort=date&limit=10")
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => {
        const row = (rows || []).find((r) => r.date === today);
        if (!row) return;
        forecastRow = { summary_forecast: row.summary_forecast, summary_when: row.summary_when, min_temp: row.min_temp, max_temp: row.max_temp };
        try { sessionStorage.setItem("od-sky", JSON.stringify({ date: today, row: forecastRow })); } catch (e) {}
        showForecast();
      })
      .catch(() => {}); // no forecast is shown if the service cannot be reached
  }

  /* ---------- start ---------- */

  measure();
  live();
  frame();
  root.classList.add("ready");

  if (tour) {
    // a link straight to a scene, such as index.html#bonfire
    const linked = scenes.findIndex((s) => s.id && "#" + s.id === location.hash);
    if (linked > 0) { goTo(linked, true); frame(); }

    const fresh = () => { settledFrom = -1; }; // the visitor has moved the page again
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", () => { touching = true; fresh(); }, { passive: true });
    window.addEventListener("touchend", () => { touching = false; onScroll(); }, { passive: true });
    window.addEventListener("touchcancel", () => { touching = false; }, { passive: true });
    window.addEventListener("wheel", fresh, { passive: true });
    window.addEventListener("keydown", fresh);

    // fetch the rest of the photos once the first screen has settled, unless the visitor is saving data
    const saving = navigator.connection && navigator.connection.saveData;
    if (!saving) window.addEventListener("load", () => setTimeout(() => { for (let i = 1; i < N; i++) warm(i); }, 1800));
  } else {
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const end = stopY[N - 1], at = P;
      const inside = tour && window.scrollY - dayTop < end;
      measure();
      // Turning a phone on its side changes how far apart the scenes are. Stay on the one that was
      // showing. (A phone's own bars sliding away also count as a resize, but move nothing.)
      if (inside && Math.abs(stopY[N - 1] - end) > 1) goTo(at, true);
      current = -1;
      frame();
    }, 120);
  });
  window.addEventListener("load", () => { measure(); frame(); });

  setInterval(live, 20000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) live(); });
  document.addEventListener("od:lang", () => { live(); showForecast(); });
  loadForecast();

  window.odTourReady = true;
})();
