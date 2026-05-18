(function () {

  function startInstance(wrap) {

    // ── Read data attributes ─────────────────────────────────────────────────
    function f(k, d) { var v = wrap.getAttribute(k); return v !== null ? parseFloat(v) : d; }
    function s(k, d) { var v = wrap.getAttribute(k); return v !== null ? v : d; }
    function n(k, d) { var v = wrap.getAttribute(k); return v !== null ? parseInt(v) : d; }

    var color      = s('data-color',          '#FF7A59');
    var count      = n('data-count',           900);
    var rad        = f('data-rad',             1.8);
    var hl         = f('data-hl',              3.2);
    var warpAmt    = f('data-warp-amt',        1.1);
    var warpScale  = f('data-warp-scale',      0.66);
    var dotMin     = f('data-dot-min',         1.8);
    var dotMax     = f('data-dot-max',         2.8);
    var alpha      = f('data-alpha',           1.0);
    var speed      = f('data-speed',           0.6);
    var camZ       = f('data-cam-z',           4.0);
    var mouseMode  = s('data-mouse',           'attract'); // attract | repel | none
    var mouseR     = f('data-mouse-radius',    1.55);
    var mouseS     = f('data-mouse-strength',  0.1);
    var patchFreq  = f('data-patch-freq',      1.9);
    var patchAmt   = f('data-patch-amt',       0.77);
    var patchBase  = f('data-patch-base',      0.57);
    var edgeDim    = f('data-edge-dim',        0.6);

    // ── Noise ────────────────────────────────────────────────────────────────
    function mkN(seed) {
      var p = new Uint8Array(512);
      for (var i = 0; i < 256; i++) p[i] = i;
      var r = seed | 0;
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

    function fbm(noise, x, y, o, freq) {
      var v = 0, a = 0.5, fr = freq;
      for (var i = 0; i < o; i++) { v += noise(x * fr, y * fr) * a; a *= 0.5; fr *= 2.1; }
      return v;
    }

    // ── Shape SDF — Teardrop ─────────────────────────────────────────────────
    function shapeSDF(x, y) {
      var cy = y + hl * 0.5;
      var base = Math.sqrt(x * x + cy * cy) / rad;
      var taper = y < 0 ? 1 + Math.pow(-y / (hl + rad), 1.5) * 0.6 : 1;
      return base * taper;
    }

    // ── Setup ────────────────────────────────────────────────────────────────
    var nA = mkN(42), nB = mkN(93), nP = mkN(137);

    var c = document.createElement('canvas');
    c.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
    wrap.appendChild(c);

    var W = wrap.clientWidth, H = wrap.clientHeight;
    var renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0, 0);

    var scene = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
    cam.position.z = camZ;

    // ── Build particles ───────────────────────────────────────────────────────
    var pos = new Float32Array(count * 3);
    var rn  = new Float32Array(count);
    var sz  = new Float32Array(count);
    var al  = new Float32Array(count);
    var placed = 0, att = 0;
    var sR = (rad + hl + warpAmt + 0.5) * 2.4;

    while (placed < count && att < count * 40) {
      att++;
      var x = (Math.random() - .5) * sR;
      var y = (Math.random() - .5) * sR;
      var wx = x + nA(x * warpScale, y * warpScale) * warpAmt;
      var wy = y + nB(x * warpScale + 5.2, y * warpScale + 1.3) * warpAmt;

      var sdf = shapeSDF(wx, wy);
      if (sdf > 1) continue;

      var pn  = fbm(nP, x * patchFreq, y * patchFreq, 2, 1);
      var pa  = patchBase + (pn + .5) * patchAmt;
      var edF = 1 - edgeDim * sdf;

      pos[placed * 3]     = x;
      pos[placed * 3 + 1] = y;
      pos[placed * 3 + 2] = (Math.random() - .5) * .2;
      rn[placed] = Math.random();
      sz[placed] = Math.random() < 0.08
        ? dotMax + Math.random() * 1.0
        : dotMin + Math.random() * (dotMax - dotMin);
      al[placed] = Math.min(1, Math.max(0, pa * edF));
      placed++;
    }

    // ── Geometry ─────────────────────────────────────────────────────────────
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos.slice(0, placed * 3), 3));
    geo.setAttribute('aR',       new THREE.BufferAttribute(rn.slice(0, placed), 1));
    geo.setAttribute('aS',       new THREE.BufferAttribute(sz.slice(0, placed), 1));
    geo.setAttribute('aAl',      new THREE.BufferAttribute(al.slice(0, placed), 1));

    // ── Material ─────────────────────────────────────────────────────────────
    var col = new THREE.Color(color);
    var mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime:  { value: 0 },
        uPR:    { value: renderer.getPixelRatio() },
        uColor: { value: new THREE.Vector3(col.r, col.g, col.b) },
        uAlpha: { value: alpha },
        uSpeed: { value: speed },
        uDX:    { value: 0.04 },
        uDY:    { value: 0.05 },
        uPulse: { value: 0.12 },
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

    if (mouseMode !== 'none') {
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
    }

    function applyMouse() {
      if (mouseMode === 'none') return;
      var pa = geo.getAttribute('position'), N = pa.count;
      var sign = mouseMode === 'attract' ? -1 : 1;
      for (var i = 0; i < N; i++) {
        var ox = orig[i * 3], oy = orig[i * 3 + 1], oz = orig[i * 3 + 2];
        var dx = ox - mx, dy = oy - my;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < mouseR && d > 0.001) {
          var ff = (1 - d / mouseR) * mouseS * sign;
          pa.setXYZ(i,
            pa.getX(i) + (ox + (dx / d) * ff - pa.getX(i)) * 0.12,
            pa.getY(i) + (oy + (dy / d) * ff - pa.getY(i)) * 0.12,
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
      renderer.render(scene, cam);
    })(0);

    // ── Resize ────────────────────────────────────────────────────────────────
    window.addEventListener('resize', function () {
      var nW = wrap.clientWidth, nH = wrap.clientHeight;
      cam.aspect = nW / nH;
      cam.updateProjectionMatrix();
      renderer.setSize(nW, nH);
    });
  }

  // ── Init all instances ────────────────────────────────────────────────────
  function run() {
    var wraps = document.querySelectorAll('[data-particles-2]');
    if (!wraps.length) return;
    for (var i = 0; i < wraps.length; i++) {
      startInstance(wraps[i]);
    }
  }

  // ── Load Three.js then run ────────────────────────────────────────────────
  if (window.THREE) {
    run();
  } else {
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = run;
    document.head.appendChild(s);
  }

})();
