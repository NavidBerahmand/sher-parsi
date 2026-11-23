// Overlays (menu, bottom sheets, the poet panel, the all-poets card) each take one history entry,
// so the phone's back button or back swipe closes the overlay instead of leaving the page behind it.
// Each entry: { close, hash } — the page address (path) when the overlay opened.
import { go, here, fromHref } from './route.js';

const stack = [];
let skip = 0;
const at = (close) => { for (let i = stack.length - 1; i >= 0; i--) if (stack[i].close === close) return i; return -1; };

// Call when an overlay opens. `close(fromBack)` must close it without calling overlayClosed again.
export function overlayOpened(close) {
  stack.push({ close, hash: location.pathname });
  window.history.pushState({ ...(window.history.state || {}), ov: stack.length }, '');
}
// Call when the overlay was closed by its own button, a tap outside or Escape: drops its history entry.
export function overlayClosed(close) {
  const i = at(close);
  if (i < 0) return;
  stack.splice(i, 1);
  skip++;
  window.history.back();
}
// A link inside an overlay: the target takes the overlay's history entry, so back does not land on a dead step.
export function overlayNavigate(close, href) {
  href = fromHref(href); // a route, or a link's path
  const i = at(close);
  if (i < 0) { go(href); return; }
  if (href === here()) { overlayClosed(close); return; } // already there: just drop the entry
  stack.splice(i, 1);
  go(href, true);
}
export const overlayIsOpen = (close) => at(close) >= 0;
// One overlay hands its history entry to another (menu → «درباره» sheet), with no history traffic.
export function overlaySwap(from, to) {
  const i = at(from);
  if (i < 0) return false;
  stack[i].close = to;
  return true;
}
// The overlay went away because the page under it changed: forget it, leave the history alone.
export function overlayForget(close) {
  const i = at(close);
  if (i >= 0) stack.splice(i, 1);
}

window.addEventListener('popstate', () => {
  if (skip) { skip--; return; }
  const top = stack[stack.length - 1];
  if (!top) return;
  // Browsers also fire popstate when the address itself changes (back to another page).
  // Then the page underneath is changing: every overlay goes, and no history entry is touched.
  if (location.pathname !== top.hash) { while (stack.length) stack.pop().close(true); return; }
  stack.pop().close(true);
});
