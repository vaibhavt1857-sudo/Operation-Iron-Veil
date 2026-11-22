import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { audio } from './audio.js';

// Global Spoken Guard Voice Synthesizer via Web Speech API + Web Audio Radio Squelch
let lastVoiceCalloutTime = 0;
const CALLOUT_COOLDOWN = 3.5; // Cooldown to prevent overlapping chatter

const VOICE_CALLOUTS = {
  alert: [
    "Hey! Stop right there!",
    "Intruder! Get him!",
    "Hold it right there!",
    "You bastard, stop!",
    "Sound the alarm!"
  ],
  suspicious: [
    "Who's there?",
    "Check that area!",
    "What was that noise?"
  ],
  damage: [
    "Taking fire!",
    "I'm hit! Alarm!"
  ]
};

export function triggerGuardVoice(type = 'alert') {
  const now = performance.now() / 1000;
  if (now - lastVoiceCalloutTime < CALLOUT_COOLDOWN) return;
  lastVoiceCalloutTime = now;

  // Authentic military walkie-talkie burst squelch and mic click
  audio.playRadioClick();

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const phrases = VOICE_CALLOUTS[type] || VOICE_CALLOUTS.alert;
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];

    setTimeout(() => {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(phrase);
        utter.rate = 1.05;
        utter.pitch = 0.85; // Deep military voice
        utter.volume = 0.9;
        const voices = window.speechSynthesis.getVoices();
        const enVoice = voices.find(v => v.lang && v.lang.startsWith('en'));
        if (enVoice) utter.voice = enVoice;
        window.speechSynthesis.speak(utter);
      } catch (e) {}
    }, 45);
  }
}

export class Guard {
  constructor(id, scene, world, waypoints, baseGltf, startWaypointIndex = 0) {
    this.id = id;
    this.scene = scene;
    this.world = world;
    this.waypoints = waypoints;
    this.currentWaypointIndex = startWaypointIndex;

    this.position = waypoints[startWaypointIndex].clone();
    this.yaw = 0;
    this.speed = 2.4;
    this.runSpeed = 4.4;

    this.maxHealth = 100;
    this.health = 100;
    this.isAlive = true;

    // AI States: 'PATROL', 'SUSPICIOUS', 'ALERT'
    this.state = 'PATROL';
    this.suspicionLevel = 0;
    this.investigatePos = null;
    this.investigateTimer = 0;
    this.patrolPauseTimer = 0;
    this.shootTimer = 0;
    this.burstCount = 0;

    // Death animation state
    this.isDying = false;
    this.deathTimer = 0;

    // Vision Parameters (Cones drawn strictly on 2D radar/satmap, zero 3D clutter)
    this.visionRange = 32.0;
    this.visionAngle = Math.PI * 0.4;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Skeletal Animation System
    this.mixer = null;
    this.actions = {};
    this.currentAction = null;

    this.initRiggedModel(baseGltf);
    this.createStatusIndicator();
    this.updateTransform();
  }

