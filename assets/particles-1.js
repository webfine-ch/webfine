/*!
 * particles-1.js — webfine.ch
 *
 * Webflow usage:
 *   <div
 *     data-particles
 *     data-color="#de6145"
 *     data-count="2200"
 *     data-width="2.2"
 *     data-height="4.6"
 *     style="position:relative;width:100%;height:600px;">
 *   </div>
 *
 * Available data attributes:
 *   data-color           Dot color             default: #de6145
 *   data-count           Number of dots        default: 2200
 *   data-width           Shape width           default: 2.2
 *   data-height          Shape height          default: 4.6
 *   data-sharpness       Edge sharpness        default: 6
 *   data-fade            Edge fade             default: 0.12
 *   data-noise-amt       Organic amount        default: 0.28
 *   data-noise-freq      Organic frequency     default: 1.8
 *   data-noise-oct       Organic octaves       default: 3
 *   data-patch-freq      Opacity zone freq     default: 2.2
 *   data-patch-amt       Opacity zone strength default: 0.6
 *   data-patch-base      Base opacity          default: 0.55
 *   data-edge-dim        Edge dimming          default: 0.7
 *   data-alpha           Global opacity        default: 0.95
 *   data-speed           Animation speed       default: 0.6
 *   data-drift-x         Drift X               default: 0.04
 *   data-drift-y         Drift Y               default: 0.05
 *   data-pulse           Pulse amount          default: 0.12
 *   data-mouse           Mouse mode: repel / attract / none  default: repel
 *   data-mouse-radius    Mouse radius          default: 1.0
 *   data-mouse-strength  Mouse strength        default: 0.4
 */
