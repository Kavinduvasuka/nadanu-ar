export const ACTS = [
    { type: 'logo', title: 'Nadanu 3.0', kicker: 'COMPUTING SOCIETY OF ICBT PRESENTS', copy: 'Feel the Beat. Own the Stage.', duration: 1.2 },
    { type: 'auditions', title: 'Auditions are open', kicker: 'YOUR MOMENT STARTS HERE', copy: '4 November · 9:00 AM onwards', duration: .8 },
    { type: 'solo-singing', title: 'Solo Singing', kicker: '01 / ONE VOICE. ONE SPOTLIGHT.', copy: 'Step up to the mic. Make it your moment.', duration: 2.5 },
    { type: 'group-singing', title: 'Group Singing', kicker: '02 / MANY VOICES. ONE STAGE.', copy: 'Bring your harmony. Bring your people.', duration: 2.5 },
    { type: 'solo-dancing', title: 'Solo Dancing', kicker: '03 / YOUR RHYTHM. YOUR STORY.', copy: 'Every move is a chance to shine.', duration: 2.5 },
    { type: 'group-dancing', title: 'Group Dancing', kicker: '04 / MOVE AS ONE.', copy: 'Together, turn the beat into something unforgettable.', duration: 2.5 },
    { type: 'finale', title: 'The stage is waiting. Are you?', kicker: '04 NOVEMBER / ICBT COLOMBO CAMPUS AUDITORIUM', copy: '9:00 AM onwards · Register now on Luma.', duration: 3 }
];
export const TOTAL = ACTS.reduce((n, a) => n + a.duration, 0);
export const startOf = i => ACTS.slice(0, i).reduce((n, a) => n + a.duration, 0);
export function position(time) { let start = 0; for (let i = 0; i < ACTS.length; i++) { if (time < start + ACTS[i].duration || i === ACTS.length - 1) return { index: i, act: ACTS[i], local: Math.max(0, Math.min(ACTS[i].duration, time - start)), start }; start += ACTS[i].duration; } }
export function advance(time, delta, { playing, tracked, visible }) { return playing && tracked && visible ? Math.min(TOTAL, time + Math.min(delta, .1)) : time; }
// Coordinates map the printed category names on the supplied poster, relative to its centre.
export const PRINTED_CATEGORIES = { 'solo-singing': [-.12, -.095], 'group-singing': [.10, -.095], 'solo-dancing': [-.12, -.145], 'group-dancing': [.10, -.145] };
export function popupPose(type, local) { const origin = PRINTED_CATEGORIES[type]; if (!origin) return null; const t = Math.max(0, Math.min(1, local / .75)), e = 1 - (1 - t) ** 3; return { x: origin[0] * (1 - e), y: origin[1] + (.68 - origin[1]) * e, z: .045 + .32 * e, scale: .23 + .77 * e, progress: t }; }