  initRiggedModel(baseGltf) {
    if (!baseGltf) return;

    // Clone independent skeletal mesh using SkeletonUtils
    const clonedScene = SkeletonUtils.clone(baseGltf.scene);
    clonedScene.scale.set(0.95, 0.95, 0.95);
    clonedScene.rotation.y = Math.PI; // Face forward

    // Apply dark charcoal / black Spetsnaz uniform styling
    clonedScene.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material = child.material.clone();
          child.material.roughness = 0.85;
          // Authentic Spetsnaz charcoal/black fatigues
          child.material.color.setHex(0x1e2124);
        }
      }
    });

    // Spetsnaz Beret or Tactical Balaclava on Head
    const isBeret = (this.id % 2 === 1);
    if (isBeret) {
      // Crimson Spetsnaz Beret
      const beretMat = new THREE.MeshLambertMaterial({ color: 0x9b1c1c });
      const beret = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.08, 12), beretMat);
      beret.position.set(0.02, 1.76, -0.02);
      beret.rotation.z = -0.15;
      beret.rotation.x = 0.1;
      this.group.add(beret);
    } else {
      // Black Tactical Helmet / Balaclava
      const helmetMat = new THREE.MeshLambertMaterial({ color: 0x16181b });
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), helmetMat);
      helmet.position.set(0, 1.74, 0);
      this.group.add(helmet);
    }

    // Armed Guard Rifle held forward in ready pose
    const rifleGroup = new THREE.Group();
    rifleGroup.position.set(0.16, 1.15, -0.28);
    rifleGroup.rotation.y = 0.1;
    const rifleMat = new THREE.MeshLambertMaterial({ color: 0x22262a });
    const rRec = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.065, 0.32), rifleMat);
    const rBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.28, 8), rifleMat);
    rBarrel.rotation.x = Math.PI / 2;
    rBarrel.position.set(0, 0.015, -0.26);
    const rMag = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.14, 0.06), rifleMat);
    rMag.position.set(0, -0.07, -0.06);
    rMag.rotation.x = 0.25;
    rifleGroup.add(rRec, rBarrel, rMag);
    this.group.add(rifleGroup);

    this.group.add(clonedScene);
    this.modelRoot = clonedScene;

    // Animation Mixer
    this.mixer = new THREE.AnimationMixer(clonedScene);
    baseGltf.animations.forEach(clip => {
      this.actions[clip.name] = this.mixer.clipAction(clip);
    });

    // Default to Walk for patrol
    this.playAnimation('Walk');
  }

  playAnimation(name, duration = 0.25) {
    if (!this.mixer || !this.actions[name]) return;
    const nextAction = this.actions[name];
    if (this.currentAction === nextAction) return;

    if (this.currentAction) {
      this.currentAction.fadeOut(duration);
    }
    nextAction.reset().fadeIn(duration).play();
    this.currentAction = nextAction;
  }

  createStatusIndicator() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    this.statusCanvas = canvas;
    this.statusCtx = canvas.getContext('2d');
    this.statusTexture = new THREE.CanvasTexture(canvas);

    this.drawStatusIndicator('PATROL');

    const spriteMat = new THREE.SpriteMaterial({
      map: this.statusTexture,
      transparent: true,
      depthTest: false
    });
    this.statusSprite = new THREE.Sprite(spriteMat);
    this.statusSprite.position.set(0, 2.2, 0);
    this.statusSprite.scale.set(0.85, 0.85, 1);
    this.group.add(this.statusSprite);
  }

  drawStatusIndicator(state) {
    const ctx = this.statusCtx;
    ctx.clearRect(0, 0, 128, 128);

    if (state === 'PATROL') {
      ctx.fillStyle = '#33ee55';
      ctx.beginPath();
      ctx.moveTo(64, 28); ctx.lineTo(96, 64); ctx.lineTo(64, 100); ctx.lineTo(32, 64);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();
    } else if (state === 'SUSPICIOUS') {
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(64, 64, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.fillStyle = '#111111';
      ctx.font = 'bold 58px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 64, 66);
    } else if (state === 'ALERT') {
      ctx.fillStyle = '#ff2222';
      ctx.beginPath();
      ctx.moveTo(64, 108); ctx.lineTo(112, 28); ctx.lineTo(16, 28);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 54px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', 64, 62);
    }

    this.statusTexture.needsUpdate = true;
  }

  takeDamage(amount, isHeadshot, attackerPos) {
    if (!this.isAlive) return;

    this.health -= amount;
    triggerGuardVoice('damage');
    this.enterAlert(attackerPos);

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.isAlive = false;
    this.health = 0;
    this.state = 'DEAD';
    this.isDying = true;
    this.deathTimer = 0;
    audio.playEnemyDeath();

    if (this.statusSprite) this.statusSprite.visible = false;

    // Stop skeletal movement animation
    if (this.currentAction) {
      this.currentAction.stop();
    }
  }

  enterSuspicious(investigatePoint) {
    if (this.state === 'ALERT' || !this.isAlive) return;

    if (this.state !== 'SUSPICIOUS') {
      audio.playAlertSting('suspicious');
      triggerGuardVoice('suspicious');
    }

    this.state = 'SUSPICIOUS';
    this.investigatePos = investigatePoint.clone();
    this.investigateTimer = 7.0;
    this.drawStatusIndicator('SUSPICIOUS');
  }

  enterAlert(targetPos) {
    if (!this.isAlive) return;

    if (this.state !== 'ALERT') {
      audio.playAlertSting('alert');
      triggerGuardVoice('alert');
    }

    this.state = 'ALERT';
    this.investigatePos = targetPos.clone();
    this.investigateTimer = 16.0;
    this.drawStatusIndicator('ALERT');
  }

  update(delta, player, onShootPlayer) {
    // Skeletal animation mixer update
    if (this.mixer) {
      this.mixer.update(delta);
    }

    // Smooth death collapse animation
    if (this.isDying) {
      this.deathTimer += delta;
      if (this.deathTimer < 0.6) {
        const t = this.deathTimer / 0.6;
        this.group.rotation.x = THREE.MathUtils.lerp(0, Math.PI / 2, t);
        this.group.position.y = THREE.MathUtils.lerp(this.position.y, this.position.y - 0.75, t);
      } else {
        this.isDying = false;
      }
      return;
    }

    if (!this.isAlive) return;

    const pPos = player.position;
    const distToPlayer = this.position.distanceTo(pPos);

    const canSeePlayer = this.checkVisionLineOfSight(player);
    const canHearPlayer = distToPlayer <= player.noiseRadius;

    if (canSeePlayer) {
      const distanceFactor = 1 - Math.min(1, distToPlayer / this.visionRange);
      const detectionRate = (2.2 * distanceFactor + 0.6) * player.visibilityFactor;
      this.suspicionLevel += detectionRate * delta;

      if (this.suspicionLevel >= 1.0) {
        this.enterAlert(pPos);
      } else if (this.suspicionLevel >= 0.25 && this.state === 'PATROL') {
        this.enterSuspicious(pPos);
      }
    } else {
      if (this.state !== 'ALERT') {
        this.suspicionLevel = Math.max(0, this.suspicionLevel - 0.4 * delta);
        if (this.suspicionLevel === 0 && this.state === 'SUSPICIOUS' && this.investigateTimer <= 0) {
          this.returnToPatrol();
        }
      }
    }

    if (canHearPlayer && this.state !== 'ALERT') {
      this.enterSuspicious(pPos);
    }

    if (this.state === 'ALERT') {
      this.handleAlertCombat(delta, player, canSeePlayer, onShootPlayer);
    } else if (this.state === 'SUSPICIOUS') {
      this.handleSuspicious(delta);
    } else {
      this.handlePatrol(delta);
    }

    this.updateTransform();
  }

  returnToPatrol() {
    this.state = 'PATROL';
    this.suspicionLevel = 0;
    this.investigatePos = null;
    this.drawStatusIndicator('PATROL');
    this.playAnimation('Walk');
  }

  checkVisionLineOfSight(player) {
    const pPos = player.position;
    const toPlayer = new THREE.Vector3().subVectors(pPos, this.position);
    const dist = toPlayer.length();

    const effectiveRange = this.visionRange * (player.isCrouched ? 0.65 : 1.0);
    if (dist > effectiveRange) return false;

    const facing = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    toPlayer.y = 0;
    toPlayer.normalize();

    const dot = facing.dot(toPlayer);
    const angle = Math.acos(THREE.MathUtils.clamp(dot, -1, 1));
    if (angle > this.visionAngle / 2) return false;

    const eyePos = this.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    const targetEye = pPos.clone().add(new THREE.Vector3(0, player.currentHeight * 0.8, 0));
    return this.world.hasLineOfSight(eyePos, targetEye);
  }

  handleAlertCombat(delta, player, canSeePlayer, onShootPlayer) {
    const pPos = player.position;
    const toPlayer = new THREE.Vector3().subVectors(pPos, this.position);
    const dist = toPlayer.length();

    const targetYaw = Math.atan2(-toPlayer.x, -toPlayer.z);
    this.yaw = this.lerpAngle(this.yaw, targetYaw, 6 * delta);

    this.shootTimer -= delta;
    if (canSeePlayer && dist < 45) {
      this.playAnimation('Idle');
      if (this.shootTimer <= 0) {
        this.fireBurstShot(player, onShootPlayer);
      }
    } else {
      if (dist > 8) {
        this.playAnimation('Run');
        const moveDir = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        this.position.x += moveDir.x * this.runSpeed * delta;
        this.position.z += moveDir.z * this.runSpeed * delta;
        this.world.checkPlayerCollision(this.position, 0.5);
      } else {
        this.playAnimation('Idle');
      }
    }
  }

  fireBurstShot(player, onShootPlayer) {
    this.shootTimer = 0.22;
    this.burstCount++;

    if (this.burstCount >= 3) {
      this.shootTimer = 1.2;
      this.burstCount = 0;
    }

    audio.playEnemyFire();

    const hitChance = (player.isCrouched ? 0.35 : 0.65) * (1 - Math.min(0.5, this.position.distanceTo(player.position) / 45));
    const willHit = Math.random() < hitChance;

    if (onShootPlayer) {
      onShootPlayer(this.position, willHit);
    }
  }

  handleSuspicious(delta) {
    this.investigateTimer -= delta;

    if (this.investigatePos) {
      const toTarget = new THREE.Vector3().subVectors(this.investigatePos, this.position);
      toTarget.y = 0;
      const dist = toTarget.length();

      if (dist > 1.2) {
        this.playAnimation('Walk');
        const targetYaw = Math.atan2(-toTarget.x, -toTarget.z);
        this.yaw = this.lerpAngle(this.yaw, targetYaw, 4 * delta);

        const moveDir = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        this.position.x += moveDir.x * (this.speed * 1.2) * delta;
        this.position.z += moveDir.z * (this.speed * 1.2) * delta;
        this.world.checkPlayerCollision(this.position, 0.5);
      } else {
        this.playAnimation('Idle');
        this.yaw += Math.sin(this.investigateTimer * 2) * 1.0 * delta;
      }
    }

    if (this.investigateTimer <= 0) {
      this.returnToPatrol();
    }
  }

  handlePatrol(delta) {
    if (this.patrolPauseTimer > 0) {
      this.patrolPauseTimer -= delta;
      this.playAnimation('Idle');
      // Subtle guard scan look-around during pause
      this.yaw += Math.sin(this.patrolPauseTimer * 2.5) * 0.35 * delta;
      return;
    }

    const targetWp = this.waypoints[this.currentWaypointIndex];
    const toWp = new THREE.Vector3().subVectors(targetWp, this.position);
    toWp.y = 0;
    const dist = toWp.length();

    if (dist > 1.2) {
      this.playAnimation('Walk');
      const targetYaw = Math.atan2(-toWp.x, -toWp.z);
      this.yaw = this.lerpAngle(this.yaw, targetYaw, 3.2 * delta);

      const moveDir = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      this.position.x += moveDir.x * this.speed * delta;
      this.position.z += moveDir.z * this.speed * delta;
      this.world.checkPlayerCollision(this.position, 0.5);
    } else {
      // Reached waypoint: brief pause looking around like real guard
      this.patrolPauseTimer = 1.8 + Math.random() * 1.2;
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
    }
  }

  updateTransform() {
    // Keep guards strictly clamped to ground elevation (no mountain climbing)
    if (this.world && this.world.terrain) {
      this.position.y = this.world.terrain.getHeight(this.position.x, this.position.z);
    }
    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
  }

  lerpAngle(a, b, t) {
    let diff = (b - a) % (Math.PI * 2);
    if (diff < -Math.PI) diff += Math.PI * 2;
    if (diff > Math.PI) diff -= Math.PI * 2;
    return a + diff * THREE.MathUtils.clamp(t, 0, 1);
  }
}

