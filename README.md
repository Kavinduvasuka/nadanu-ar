# Nadanu AR — separate standalone pages

- Auditions: `https://kavinduvasuka.github.io/nadanu-ar/auditions/`
- Invitation: `https://kavinduvasuka.github.io/nadanu-ar/invitation/`
- Landing page: `https://kavinduvasuka.github.io/nadanu-ar/`

Both pages have their own HTML, JavaScript, CSS, libraries, images, and videos.

## Generate MindAR target files
1. Visit https://hiukim.github.io/mind-ar-js-doc/tools/compile/
2. Upload `auditions/assets/post 10.png`, compile and download, rename to `auditions.mind` and put it in `auditions/assets/`.
3. Separately upload `invitation/assets/judges-invitation.jpg` and `invitation/assets/judges-invitation-ar-qr.jpg` in that order; compile together and download, rename to `judges.mind` and put it in `invitation/assets/`.
4. Without `.mind` files, app.js falls back to compiling on the phone (slower and possibly unstable). Never create an empty `.mind` file.
5. Push the contents of this folder to your GitHub repository root. Set GitHub Pages source to main branch / (root).

Two different QR codes should point to the two page URLs. A single QR code can point to the landing page, allowing users to choose.
