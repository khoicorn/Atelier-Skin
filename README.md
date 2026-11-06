# Atelier Skin

A private, local-first skincare PWA, designed for a Samsung S24 Ultra. No login, no backend.

## What it does

The app has three tabs. Plan opens first.

1. **Plan**: a weekly clinic plan. It comes with six weeks that alternate IPL F-AC / F-SR Therapy and Aqua Mesoderm Fusion Radiance.
   - The top shows the phase, "Week X of N", progress, and the next visit with one-tap **Mark booked** / **Mark completed**.
   - Past visits still marked Planned or Booked ask "Did it happen?" with one-tap Completed / Skipped.
   - **Add service** adds a plan week or an **extra visit** (a one-off service that counts in cost, not in "Week X of N").
   - Edit any visit: service, week, date, time, clinic, price, note, and status (Planned, Booked, Completed, Skipped).
   - Completed and skipped visits are pinned to their date. Changing the first clinic date (in Settings) only moves upcoming visits.
   - "Is it working?": rate each completed visit (Better, No change, Worse). A verdict appears after 2 ratings.
2. **Products**: what you own and what it costs.
   - Buy soon: products marked almost empty or running out within 14 days.
   - Monthly spending, clinic and products kept separate, a 6-month chart, "still planned this month", and the average of full months.
   - Month view: clinic visits, products bought, finished and used that month. History by purchase month.
   - Prices accept "850000", "850k" or "1tr1". Unknown prices show "Add price". The app never guesses a price.
3. **Mirror**: weekly progress photos.
   - Take a photo or pick one from the gallery. Gallery photos use the date the photo was taken. Photos are resized on the phone and stored in IndexedDB.
   - Title, date, note, and area tags (Full face, Chin, Forehead, Left cheek, Right cheek).
   - Before & after: the default pair is the oldest and newest photo of the same area. Shows the days between them and the completed visits in between.

**Settings** (icon at the top right): backup and restore, treatment phase, first clinic date, install help, and old-version data. A dot on the icon means no backup in the last 30 days.

Deletes can be undone for 8 seconds. Closing a form with unsaved changes asks first, also with the Android back gesture.

## Your data

All records stay in the browser on the device: plan and products in localStorage, photos in IndexedDB. The app asks the browser not to clear this data.

**Backup**: Settings → **Save backup file** (or **Send backup to Drive or Zalo**) writes one JSON file with the plan, products and all photos. **Restore from file** replaces everything on the device with that file, after a confirmation. Use it when changing phones.

## Upgrading from version 1 (daily tracking)

On first launch, version 2 copies old clinic expenses (as completed visits) and old product purchases. It does not delete the old daily check-ins. To remove them, open **Settings → Data from the old version**. Download them there first if you want to keep them.

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
