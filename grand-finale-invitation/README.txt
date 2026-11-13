NADANU GRAND FINALE — STAGE LIGHTS STYLE AR TEST

This applies the provided Stage Lights visual style to the working MindAR concept:
- pink/cyan/gold spotlights, glowing floor rings, equalizer bars, particles
- solo singer / solo dancer / group GLB performances
- selectable scenes and optional original synthesized instrumental audio

Copy these assets from your CURRENT local Invitation project into assets/:
finale.mind
singer.glb
solo-dancer.glb
group-dancers.glb

IMPORTANT: This does not edit your real files or GitHub. Test in a separate folder first.

Test in Chrome using http://localhost:8000/ (not phone LAN HTTP address).
Run: npx.cmd --yes http-server . -p 8000 -c-1
MindAR camera requires localhost or HTTPS. For mobile use an HTTPS deployment.

Uses Three.js r147 and MindAR 1.2.5 as in the earlier compatibility test.
Scene mode AUTO rotates between the three performers every six seconds.
Solo dancer and singer play embedded GLB animations. Group GLB is a static mesh.
No copyrighted recordings included; soundtrack is synthesized at runtime.
