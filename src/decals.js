import * as THREE from 'three';
import { textures } from './textures.js';

export class DecalManager {
  constructor(scene) {
    this.scene = scene;
    this.maxDecals = 150;
    this.decalPool = [];
    this.decalIndex = 0;
    this.particles = [];

    this.initPool();
  }

  initPool() {
    const decalGeo = new THREE.PlaneGeometry(0.2, 0.2);
    const decalMat = new THREE.MeshBasicMaterial({
      map: textures.getBulletHoleTexture(),
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4
    });

    for (let i = 0; i < this.maxDecals; i++) {
      const mesh = new THREE.Mesh(decalGeo, decalMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.decalPool.push(mesh);
    }
  }

  // Spawn bullet hole decal at point with surface normal
  spawnDecal(point, normal, surfaceType = 'concrete') {
    const decal = this.decalPool[this.decalIndex];
    this.decalIndex = (this.decalIndex + 1) % this.maxDecals;

    // Position slightly offset along normal to prevent z-fighting
    decal.position.copy(point).addScaledVector(normal, 0.006);

    // Orient decal facing outward along normal
    const target = decal.position.clone().add(normal);
    decal.lookAt(target);

    // Random roll rotation for natural variety
    decal.rotateZ(Math.random() * Math.PI * 2);

    // Subtle scale variation (0.16m to 0.24m)
    const scale = 0.8 + Math.random() * 0.4;
    decal.scale.set(scale, scale, 1);

    decal.visible = true;

    // Spawn surface particles
    this.spawnSurfaceParticles(point, normal, surfaceType);
  }

  // Surface-dependent particles (concrete dust, metal sparks, dirt puffs)
  spawnSurfaceParticles(point, normal, surfaceType) {
    let color = 0xd5d0c8; // Concrete dust (greyish white)
    let particleCount = 6;
    let speed = 2.5;

    if (surfaceType === 'metal' || surfaceType === 'camera') {
      color = 0xffcc44; // Bright metal sparks
      particleCount = 10;
      speed = 4.5;
    } else if (surfaceType === 'dirt') {
      color = 0x8a7250; // Brown dirt puff
      particleCount = 5;
      speed = 1.8;
    }

    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;

      // Cone of velocity bouncing away from normal
      const spread = new THREE.Vector3(
        normal.x + (Math.random() - 0.5) * 1.2,
        normal.y + (Math.random() - 0.5) * 1.2,
        normal.z + (Math.random() - 0.5) * 1.2
      ).normalize().multiplyScalar(speed * (0.5 + Math.random() * 0.5));

      velocities.push(spread);
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: color,
      size: surfaceType === 'metal' ? 0.08 : 0.12,
      transparent: true,
      opacity: 0.95
    });
    const pSystem = new THREE.Points(pGeo, pMat);
    this.scene.add(pSystem);

    this.particles.push({
      mesh: pSystem,
      positions: positions,
      velocities: velocities,
      gravity: surfaceType === 'metal' ? 12.0 : 4.0,
      life: surfaceType === 'metal' ? 0.28 : 0.4,
      maxLife: surfaceType === 'metal' ? 0.28 : 0.4
    });
  }

  update(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      const count = p.velocities.length;

      for (let j = 0; j < count; j++) {
        p.positions[j * 3] += p.velocities[j].x * delta;
        p.positions[j * 3 + 1] += p.velocities[j].y * delta;
        p.positions[j * 3 + 2] += p.velocities[j].z * delta;
        p.velocities[j].y -= p.gravity * delta;
      }

      p.mesh.geometry.attributes.position.needsUpdate = true;
      p.mesh.material.opacity = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }
}
