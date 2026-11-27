// Desktop focus backdrop (≥ 1024px): the current scene full-bleed behind the focus panel.
// Same scene host, drift and 25-minute swap as the idle screen (createSceneHost); the first scene is the one
// the user just saw (today's band scene, or the one this block showed before it was minimised), so opening a
// block feels like stepping into the band. The scene never swaps mid-focus: the host is held in every step
// except the break, and a swap that came due while held happens at the break.
// No time-of-day picking, no calm-in-focus, no mouse parallax (host defaults since 2026-11-26).
import { createSceneHost, loadScenes } from '../scenes/registry.js';
import { palette } from '../idle/idle.js';
import { clock } from '../core/util.js';

export const WIDE = '(min-width: 1024px)';
export const isWide = () => matchMedia(WIDE).matches;

export function createFocusScene(box) {
  const manifestUrl = new URL('scenes/manifest.json', location.href).href;
  let host = null, running = false, lastId = '', list = null, loading = null, gen = 0;
  const load = () => loading || (loading = loadScenes(manifestUrl).then(s => (list = s)).catch(() => (list = [])));

  // A host whose first bag starts at `first` and then shuffles as usual.
  function build(first) {
    const i = Math.max(0, list.findIndex(s => s.id === first));
    const order = list.slice(i).concat(list.slice(0, i));
    let keep = order.length - 1; // makeBag calls random() n-1 times for its first shuffle: 0.9999 leaves the order as is
    const random = () => (keep-- > 0 ? 0.9999 : Math.random());
    return createSceneHost(box, { manifestUrl, palette, now: () => clock.now(), scenes: order, random });
  }

  async function start(held) {
    if (running) { hold(held); return; }
    running = true; const my = ++gen;
    await load(); if (!running || my !== gen || !list.length) return;
    const band = document.querySelector('#horizon');
    host = build(lastId || (band && band.dataset.scene) || '');
    host.hold(held);
    await host.start();
    if (my !== gen) return;
    box.classList.add('on');
  }
  function stop() {
    if (!running) return;
    running = false; gen++;
    if (host) { const c = host.current(); if (c) lastId = c.id; host.stop(); host = null; }
    box.classList.remove('on');
  }
  function hold(on) { if (host) host.hold(on); }
  // the next block opens on the band scene again
  function forget() { lastId = ''; }
  return { start, stop, hold, forget, get on() { return running; }, current: () => (host ? host.current() : null) };
}
