/*!
 * particles-1.js — webfine.ch
 * Loads Three.js automatically, then renders particle animation.
 *
 * Usage in Webflow:
 *   <div data-particles style="position:relative;width:100%;height:600px;"></div>
 */
(function () {
  function run() {

    // ── Noise ────────────────────────────────────────────────────────────────
    function mkN(s) {
      var p = new Uint8Array(512);
      for (var i = 0; i < 256; i++) p[i] = i;
      var r = s | 0;
      for (var i = 255; i > 0; i--) {
        r = (r * 1664525 + 1013904223) & 0xffffffff;
        var j = (r >>> 0) % (i + 1);
        var t = p[i]; p[i] = p[j]; p[j] = t;
      }
      for (var i = 0; i < 256; i++) p[i + 256] = p[i];
      function fd(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
      function lr(a, b, t) { return a + t * (b - a); }
      function gr(h, x, y) {
        var u = h < 8 ? x : y, v = h < 4 ? y : x;
        return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
      }
      return function (x, y) {
        var X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
        x -= Math.floor(x); y -= Math.floor(y);
        var u = fd(x), v = fd(y), a = p[X] + Y, b = p[X + 1] + Y;
        return lr(lr(gr(p[a], x, y), gr(p[b], x - 1, y), u),
                  lr(gr(p[a + 1], x, y - 1), gr(p[b + 1], x - 1, y - 1), u), v);
      };
    }

    function fbm(n, x, y, o, f) {
      var v = 0, a = 0.5, fr = f;
      for (var i = 0; i < o; i++) { v += n(x * fr, y * fr) * a; a *= 0.5; fr *= 2.1; }
      return v;
    }

    // ── Shape SDF ────────────────────────────────────────────────────────────
    // Rounded rectangle — flat top & bottom, round corners
    function shapeSDF(x, y, r, hl) {
      var px = Math.max(Math.abs(x) - r, 0);
      var py = Math.max(Math.abs(y) - hl, 0);
      return Math.sqrt(px * px + py * py) / (r * 0.3);
    }

    // Hard clip: reject points outside flat top/bottom boundary
    function clipped(wx, wy, r, hl) {
      return Math.abs(wy) > hl;
    }

    // ── Setup ────────────────────────────────────────────────────────────────
    var nA = mkN(42), nB = mkN(93), nP = mkN(137);

    var wrap = document.querySelector('[data-particles]');
    if (!wrap) return;

    var c = document.createElement('canvas');
    c.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
    wrap.appendChild(c);

    var W = wrap.clientWidth, H = wrap.clientHeight;
    var r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.setSize(W, H);
    r.setClearColor(0, 0);

    var scene = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
    cam.position.z = 5;

    // ── Parameters ───────────────────────────────────────────────────────────
    var N   = 3600;
    var rad = 0.85, hl  = 2.65;  // shape: radius, half-length
    var wA  = 0.83, wS  = 0.36;  // warp: amount, scale
    var fd  = 0.00;               // edge fade
    var pF  = 0.60, pA  = 1.00, pB = 0.05;  // opacity patches
    var eD  = 0.00;               // edge dimming

    // ── Build particles ───────────────────────────────────────────────────────
    var pos = new Float32Array(N * 3);
    var rn  = new Float32Array(N);
    var sz  = new Float32Array(N);
    var al  = new Float32Array(N);
    var placed = 0, att = 0;
    var sR = (rad + hl + wA + 0.5) * 2.4;

    while (placed < N && att < N * 40) {
      att++;
      var x = (Math.random() - .5) * sR;
      var y = (Math.random() - .5) * sR;
      var wx = x + nA(x * wS, y * wS) * wA;
      var wy = y + nB(x * wS + 5.2, y * wS + 1.3) * wA;

      if (clipped(wx, wy, rad, hl)) continue;
      var sdf = shapeSDF(wx, wy, rad, hl);
      if (sdf > 1) continue;

      var ef  = fd > 0 ? Math.min(1, (1 - sdf) / fd) : 1;
      var pn  = fbm(nP, x * pF, y * pF, 2, 1);
      var pa  = pB + (pn + .5) * pA;
      var edF = 1 - eD * sdf;

      pos[placed * 3]     = x;
      pos[placed * 3 + 1] = y;
      pos[placed * 3 + 2] = (Math.random() - .5) * .2;
      rn[placed] = Math.random();
      sz[placed] = Math.random() < 0.08
        ? 3.8 + Math.random() * 1.5
        : 3.8 + Math.random() * 0.0;
      al[placed] = Math.min(1, Math.max(0, pa * edF * ef));
      placed++;
    }

    // ── Geometry ─────────────────────────────────────────────────────────────
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos.slice(0, placed * 3), 3));
    geo.setAttribute('aR',       new THREE.BufferAttribute(rn.slice(0, placed), 1));
    geo.setAttribute('aS',       new THREE.BufferAttribute(sz.slice(0, placed), 1));
    geo.setAttribute('aAl',      new THREE.BufferAttribute(al.slice(0, placed), 1));

    // ── Material ─────────────────────────────────────────────────────────────
    var col = new THREE.Color('#ff5c33');
    var mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime:  { value: 0 },
        uPR:    { value: r.getPixelRatio() },
        uColor: { value: new THREE.Vector3(col.r, col.g, col.b) },
        uAlpha: { value: 0.8 },
        uSpeed: { value: 1.8 },
        uDX:    { value: 0.04 },
        uDY:    { value: 0.05 },
        uPulse: { value: 0.08 },
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
        '  if (length(uv) > 0.5) discard;',
        '  gl_FragColor = vec4(uColor, uAlpha * vAl);',
        '}',
      ].join('\n'),
    });

    var pts = new THREE.Points(geo, mat);
    scene.add(pts);

    // ── Mouse ─────────────────────────────────────────────────────────────────
    var mx = -9999, my = -9999;
    var orig = pos.slice(0, placed * 3);

    wrap.addEventListener('mousemove', function (e) {
      var rect = wrap.getBoundingClientRect();
      var nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      var ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      var v = new THREE.Vector3(nx, ny, 0.5).unproject(cam);
      var d = v.sub(cam.position).normalize();
      var t = -cam.position.z / d.z;
      var p = cam.position.clone().add(d.multiplyScalar(t));
      mx = p.x; my = p.y;
    });
    wrap.addEventListener('mouseleave', function () { mx = -9999; my = -9999; });

    function applyMouse() {
      var pa = geo.getAttribute('position'), N = pa.count;
      var R = 1, S = 0.4;
      for (var i = 0; i < N; i++) {
        var ox = orig[i * 3], oy = orig[i * 3 + 1], oz = orig[i * 3 + 2];
        var dx = ox - mx, dy = oy - my;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < R && d > 0.001) {
          var f = (1 - d / R) * S;
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
    (function anim(t) {
      requestAnimationFrame(anim);
      mat.uniforms.uTime.value = t / 1000;
      applyMouse();
      r.render(scene, cam);
    })(0);

    // ── Resize ────────────────────────────────────────────────────────────────
    window.addEventListener('resize', function () {
      var nW = wrap.clientWidth, nH = wrap.clientHeight;
      cam.aspect = nW / nH;
      cam.updateProjectionMatrix();
      r.setSize(nW, nH);
    });
  }

// ── Load Three.js then run ────────────────────────────────────────────────
  function waitForDiv() {
    if (document.querySelector('[data-particles]')) {
      run();
    } else {
      setTimeout(waitForDiv, 100);
    }
  }

  function loadAndRun() {
    if (window.THREE) {
      waitForDiv();
    } else {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      s.onload = waitForDiv;
      document.head.appendChild(s);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAndRun);
  } else {
    loadAndRun();
  }

})();
