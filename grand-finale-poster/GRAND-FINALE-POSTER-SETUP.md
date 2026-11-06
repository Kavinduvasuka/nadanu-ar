# Nadanu 3.0 — Grand Finale Poster Experience

This is a standalone site at `grand-finale-poster/`, cloned **from the exact `auditions/` page tree** rather than from `finale/`.

## Preserved from original site
- HTML layout, section hierarchy, hero and poster display
- `style.css`: all neon artwork animation, responsive layout, background concert lights, scrolling reveals, hover effects
- Four original SVG category artworks including microphones and solo/group dancers
- All video, audio, MindAR/Three.js runtime assets and original 15-second preview
- Mouse poster effect: starts at 3-degree angle, straightens and gently tilts with cursor; resets on pointer exit

The existing `finale/`, `invitation/` and `auditions/` are NOT altered by this clone.

## Required production assets (not yet in repo)
The organizer's exact new Grand Finale poster should be uploaded as:
`grand-finale-poster/assets/grand-finale-poster.png`.

For faster AR scanning, compile that same image as MindAR target:
`grand-finale-poster/assets/grand-finale-poster.mind`.
The JS can fall back to on-device compilation if the PNG exists, but this is slower.

Until the PNG is uploaded, the hero and AR poster cannot work. The included audio/video preview is copied from auditions and has not been re-edited for the Finale.

Grand Finale page details: 26 November 2026, 1:30 AM onwards, ICBT Colombo Campus Amphitheater. Confirm AM/PM against the official poster before public launch.
