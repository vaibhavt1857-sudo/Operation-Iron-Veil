import * as THREE from 'three';
import { audio } from './audio.js';

export class SecurityCamera {
  constructor(id, scene, world, config) {
    this.id = id;
    this.scene = scene;
    this.world = world;
    this.position = config.position.clone();
    this.baseAngle = config.baseAngle; // Central facing yaw
    this.sweepAngle = config.sweepAngle || 1.3;
    this.sweepSpeed = config.sweepSpeed || 0.55;
    this.pitch = config.pitch || -0.42;

    // Destructible Health
    this.health = 30;
    this.isDestroyed = false;

    // Detection Parameters
    this.detectionTime = 0;
    this.maxDetectionTime = 1.5;
    this.isAlarmTriggered = false;
    this.scanRange = 24.0;
    this.scanFOV = Math.PI * 0.34;
    this.beepTimer = 0;

    // Groups & Meshes
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.scene.add(this.group);

    this.swivelHead = null;
    this.scanConeMesh = null;
    this.cameraLight = null;
    this.statusLed = null;
    this.cameraMesh = null;
    this.smokeParticles = [];

    this.buildCamera();
  }

  buildCamera() {
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x22262a });
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x33ff55 });

    // Wall Mount Bracket
    const mountGeo = new THREE.BoxGeometry(0.35, 0.35, 0.45);
    const mount = new THREE.Mesh(mountGeo, metalMat);
    this.group.add(mount);

    // Swivel Joint
    this.swivelHead = new THREE.Group();
    this.swivelHead.position.set(0, 0, 0.32);

    // Main Camera Body
    const bodyGeo = new THREE.BoxGeometry(0.4, 0.3, 0.65);
    this.cameraMesh = new THREE.Mesh(bodyGeo, metalMat);
    this.swivelHead.add(this.cameraMesh);

    // Lens Barrel
    const lensGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.22, 10);
    const lens = new THREE.Mesh(lensGeo, metalMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0, 0.38);
    this.swivelHead.add(lens);

    // Status Indicator LED
    this.statusLed = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), lensMat);
    this.statusLed.position.set(0.13, 0.12, 0.34);
    this.swivelHead.add(this.statusLed);

    // Target node for spot light
    const lightTarget = new THREE.Object3D();
    lightTarget.position.set(0, 0, 12);
    this.swivelHead.add(lightTarget);

    // Dynamic Camera Spot Light (Realistic surveillance beam on ground, zero floating cone clutter)
    this.cameraLight = new THREE.SpotLight(0x33ff55, 1.2, this.scanRange, this.scanFOV / 2, 0.5, 1.5);
    this.cameraLight.position.set(0, 0, 0.45);
    this.cameraLight.target = lightTarget;
    this.swivelHead.add(this.cameraLight);

    this.group.add(this.swivelHead);
  }

  // Damage & Destruction
  takeDamage(amount, hitPoint) {
    if (this.isDestroyed) return;

    this.health -= amount;
    if (this.health <= 0) {
      this.destroy(hitPoint);
    }
  }

  destroy(hitPoint) {
    this.isDestroyed = true;
    this.health = 0;

    // Play electric explosion sound
    audio.playDestructionExplosion();

    // Disable scan cone, light, and status LED
    if (this.scanConeMesh) this.scanConeMesh.visible = false;
    if (this.cameraLight) this.cameraLight.intensity = 0;
    if (this.statusLed) this.statusLed.material.color.setHex(0x111111);

    // Replace material with scorched charred black metal
    if (this.cameraMesh) {
      this.cameraMesh.material = new THREE.MeshLambertMaterial({ color: 0x111111 });
    }

    // Hang broken camera down limply
    this.swivelHead.rotation.set(Math.PI / 3, 0, (Math.random() - 0.5) * 0.8);

    // Add dangling spark wire
    const wireGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.45, 4);
    const wire = new THREE.Mesh(wireGeo, new THREE.MeshBasicMaterial({ color: 0x882211 }));
    wire.position.set(0, -0.25, 0.2);
    wire.rotation.z = 0.2;
    this.swivelHead.add(wire);

    // Trigger black smoke & spark emitter
    this.spawnSmoke(hitPoint || this.position);
  }

  spawnSmoke(pos) {
    const pGeo = new THREE.BufferGeometry();
    const count = 16;
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.2;
      positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.2;
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.6,
        0.8 + Math.random() * 1.2,
        (Math.random() - 0.5) * 0.6
      ));
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x222222, // Dark smoke
      size: 0.25,
      transparent: true,
      opacity: 0.85
    });
    const pSystem = new THREE.Points(pGeo, pMat);
    this.scene.add(pSystem);

    this.smokeParticles.push({
      mesh: pSystem,
      positions: positions,
      velocities: velocities,
      life: 2.2,
      maxLife: 2.2
    });
  }

  update(delta, time, player, onTriggerAlarm) {
    // Update lingering smoke if destroyed
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const sp = this.smokeParticles[i];
      sp.life -= delta;
      const count = sp.velocities.length;
      for (let j = 0; j < count; j++) {
        sp.positions[j * 3] += sp.velocities[j].x * delta;
        sp.positions[j * 3 + 1] += sp.velocities[j].y * delta;
        sp.positions[j * 3 + 2] += sp.velocities[j].z * delta;
      }
      sp.mesh.geometry.attributes.position.needsUpdate = true;
      sp.mesh.material.opacity = (sp.life / sp.maxLife) * 0.85;

      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        sp.mesh.geometry.dispose();
        sp.mesh.material.dispose();
        this.smokeParticles.splice(i, 1);
      }
    }

    if (this.isDestroyed) return;

    // 1. Mechanical Panning Sweep
    this.currentSweep = Math.sin(time * this.sweepSpeed) * (this.sweepAngle / 2);
    const currentYaw = this.baseAngle + this.currentSweep;

    this.swivelHead.rotation.set(0, 0, 0);
    this.swivelHead.rotation.y = currentYaw;
    this.swivelHead.rotation.x = this.pitch;

    // 2. Line of sight scan test against player
    const canSeePlayer = this.checkPlayerInScan(player);

    if (canSeePlayer) {
      this.detectionTime += delta;
      const progress = Math.min(1.0, this.detectionTime / this.maxDetectionTime);

      // Warning beep
      this.beepTimer -= delta;
      if (this.beepTimer <= 0) {
        audio.playHackBeep(progress);
        this.beepTimer = 0.35 - progress * 0.22;
      }

      // Visual transition
      if (progress < 0.6) {
        this.setColor(0xffcc00, 0.26); // Yellow
      } else {
        this.setColor(0xff2222, 0.38); // Red
      }

      // Trigger alarm
      if (this.detectionTime >= this.maxDetectionTime && !this.isAlarmTriggered) {
        this.isAlarmTriggered = true;
        this.setColor(0xff0000, 0.5);
        if (onTriggerAlarm) {
          onTriggerAlarm(this.position, player.position);
        }
      }
    } else {
      if (this.detectionTime > 0) {
        this.detectionTime = Math.max(0, this.detectionTime - delta * 0.8);
        if (this.detectionTime === 0 && !this.isAlarmTriggered) {
          this.setColor(0x33ff55, 0.15); // Safe green
        }
      }
    }
  }

  setColor(hexColor, opacity) {
    if (this.scanConeMesh) {
      this.scanConeMesh.material.color.setHex(hexColor);
      this.scanConeMesh.material.opacity = opacity;
    }
    if (this.cameraLight) {
      this.cameraLight.color.setHex(hexColor);
    }
    if (this.statusLed) {
      this.statusLed.material.color.setHex(hexColor);
    }
  }

  checkPlayerInScan(player) {
    const pPos = player.position;
    const toPlayer = new THREE.Vector3().subVectors(pPos, this.position);
    const dist = toPlayer.length();

    if (dist > this.scanRange) return false;

    const camForward = new THREE.Vector3(0, 0, 1);
    camForward.applyEuler(this.swivelHead.rotation);
    toPlayer.normalize();

    const dot = camForward.dot(toPlayer);
    const angle = Math.acos(THREE.MathUtils.clamp(dot, -1, 1));

    if (angle > this.scanFOV / 2) return false;

    // Raycast obstacle check
    const cameraWorldPos = this.position.clone().add(new THREE.Vector3(0, 0.2, 0));
    const playerTargetPos = pPos.clone().add(new THREE.Vector3(0, player.currentHeight * 0.8, 0));

    return this.world.hasLineOfSight(cameraWorldPos, playerTargetPos);
  }
}

