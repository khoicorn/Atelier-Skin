# Atelier Skin

A private, local-first skincare and clinic tracking PWA designed for a Samsung S24 Ultra.

## Included

- Daily AM/PM routine and supplement checklist
- Redness, hydration, and pustule tracking
- Six-week alternating Hasaki Clinic schedule
- Weekly progress photos with area tags and side-by-side comparison
- Product, supplement, and clinic expense ledger
- Monthly VND burn rate and muted spending distribution chart
- Offline support and Android home-screen installation

All personal data is stored in the browser on the device. Photos use IndexedDB and are resized before storage. No personal records are committed to GitHub.

## Local development

```bash
npm install
npm run dev
```

Production verification:

```bash
npm run build
npm run preview
```

## Deploy with GitHub Pages

1. Create a GitHub repository and push this project to its `main` branch.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. The included `.github/workflows/deploy.yml` builds and publishes automatically.
5. Open the Pages URL after the workflow completes.

The Vite base path is relative, so the same build works for both user and project Pages URLs.

## Install on Samsung S24 Ultra

1. Open the HTTPS GitHub Pages URL in Chrome.
2. Tap **⋮ → Add to Home screen → Install**.
3. Launch **Atelier Skin** from the home screen.

Chrome may show an install icon in the address bar after the first successful load.
