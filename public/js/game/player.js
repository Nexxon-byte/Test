// Spieler: Bewegung, Kollision, Kurbellampe, Ausdauer, Lärm, Angst, Verstecken, Tod.

import * as THREE from 'three';
import { cloneModel, hasModel } from '../gfx/models.js';
import { input } from '../core/input.js';
import { settings, QUALITY } from '../core/settings.js';
import { clamp, damp, lerp } from '../core/rng.js';
import { flashlightCookie } from '../gfx/textures.js';
import { Builder } from '../gfx/geo.js';
import { mat, glowMat } from '../gfx/materials.js';
import { makeBeam } from '../gfx/particles.js';

const EYE = 1.62, EYE_CROUCH = 1.02, RADIUS = 0.28;

export class Player {
  constructor(renderer, collision) {
    this.r = renderer;
    this.cam = renderer.camera;
    this.collision = collision;
    this.pos = new THREE.Vector3(0, 0, 0);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.eye = EYE;
    this.crouching = false;
    this.sprinting = false;
    this.moving = false;
    this.speedNow = 0;
    this.stamina = 1;
    this.staminaDelay = 0;
    this.battery = 1;
    this.lampOn = false;
    this.cranking = false;
    this.fear = 0;
    this.noise = 0;          // Lärmradius in Metern (dieses Frame)
    this.surface = 'stone';
    this.bobPhase = 0;
    this.bobAmp = 0;
    this.shake = 0;
    this.frozen = false;     // keine Bewegung (Filmsequenz, Menü)
    this.lookLocked = false;
    this.lookTarget = null;  // Vector3 – Blick wird dorthin gezogen
    this.hidden = null;      // Versteck
    this.dead = false;
    this.inCabin = false;
    this.onFootstep = null;
    this.onCrankTick = null;
    this.stats = {
      walk: 2.45, sprint: 4.3, crouch: 1.25, staminaMax: 5, lampRange: 22, lampDrain: 1 / 150,
      crankRate: 0.16, crankNoise: 8, stepNoise: 1, lampAngle: 0.5,
    };
    this.child = false;      // Erinnerung: Ilse (klein)
    this._buildLamp();
  }

  // ---------------------------------------------------------------- Lampe

