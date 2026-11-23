import * as THREE from 'three';
import { audio } from './audio.js';

export class PickupManager {
  constructor(scene) {
    this.scene = scene;
    this.pickups = [];
    this.medkitTexture = this.createMedkitTexture();
    this.ammoTexture = this.createAmmoTexture();
  }

  createMedkitTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Clean white medical casing
    ctx.fillStyle = '#eef3f6';
    ctx.fillRect(0, 0, 256, 256);

    // Beveled frame
    ctx.strokeStyle = '#9aa9b4';
    ctx.lineWidth = 12;
    ctx.strokeRect(6, 6, 244, 244);

    // Red Cross Symbol
    ctx.fillStyle = '#d32222';
    // Vertical arm
    ctx.fillRect(104, 48, 48, 160);
    // Horizontal arm
    ctx.fillRect(48, 104, 160, 48);

    // Medical stencil text
    ctx.fillStyle = '#3a4b56';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FIRST AID // IGI', 128, 36);
    ctx.fillText('+35 HP', 128, 238);

    return new THREE.CanvasTexture(canvas);
  }

  createAmmoTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Olive-drab military steel
    ctx.fillStyle = '#2f3d2b';
    ctx.fillRect(0, 0, 256, 256);

    // Heavy stamped border
    ctx.strokeStyle = '#1b2518';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 246, 246);

    // Yellow stencils
    ctx.fillStyle = '#cca82b';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CAL 7.62 / 9mm / 5.56', 128, 65);
    ctx.fillText('COMBAT AMMO PACK', 128, 128);

    ctx.font = '18px monospace';
    ctx.fillStyle = '#9aa880';
    ctx.fillText('MIL-SPEC // LOT-44B', 128, 195);

    return new THREE.CanvasTexture(canvas);
  }

  // Spawn all tactical pickups in Base A, Base B, and Base C
  initPickups(world) {
    const medkitLocations = [
      // Base A: Checkpoint Guard Booth & sandbag line
      { x: 3.5, y: 0.8, z: 180.5, name: 'Outer Checkpoint Booth' },
      { x: -5.0, y: 0.6, z: 172.0, name: 'Checkpoint Sandbags' },

      // Base B: Comms Outpost Barracks & Tower Foot
      { x: -110.0, y: 1.2, z: -6.0, name: 'Comms Barracks' },
      { x: -103.0, y: 0.6, z: 8.0, name: 'Radar Tower Base' },

      // Base C: Main Airbase & Command Bunker
      { x: 46.5, y: 0.6, z: -194.0, name: 'Command Bunker Server Room' },
      { x: 24.0, y: 0.6, z: -170.0, name: 'Airbase Hangar' },
      { x: 14.0, y: 10.4, z: -206.0, name: 'NW Watchtower Platform' }
    ];

    const ammoLocations = [
      // Base A: Checkpoint Barrier
      { x: -4.0, y: 0.6, z: 182.0, name: 'Checkpoint Gate' },

      // Base B: Comms Outpost
      { x: -112.5, y: 1.2, z: -4.5, name: 'Comms Electronics Rack' },

      // Base C: Main Airbase
      { x: 43.5, y: 0.6, z: -192.0, name: 'Bunker Entrance Corridor' },
      { x: 54.0, y: 0.6, z: -168.0, name: 'Container Yard' }
    ];

    medkitLocations.forEach(loc => this.createMedkit(loc.x, loc.y, loc.z, loc.name));
    ammoLocations.forEach(loc => this.createAmmoCrate(loc.x, loc.y, loc.z, loc.name));
  }

  createMedkit(x, y, z, label) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const mat = new THREE.MeshLambertMaterial({ map: this.medkitTexture });
    const latchMat = new THREE.MeshLambertMaterial({ color: 0x3d4349 });

    // Main Case Box
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.38, 0.44), mat);
    box.castShadow = true;
    group.add(box);

    // Steel latches
    const latch1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), latchMat);
    latch1.position.set(-0.16, 0.05, 0.23);
    const latch2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), latchMat);
    latch2.position.set(0.16, 0.05, 0.23);
    group.add(latch1, latch2);

    // Subtle emerald pulsing glow light
    const light = new THREE.PointLight(0x44ff88, 1.2, 4.0);
    light.position.set(0, 0.3, 0);
    group.add(light);

    this.scene.add(group);
    this.pickups.push({
      type: 'medkit',
      group,
      baseY: y,
      basePos: new THREE.Vector3(x, y, z),
      label,
      light,
      isActive: true,
      respawnTimer: 0
    });
  }

  createAmmoCrate(x, y, z, label) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const mat = new THREE.MeshLambertMaterial({ map: this.ammoTexture });
    const latchMat = new THREE.MeshLambertMaterial({ color: 0x1a1e18 });

    // Olive steel crate
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.42), mat);
    box.castShadow = true;
    group.add(box);

    // Handle on top
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.06), latchMat);
    handle.position.set(0, 0.24, 0);
    group.add(handle);

    // Subtle amber glow light
    const light = new THREE.PointLight(0xffb733, 1.2, 4.0);
    light.position.set(0, 0.3, 0);
    group.add(light);

    this.scene.add(group);
    this.pickups.push({
      type: 'ammo',
      group,
      baseY: y,
      basePos: new THREE.Vector3(x, y, z),
      label,
      light,
      isActive: true,
      respawnTimer: 0
    });
  }

  update(delta, time, player, weapons, ui) {
    const pPos = player.position;

    this.pickups.forEach(p => {
      if (!p.isActive) {
        p.respawnTimer -= delta;
        if (p.respawnTimer <= 0) {
          p.isActive = true;
          p.group.visible = true;
          if (p.light) p.light.intensity = 1.2;
        }
        return;
      }

      // Floating bobbing & slow tactical rotation
      p.group.rotation.y += delta * 1.3;
      p.group.position.y = p.baseY + Math.sin(time * 2.8 + p.basePos.x) * 0.06;

      // Distance check to player
      const dist = p.group.position.distanceTo(pPos);
      if (dist < 1.75) {
        if (p.type === 'medkit') {
          if (player.health < 100) {
            const healed = Math.min(35, 100 - player.health);
            player.health += healed;
            audio.playMedkitPickup();

            if (ui && ui.showHealNotification) {
              ui.showHealNotification(`+${healed} HEALTH // FIELD MEDKIT`);
            }

            p.isActive = false;
            p.group.visible = false;
            if (p.light) p.light.intensity = 0;
            p.respawnTimer = 45.0; // Respawns after 45 seconds
          }
        } else if (p.type === 'ammo') {
          // Refill reserve ammo for all 5 firearms
          weapons.weapons[0].reserveAmmo = Math.min(68, weapons.weapons[0].reserveAmmo + 34);  // Glock
          weapons.weapons[1].reserveAmmo = Math.min(120, weapons.weapons[1].reserveAmmo + 60); // MP5
          weapons.weapons[2].reserveAmmo = Math.min(120, weapons.weapons[2].reserveAmmo + 60); // AK47
          weapons.weapons[3].reserveAmmo = Math.min(120, weapons.weapons[3].reserveAmmo + 60); // M16
          weapons.weapons[4].reserveAmmo = Math.min(25, weapons.weapons[4].reserveAmmo + 10);  // SVD

          audio.playAmmoPickup();

          if (ui && ui.showHealNotification) {
            ui.showHealNotification(`+AMMO CRATE // RESUPPLIED ALL WEAPONS`, '#ffaa33');
          }

          p.isActive = false;
          p.group.visible = false;
          if (p.light) p.light.intensity = 0;
          p.respawnTimer = 45.0;
        }
      }
    });
  }

  reset() {
    this.pickups.forEach(p => {
      p.isActive = true;
      p.group.visible = true;
      p.respawnTimer = 0;
      if (p.light) p.light.intensity = 1.2;
    });
  }
}
