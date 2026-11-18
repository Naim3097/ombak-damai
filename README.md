# Ombak Damai Penarik

Static three-page site for a four-room coastal roomstay in Rhu Sepuluh,
Penarik, Terengganu: landing, booking, checkout. No build step, no backend.
Guests choose dates, rooms and extras, then the site hands them to WhatsApp
with a prefilled request; the deposit is arranged there. Nothing is charged
online.

The look follows the roomstay's own posters: night-sky navy, cream and gold,
script headlines, and photos in postage-stamp frames.

## Run locally

```
npx -y serve -l 4173 .
```

Then open http://localhost:4173. The `serve.json` file keeps `.html` URLs
working; leave it in place if you deploy with `serve` or Vercel.

Pushing to `main` deploys to https://ombak-damai.vercel.app.

## Settings

Everything the owner changes lives in `OD` at the top of `assets/js/site.js`.
Rates, room counts and the phone number on every page are filled from there.

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

To block dates, list the rooms taken on each night:

```js
booked: { "2026-12-24": 4, "2026-12-25": 2 },
```

A night with every room taken cannot be booked, but guests can still check
out that morning. A night with some rooms taken limits how many can be chosen.

## Languages

Every page is in English and Bahasa Melayu. The EN | BM switch sits in the
top bar and again in the footer, and changes the page without reloading it.

- **English** is written in the three HTML files.
- **Malay** is in `assets/js/lang-ms.js`, one line per piece of text. The
  name at the start of each line matches a `data-i18n` attribute in the HTML,
  or a name used in the scripts.

To change wording, edit the English in the HTML and the Malay line with the
same name. To add new text, give the element a `data-i18n="some.name"`
attribute and add `"some.name"` to `lang-ms.js`. Text with no Malay line stays
in English. Use `data-i18n-html` when the text contains tags, and
`data-i18n-alt`, `-aria`, `-placeholder`, `-title` or `-content` for
attributes.

Which language a visitor sees:

1. `?lang=ms` or `?lang=en` in the link, if there is one. Use
   `https://ombak-damai.vercel.app/?lang=ms` to share the Malay version.
2. Otherwise the language they chose last time.
3. Otherwise Malay if their phone or browser is set to Malay, English if not.

The booking request sent to WhatsApp is written in the language the guest is
reading. Dates and month names come from the browser, so they follow the
language too.

## Before launch, confirm with the owner

1. **Rate.** RM 150 a room is a flat placeholder. There are no weekend,
   holiday or whole-place rates yet.
2. **Guests per room.** Four is assumed from two double beds.
3. **Deposit, check-in and check-out.** 50%, 3.00 pm and 12.00 pm are
   carried over from the first draft, not confirmed.
4. **Extras.** Which trips the owner arranges, the island they go to, and
   prices. The site names Redang and quotes nothing.
5. **Facilities.** Air-conditioning in every room, and what the shared
   kitchen holds.
6. **Photos.** See below. Replace restored and generated images with the
   owner's originals where possible, and get the owner's approval on the rest.
7. **Domain.** `og:image` and the structured data point at
   `ombak-damai.vercel.app`.
8. **Search engines.** Every page carries `<meta name="robots" content="noindex">`
   so the site is not listed while the items above are unconfirmed. Remove
   that line from the three HTML files to launch.
9. **Malay wording.** Have the owner, or another native speaker, read the
   Malay pages once. Local terms such as "roomstay", "trip" and "snorkeling"
   were kept as people in Terengganu use them.

## Images

All in `assets/img/`, each with a smaller `-560` or `-640` version.
Sources were the owner's WhatsApp photos and videos. No identifiable guest
appears in any of them; the stargazing photo shows guests only as
silhouettes from behind.

| File | Source |
| --- | --- |
| `night-sign`, `night-rooms`, `night-stars`, `night-pavilion`, `og` | Owner's night photos, cropped only. No AI |
| `sandbank`, `boats`, `wake`, `catch` | Owner's photos, cropped and upscaled |
| `rods` | Owner's photo, cropped only. The AI upscaler rewrote the sign in this one, so the original is used |
| `room-a`, `room-b`, `room-bed`, `kettle`, `veranda`, `courtyard` | Stills from the owner's walkthrough video, restored with AI to remove blur. Layout and objects match the stills |
| `bonfire-tall`, `turtles` | Stills from the owner's videos, restored with AI |
| `celup-tepung` | Generated with AI. Illustrates the dish, not a specific stall |
| `logo-cream`, `logo-ink` | Recoloured from `logo.png` |
| `turtle`, `place-sign` | Spare, not on any page: the owner's turtle close-up (upscaled) and a restored daytime still of the sign |

## Files

- `index.html` landing page
- `booking.html` calendar, rooms, guests, extras and quote
- `checkout.html` guest details and WhatsApp handoff
- `assets/css/style.css` all styling; colours are the variables at the top
- `assets/js/site.js` settings, language switch and helpers shared by every page
- `assets/js/lang-ms.js` the Malay text for every page
- `assets/js/booking.js` calendar, availability and pricing
- `assets/js/checkout.js` summary, validation, WhatsApp message