  _buildLamp() {
    const q = QUALITY[settings.quality] || QUALITY.standard;
    const spot = new THREE.SpotLight(0xfff0d6, 0, this.stats.lampRange, this.stats.lampAngle, 0.5, 1.2);
    spot.castShadow = true;
    spot.shadow.mapSize.set(q.shadow, q.shadow);
    spot.shadow.camera.near = 0.1;
    spot.shadow.camera.far = 26;
    spot.shadow.bias = -0.0004;
    spot.shadow.normalBias = 0.03;
    spot.map = flashlightCookie();
    this.spot = spot;
    this.spotTarget = new THREE.Object3D();
    this.cam.add(spot);
    this.cam.add(this.spotTarget);
    spot.target = this.spotTarget;
    spot.position.set(0.15, -0.12, -0.36);
    this.spotTarget.position.set(0.02, -0.08, -6);

    // weiches Streulicht, damit nahe Flächen nicht pechschwarz sind
    this.bounce = new THREE.PointLight(0xffe8c8, 0, 4.5, 2);
    this.bounce.position.set(0, 0.15, -1.6);
    this.cam.add(this.bounce);

    // Modell: Kurbellampe in Handschuh
    const lamp = new THREE.Group();
    // Echtes Modell (Poly Haven „vintage_flashlight“, Linse am +Z-Ende → 180° gedreht); sonst Ersatz aus Grundformen
    const real = hasModel('vintage_flashlight') ? cloneModel('vintage_flashlight') : null;
    if (real) {
      real.rotation.y = Math.PI;
      real.scale.setScalar(0.62);
      real.traverse(o => { if (o.isMesh && !/glass/i.test(o.material.name)) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.22); o.material.roughness = 0.55; } });
      real.position.set(0, -0.106 * 0.62, 0);
      lamp.add(real);
    }
    const b = new Builder();
    if (!real) {
    b.cyl(mat('brassDark'), 0, 0, 0, 0.028, 0.028, 0.16, 12, { rx: Math.PI / 2 });
    b.cyl(mat('brass'), 0, 0, -0.1, 0.042, 0.03, 0.05, 12, { rx: Math.PI / 2 });
    b.cyl(mat('rubber'), 0, 0, 0.055, 0.031, 0.031, 0.04, 12, { rx: Math.PI / 2 });
    b.box(mat('fabricBlack'), 0.0, -0.04, 0.03, 0.07, 0.06, 0.12);   // Handschuh
    b.box(mat('fabricBlack'), 0.0, -0.06, 0.12, 0.06, 0.05, 0.12);
    lamp.add(b.build({ castShadow: false }));
    }
    const lens = new THREE.Mesh(new THREE.CircleGeometry(real ? 0.022 : 0.036, 16), glowMat(0xfff4dc, 1.2, 'lampLens'));
    lens.position.z = real ? -0.097 : -0.126;
    lens.rotation.set(0, Math.PI, 0);
    lamp.add(lens);
    this.lensMat = lens.material;
    // Kurbel
    const crank = new THREE.Group();
    const cb = new Builder();
    cb.box(mat('brass'), 0.035, 0, 0, 0.012, 0.012, 0.05);
    cb.box(mat('brass'), 0.035, 0, 0.025, 0.012, 0.05, 0.012);
    cb.cyl(mat('wood'), 0.05, 0.03, 0.025, 0.01, 0.01, 0.03, 6, { rz: Math.PI / 2 });
    crank.add(cb.build({ castShadow: false }));
    crank.position.set(real ? 0.014 : 0, real ? -0.03 : 0, real ? 0.03 : 0.02);
    if (real) crank.scale.setScalar(0.75);
    lamp.add(crank);
    this.crank = crank;
    lamp.scale.setScalar(real ? 1 : 0.62);
    lamp.position.set(0.15, -0.13, -0.24);
    lamp.rotation.y = 0.08;
    lamp.traverse(o => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 10; } });
    this.cam.add(lamp);
    this.lampModel = lamp;
    this.lampBase = lamp.position.clone();

    this.beam = makeBeam(8, 2.2, 0.07);
    this.beam.position.copy(spot.position);
    this.cam.add(this.beam);
  }

  setQualityShadow(size) {
    this.spot.shadow.mapSize.set(size, size);
    if (this.spot.shadow.map) { this.spot.shadow.map.dispose(); this.spot.shadow.map = null; }
  }

  applyStats() {
    this.spot.distance = this.stats.lampRange;
    this.spot.angle = this.stats.lampAngle;
  }

  toggleLamp(force) {
    const on = force !== undefined ? force : !this.lampOn;
    if (on && this.battery <= 0.01) return false;
    this.lampOn = on;
    return true;
  }

  // ---------------------------------------------------------------- Steuerung

  teleport(x, z, yaw = this.yaw, pitch = 0) {
    this.pos.set(x, 0, z);
    this.yaw = yaw;
    this.pitch = pitch;
    this.vel.set(0, 0, 0);
  }

  forward(out = new THREE.Vector3()) {
    return out.set(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
  }

  get eyePos() { return new THREE.Vector3(this.pos.x, this.pos.y + this.eye, this.pos.z); }

  update(dt, world) {
    const st = this.stats;
    // Blick
    const [dx, dy] = input.consumeLook();
    if (!this.lookLocked && !this.dead) {
      this.yaw -= dx;
      this.pitch = clamp(this.pitch - dy, -1.45, 1.45);
      if (this.hidden) {
        const base = this.hidden.yaw;
        let d = this.yaw - base;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        this.yaw = base + clamp(d, -0.5, 0.5);
        this.pitch = clamp(this.pitch, -0.35, 0.3);
      }
    }
    if (this.lookTarget) {
      const e = this.eyePos;
      const t = this.lookTarget;
      const ty = Math.atan2(-(t.x - e.x), -(t.z - e.z));
      const tp = Math.atan2(t.y - e.y, Math.hypot(t.x - e.x, t.z - e.z));
      let d = ty - this.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const k = 1 - Math.exp(-(this.lookSpeed ?? 4) * dt);
      this.yaw += d * k;
      this.pitch += (tp - this.pitch) * k;
    }

    // Bewegung
    let mx = 0, mz = 0;
    const canMove = !this.frozen && !this.hidden && !this.dead;
    if (canMove) {
      if (input.down('KeyW')) mz -= 1;
      if (input.down('KeyS')) mz += 1;
      if (input.down('KeyA')) mx -= 1;
      if (input.down('KeyD')) mx += 1;
    }
    const len = Math.hypot(mx, mz);
    if (len > 0) { mx /= len; mz /= len; }

    // Ducken
    if (canMove) {
      if (settings.crouchToggle) { if (input.hit('KeyC') || input.hit('ControlLeft')) this.crouching = !this.crouching; }
      else this.crouching = input.down('KeyC');
    }
    if (this.child) this.crouching = false;

    // Rennen & Ausdauer
    const wantSprint = canMove && input.down('ShiftLeft') && mz < 0 && !this.crouching && this.stamina > 0.02 && !this.cranking;
    this.sprinting = wantSprint && len > 0;
    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - dt / st.staminaMax);
      this.staminaDelay = 1.1;
      if (this.stamina <= 0) this.exhausted = 2.0;
    } else {
      this.staminaDelay -= dt;
      if (this.staminaDelay <= 0) this.stamina = Math.min(1, this.stamina + dt * 0.22);
    }
    if (this.exhausted > 0) { this.exhausted -= dt; this.sprinting = false; }

    let speed = this.crouching ? st.crouch : this.sprinting ? st.sprint : st.walk;
    if (this.cranking) speed *= 0.45;
    if (this.child) speed *= 0.8;
    if (this.slow) speed *= this.slow;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const wx = mx * cos + mz * sin;
    const wz = -mx * sin + mz * cos;
    const accel = len > 0 ? 12 : 10;
    this.vel.x = damp(this.vel.x, wx * speed, accel, dt);
    this.vel.z = damp(this.vel.z, wz * speed, accel, dt);
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    if (!this.noclip) this.collision.resolveCircle(this.pos, RADIUS, 0.15, this.crouching ? 1.1 : 1.7);
    this.speedNow = Math.hypot(this.vel.x, this.vel.z);
    this.moving = this.speedNow > 0.3;

    // Augenhöhe
    const targetEye = this.child ? 1.08 : this.hidden ? (this.hidden.eye ?? 1.55) : this.dead ? 0.35 : (this.crouching ? EYE_CROUCH : EYE);
    this.eye = damp(this.eye, targetEye, 9, dt);

    // Kurbeln
    this.cranking = canMove && !this.noCrank && input.down('KeyR') && this.battery < 1;
    if (this.cranking) {
      this.battery = Math.min(1, this.battery + st.crankRate * dt);
      this.crank.rotation.z += dt * 14;
      this._crankT = (this._crankT ?? 0) - dt;
      if (this._crankT <= 0) { this._crankT = 0.14; this.onCrankTick?.(); }
    }

    // Akku
    if (this.lampOn) {
      this.battery = Math.max(0, this.battery - st.lampDrain * dt);
      if (this.battery <= 0) this.lampOn = false;
    }

    // Lärm
    let noise = 0;
    if (this.moving) noise = this.crouching ? 1 : this.sprinting ? 12 : 4;
    noise *= st.stepNoise * (SURF_NOISE[this.surface] ?? 1);
    if (this.cranking) noise = Math.max(noise, st.crankNoise);
    if (this.hidden) noise = 0;
    this.noise = noise;

    // Kopfbewegung & Schritte
    if (this.moving && !this.hidden) {
      const freq = this.sprinting ? 2.3 : this.crouching ? 1.25 : 1.75;
      const prev = this.bobPhase;
      this.bobPhase += dt * freq * Math.PI * 2 * Math.min(1.2, this.speedNow / 2.4 + 0.3);
      if (Math.floor(prev / Math.PI) !== Math.floor(this.bobPhase / Math.PI)) this.onFootstep?.(this.surface, this.sprinting ? 1 : this.crouching ? 0.35 : 0.7);
      this.bobAmp = damp(this.bobAmp, this.sprinting ? 1 : 0.6, 6, dt);
    } else this.bobAmp = damp(this.bobAmp, 0, 6, dt);

    this._applyCamera(dt);
  }

  _applyCamera(dt) {
    const bobOn = settings.headBob ? 1 : 0.25;
    const bx = Math.cos(this.bobPhase * 0.5) * 0.035 * this.bobAmp * bobOn;
    const by = Math.abs(Math.sin(this.bobPhase)) * 0.045 * this.bobAmp * bobOn;
    const breathe = Math.sin(performance.now() * 0.0011) * 0.006 * (1 + this.fear * 2);
    const sh = this.shake;
    const t = performance.now() * 0.001;
    const shx = sh ? (Math.sin(t * 57) + Math.sin(t * 31)) * 0.01 * sh : 0;
    const shy = sh ? (Math.sin(t * 43) + Math.sin(t * 71)) * 0.01 * sh : 0;
    const p = this.hidden ? this.hidden.pos : this.pos;
    this.cam.position.set(p.x + bx * Math.cos(this.yaw) + shx, p.y + this.eye + by + breathe + shy, p.z - bx * Math.sin(this.yaw));
    this.cam.rotation.set(this.pitch + shy * 0.5, this.yaw, (this.lean ?? 0) + bx * 0.15 * bobOn + (this.dead ? 0.6 : 0));
    this.shake = Math.max(0, this.shake - dt * 1.5);

    // Lampe: Sway, Zittern bei Angst, Flackern
    const lm = this.lampModel;
    const sway = this.bobAmp * bobOn;
    const trem = this.fear > 0.6 ? (this.fear - 0.6) * 0.02 : 0;
    lm.position.set(
      this.lampBase.x + Math.cos(this.bobPhase * 0.5) * 0.012 * sway + (Math.random() - 0.5) * trem,
      this.lampBase.y + Math.abs(Math.sin(this.bobPhase)) * 0.01 * sway + (Math.random() - 0.5) * trem - (this.cranking ? 0.04 : 0),
      this.lampBase.z);
    lm.rotation.set((this.cranking ? 0.5 : 0) + (Math.random() - 0.5) * trem * 3, 0, this.cranking ? -0.3 : 0);
    lm.visible = !this.hidden && !this.dead && !this.hideLampModel;

    let flick = 1;
    if (this.battery < 0.2) flick *= Math.random() < (0.2 - this.battery) * 2.5 ? 0.15 : 1;
    if (this.monsterFlicker > 0) flick *= Math.random() < this.monsterFlicker * 0.4 ? 0.05 : 1;
    const level = this.lampOn ? (0.35 + 0.65 * Math.min(1, this.battery * 3)) * flick : 0;
    this.spot.intensity = 95 * level;
    // Schattenkarte nur neu zeichnen, wenn die Lampe wirklich leuchtet (spart einen ganzen Szenendurchlauf)
    this.spot.shadow.autoUpdate = level > 0.01;
    if (!this.spot.shadow.map) this.spot.shadow.needsUpdate = true;   // einmal anlegen, sonst passt der Shader-Sampler nicht
    this.bounce.intensity = 0.9 * level;
    this.lensMat.emissiveIntensity = 1.1 * level + 0.02;
    this.beam.material.uniforms.strength.value = 0.0;
    this.beam.visible = false;
    this.lampLevel = level;
  }
}

const SURF_NOISE = { carpet: 0.6, water: 1.8, metal: 1.3, stone: 1, wood: 1.1, flesh: 0.8, salt: 1.1, tile: 1.15, grate: 1.4 };
