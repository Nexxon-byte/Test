// Staub im Lichtkegel, sichtbare Lichtkegel, Funken.

import * as THREE from 'three';
import { glowTexture } from './textures.js';

// Schwebender Staub rund um die Kamera (wird im Taschenlampenlicht sichtbar)
export class Dust {
  constructor(scene, count = 300, radius = 7) {
    this.radius = radius;
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * radius * 2;
      pos[i * 3 + 1] = Math.random() * 3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * radius * 2;
      seed[i] = Math.random() * 100;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    this.uniforms = {
      time: { value: 0 },
      center: { value: new THREE.Vector3() },
      lightPos: { value: new THREE.Vector3() },
      lightDir: { value: new THREE.Vector3(0, 0, -1) },
      lightOn: { value: 1 },
      radius: { value: radius },
      tint: { value: new THREE.Color(1, 0.95, 0.85) },
      map: { value: glowTexture() },
    };
    const m = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute float seed;
        uniform float time, radius, lightOn;
        uniform vec3 center, lightPos, lightDir;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.x += sin(time * 0.13 + seed) * 0.4;
          p.y += sin(time * 0.07 + seed * 1.7) * 0.3 - mod(time * 0.02 + seed, 3.0) * 0.1;
          p.z += cos(time * 0.11 + seed * 0.7) * 0.4;
          // um die Kamera wickeln
          vec3 wp = center + mod(p - center + radius, 2.0 * radius) - radius;
          wp.y = mod(p.y, 3.2);
          vec3 toP = wp - lightPos;
          float d = length(toP);
          float cone = smoothstep(0.82, 0.97, dot(normalize(toP), lightDir));
          vAlpha = cone * lightOn * smoothstep(9.0, 0.5, d) * 0.55;
          vec4 mv = modelViewMatrix * vec4(wp, 1.0);
          gl_PointSize = clamp(14.0 / -mv.z, 1.0, 3.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D map;
        uniform vec3 tint;
        varying float vAlpha;
        void main() {
          float a = texture2D(map, gl_PointCoord).r * vAlpha;
          gl_FragColor = vec4(tint * a, a);
        }
      `,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
  }

  update(dt, camPos, lightPos, lightDir, lightOn) {
    this.uniforms.time.value += dt;
    this.uniforms.center.value.copy(camPos);
    this.uniforms.lightPos.value.copy(lightPos);
    this.uniforms.lightDir.value.copy(lightDir);
    this.uniforms.lightOn.value = lightOn;
  }
}

// Sichtbarer Lichtkegel (additiv, weich)
export function makeBeam(length = 7, radius = 1.9, strength = 0.12, color = 0xfff0d0) {
  const geo = new THREE.CylinderGeometry(0.03, radius, length, 24, 1, true);
  geo.translate(0, -length / 2, 0);
  geo.rotateX(-Math.PI / 2);   // Spitze am Ursprung, zeigt nach -Z
  const m = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, strength: { value: strength }, len: { value: length } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      varying float vT; varying vec3 vN; varying vec3 vV;
      uniform float len;
      void main() {
        vT = clamp(-position.z / len, 0.0, 1.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 color; uniform float strength;
      varying float vT; varying vec3 vN; varying vec3 vV;
      void main() {
        float f = pow(abs(dot(vN, vV)), 1.5);
        float a = f * (1.0 - vT) * (1.0 - vT) * strength * smoothstep(0.0, 0.08, vT);
        gl_FragColor = vec4(color * a, a);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, m);
  mesh.renderOrder = 6;
  mesh.frustumCulled = false;
  return mesh;
}

// Funkenregen (z. B. Notbremse, platzende Lampe)
export class Sparks {
  constructor(scene, max = 120) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo = g;
    const m = new THREE.PointsMaterial({ color: 0xffb060, size: 0.04, map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.i = 0;
  }
  burst(x, y, z, n = 30, spread = 2, up = 1.5) {
    for (let k = 0; k < n; k++) {
      const i = this.i = (this.i + 1) % this.max;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      this.vel[i * 3] = (Math.random() - 0.5) * spread;
      this.vel[i * 3 + 1] = Math.random() * up;
      this.vel[i * 3 + 2] = (Math.random() - 0.5) * spread;
      this.life[i] = 0.4 + Math.random() * 0.8;
    }
  }
  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -999; continue; }
      this.life[i] -= dt;
      this.vel[i * 3 + 1] -= 9.8 * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.pos[i * 3 + 1] < 0.02) { this.pos[i * 3 + 1] = 0.02; this.vel[i * 3 + 1] *= -0.3; this.vel[i * 3] *= 0.5; this.vel[i * 3 + 2] *= 0.5; }
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}
