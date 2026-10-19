import * as THREE from 'three';
import { createVideoStage } from './video-stage.js?v=invitation-only-3';

export const JUDGE_SCENES = [
    { start: 0, end: 2.5, kicker: 'COMPUTING SOCIETY OF ICBT', lines: ['A SPECIAL', 'INVITATION'], copy: ['Nadanu 3.0 · Auditions'] },
    { start: 2.5, end: 6, kicker: 'WITH GREAT PLEASURE', lines: ['JOIN OUR', 'JUDGING PANEL'], copy: ['Your expertise. Their spotlight.', 'Help us recognise extraordinary talent.'] },
    { start: 6, end: 11, kicker: 'SAVE THE DATE', lines: ['04 NOVEMBER', '9:00 AM ONWARDS'], copy: ['AUDITORIUM', 'ICBT COLOMBO CAMPUS'] },
    { start: 11, end: 15, kicker: 'WE WOULD BE HONOURED', lines: ['BY YOUR', 'PRESENCE.'], copy: ['Lohitha  075 899 9638', 'Dulsith  071 092 9324'] }
];

export function createJudgesStage(movie, posterSrc = 'assets/judges-invitation-ar-qr.webp') {
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
    const ctx = canvas.getContext('2d'), texture = new THREE.CanvasTexture(canvas);
    const stage = createVideoStage(movie, posterSrc, texture, false);
    const logo = new Image(); logo.src = 'assets/logo.webp';
    const clamp = v => Math.max(0, Math.min(1, v)), ease = v => 1 - (1 - clamp(v)) ** 3;
    function text(value, y, size, color = '#fff0cf', weight = 700) { ctx.font = `${weight} ${size}px Arial, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.fillText(value, 540, y, 900); }
    function rule(y, width, alpha = 1) { ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = '#dbac69'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(540 - width / 2, y); ctx.lineTo(540 + width / 2, y); ctx.stroke(); ctx.restore(); }
    function draw(time) {
        const t = Math.max(0, Math.min(15, time));
        const scene = JUDGE_SCENES.find(s => t < s.end) || JUDGE_SCENES.at(-1), local = t - scene.start;
        const enter = ease(local / .65), exit = scene.end === 15 ? 1 : clamp((scene.end - t) / .28);
        ctx.globalAlpha = 1; ctx.fillStyle = '#160b07'; ctx.fillRect(0, 0, 1080, 1920);
        const glow = ctx.createRadialGradient(540, 650, 20, 540, 650, 1050); glow.addColorStop(0, '#9d461e66'); glow.addColorStop(1, '#160b0700'); ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, 1920);
        // A quiet, slowly moving halo frames the event identity.
        ctx.save(); ctx.translate(540, 500); ctx.rotate(Math.sin(t * .24) * .06); ctx.strokeStyle = '#e2ad5c22'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 350, 260, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 0, 375, 285, 0, Math.PI * .12, Math.PI * 1.16); ctx.stroke(); ctx.restore();
        ctx.strokeStyle = '#dca65b66'; ctx.lineWidth = 2; ctx.strokeRect(54, 54, 972, 1812); ctx.strokeStyle = '#dca65b22'; ctx.strokeRect(68, 68, 944, 1784);
        text('NADANU 3.0  /  AUDITIONS', 165, 38, '#e6b36d');
        if (logo.complete && logo.naturalWidth) { const w = 430 * (.96 + .04 * ease(t / 1.2)), h = w * logo.naturalHeight / logo.naturalWidth; ctx.drawImage(logo, 540 - w / 2, 505 - h / 2, w, h); }
        rule(775, 500, .65);
        ctx.save(); ctx.globalAlpha = enter * exit; ctx.translate(0, 44 * (1 - enter));
        text(scene.kicker, 875, 38, '#f7b461');
        scene.lines.forEach((line, i) => text(line, 1015 + i * 114, line.length > 17 ? 70 : 88, '#fff2d7', 800));
        rule(1190, 580 * enter, .5);
        scene.copy.forEach((line, i) => { const a = ease((local - .18 - i * .10) / .5); ctx.save(); ctx.globalAlpha *= a; text(line, 1290 + i * 78, scene.start === 6 ? 52 : 46, '#e5cfb1', scene.start === 6 ? 700 : 400); ctx.restore(); });
        if (scene.start === 11) { ctx.fillStyle = '#ec8e42'; ctx.fillRect(205, 1500, 670, 110); text('CONTACT THE ORGANIZERS', 1570, 40, '#241209', 800); }
        ctx.restore();
        text('FEEL THE BEAT. OWN THE STAGE.', 1750, 36, '#e8b16a');
        ctx.fillStyle = '#7c4b2c'; ctx.fillRect(190, 1810, 700, 3); ctx.fillStyle = '#e9ad65'; ctx.fillRect(190, 1810, 700 * t / 15, 3);
        texture.needsUpdate = true;
    }
    draw(0); const update = stage.update; stage.update = t => { draw(t); update(t); }; return stage;
}
