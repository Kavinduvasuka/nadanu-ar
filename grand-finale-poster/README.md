# Nadanu 3.0 — Grand Finale Poster 3D AR

This is a **separate copy** of the original `grand-finale-invitation/` 3D AR invitation experience, not the auditions website. The original `grand-finale-invitation/`, `audition-invitation/` and `auditions/` folders are unchanged.

## Kept exactly from the existing finale experience
- Three 3D GLB performers: `singer.glb`, `solo-dancer.glb`, `group_dancers.glb`
- Three.js concert stage, lights, original 3D animation code, three-act performer sequence
- Existing animated Solo Singing, Solo Dancing and Group Dancing string-art canvas cards
- Original styling, background animations, responsive landing and interactive world stage
- Separate independent copy of the soundtrack and display font

## Changed only in this copy
- Official Grand Finale poster in `assets/grand-finale-poster.png`
- New poster-specific wording and a 3D mouse hover effect: tilted at rest and straightens on hover
- Old invitation photo and old `finale.mind` omitted
- The old auditions website, audition/judges photos, and group-singing artwork are not included

## REQUIRED before poster camera recognition works
Compile **this exact poster image** as `assets/grand-finale-poster.mind` in the MindAR Image Target Compiler. Do not use `grand-finale-invitation/assets/finale.mind` — it tracks the old invitation. The Start Poster AR button checks this file and displays an explanatory error until it exists.

The **Explore 3D Stage** link is usable independently of the poster tracking target, using the original GLB performers.

Event details from the supplied poster: 26 November 2026, 1:30 AM onwards, ICBT Colombo Campus Amphitheater. Verify AM/PM with event organizers before sharing the link.

Local update: `git pull --ff-only origin main`.
