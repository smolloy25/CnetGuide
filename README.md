# Vertage Cnet Manager Hub

A responsive, installable guide app based on the supplied October 2026 Client Manager Cnet Guide. The presentation uses Vertage's official logo, teal palette, yellow accents and supplied brand imagery. It includes all 12 process sections and reference screenshots, full-text search, topic filters, saved guides, local step checklists, print layouts and offline guide access.

## Opening video

The supplied Vertage animation plays muted, loops and uses inline playback on mobile. A play/pause button is included. Reduced-motion preferences disable autoplay. The original WebM is used with an MP4 fallback and the supplied still image as its poster.

## Support and Cnet access

- Support team: support@comensura.co.uk
- Cnet Ireland: https://ie.comensura.net/CNET5/
- Cnet UK: https://uk.comensura.net/CNET5/
- Vertage: https://www.vertage.com/

## Run and build

No dependencies are required. With Node.js 20 or newer:

```sh
npm test
npm run build
```

Serve `dist/` with any static web server. This app uses ES modules, so opening `index.html` directly with `file://` is not supported.

## Vercel

Import `smolloy25/CnetGuide` into Vercel using the **Other** framework preset. The included `vercel.json` sets the build command to `node build.mjs`, output directory to `dist`, and disables dependency installation. Once connected, pushes to the production branch trigger deployments automatically.

## Content and privacy

- Process content lives in `guide-data.js`; the workflow instructions and screenshots come from the supplied guide.
- Support details and quick checks live in `app.js`; regional Cnet links also appear in `index.html`.
- No login, analytics, database or Cnet API connection is used. The app does not collect credentials or candidate/worker records.
- Saved guide IDs and step numbers are stored only in the visitor's browser. Checklist ticks do not execute Cnet actions.
- Offline access is enabled after the initial online visit by a service worker. External Cnet login and email need a connection.
- Increase the cache version in `sw.js` when updating the offline asset set.
- Reference screens illustrate Cnet5 workflows; layouts and options can vary by programme.

## Source

Vertage Client Manager Cnet Guide v1.0, 6 October 2026. Brand reference: https://www.vertage.com/.
