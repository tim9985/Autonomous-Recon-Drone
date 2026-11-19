/** Keep selection, focus and scroll in the control surface. The map has a separate lifecycle. */
const tabMemory = new WeakMap();

export function changeControlTab(nav, target, render, focus = false) {
  const tabs = Array.from(nav.querySelectorAll('[role="tab"]'));
  const previous = nav.querySelector('[aria-selected="true"]');
  const sidebar = nav.closest('.mission-sidebar');
  const desktop = !sidebar.ownerDocument.body.matches('[data-mobile-ui="true"]');
  const scrollers = desktop ? [...sidebar.querySelectorAll('.sidebar-scroll, .control-content')] : [];
  let positions = tabMemory.get(nav);
  if (!positions) { positions = new Map(); tabMemory.set(nav, positions); }
  const changed = previous !== target;
  if (changed && previous) positions.set(previous.id, scrollers.map(s => s.scrollTop));
  render();
  const index = tabs.indexOf(target);
  nav.style.setProperty('--selected-tab', index);
  if (changed) {
    scrollers.forEach((s,i) => { s.scrollTop = positions.get(target.id)?.[i] || 0; });
    // Mobile builds a compact patrol overview outside the legacy tabpanel.
    nav.dispatchEvent(new CustomEvent('school-tab-change', {bubbles:true}));
    const panel = !desktop && sidebar.dataset.mobileView === 'overview'
      ? sidebar.querySelector('.mobile-mission-overview')
      : sidebar.ownerDocument.getElementById(target.getAttribute('aria-controls'));
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && panel && !panel.hidden) {
      panel.getAnimations?.().filter(a => a.id==='control-tab-entry').forEach(a => a.cancel());
      const direction = index > tabs.indexOf(previous) ? 1 : -1;
      panel.animate?.([{opacity:.65,transform:'translateX('+direction*6+'px)'},{opacity:1,transform:'none'}],
        {id:'control-tab-entry',duration:150,easing:'cubic-bezier(.2,.7,.2,1)'});
    }
  }
  if (focus) target.focus({preventScroll:true});
}

export function denseMapScreen(win) {
  return (win.devicePixelRatio || 1) > 1 && win.matchMedia('(max-width: 1023px), (pointer: coarse)').matches;
}
