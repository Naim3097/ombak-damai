# Ombak Damai, Penarik, Terengganu

Static three-page site: landing, booking, checkout. No build step, no backend.
Booking works by handing the guest to WhatsApp with a prefilled request; the
deposit is arranged there. Nothing is charged online.

## Run locally

```
npx -y serve -l 4173 .
```

Then open http://localhost:4173. The `serve.json` file keeps `.html` URLs
working; leave it in place if you deploy with `serve` or Vercel.

## Before launch, change these

1. **WhatsApp number**: `assets/js/site.js`, the `phone` value in `OD`
   (digits only, international format, e.g. `60139876543`). This drives the
   floating button, the footer link and the checkout handoff.
   The visible number in the footer of `index.html` must be updated to match.
2. **Rates**: `assets/js/site.js`, `OD.rates` (weeknight and weekend).
   Update the same figures shown in the Rates section of `index.html`.
3. **Blocked dates**: `assets/js/site.js`, `OD.unavailable`, an array of
   `"YYYY-MM-DD"` strings for nights already booked.
4. **Email**: the `stay@ombakdamai.my` placeholder in `index.html`.
5. **Photos**: the pages currently hotlink Unsplash stock (free license,
   commercial use allowed). Swap the `images.unsplash.com` URLs for real
   photos of the property before launch. The logo is `assets/img/logo.png`.
6. **Map pin**: the iframe in `index.html` points at Kampung Penarik
   generally. Replace the `q=` value with the real coordinates when ready.

## Files

- `index.html` landing page
- `booking.html` date picker and quote
- `checkout.html` guest details and WhatsApp handoff
- `assets/css/style.css` all styling
- `assets/js/site.js` config shared by every page
- `assets/js/booking.js` calendar and pricing
- `assets/js/checkout.js` summary, validation, WhatsApp message
