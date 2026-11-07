// Crosshair movement and firing error in drills, like VALORANT's: with Movement error or
// Firing error on for the inner or outer lines (Settings > Crosshair), the lines spread
// while you move and spray. The original game only animated this in the editor preview.
//
// How it fits together:
// - main.js serves the game's frame loop with a call to window.__aimMove(player) every
//   frame, and every shot already reaches window.__aimShot (shooting-error.js), which is
//   wrapped here.
// - The crosshair component (mods BiMsX6Xn.js) puts each line set's switch × multiplier
//   on its root element as --aim-im / --aim-if / --aim-om / --aim-of (0 when off).
// - This script sets the live spread (--aim-move, --aim-fire) on that same element, and
//   the CSS below moves each line outward by the sum.
// Amounts match the editor preview: up to 7 px at full run speed (eased in over 0.35 s,
// out over 0.25 s), plus 3.2 px per shot fading over about 0.22 s.
(() => {
  if (window.__aimCrossErr) return;
  window.__aimCrossErr = true;

  // ponytail: one run speed (rifle, 6.75 m/s) for every weapon; knives and heavy guns run
  // at other speeds, so their spread is slightly off. Read the weapon's speed if it matters.
  const RUN = 6.75;
  const MOVE_PX = 7, MOVE_IN = 0.35, MOVE_OUT = 0.25, SHOT_PX = 3.2, SHOT_FADE = 0.22;
  let move = 0, fire = 0, last = 0, shown = "", el = null;

  const css = document.createElement("style");
  css.textContent = [
    ".al-center-crosshair{",
    "--aim-in:calc(var(--aim-move,0px)*var(--aim-im,0) + var(--aim-fire,0px)*var(--aim-if,0));",
    "--aim-out:calc(var(--aim-move,0px)*var(--aim-om,0) + var(--aim-fire,0px)*var(--aim-of,0))}",
    ...["inner", "outer"].map((part) => {
      const v = part === "inner" ? "var(--aim-in)" : "var(--aim-out)";
      return `.al-${part}.al-left{translate:calc(-1*${v}) 0}.al-${part}.al-right{translate:${v} 0}` +
        `.al-${part}.al-top{translate:0 calc(-1*${v})}.al-${part}.al-bottom{translate:0 ${v}}`;
    }),
  ].join("\n");
  (document.head || document.documentElement).appendChild(css);

  const prevShot = window.__aimShot;
  window.__aimShot = (e) => {
    prevShot?.(e);
    fire += SHOT_PX;
  };

  window.__aimMove = (player) => {
    const now = performance.now() / 1000;
    if (now - last > 0.5) move = fire = 0; // a new round, or the game was paused
    const dt = last ? Math.min(0.1, now - last) : 0;
    last = now;
    const v = player && player.velocity ? Math.hypot(player.velocity.x, player.velocity.y) : 0;
    const target = player && player.grounded === false ? MOVE_PX : MOVE_PX * Math.min(1, v / RUN);
    move = target > move
      ? Math.min(target, move + (MOVE_PX * dt) / MOVE_IN)
      : Math.max(target, move - (MOVE_PX * dt) / MOVE_OUT);
    fire = fire * Math.exp(-dt / SHOT_FADE);
    if (fire < 0.05) fire = 0;

    // Crosshair units are device pixels; CSS wants CSS pixels.
    const r = window.devicePixelRatio || 1;
    const m = (move / r).toFixed(1), f = (fire / r).toFixed(1);
    if (!el || !el.isConnected) el = document.querySelector(".al-center-crosshair");
    if (!el || (m + "," + f === shown && el.style.getPropertyValue("--aim-move"))) return;
    shown = m + "," + f;
    el.style.setProperty("--aim-move", m + "px");
    el.style.setProperty("--aim-fire", f + "px");
  };
})();