export class CameraManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.cameras = [];
    this.isAlarmActive = false;

    this.initCameras();
  }

  initCameras() {
    // 4 Strategic Wall-Mounted Destructible Cameras
    const cameraConfigs = [
      // Camera 1: Outer Checkpoint (z = 168) scanning entrance gate road
      {
        id: 1,
        position: new THREE.Vector3(6.5, 4.2, 168),
        baseAngle: 0, // Southward towards approach road
        sweepAngle: 1.4,
        sweepSpeed: 0.5,
        pitch: -0.38
      },
      // Camera 2: Comms Outpost (x = -120, z = 0) scanning barracks and radar console approach
      {
        id: 2,
        position: new THREE.Vector3(-112, 4.3, 8),
        baseAngle: -Math.PI / 2, // Facing west across comms yard
        sweepAngle: 1.3,
        sweepSpeed: 0.6,
        pitch: -0.42
      },
      // Camera 3: Main Airbase Hangar (x = 24, z = -162) scanning base courtyard
      {
        id: 3,
        position: new THREE.Vector3(24, 4.6, -162),
        baseAngle: Math.PI / 4,
        sweepAngle: 1.4,
        sweepSpeed: 0.52,
        pitch: -0.4
      },
      // Camera 4: Main Bunker South Entrance (x = 40, z = -188) scanning bunker doorway
      {
        id: 4,
        position: new THREE.Vector3(40, 4.4, -188),
        baseAngle: 0,
        sweepAngle: 1.2,
        sweepSpeed: 0.65,
        pitch: -0.44
      }
    ];

    cameraConfigs.forEach(cfg => {
      this.cameras.push(new SecurityCamera(cfg.id, this.scene, this.world, cfg));
    });
  }

  update(delta, time, player, onTriggerAlarm) {
    this.cameras.forEach(cam => {
      cam.update(delta, time, player, (camPos, playerPos) => {
        this.isAlarmActive = true;
        if (onTriggerAlarm) {
          onTriggerAlarm(camPos, playerPos);
        }
      });
    });
  }

  // Check raycast hits on any camera body (radius ~0.5m)
  checkRaycastHit(origin, dir, maxDist) {
    for (let cam of this.cameras) {
      if (cam.isDestroyed) continue;
      const toCam = cam.position.clone().sub(origin);
      const proj = toCam.dot(dir);
      if (proj > 0.5 && proj < maxDist) {
        const closestPoint = origin.clone().addScaledVector(dir, proj);
        const dist = closestPoint.distanceTo(cam.position);
        if (dist < 0.65) {
          return {
            camera: cam,
            hitPoint: closestPoint,
            dist: proj
          };
        }
      }
    }
    return null;
  }
}
