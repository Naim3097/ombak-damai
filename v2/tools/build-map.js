/* Draws the line map of the coast used on the home page, from OpenStreetMap.

   1. Fetch the coastline for the area from the Overpass API and save it as coast.json:

        [out:json][timeout:60];
        way["natural"="coastline"](5.45,102.52,5.96,103.14);
        out geom;

   2. Run:  node build-map.js coast.json .

   It writes map-data.json (the paths, and where each place sits on the map as x and y)
   and map-preview.svg to look at. The paths go into the <svg> in index.html: the long
   coast line as class "coast", the islands as class "isles". Each place becomes a
   <button class="pin"> with its x and y as percentages of the width and height.

   Map data (c) OpenStreetMap contributors, Open Database Licence. */

const fs = require("fs");
const path = require("path");

const [, , inFile, outDir] = process.argv;
const osm = JSON.parse(fs.readFileSync(inFile, "utf8"));

// The frame of the map, chosen to hold Kuala Besut, the Perhentians, Redang, Bidong and Merang.
const BOX = { west: 102.50, east: 103.12, south: 5.47, north: 5.965 };
const W = 1200;
const midLat = (BOX.south + BOX.north) / 2;
const kx = Math.cos((midLat * Math.PI) / 180);
const scale = W / ((BOX.east - BOX.west) * kx);
const H = Math.round((BOX.north - BOX.south) * scale);

const project = (lon, lat) => [(lon - BOX.west) * kx * scale, (BOX.north - lat) * scale];

// 1. Join ways end to end into chains.
const ways = osm.elements.filter((e) => e.type === "way").map((w) => w.geometry.map((g) => [g.lon, g.lat]));
const key = (p) => p[0].toFixed(7) + "," + p[1].toFixed(7);
const chains = [];
const used = new Array(ways.length).fill(false);
const byStart = new Map();
const byEnd = new Map();
ways.forEach((w, i) => {
  (byStart.get(key(w[0])) || byStart.set(key(w[0]), []).get(key(w[0]))).push(i);
  (byEnd.get(key(w[w.length - 1])) || byEnd.set(key(w[w.length - 1]), []).get(key(w[w.length - 1]))).push(i);
});
for (let i = 0; i < ways.length; i++) {
  if (used[i]) continue;
  used[i] = true;
  let chain = ways[i].slice();
  let grew = true;
  while (grew) {
    grew = false;
    const tail = key(chain[chain.length - 1]);
    const next = (byStart.get(tail) || []).find((j) => !used[j]);
    if (next !== undefined) { used[next] = true; chain = chain.concat(ways[next].slice(1)); grew = true; continue; }
    const head = key(chain[0]);
    const prev = (byEnd.get(head) || []).find((j) => !used[j]);
    if (prev !== undefined) { used[prev] = true; chain = ways[prev].slice(0, -1).concat(chain); grew = true; }
  }
  chains.push(chain);
}

