'use strict';

/* ============================================================================
   MAE STUDIO — opening splash (reusable)
   Drop the CSS, the #mae-splash markup and this block into any game, then call
   MaeSplash.play(document.getElementById('mae-splash'), { audio: anAudioContext, onDone })
   An ink drop falls, a golden brush-circle draws itself (with bristle strokes and a spatter),
   m-a-e land one by one on a little tune, a brushed underline, STUDIO opens up beneath,
   gold dust rises and a light passes over — then it fades to the game.
   Tapping skips (after a short moment, so a stray tap doesn't eat it).
   ============================================================================ */
const MaeSplash = {
  play(el, opts) {
    opts = opts || {};
    const done = () => {
      if (el.dataset.state === 'done') return;
      el.dataset.state = 'done';
      clearTimeout(this._t1);
      if (this._out) { try { const t = this._ac.currentTime; this._out.gain.cancelScheduledValues(t); this._out.gain.setValueAtTime(this._out.gain.value, t); this._out.gain.linearRampToValueAtTime(0.0001, t + .45); } catch (e) {} }
      el.classList.add('mae-out');
      setTimeout(() => { el.style.display = 'none'; el.classList.remove('mae-run', 'mae-out'); if (opts.onDone) opts.onDone(); }, 560);
    };
    // gold dust: a handful of motes that rise through the whole splash
    el.querySelectorAll('.mae-dust').forEach(d => d.remove());
    for (let i = 0; i < 14; i++) {
      const d = document.createElement('div'); d.className = 'mae-dust';
      d.style.left = (8 + Math.random() * 84) + '%';
      d.style.setProperty('--dx', ((Math.random() - .5) * 60) + 'px');
      d.style.animationDelay = (.6 + Math.random() * 2.2) + 's';
      d.style.width = d.style.height = (2 + Math.random() * 2.5) + 'px';
      el.appendChild(d);
    }
    el.dataset.state = 'run';
    el.style.display = 'flex';
    void el.offsetWidth;                         // restart the CSS animations on every play
    el.classList.add('mae-run');
    if (opts.audio && opts.sound !== false) this.tune(opts.audio, opts.volume == null ? 1 : opts.volume);
    const started = Date.now();
    el.onclick = el.ontouchstart = () => { if (Date.now() - started > 600) done(); };
    this._t1 = setTimeout(done, opts.duration || 2400);
  },
  /* The Mae Studio tune, in A major, about 3.5 seconds, timed to the picture:
     a drop, a marimba line that climbs while the circle draws, three bright notes for m-a-e,
     then a warm chord and a bell as STUDIO opens. A small echo gives it room. */
  tune(ac, vol) {
    try {
      if (ac.state !== 'running' && ac.resume) ac.resume();
      const t0 = ac.currentTime + .05;
      const out = ac.createGain(); out.gain.value = .85 * vol;
      const dry = ac.createGain(); dry.gain.value = 1;
      const delay = ac.createDelay(1); delay.delayTime.value = .19;
      const fb = ac.createGain(); fb.gain.value = .32;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
      const wet = ac.createGain(); wet.gain.value = .35;
      dry.connect(out); dry.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(wet); wet.connect(out);
      out.connect(ac.destination);
      this._ac = ac; this._out = out;
      const voice = (f, at, dur, peak, type, attack, dest) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0 + at);
        g.gain.setValueAtTime(0.0001, t0 + at);
        g.gain.exponentialRampToValueAtTime(peak, t0 + at + (attack || .006));
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
        o.connect(g); g.connect(dest || dry); o.start(t0 + at); o.stop(t0 + at + dur + .05);
      };
      const marimba = (f, at, v) => { voice(f, at, .55, .11 * v); voice(f * 4, at, .12, .025 * v); voice(f * 2.01, at, .3, .02 * v); };
      const bell = (f, at, v) => { voice(f, at, 2.2, .06 * v); voice(f * 2.76, at, 1.1, .018 * v); voice(f * 5.4, at, .5, .008 * v); };
      const N = { A2: 110, E3: 164.81, A3: 220, Cs4: 277.18, E4: 329.63, A4: 440, B4: 493.88, Cs5: 554.37, E5: 659.25, Fs5: 739.99,
                  A5: 880, B5: 987.77, Cs6: 1108.73, E6: 1318.51 };
      voice(1568, .42, .28, .08); voice(2093, .46, .2, .03);                          // the drop lands
      [['A4', .62], ['Cs5', .82], ['E5', 1.02], ['Fs5', 1.22], ['E5', 1.4]].forEach(([n, at]) => marimba(N[n], at, 1));   // the circle
      [['A5', 1.55], ['B5', 1.7], ['Cs6', 1.85]].forEach(([n, at]) => marimba(N[n], at, .8));                          // m · a · e
      ['A2', 'E3', 'A3', 'Cs4', 'E4'].forEach((n, i) => voice(N[n], 2.08, 1.9, i ? .03 : .05, 'triangle', .35));     // the chord
      bell(N.A5, 2.1, 1); bell(N.E6, 2.45, .7);                                                                      // STUDIO
    } catch (e) {}
  },
  chime(ac, vol) { this.tune(ac, vol); }
};
