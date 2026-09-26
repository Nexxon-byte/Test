// Renderer + Post-Processing: „Gothic Neon Lo-Fi“
// RenderPass → Bloom → OutputPass (ACES + sRGB) → FinalPass (Grading, Aberration, Korn, Vignette, Dithering, Glitch)

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { settings, QUALITY } from '../core/settings.js';
import { damp } from '../core/rng.js';

const FinalShader = {
  name: 'TieferFinal',
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(960, 540) },
    time: { value: 0 },
    aberration: { value: 0.3 },
    vignette: { value: 0.35 },
    grain: { value: 0.06 },
    levels: { value: 32 },
    saturation: { value: 0.9 },
    contrast: { value: 1.08 },
    gamma: { value: 1.0 },
    shadowTint: { value: new THREE.Color(0.02, 0.015, 0.03) },
    highlightTint: { value: new THREE.Color(1.0, 0.97, 0.9) },
    glitch: { value: 0 },
    flash: { value: 0 },
    flashColor: { value: new THREE.Color(1, 1, 1) },
    fade: { value: 0 },
    echo: { value: 0 },
    curvature: { value: 0.06 },
    letterbox: { value: 0 },
    pulse: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float time, aberration, vignette, grain, levels, saturation, contrast, gamma;
    uniform vec3 shadowTint, highlightTint, flashColor;
    uniform float glitch, flash, fade, echo, curvature, letterbox, pulse;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    float bayer4(vec2 p) {
      vec2 q = mod(p, 4.0);
      int i = int(q.x) + int(q.y) * 4;
      float m[16];
      m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;
      m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
      for (int k = 0; k < 16; k++) if (k == i) return (m[k] + 0.5) / 16.0;
      return 0.5;
    }

    void main() {
      vec2 cc = vUv - 0.5;
      float r2 = dot(cc, cc);
      vec2 uv = 0.5 + cc * (1.0 + curvature * r2);

      // VHS-Tracking: horizontale Bänder verrutschen
      if (glitch > 0.001) {
        float band = floor(uv.y * 28.0 + floor(time * 17.0));
        float n = hash(vec2(band, floor(time * 24.0)));
        if (n < glitch * 0.45) uv.x += (hash(vec2(band * 1.7, floor(time * 31.0))) - 0.5) * 0.09 * glitch;
        uv.y += (hash(vec2(floor(time * 9.0), 3.1)) - 0.5) * 0.01 * glitch;
      }

      vec2 dir = normalize(cc + 1e-5);
      float ca = aberration * (0.0015 + r2 * 0.02) + glitch * 0.006;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir * ca).b;
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);

      // Helligkeit / Gamma
      col = pow(max(col, 0.0), vec3(1.0 / gamma));

      // Grading
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, saturation);
      col = (col - 0.5) * contrast + 0.5;
      col += shadowTint * (1.0 - smoothstep(0.0, 0.45, l));
      col *= mix(vec3(1.0), highlightTint, smoothstep(0.25, 1.0, l));

      // Echo (tot im Koop): kalt und farblos
      float le = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, vec3(le * 0.85, le * 0.95, le * 1.1), echo);

      // Vignette (+ Herzschlag)
      float v = length(cc * vec2(1.0, 0.8));
      float vig = 1.0 - smoothstep(0.25, 0.85, v * (1.0 + vignette + pulse * 0.25));
      col *= mix(1.0, vig, 0.92);

      // feine Scanlines
      col *= 0.965 + 0.035 * sin(vUv.y * resolution.y * 3.14159);

      // Filmkorn
      float g = hash(floor(vUv * resolution) + fract(time * 7.13) * 113.0) - 0.5;
      col += g * grain * (0.6 + (1.0 - l) * 0.8);

      col = mix(col, flashColor, clamp(flash, 0.0, 1.0));
      col *= 1.0 - clamp(fade, 0.0, 1.0);

      // Letterbox für Filmsequenzen
      if (abs(vUv.y - 0.5) > 0.5 - letterbox) col = vec3(0.0);

      // geordnetes Dithering + Farbquantisierung
      float d = bayer4(floor(vUv * resolution));
      col = floor(clamp(col, 0.0, 1.0) * levels + d) / levels;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = r;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.06);

    this.camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.04, 160);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    this.composer = new EffectComposer(r);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.45, 0.0, 1.2);
    // enge, edle Überstrahlung statt Nebelschleier
    this.bloom.compositeMaterial.uniforms.bloomFactors.value = [1.0, 0.55, 0.22, 0.07, 0.02];
    this.outputPass = new OutputPass();
    this.finalPass = new ShaderPass(FinalShader);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.outputPass);
    this.composer.addPass(this.finalPass);
    this.u = this.finalPass.uniforms;

    // Ziel-Werte, die weich angefahren werden
    this.grade = {
      saturation: 0.9, contrast: 1.08,
      shadowTint: new THREE.Color(0.02, 0.015, 0.03),
      highlightTint: new THREE.Color(1.0, 0.97, 0.9),
      exposure: 1.0,
    };
    this.fx = { fear: 0, glitch: 0, flash: 0, fade: 0, echo: 0, letterbox: 0, pulse: 0, extraAberration: 0 };
    this.time = 0;

    this.applyQuality();
    window.addEventListener('resize', () => this.resize());
  }

  applyQuality() {
    const q = QUALITY[settings.quality] || QUALITY.standard;
    this.quality = q;
    this.u.levels.value = settings.quality === 'retro' ? 22 : settings.quality === 'hoch' ? 56 : 34;
    this.bloom.enabled = q.bloom;
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const pr = Math.min(this.quality.height / h, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.u.resolution.value.set(Math.round(w * pr), Math.round(h * pr));
    this.pixelRatio = pr;
  }

  // Zonenlook (weich überblenden)
  setGrade({ saturation, contrast, shadowTint, highlightTint, exposure } = {}) {
    if (saturation !== undefined) this.grade.saturation = saturation;
    if (contrast !== undefined) this.grade.contrast = contrast;
    if (shadowTint) this.grade.shadowTint.set(shadowTint);
    if (highlightTint) this.grade.highlightTint.set(highlightTint);
    if (exposure !== undefined) this.grade.exposure = exposure;
  }

  glitchPulse(amount = 1) { this.fx.glitch = Math.max(this.fx.glitch, amount * (settings.reduceFlashing ? 0.35 : 1)); }
  flashPulse(amount = 1, color = 0xffffff) {
    this.fx.flash = Math.max(this.fx.flash, amount * (settings.reduceFlashing ? 0.25 : 1));
    this.u.flashColor.value.set(color);
  }

  render(dt) {
    this.time += dt;
    const u = this.u, fx = this.fx, g = this.grade;
    u.time.value = this.time;
    u.saturation.value = damp(u.saturation.value, g.saturation * (1 - fx.fear * 0.35), 2, dt);
    u.contrast.value = damp(u.contrast.value, g.contrast + fx.fear * 0.1, 2, dt);
    u.shadowTint.value.lerp(g.shadowTint, 1 - Math.exp(-2 * dt));
    u.highlightTint.value.lerp(g.highlightTint, 1 - Math.exp(-2 * dt));
    this.renderer.toneMappingExposure = damp(this.renderer.toneMappingExposure, g.exposure, 3, dt);

    u.aberration.value = 0.35 + fx.fear * 1.6 + fx.extraAberration;
    u.vignette.value = 0.3 + fx.fear * 0.7;
    u.pulse.value = fx.pulse;
    u.grain.value = 0.055 + fx.fear * 0.05;
    u.gamma.value = settings.brightness;
    u.glitch.value = fx.glitch;
    u.flash.value = fx.flash;
    u.fade.value = fx.fade;
    u.echo.value = fx.echo;
    u.letterbox.value = fx.letterbox;

    // Abklingen
    fx.glitch = Math.max(0, fx.glitch - dt * 1.8);
    fx.flash = Math.max(0, fx.flash - dt * 2.5);

    this.composer.render(dt);
  }
}
