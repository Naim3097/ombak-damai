# Ombak Damai Penarik, version 2

A second version of the site, kept beside the first so the two can be compared.
Same roomstay, same rooms, rates, booking and WhatsApp handoff. What changed is
how you move through it.

Version 1 is a page you read from top to bottom. Version 2 is a day you spend
there.

- **Scrolling moves time.** The first screen stays in place while a clock runs
  from first light to the stars. Each scene has its hour: boats at 06:40,
  turtles at 11:30, the bonfire at 20:30.
- **The page is the sky.** Its colour follows the hour, from dark blue before
  dawn to pale daylight to dusk and night, and the text flips from cream to
  navy with it.
- **It opens on the real time at the roomstay.** Open it at night and you get
  the night photo under a dark sky; open it at midday and you get the daytime
  one. The mark labelled "now" on the right-hand rail shows where the real day
  has got to.
- **The rail and the menu are the day laid out.** Click an hour to travel to
  it. The menu previews each scene's photo as you point at it.
- **The whole coast on one map.** A line map drawn from OpenStreetMap, from
  Kuala Besut to Merang with the islands offshore. The list beside it and the
  marks on it select each other.
- **Live facts.** Local time, sunrise and sunset, tonight's moon, whether the
  island boats are running, and today's official forecast for Setiu.

No stamps, postmarks or decoration. The interface is one text colour on one
sky colour; the photographs carry the rest.

## Run locally

From the project's root folder:

```
npx -y serve -l 4173 .
```

Then open http://localhost:4173/v2/. Once pushed, it is served at
https://ombak-damai.vercel.app/v2/ beside version 1.

To see the page as it opens at another hour, add `?at=` and a time:
`/v2/?at=21:30` for night, `/v2/?at=10:00` for morning.

## Settings

Everything the owner changes is in `OD` at the top of `assets/js/site.js`.
This folder has its own copy, so a change to the rate or the phone number has
to be made here as well as in version 1.

| Setting | What it does | Now |
| --- | --- | --- |
| `phone` | WhatsApp number, digits only, international format | `60107648227` |
| `rooms` | Rooms in the roomstay | `4` |
| `guestsPerRoom` | Most guests one room takes | `4` |
| `rate` | RM per room, per night | `150` |
| `depositRate` | Share of the total paid to confirm | `0.5` |
| `booked` | Rooms already taken, by night | empty |
| `islandSeason` | Months the island trips run | March to October |
| `addons` | Extras a guest can ask about | Redang trip, fishing, BBQ and bonfire |
| `place` | Where the roomstay is; the clock, sun and moon are worked out from it | 5.5742, 102.8377 |
| `forecast` | Show today's forecast | `true` |
| `forecastArea` | Which MET Malaysia area to ask for | `Ds042`, Setiu district |

One thing sits outside that file. So the page can open in day or night colours
before anything is drawn, the short script at the top of `index.html` carries
its own rough table of sunrise and sunset at Penarik for each month. The main
script then refines it from the exact times. If the site were ever reused for
a place far from Penarik, that table would need new numbers.

## Changing the day

The scenes are the list `<ol class="scenes">` in `index.html`. Each one has a
time, a title, a sentence and a photo:

```html
<li class="scene" id="turtles" data-time="11:30"> ... </li>
```

To add, remove or reorder a scene, keep three things in step:

1. the scene itself, with its `data-time`;
2. its line in the rail (`<nav class="rail">`) and in the menu
   (`<nav class="menu-day">`), where `data-go` is the scene's position
   counting the first screen as 0;
3. the count on the section, `style="--n: 10"`, which is the number of scenes
   including the first screen.

Photos are shown in an upright frame, at most about 520 pixels wide on a
computer screen. They are 1000 pixels wide, which is as large as the owner's
phone photos allow, so they should not be shown bigger.

The sky colours are the `SKY` list at the top of `assets/js/experience.js`:
a time in minutes after midnight, then the colour.

## Languages

English is written in the HTML. Malay is in `assets/js/lang-ms.js`, one line
per piece of text, matched by the `data-i18n` attributes. It works the same
way as in version 1, and the two versions remember the visitor's choice
together.

## Less motion

Visitors who have asked their device for reduced motion do not get the
scroll-through tour. They get the same scenes as a plain page, one under the
other, with no smooth scrolling and no animation. The same happens if the
scripts fail to load.

## What is borrowed, and from where

| What | From | Licence |
| --- | --- | --- |
| Smooth scrolling | [Lenis](https://github.com/darkroomengineering/lenis) 1.3.27, the most starred smooth-scroll project on GitHub | MIT |
| Sun and moon times | [SunCalc](https://github.com/mourner/suncalc) 2.1.4 | BSD 2-Clause |
| Coastline and islands | [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, traced into a simplified line map | ODbL |
| Today's forecast | MET Malaysia through [data.gov.my](https://developer.data.gov.my/realtime-api/weather) | CC BY 4.0 |
| Setiu lagoon photo | [Fikku fiq on Wikimedia Commons](https://commons.wikimedia.org/wiki/File:The_lagoon_of_Setiu_Wetlands_State_Park.jpg), cropped | CC BY 4.0 |

The two libraries are copied into `assets/vendor`, unchanged, with their
licences in `LICENSES.txt`. The site loads nothing from a third party except
the fonts and the forecast. Moving between pages uses the browser's own
page transitions, so no library is needed for that.

Credits for the map, the forecast and the lagoon photo are printed on the
page, as their licences ask.

Places on the map are at their real positions. Drive times are the ones from
version 1, taken from Google Maps.

## Before launch

Everything on the first version's list still applies: the rate, guests per
room, deposit and check-in times, extras, facilities, photo approval, the
domain and the `noindex` tag. Three more for this version:

1. **The forecast.** It is the official one and it is honest, which in the
   monsoon means it often says thunderstorms. If the owner would rather not
   show it, set `forecast: false`.
2. **Celup tepung photo.** It is the one generated image, as in version 1,
   and here it has a scene of its own. A real photo from a Rhu Sepuluh stall
   would be better.
3. **Malay wording.** The new lines have not been read by a native speaker.

## Files

- `index.html` the day, then rooms, rates, the coast and good to know
- `booking.html` calendar, rooms, guests, extras and quote
- `checkout.html` guest details and WhatsApp handoff
- `assets/css/v2.css` all styling
- `assets/js/experience.js` the tour, the sky, the clock, the menu, the map and the live facts
- `assets/js/site.js` settings, language switch and shared helpers
- `assets/js/lang-ms.js` the Malay text
- `assets/js/booking.js`, `assets/js/checkout.js` unchanged from version 1
- `assets/vendor/` Lenis and SunCalc
- `assets/img/` the photos this version uses
- `tools/build-map.js` draws the coast map from OpenStreetMap data; only needed to redraw it
