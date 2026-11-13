# Nadanu 3.0 Grand Finale WebAR — Step 3

Technologies: Three.js 0.160.0, MindAR 1.2.5, static HTML/CSS/JS. No build required.

## First
Copy your compiled `finale.mind` into `assets/finale.mind`. Optionally copy the exported B5 tracking image into `assets/finale-invitation.png` (for your records; the script only loads the .mind file).

## Local test
Open this folder in VS Code and run a local server (e.g. `py -m http.server 8000`), then open `http://localhost:8000`. On a phone, use GitHub Pages HTTPS for camera access; a plain LAN HTTP URL may not enable the camera. Print the invitation or show it on another screen as a target.

## Publish later
Place these files under `/finale` in your GitHub Pages repository, maintaining the `assets` folder. The target page should be `https://kavinduvasuka.github.io/nadanu-ar/finale/` if you deploy to the repo's root Pages site.

## Notes
- The overlay displays animated title, ring and particles. It is not an MP4 video.
- Text is a Three.js CanvasTexture, not editable Photoshop text.
- This project intentionally does not include any invented finale date or venue.
- The .mind file must be compiled using the *final printed invitation image* and is not provided.
