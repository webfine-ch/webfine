(function () {
  // Warte bis DOM geladen ist
  function init() {
    document.querySelectorAll('canvas[data-particles]').forEach(function (c) {
      startParticles(c);
    });
  }

  function startParticles(c) {
    // Config aus data-Attributen lesen
    var cfg = {
      color:      c.getAttribute('data-color')     || '#de6145',
      count:      parseInt(c.getAttribute('data-count'))    || 2200,
      width:      parseFloat(c.getAttribute('data-width'))  || 2.2,
      height:     parseFloat(c.getAttribute('data-height')) || 4.6,
      sharpness:  parseFloat(c.getAttribute('data-sharpness')) || 6,
      fade:       parseFloat(c.getAttribute('data-fade'))   || 0.12,
      noiseamt:   parseFloat(c.getAttribute('data-noiseamt'))  || 0.28,
      noisefreq:  parseFloat(c.getAttribute('data-noisefreq')) || 1.8,
      noiseoct:   parseInt(c.getAttribute('data-noiseoct'))    || 3,
      patchFreq:  parseFloat(c.getAttribute('data-patch-freq'))  || 2.2,
      patchAmt:   parseFloat(c.getAttribute('data-patch-amt'))   || 0.6,
      patchBase:  parseFloat(c.getAttribute('data-patch-base'))  || 0.55,
      edgeDim:    parseFloat(c.getAttribute('data-edge-dim'))    || 0.7,
      alpha:      parseFloat(c.getAttribute('data-alpha'))   || 0.95,
      speed:      parseFloat(c.getAttribute('data-speed'))   || 0.6,
      driftx:     parseFloat(c.getAttribute('data-drift-x')) || 0.04,
      drifty:     parseFloat(c.getAttribute('data-drift-y')) || 0.05,
      pulse:      parseFloat(c.getAttribute('data-pulse'))   || 0.12,
      mouseMode:  c.getAttribute('data-mouse')     || 'repel',
      mradius:    parseFloat(c.getAttribute('data-mouse-radius'))   || 1.0,
      mstrength:  parseFloat(c.getAttribute('data-mouse-strength')) || 0.4,
    };
    // ... animation code
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