// 2. Project and simplify (Douglas-Peucker).
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let worst = 0, index = -1;
    const [ax, ay] = points[a], [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((points[i][0] - ax) * dy - (points[i][1] - ay) * dx) / len;
      if (d > worst) { worst = d; index = i; }
    }
    if (worst > tolerance && index !== -1) { keep[index] = 1; stack.push([a, index], [index, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

// A ring starts and ends on the same point, so it is cut at its far side and each half is simplified.
function simplifyRing(points, tolerance) {
  let far = 0, best = -1;
  for (let i = 1; i < points.length - 1; i++) {
    const d = Math.hypot(points[i][0] - points[0][0], points[i][1] - points[0][1]);
    if (d > best) { best = d; far = i; }
  }
  if (far === 0) return points;
  const a = simplify(points.slice(0, far + 1), tolerance);
  const b = simplify(points.slice(far), tolerance);
  return a.concat(b.slice(1));
}

const TOL = 0.55;
const shapes = chains.map((chain) => {
  const closed = key(chain[0]) === key(chain[chain.length - 1]);
  const pts = chain.map(([lon, lat]) => project(lon, lat));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  pts.forEach(([x, y]) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); });
  return { closed, pts, size: Math.max(maxX - minX, maxY - minY), box: [minX, minY, maxX, maxY], raw: chain.length };
});

const fmt = (n) => (Math.round(n * 10) / 10).toString();
const toPath = (pts, closed) => "M" + pts.map(([x, y]) => fmt(x) + " " + fmt(y)).join("L") + (closed ? "Z" : "");

const land = [];   // open coast lines (the mainland)
const isles = [];  // closed rings
shapes.forEach((s) => {
  if (s.closed) {
    if (s.size < 2.2) return;                       // specks smaller than a hairline dot
    const pts = simplifyRing(s.pts, s.size < 12 ? 0.3 : TOL);
    if (pts.length < 4) return;
    isles.push({ d: toPath(pts.slice(0, -1), true), size: Math.round(s.size), n: pts.length, box: s.box.map((v) => Math.round(v)) });
  } else {
    const pts = simplify(s.pts, TOL);
    land.push({ d: toPath(pts, false), size: Math.round(s.size), n: pts.length, box: s.box.map((v) => Math.round(v)) });
  }
});

land.sort((a, b) => b.size - a.size);
isles.sort((a, b) => b.size - a.size);

// 3. Places, from OpenStreetMap unless noted.
const places = {
  home:       { lon: 102.8376505, lat: 5.5742319 },  // Ombak Damai, from its Google listing
  penarik:    { lon: 102.8150, lat: 5.6085, snap: true }, // Pantai Penarik, on the shore about 4.5 km up the coast road
  merang:     { lon: 102.9465, lat: 5.5337 },        // Jeti Merang
  besut:      { lon: 102.5583, lat: 5.8307 },        // Jeti Kuala Besut
  redang:     { lon: 103.0162, lat: 5.7836 },
  langtengah: { lon: 102.8968, lat: 5.7957 },
  bidong:     { lon: 103.0635, lat: 5.62 },
  perhentian: { lon: 102.7400, lat: 5.9093 },        // between Perhentian Besar and Kecil
  mangkuk:    { lon: 102.7570, lat: 5.6475 },        // Kampung Mangkuk, by Pulau Gemia in the lagoon
  wetlands:   { lon: 102.7253, lat: 5.67 },          // Setiu lagoon, at Pulau Besar
};
const points = {};
const allCoast = chains.reduce((a, c) => a.concat(c), []);
Object.keys(places).forEach((k) => { let pl = places[k]; if (pl.snap) { let bd = Infinity, bp = null; allCoast.forEach((q) => { const d = Math.hypot((q[0] - pl.lon) * kx, q[1] - pl.lat); if (d < bd) { bd = d; bp = q; } }); pl = { lon: bp[0], lat: bp[1] }; } const [x, y] = project(pl.lon, pl.lat); points[k] = [Math.round(x * 10) / 10, Math.round(y * 10) / 10]; });

const out = { width: W, height: H, land, isles, points, kmPerPx: 111.32 / scale };
fs.writeFileSync(path.join(outDir, "map-data.json"), JSON.stringify(out));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="background:#0B1422">
<g fill="none" stroke="#F1E9D8" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round">
${land.map((s) => `<path d="${s.d}"/>`).join("\n")}
${isles.map((s) => `<path d="${s.d}"/>`).join("\n")}
</g>
<g fill="#D9B36A" font-family="sans-serif" font-size="13">
${Object.keys(points).map((k) => `<circle cx="${points[k][0]}" cy="${points[k][1]}" r="4"/><text x="${points[k][0] + 8}" y="${points[k][1] + 4}">${k}</text>`).join("\n")}
</g></svg>`;
fs.writeFileSync(path.join(outDir, "map-preview.svg"), svg);

const bytes = land.concat(isles).reduce((n, s) => n + s.d.length, 0);
console.log(JSON.stringify({ ways: ways.length, chains: chains.length, land: land.length, isles: isles.length, viewBox: [W, H], pathBytes: bytes, kmPerPx: +(111.32 / scale).toFixed(4),
  landSizes: land.map((s) => s.size + "px/" + s.n + "pt").slice(0, 8), biggestIsles: isles.slice(0, 10).map((s) => s.size + "px/" + s.n + "pt") }, null, 1));