(function () {
  'use strict';

  // ── Noise ──────────────────────────────────────────────────────────────────
  function makeNoise(seed) {
    var p = new Uint8Array(512);
    for (var i = 0; i < 256; i++) p[i] = i;
    var s = seed | 0;
    for (var i = 255; i > 0; i--) {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      var j = (s >>> 0) % (i + 1);
      var t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (var i = 0; i < 256; i++) p[i + 256] = p[i];
    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(a, b, t) { return a + t * (b - a); }
    function grad(h, x, y) {
      var u = h < 8 ? x : y, v = h < 4 ? y : x;
      return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    }
    return function (x, y) {
      var X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      x -= Math.floor(x); y -= Math.floor(y);
      var u = fade(x), v = fade(y), a = p[X] + Y, b = p[X + 1] + Y;
      return lerp(
        lerp(grad(p[a], x, y),     grad(p[b],     x - 1, y),     u),
        lerp(grad(p[a + 1], x, y - 1), grad(p[b + 1], x - 1, y - 1), u),
        v
      );
    };
  }

  function fbm(noise, x, y, oct, freq) {
    var v = 0, amp = 0.5, f = freq;
    for (var i = 0; i < oct; i++) {
      v += noise(x * f, y * f) * amp;
      amp *= 0.5; f *= 2.1;
    }
    return v;
  }

  function superSDF(x, y, rx, ry, n) {
    return Math.pow(Math.pow(Math.abs(x / rx), n) + Math.pow(Math.abs(y / ry), n), 1 / n);
  }

  // ── Read config from div data-attributes ───────────────────────────────────
  function readCfg(el) {
    function f(k, d) { var v = el.getAttribute(k); return v !== null ? parseFloat(v) : d; }
    function s(k, d) { var v = el.getAttribute(k); return v !== null ? v : d; }
    function n(k, d) { var v = el.getAttribute(k); return v !== null ? parseInt(v) : d; }
    return {
      color:         s('data-color',          '#de6145'),
      count:         n('data-count',           2200),
      width:         f('data-width',           2.2),
      height:        f('data-height',          4.6),
      sharpness:     f('data-sharpness',       6),
      fade:          f('data-fade',            0.12),
      noiseAmt:      f('data-noise-amt',       0.28),
      noiseFreq:     f('data-noise-freq',      1.8),
      noiseOct:      n('data-noise-oct',       3),
      patchFreq:     f('data-patch-freq',      2.2),
      patchAmt:      f('data-patch-amt',       0.6),
      patchBase:     f('data-patch-base',      0.55),
      edgeDim:       f('data-edge-dim',        0.7),
      alpha:         f('data-alpha',           0.95),
      speed:         f('data-speed',           0.6),
      driftX:        f('data-drift-x',         0.04),
      driftY:        f('data-drift-y',         0.05),
      pulse:         f('data-pulse',           0.12),
      mouseMode:     s('data-mouse',           'repel'),
      mouseRadius:   f('data-mouse-radius',    1.0),
      mouseStrength: f('data-mouse-strength',  0.4),
    };
  }

  // ── Start one instance ─────────────────────────────────────────────────────
  function startParticles(wrapper) {
    var THREE = window.THREE;
    var cfg = readCfg(wrapper);

    // Create canvas inside the div
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
    wrapper.style.position = wrapper.style.position || 'relative';
    wrapper.appendChild(canvas);

    // Renderer
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 5;

    var geo, mat, pts, origArr;
    var mouse3D = { x: -9999, y: -9999 };

    // ── Resize ────────────────────────────────────────────────────────────────
    function resize() {
      var W = wrapper.clientWidth;
      var H = wrapper.clientHeight;
      renderer.setSize(W, H);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    }

    // ── Build particles ───────────────────────────────────────────────────────
    function build() {
      if (pts) scene.remove(pts);

      var noiseShape = makeNoise(42);
      var noisePatch = makeNoise(137);

      var N = cfg.count;
      var pos = new Float32Array(N * 3);
      var rnd = new Float32Array(N);
      var siz = new Float32Array(N);
      var alp = new Float32Array(N);

      var placed = 0, att = 0;
      var rx = cfg.width / 2, ry = cfg.height / 2;

      while (placed < N && att < N * 30) {
        att++;
        var x = (Math.random() - 0.5) * cfg.width * 1.3;
        var y = (Math.random() - 0.5) * cfg.height * 1.3;

        var angle = Math.atan2(y / ry, x / rx);
        var sn = fbm(noiseShape, Math.cos(angle) * cfg.noiseFreq, Math.sin(angle) * cfg.noiseFreq, cfg.noiseOct, 1.0);
        var sdf = superSDF(x, y, rx, ry, cfg.sharpness);
        var boundary = 1.0 + sn * cfg.noiseAmt;
        if (sdf > boundary) continue;

        var edgeFade = cfg.fade > 0 ? Math.min(1, (boundary - sdf) / (cfg.fade * boundary)) : 1.0;
        var pn = fbm(noisePatch, x * cfg.patchFreq, y * cfg.patchFreq, 2, 1.0);
        var patchAlpha = cfg.patchBase + (pn + 0.5) * cfg.patchAmt;
        var distC = sdf / boundary;
        var edgeDimFactor = 1.0 - cfg.edgeDim * distC;

        pos[placed * 3]     = x;
        pos[placed * 3 + 1] = y;
        pos[placed * 3 + 2] = (Math.random() - 0.5) * 0.2;
        rnd[placed] = Math.random();
        siz[placed] = Math.random() < 0.10
          ? 2.8 + Math.random() * 1.5
          : 1.0 + Math.random() * 1.8;
        alp[placed] = Math.min(1, Math.max(0, patchAlpha * edgeDimFactor * edgeFade));
        placed++;
      }

      origArr = pos.slice(0, placed * 3);

      geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos.slice(0, placed * 3), 3));
      geo.setAttribute('aR',       new THREE.BufferAttribute(rnd.slice(0, placed), 1));
      geo.setAttribute('aS',       new THREE.BufferAttribute(siz.slice(0, placed), 1));
      geo.setAttribute('aAl',      new THREE.BufferAttribute(alp.slice(0, placed), 1));

      var col = new THREE.Color(cfg.color);
      mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime:  { value: 0 },
          uPR:    { value: renderer.getPixelRatio() },
          uColor: { value: new THREE.Vector3(col.r, col.g, col.b) },
          uAlpha: { value: cfg.alpha },
          uSpeed: { value: cfg.speed },
          uDX:    { value: cfg.driftX },
          uDY:    { value: cfg.driftY },
          uPulse: { value: cfg.pulse },
        },
        vertexShader: [
          'attribute float aR; attribute float aS; attribute float aAl;',
          'uniform float uTime, uPR, uSpeed, uDX, uDY, uPulse;',
          'varying float vAl;',
          'void main() {',
          '  vAl = aAl;',
          '  vec3 p = position;',
          '  p.x += sin(uTime * uSpeed + aR * 6.28) * uDX;',
          '  p.y += cos(uTime * uSpeed * 0.8 + aR * 3.14) * uDY;',
          '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
          '  gl_Position = projectionMatrix * mv;',
          '  float pulse = 1.0 + uPulse * sin(uTime * 1.1 + aR * 6.28);',
          '  gl_PointSize = aS * uPR * pulse * (4.0 / -mv.z);',
          '}',
        ].join('\n'),
        fragmentShader: [
          'uniform vec3 uColor; uniform float uAlpha;',
          'varying float vAl;',
          'void main() {',
          '  vec2 uv = gl_PointCoord - 0.5;',
          '  float d = length(uv);',
          '  if (d > 0.5) discard;',
          '  float a = smoothstep(0.5, 0.15, d) * uAlpha * vAl;',
          '  gl_FragColor = vec4(uColor, a);',
          '}',
        ].join('\n'),
      });

      pts = new THREE.Points(geo, mat);
      scene.add(pts);
    }

    // ── Mouse ─────────────────────────────────────────────────────────────────
    function onMouseMove(e) {
      var rect = canvas.getBoundingClientRect();
      var nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      var ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      var vec = new THREE.Vector3(nx, ny, 0.5).unproject(camera);
      var dir = vec.sub(camera.position).normalize();
      var dist = -camera.position.z / dir.z;
      var p = camera.position.clone().add(dir.multiplyScalar(dist));
      mouse3D.x = p.x; mouse3D.y = p.y;
    }

    function applyMouse() {
      if (!geo || !origArr || cfg.mouseMode === 'none') return;
      var pa = geo.getAttribute('position'), N = pa.count;
      var mx = mouse3D.x, my = mouse3D.y;
      var R = cfg.mouseRadius, S = cfg.mouseStrength;
      var sign = cfg.mouseMode === 'attract' ? -1 : 1;
      for (var i = 0; i < N; i++) {
        var ox = origArr[i * 3], oy = origArr[i * 3 + 1], oz = origArr[i * 3 + 2];
        var dx = ox - mx, dy = oy - my;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < R && d > 0.001) {
          var f = (1 - d / R) * S * sign;
          pa.setXYZ(i,
            pa.getX(i) + (ox + (dx / d) * f - pa.getX(i)) * 0.12,
            pa.getY(i) + (oy + (dy / d) * f - pa.getY(i)) * 0.12,
            oz
          );
        } else {
          pa.setXYZ(i,
            pa.getX(i) + (ox - pa.getX(i)) * 0.06,
            pa.getY(i) + (oy - pa.getY(i)) * 0.06,
            oz
          );
        }
      }
      pa.needsUpdate = true;
    }

    // ── Animate ───────────────────────────────────────────────────────────────
    function animate(ts) {
      requestAnimationFrame(animate);
      if (mat) {
        mat.uniforms.uTime.value = ts / 1000;
        applyMouse();
      }
      renderer.render(scene, camera);
    }

    // ── Events ────────────────────────────────────────────────────────────────
    if (cfg.mouseMode !== 'none') {
      wrapper.addEventListener('mousemove', onMouseMove);
      wrapper.addEventListener('mouseleave', function () {
        mouse3D.x = -9999; mouse3D.y = -9999;
      });
    }

    window.addEventListener('resize', resize);

    // ── Init ──────────────────────────────────────────────────────────────────
    resize();
    build();
    requestAnimationFrame(animate);
  }

  // ── Load Three.js, then init all wrappers ──────────────────────────────────
  function init() {
    document.querySelectorAll('[data-particles]').forEach(startParticles);
  }

  if (window.THREE) {
    init();
  } else {
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = init;
    document.head.appendChild(s);
  }

})();
