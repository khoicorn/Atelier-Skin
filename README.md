# Atelier Skin

A private, local-first skincare PWA, designed for a Samsung S24 Ultra. No login, no backend.

## What it does

The app has three tabs. Plan opens first.

1. **Plan**: a weekly clinic plan. It comes with six weeks that alternate IPL F-AC / F-SR Therapy and Aqua Mesoderm Fusion Radiance.
   - Pick the first clinic date. Later weeks follow every 7 days.
   - Edit any week: service, date, clinic, price, note, and status (Planned, Booked, Completed, Skipped).
   - A rescheduled week keeps its date when the first clinic date changes.
   - Add weeks after Week 6, or delete weeks.
   - Shows the current week, the next service, the plan total, and the completed cost.
   - "Is it working?": rate each completed visit (Better, No change, Worse) and see the results per service.
2. **Products**: what you own and what it costs.
   - Inventory with brand, category, price, purchase, opened and empty dates, and status.
   - Monthly spending, with clinic services and products kept separate, plus a 6-month chart and the average monthly burn rate.
   - A month view: what you bought and what you used that month. A history view by purchase month.
   - Unknown prices show "Add price". The app never guesses a price.
3. **Mirror**: weekly progress photos.
   - Take a photo or pick one from the gallery. It is resized on the phone and stored in IndexedDB.
   - Title, date, note, and area tags (Full face, Chin, Forehead, Left cheek, Right cheek).
   - Compare any two photos side by side. It also shows the days between them and the completed services in between.

All records stay in the browser on the device: plan and products in localStorage, photos in IndexedDB. The app asks the browser to keep this data when the phone is low on space.

## Upgrading from version 1 (daily tracking)

On first launch, version 2 copies the old first clinic date, old clinic expenses (as completed weeks), and old product purchases. It does not delete the old daily check-ins. To remove them, open **Plan → settings (top right of the dark card) → Data from the old version**. Download a backup there first if you want to keep it.

## Local development

```bash
npm install
npm run dev
```

Checks:

```bash
npm test         # logic tests (plan dates, costs, spending, migration)
npm run build    # type check + production build
npm run preview  # serve the production build
```

## Deploy with GitHub Pages

1. Push this project to the `main` branch of a GitHub repository.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. Every push to `main` runs `.github/workflows/deploy.yml`: install, test, build, publish `dist`.
5. Open the Pages URL after the workflow finishes.

The Vite base path is relative, so the same build works for user and project Pages URLs.

## Install on Samsung S24 Ultra

1. Open the HTTPS GitHub Pages URL in Chrome.
2. Tap **⋮ → Add to Home screen → Install**.
3. Open **Atelier Skin** from the home screen. It works offline after the first load.

Data lives in that browser on that phone. Clearing Chrome site data deletes it.