// Enemy Manager loading Soldier.glb and instantiating 8 guards across the 3 installations
export class EnemyManager {
  constructor(scene, world, onLoadCallback) {
    this.scene = scene;
    this.world = world;
    this.guards = [];
    this.baseGltf = null;

    this.loadModelAndInit(onLoadCallback);
  }

  loadModelAndInit(onLoadCallback) {
    const loader = new GLTFLoader();
    loader.load(
      '/models/Soldier.glb',
      (gltf) => {
        this.baseGltf = gltf;
        this.initGuards();
        if (onLoadCallback) onLoadCallback();
      },
      undefined,
      (err) => {
        console.error('Error loading Soldier.glb:', err);
      }
    );
  }

  initGuards() {
    const guardConfigs = [
      // Base A: Checkpoint Patrols (strictly on compound gravel and tarmac road)
      { id: 1, waypoints: [ new THREE.Vector3(4, 0, 192), new THREE.Vector3(-4, 0, 192), new THREE.Vector3(-4, 0, 168), new THREE.Vector3(4, 0, 168) ] },
      { id: 2, waypoints: [ new THREE.Vector3(12, 0, 175), new THREE.Vector3(12, 0, 195), new THREE.Vector3(5, 0, 195), new THREE.Vector3(5, 0, 175) ] },

      // Base B: Comms Outpost Patrols (strictly on outpost gravel yard)
      { id: 3, waypoints: [ new THREE.Vector3(-105, 1, 6), new THREE.Vector3(-105, 1, -12), new THREE.Vector3(-118, 1, -12), new THREE.Vector3(-118, 1, 6) ] },
      { id: 4, waypoints: [ new THREE.Vector3(-126, 1, 14), new THREE.Vector3(-114, 1, 14), new THREE.Vector3(-114, 1, 4), new THREE.Vector3(-126, 1, 4) ] },

      // Base C: Main Airbase, Command Bunker & Helipad Patrols (strictly on base slabs & roads)
      { id: 5, waypoints: [ new THREE.Vector3(26, 0, -165), new THREE.Vector3(26, 0, -195), new THREE.Vector3(14, 0, -195), new THREE.Vector3(14, 0, -165) ] },
      { id: 6, waypoints: [ new THREE.Vector3(55, 0, -165), new THREE.Vector3(55, 0, -195), new THREE.Vector3(44, 0, -195), new THREE.Vector3(44, 0, -165) ] },
      { id: 7, waypoints: [ new THREE.Vector3(32, 0, -174), new THREE.Vector3(48, 0, -174), new THREE.Vector3(48, 0, -182), new THREE.Vector3(32, 0, -182) ] },
      { id: 8, waypoints: [ new THREE.Vector3(35, 0, -205), new THREE.Vector3(45, 0, -205), new THREE.Vector3(45, 0, -220), new THREE.Vector3(35, 0, -220) ] }
    ];

    guardConfigs.forEach((cfg, idx) => {
      const guard = new Guard(cfg.id, this.scene, this.world, cfg.waypoints, this.baseGltf, idx % cfg.waypoints.length);
      this.guards.push(guard);
    });
  }

  alertGuardsInRadius(x, z, radius, alertPoint = null) {
    const origin = new THREE.Vector3(x, 0, z);
    const target = alertPoint || origin;

    this.guards.forEach(g => {
      if (!g.isAlive) return;
      const dist = g.position.distanceTo(origin);
      if (dist <= radius) {
        if (radius > 35) {
          g.enterAlert(target);
        } else {
          g.enterSuspicious(target);
        }
      }
    });
  }

  update(delta, player, onShootPlayer) {
    this.guards.forEach(g => {
      g.update(delta, player, onShootPlayer);
    });
  }

  getAliveCount() {
    return this.guards.filter(g => g.isAlive).length;
  }
}
