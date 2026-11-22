import * as THREE from 'three';
import { textures } from './textures.js';

// Deterministic 2D Noise Implementation for Ridged Multifractal Mountains
class FastNoise {
  constructor(seed = 1337) {
    this.p = new Uint8Array(512);
    const perm = new Uint8Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 255; i > 0; i--) {
      seed = (seed * 16807 + 7) % 2147483647;
      const j = seed % (i + 1);
      const tmp = perm[i];
      perm[i] = perm[j];
      perm[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      this.p[i] = perm[i & 255];
    }
  }

  grad(hash, x, z) {
    const h = hash & 7;
    const u = h < 4 ? x : z;
    const v = h < 4 ? z : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
  }

  noise2D(x, z) {
    const X = Math.floor(x) & 255;
    const Z = Math.floor(z) & 255;
    const fx = x - Math.floor(x);
    const fz = z - Math.floor(z);

    const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
    const w = fz * fz * fz * (fz * (fz * 6 - 15) + 10);

    const a = this.p[X] + Z;
    const b = this.p[X + 1] + Z;

    const g00 = this.grad(this.p[a], fx, fz);
    const g10 = this.grad(this.p[b], fx - 1, fz);
    const g01 = this.grad(this.p[a + 1], fx, fz - 1);
    const g11 = this.grad(this.p[b + 1], fx - 1, fz - 1);

    const x1 = g00 + u * (g10 - g00);
    const x2 = g01 + u * (g11 - g01);
    return x1 + w * (x2 - x1);
  }

  // Multi-octave Ridged Multifractal Generator
  ridgedMultifractal(x, z) {
    let sum = 0;
    let freq = 0.0032;
    let amp = 1.0;
    let weight = 1.0;

    for (let o = 0; o < 4; o++) {
      let n = 1.0 - Math.abs(this.noise2D(x * freq, z * freq));
      n = n * n * weight;
      weight = Math.max(0, Math.min(1, n * 2.0));
      sum += n * amp;
      freq *= 2.15;
      amp *= 0.48;
    }
    return sum;
  }
}

