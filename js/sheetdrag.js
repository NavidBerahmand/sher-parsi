// Bottom sheets that follow the finger.
// The sheet moves 1:1 with the touch, then settles by where it is and how fast it was flicked:
// to one of its resting heights (snaps), or closed. Scrolling inside the sheet only takes over
// when the sheet is at its top height and the content is not at its very top.
//
// snaps(): translateY values in px, smallest first (0 = sheet fully up).
// canScroll(i): may the content scroll while resting at snap i? (default: yes)
export function attachSheetDrag({ el, scroller = el, backdrop = null, handle = null, snaps = () => [0], start = 0,
  enabled = () => true, canScroll = () => true, onSnap = () => {}, onClose, snapMs = 380, ease = 'cubic-bezier(.22,.9,.3,1)' }) {
  let idx = start, mode = null, grab = false, y0 = 0, base = 0, cur = 0, lastY = 0, lastT = 0, v = 0;
  const EASE = ease;
  const closedY = () => el.offsetHeight + 24;

  function set(y, ms) {
    cur = y;
    el.style.transition = ms ? `transform ${ms}ms ${EASE}` : 'none';
    el.style.transform = `translateY(${y}px)`;
    if (backdrop) {
      const low = snaps().at(-1);
      backdrop.style.transition = ms ? `opacity ${ms}ms ${EASE}` : 'none';
      backdrop.style.opacity = String(Math.max(0, Math.min(1, 1 - (y - low) / (closedY() - low))));
    }
  }
  function snapTo(i, ms = snapMs) {
    idx = i; set(snaps()[i], ms); onSnap(i);
  }

  function onStart(e) {
    if (!enabled() || e.touches.length > 1) { mode = 'off'; return; }
    mode = null; grab = !!(handle?.() || null)?.contains(e.target); y0 = lastY = e.touches[0].clientY; lastT = e.timeStamp; v = 0;
    base = snaps()[idx];
  }
  function onMove(e) {
    if (mode === 'off' || mode === 'scroll') return;
    const y = e.touches[0].clientY;
    if (mode === null) {
      const dy = y - y0;
      if (Math.abs(dy) < 5) return;
      const atTop = scroller.scrollTop <= 0;
      // Down at the top of the content, up while not fully open, or content locked: move the sheet.
      // The grip at the top always moves the sheet, however far the content is scrolled.
      if (grab || (dy > 0 && atTop) || (dy < 0 && idx > 0) || !canScroll(idx)) { mode = 'drag'; y0 = y; lastY = y; }
      else { mode = 'scroll'; return; }
    }
    if (e.cancelable) e.preventDefault();
    const dt = e.timeStamp - lastT;
    if (dt > 0) v = 0.7 * ((y - lastY) / dt) + 0.3 * v;
    lastY = y; lastT = e.timeStamp;
    let t = base + (y - y0);
    const top = snaps()[0];
    if (t < top) t = top - Math.sqrt(top - t) * 3; // soft resistance above the top
    set(t, 0);
  }
  function onEnd(e) {
    if (mode !== 'drag') { mode = null; return; }
    mode = null;
    if (e.timeStamp - lastT > 90) v = 0; // finger rested before lifting: no flick
    const s = snaps(), low = s.at(-1);
    const proj = cur + v * 220; // where the flick would carry it
    if ((v > 0.9 && cur > low - 40) || proj > low + (closedY() - low) * 0.5) {
      const ms = Math.max(160, Math.min(380, (closedY() - cur) / Math.max(v, 1.2)));
      set(closedY(), ms);
      onClose(ms);
      return;
    }
    let best = 0;
    s.forEach((p, i) => { if (Math.abs(p - proj) < Math.abs(s[best] - proj)) best = i; });
    snapTo(best);
  }

  scroller.addEventListener('touchstart', onStart, { passive: true });
  scroller.addEventListener('touchmove', onMove, { passive: false });
  scroller.addEventListener('touchend', onEnd);
  scroller.addEventListener('touchcancel', onEnd);

  return {
    snapTo,
    get index() { return idx; },
    // Hand the sheet back to its CSS (used when it opens or closes by other means).
    reset() {
      idx = start; mode = null;
      el.style.transition = el.style.transform = '';
      if (backdrop) backdrop.style.transition = backdrop.style.opacity = '';
    },
  };
}
