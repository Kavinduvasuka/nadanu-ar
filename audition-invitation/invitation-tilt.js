/* Lightweight 3D tilt for the invitation image only. AR scanner and page stay unchanged. */
(() => {
  const card = document.querySelector('.poster-display .poster');
  if (!card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const frame = card.closest('.poster-display');
  const limit = 9;
  let orientationEnabled = false;
  const tilt = (x, y) => {
    card.style.setProperty('--inv-tilt-x', x.toFixed(2) + 'deg');
    card.style.setProperty('--inv-tilt-y', y.toFixed(2) + 'deg');
  };
  const reset = () => tilt(0, 0);
  frame.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const r = card.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width * 2 - 1));
    const y = Math.max(-1, Math.min(1, (e.clientY - r.top) / r.height * 2 - 1));
    tilt(-y * limit, x * limit);
  }, { passive: true });
  frame.addEventListener('pointerleave', reset, { passive: true });
  function motion(e) {
    if (document.hidden || document.getElementById('landing')?.hidden) return;
    const beta = Math.max(-25, Math.min(25, e.beta ?? 0));
    const gamma = Math.max(-25, Math.min(25, e.gamma ?? 0));
    tilt(-beta / 25 * limit, gamma / 25 * limit);
  }
  function enableMotion() {
    if (orientationEnabled || !('DeviceOrientationEvent' in window)) return;
    orientationEnabled = true;
    window.addEventListener('deviceorientation', motion, { passive: true });
  }
  if ('DeviceOrientationEvent' in window &&
      typeof DeviceOrientationEvent.requestPermission !== 'function') {
    enableMotion();
  } else if ('DeviceOrientationEvent' in window) {
    frame.addEventListener('click', async () => {
      if (orientationEnabled) return;
      try {
        if (await DeviceOrientationEvent.requestPermission() === 'granted') enableMotion();
      } catch (_) { /* Pointer tilt remains available. */ }
    });
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
})();