export class TerrainManager {
  constructor(scene) {
    this.scene = scene;
    this.chunkSize = 90;
    this.chunkResolution = 24; // Smooth high-res vertex mesh
    this.viewDistance = 2; // 5x5 active grid around player
    this.chunks = new Map();

    this.noise = new FastNoise(4242);

    // Shared Materials with Vertex Colors for Multi-Biome Terrain
    this.terrainMat = new THREE.MeshLambertMaterial({
      map: textures.getGrassTexture(),
      vertexColors: true
    });

    this.trunkMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });
    this.foliageMat = new THREE.MeshLambertMaterial({ color: 0x1f341c });
    this.poleMat = new THREE.MeshLambertMaterial({ color: 0x4a3c2c });

    // Road Segments connecting Bases
    this.roadSegments = [
      { p1: new THREE.Vector2(0, 240), p2: new THREE.Vector2(0, 90), width: 7 },
      { p1: new THREE.Vector2(0, 90), p2: new THREE.Vector2(-120, 0), width: 6.5 },
      { p1: new THREE.Vector2(0, 90), p2: new THREE.Vector2(40, -180), width: 7.5 },
      { p1: new THREE.Vector2(-120, 0), p2: new THREE.Vector2(40, -180), width: 6 },
      { p1: new THREE.Vector2(40, -180), p2: new THREE.Vector2(40, -260), width: 8 }
    ];

    // Base zones: flat valleys
    this.baseZones = [
      { x: 0, z: 180, radius: 32, height: 0.1 },     // Checkpoint A
      { x: -120, z: 0, radius: 45, height: 1.0 },    // Comms Outpost B
      { x: 40, z: -180, radius: 68, height: 0.1 },   // Main Base C
      { x: 40, z: -260, radius: 26, height: 0.1 }    // Helipad
    ];

    this.lastPlayerChunkX = null;
    this.lastPlayerChunkZ = null;
  }

  // Calculate Elevation: Valley Floor + Towering Outer Mountains (120m to 220m)
  getHeight(x, z) {
    // 1. Distance from Central Valley axis
    // Valley spans roughly X: -130 to +50, Z: 240 to -270
    const valleyCenterX = -40;
    const valleyCenterZ = -15;

    const dx = Math.abs(x - valleyCenterX);
    const dz = Math.abs(z - valleyCenterZ);

    // Mountain envelope factor: rises steeply outside the 85m valley radius
    const valleyDist = Math.max(0, (Math.hypot(dx * 0.9, dz * 0.45) - 85) / 110);
    const mountainFactor = Math.min(1.0, Math.max(0, valleyDist));
    const smoothMountain = mountainFactor * mountainFactor * (3 - 2 * mountainFactor);

    // 2. Multi-octave Ridged Multifractal Mountains
    const rawRidge = this.noise.ridgedMultifractal(x, z);
    const mountainPeakHeight = rawRidge * 220.0; // Towering peaks up to 220m!

    // 3. Valley rolling hills (gentle 0 to 8m variation)
    const valleyFloor = (Math.sin(x * 0.018) * Math.cos(z * 0.018) * 4.5 + Math.sin(x * 0.04) * 2.5);

    let h = THREE.MathUtils.lerp(valleyFloor, mountainPeakHeight, smoothMountain);

    // 4. Carve Dirt Roads
    let minRoadDist = 999;
    for (let seg of this.roadSegments) {
      const d = this.distToSegment(x, z, seg.p1.x, seg.p1.y, seg.p2.x, seg.p2.y);
      if (d < minRoadDist) minRoadDist = d;
    }

    if (minRoadDist < 12) {
      const roadBlend = Math.min(1.0, minRoadDist / 12);
      h = THREE.MathUtils.lerp(0.15, h, roadBlend * roadBlend);
    }

    // 5. Flatten Base Plateaus
    for (let b of this.baseZones) {
      const dist = Math.hypot(x - b.x, z - b.z);
      if (dist < b.radius) {
        return b.height;
      } else if (dist < b.radius + 20) {
        const blend = (dist - b.radius) / 20;
        const smoothBlend = blend * blend * (3 - 2 * blend);
        h = THREE.MathUtils.lerp(b.height, h, smoothBlend);
      }
    }

    return Math.max(0.1, h);
  }

  distToSegment(px, pz, x1, z1, x2, z2) {
    const l2 = (x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1);
    if (l2 === 0) return Math.hypot(px - x1, pz - z1);
    let t = ((px - x1) * (x2 - x1) + (pz - z1) * (z2 - z1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projZ = z1 + t * (z2 - z1);
    return Math.hypot(px - projX, pz - projZ);
  }

  isNearRoad(x, z, threshold = 6) {
    for (let seg of this.roadSegments) {
      if (this.distToSegment(x, z, seg.p1.x, seg.p1.y, seg.p2.x, seg.p2.y) < threshold) {
        return true;
      }
    }
    return false;
  }

  isInsideBase(x, z) {
    for (let b of this.baseZones) {
      if (Math.hypot(x - b.x, z - b.z) < b.radius + 8) return true;
    }
    return false;
  }

  update(playerPos) {
    const currentChunkX = Math.floor((playerPos.x + this.chunkSize / 2) / this.chunkSize);
    const currentChunkZ = Math.floor((playerPos.z + this.chunkSize / 2) / this.chunkSize);

    if (currentChunkX === this.lastPlayerChunkX && currentChunkZ === this.lastPlayerChunkZ) {
      return;
    }

    this.lastPlayerChunkX = currentChunkX;
    this.lastPlayerChunkZ = currentChunkZ;

    const neededKeys = new Set();

    for (let dx = -this.viewDistance; dx <= this.viewDistance; dx++) {
      for (let dz = -this.viewDistance; dz <= this.viewDistance; dz++) {
        const cx = currentChunkX + dx;
        const cz = currentChunkZ + dz;
        const key = `${cx}_${cz}`;
        neededKeys.add(key);

        if (!this.chunks.has(key)) {
          const chunk = this.createChunk(cx, cz);
          this.chunks.set(key, chunk);
          this.scene.add(chunk.group);
        }
      }
    }

    for (let [key, chunk] of this.chunks.entries()) {
      if (!neededKeys.has(key)) {
        this.scene.remove(chunk.group);
        this.disposeChunk(chunk);
        this.chunks.delete(key);
      }
    }
  }

  createChunk(cx, cz) {
    const group = new THREE.Group();
    const originX = cx * this.chunkSize;
    const originZ = cz * this.chunkSize;

    // High-Resolution Smoothly Shaded Plane Geometry
    const geo = new THREE.PlaneGeometry(
      this.chunkSize,
      this.chunkSize,
      this.chunkResolution,
      this.chunkResolution
    );
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position;
    const vertexCount = posAttr.count;

    // Displace vertices with smooth heights
    for (let i = 0; i < vertexCount; i++) {
      const vx = posAttr.getX(i) + originX;
      const vz = posAttr.getZ(i) + originZ;
      const vy = this.getHeight(vx, vz);
      posAttr.setY(i, vy);
    }

    // Compute smooth vertex normals across surfaces (zero flat facets!)
    geo.computeVertexNormals();

    // Multi-Biome Shading via Vertex Colors (Authentic Project IGI Eastern European Steppe):
    // Valley Steppe Grass -> Gravel Compounds/Roads -> Craggy Rock -> Mountain Snow
    const colors = new Float32Array(vertexCount * 3);
    const normalAttr = geo.attributes.normal;

    const grassColor = new THREE.Color(0x383e29);   // Desaturated olive-brown steppe grass
    const gravelColor = new THREE.Color(0x484540);  // Compound gravel and dirt pad
    const roadColor = new THREE.Color(0x544c3c);    // Tire-worn dirt road
    const rockColor = new THREE.Color(0x454038);    // Steep craggy granite
    const snowColor = new THREE.Color(0xdce5ed);    // Mountain snow ridges

    for (let i = 0; i < vertexCount; i++) {
      const vx = posAttr.getX(i) + originX;
      const vz = posAttr.getZ(i) + originZ;
      const vy = posAttr.getY(i);
      const ny = normalAttr.getY(i);

      let col = grassColor.clone();

      // Compound gravel & dirt yards
      if (this.isInsideBase(vx, vz)) {
        col.lerp(gravelColor, 0.85);
      } else if (this.isNearRoad(vx, vz, 6)) {
        col.lerp(roadColor, 0.8);
      }

      // Steep slope factor -> Rocky Crags
      if (ny < 0.78) {
        const slopeBlend = Math.min(1.0, (0.78 - ny) / 0.38);
        col.lerp(rockColor, slopeBlend);
      }

      // High altitude factor -> Snow Peaks (90m to 220m)
      if (vy > 85) {
        const snowBlend = Math.min(1.0, (vy - 85) / 55);
        col.lerp(snowColor, snowBlend);
      }

      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const terrainMesh = new THREE.Mesh(geo, this.terrainMat);
    terrainMesh.position.set(originX, 0, originZ);
    terrainMesh.receiveShadow = true;
    group.add(terrainMesh);

    // Natural Props: Realistic Sparse Scrub Bushes, Deadwood & Mountain Conifers
    const seed = Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453;
    const rng = (offset) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    const propCount = 6 + Math.floor(rng(1) * 5);
    for (let t = 0; t < propCount; t++) {
      const lx = (rng(t * 3 + 2) - 0.5) * (this.chunkSize - 12);
      const lz = (rng(t * 3 + 3) - 0.5) * (this.chunkSize - 12);
      const wx = originX + lx;
      const wz = originZ + lz;

      if (!this.isNearRoad(wx, wz, 8) && !this.isInsideBase(wx, wz)) {
        const wy = this.getHeight(wx, wz);

        if (wy > 35 && wy < 85) {
          // Higher mountain edges: Sparse realistic northern conifer
          if (rng(t * 5) < 0.5) {
            const conifer = this.buildRealisticConifer(wx, wy, wz, 0.85 + rng(t * 2) * 0.4);
            group.add(conifer);
          }
        } else if (wy <= 35) {
          // Foothills & valley floor: Dry scrub bushes and deadwood branches
          if (rng(t * 4) < 0.6) {
            const bush = this.buildDryScrubBush(wx, wy, wz, 0.75 + rng(t * 3) * 0.5);
            group.add(bush);
          } else if (rng(t * 4) < 0.85) {
            const deadwood = this.buildDeadwood(wx, wy, wz, 0.8 + rng(t * 2) * 0.5);
            group.add(deadwood);
          }
        }
      }
    }

    // Telephone Poles along Road
    for (let seg of this.roadSegments) {
      const d1 = this.distToSegment(originX, originZ, seg.p1.x, seg.p1.y, seg.p2.x, seg.p2.y);
      if (d1 < this.chunkSize * 0.75) {
        for (let p = 0; p < 2; p++) {
          const px = THREE.MathUtils.lerp(seg.p1.x, seg.p2.x, (cx * 0.3 + p * 0.4) % 1);
          const pz = THREE.MathUtils.lerp(seg.p1.y, seg.p2.y, (cx * 0.3 + p * 0.4) % 1);

          if (Math.abs(px - originX) < this.chunkSize / 2 && Math.abs(pz - originZ) < this.chunkSize / 2) {
            const poleX = px + 5.5;
            const poleZ = pz + 2.0;
            const poleY = this.getHeight(poleX, poleZ);
            const pole = this.buildTelephonePole(poleX, poleY, poleZ);
            group.add(pole);
          }
        }
        break;
      }
    }

    return { group, terrainMesh, geo };
  }

  // Realistic Dry Steppe Scrub Bush
  buildDryScrubBush(x, y, z, scale = 1.0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.scale.set(scale, scale, scale);

    const bushMat = new THREE.MeshLambertMaterial({ color: 0x3e422c }); // Dry ochre/olive foliage
    const stemMat = new THREE.MeshLambertMaterial({ color: 0x30281e });

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.2, 5), stemMat);
    stem.position.set(0, 0.6, 0);
    group.add(stem);

    // Irregular natural bush clusters
    const b1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), bushMat);
    b1.position.set(0, 1.1, 0);
    const b2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), bushMat);
    b2.position.set(0.4, 0.9, 0.2);
    const b3 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), bushMat);
    b3.position.set(-0.35, 0.85, -0.2);

    group.add(b1, b2, b3);
    return group;
  }

  // Realistic Weathered Deadwood Branch / Fallen Log
  buildDeadwood(x, y, z, scale = 1.0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.scale.set(scale, scale, scale);

    const woodMat = new THREE.MeshLambertMaterial({ color: 0x2e2820 }); // Dark weathered deadwood

    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 2.6, 6), woodMat);
    log.rotation.z = Math.PI / 2 + 0.1;
    log.rotation.y = Math.sin(x + z) * 2;
    log.position.set(0, 0.12, 0);
    group.add(log);

    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.1, 5), woodMat);
    branch.rotation.x = 0.6;
    branch.position.set(0.4, 0.4, 0.2);
    group.add(branch);

    return group;
  }

  // Realistic Northern Mountain Conifer
  buildRealisticConifer(x, y, z, scale = 1.0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.scale.set(scale, scale, scale);

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x2a221a });
    const needleMat = new THREE.MeshLambertMaterial({ color: 0x1b2818 }); // Deep dark northern pine

    // Slender gnarled trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 8.5, 6), trunkMat);
    trunk.position.set(0, 4.25, 0);
    trunk.castShadow = true;
    group.add(trunk);

    // Natural multi-tier pine foliage layers
    const tiers = [
      { y: 3.8, r: 2.4, h: 2.2 },
      { y: 5.2, r: 2.0, h: 2.2 },
      { y: 6.6, r: 1.5, h: 2.0 },
      { y: 7.8, r: 1.1, h: 1.8 },
      { y: 8.8, r: 0.6, h: 1.5 }
    ];

    tiers.forEach(t => {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 6), needleMat);
      cone.position.set(0, t.y, 0);
      cone.castShadow = true;
      group.add(cone);
    });

    return group;
  }

  buildTelephonePole(x, y, z) {
    const poleGroup = new THREE.Group();
    poleGroup.position.set(x, y, z);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 9, 6), this.poleMat);
    post.position.set(0, 4.5, 0);
    post.castShadow = true;
    poleGroup.add(post);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 0.18), this.poleMat);
    arm.position.set(0, 8.2, 0);
    poleGroup.add(arm);

    return poleGroup;
  }

  disposeChunk(chunk) {
    chunk.geo.dispose();
    chunk.group.traverse(obj => {
      if (obj.geometry && obj.geometry !== chunk.geo) {
        obj.geometry.dispose();
      }
    });
  }
}
