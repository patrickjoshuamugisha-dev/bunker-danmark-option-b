/* The lawn lift lab strip: switching between lift-1 to lift-4 keeps the scroll position. */
(() => {
  const strip = document.querySelector('.lab');
  if (!strip) return;
  strip.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
    try { sessionStorage.setItem('liftLabY', String(Math.round(window.scrollY))); } catch (e) {}
  }));
  let y = 0;
  try { y = parseInt(sessionStorage.getItem('liftLabY') || '0', 10) || 0; sessionStorage.removeItem('liftLabY'); } catch (e) {}
  if (y > 0) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const go = () => window.scrollTo({ top: y, behavior: 'instant' });
    window.addEventListener('load', () => { go(); setTimeout(go, 120); setTimeout(go, 600); });
  }
})();
