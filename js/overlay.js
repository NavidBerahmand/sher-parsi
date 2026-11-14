// Overlays (menu, bottom sheets, the poet panel, the all-poets card) each take one history entry,
// so the phone's back button or back swipe closes the overlay instead of leaving the page behind it.
const stack = [];
let skip = 0;

// Call when an overlay opens. `close(fromBack)` must close it without calling overlayClosed again.
export function overlayOpened(close) {
  stack.push(close);
  window.history.pushState({ ...(window.history.state || {}), ov: stack.length }, '');
}
// Call when the overlay was closed by its own button, a tap outside or Escape: drops its history entry.
export function overlayClosed(close) {
  const i = stack.lastIndexOf(close);
  if (i < 0) return;
  stack.splice(i, 1);
  skip++;
  window.history.back();
}
// A link inside an overlay: the target takes the overlay's history entry, so back does not land on a dead step.
export function overlayNavigate(close, href) {
  const i = stack.lastIndexOf(close);
  if (i < 0) { location.hash = href; return; }
  if (href === location.hash) { overlayClosed(close); return; } // already there: just drop the entry
  stack.splice(i, 1);
  location.replace(href);
}
export const overlayIsOpen = (close) => stack.includes(close);
// One overlay hands its history entry to another (menu → «درباره» sheet), with no history traffic.
export function overlaySwap(from, to) {
  const i = stack.lastIndexOf(from);
  if (i < 0) return false;
  stack[i] = to;
  return true;
}
// The overlay went away because the page under it changed: forget it, leave the history alone.
export function overlayForget(close) {
  const i = stack.lastIndexOf(close);
  if (i >= 0) stack.splice(i, 1);
}

window.addEventListener('popstate', () => {
  if (skip) { skip--; return; }
  const close = stack.pop();
  if (close) close(true);
});
