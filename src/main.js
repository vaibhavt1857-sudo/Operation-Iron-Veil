import * as THREE from 'three';
import { World } from './world.js';
import { TerrainManager } from './terrain.js';
import { DecalManager } from './decals.js';
import { Player } from './player.js';
import { WeaponSystem } from './weapons.js';
import { EnemyManager } from './enemies.js';
import { CameraManager } from './cameras.js';
import { TacticalRadar } from './radar.js';
import { SatelliteMap } from './satmap.js';
import { UIManager } from './ui.js';
import { audio } from './audio.js';
import { textures } from './textures.js';

class Game {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.lastTime = performance.now();
    this.elapsedTime = 0;

    // States: 'START', 'PLAYING', 'PAUSED', 'GAMEOVER', 'COMPLETE'
    this.gameState = 'START';

    // 4-Stage Mission Flow
    // 1 = Infiltrate Checkpoint A
    // 2 = Destroy Comms Radar Console at Base B
    // 3 = Hack Mainframe Terminal at Bunker C
    // 4 = Reach Extraction Helipad
    this.objectivePhase = 1;

    // Timers & Stats
    this.hackTimer = 0;
    this.hackRequiredTime = 3.0;
    this.isHacking = false;
    this.hackCompleted = false;

    this.missionTime = 0;
    this.alarmsTriggered = 0;
    this.isBaseAlarmActive = false;
    this.isMouseDown = false;

    this.initThree();
    this.initSystems();
    this.setupEventListeners();

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 750);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap; // Very lightweight 60 FPS
    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initSystems() {
    // 1. Decals Manager (150-decal pooled memory limit)
    this.decals = new DecalManager(this.scene);

    // 2. Infinite / Streaming Procedural Terrain
    this.terrain = new TerrainManager(this.scene);

    // 3. Military Installations & Compounds
    this.world = new World(this.scene);

    // 4. Operative Controller (with 3rd-person rigged model support)
    this.player = new Player(this.camera, this.renderer.domElement, this.world, this.terrain, this.scene);

    // 5. 3 Authentic Weapons (Pistol, Rifle, Sniper)
    this.weapons = new WeaponSystem(this.camera, this.scene, this.decals);
    this.player.onMouseMoveDelta = (dx, dy) => this.weapons.handleMouseDelta(dx, dy);

    this.weapons.onHit = (isHeadshot) => {
      this.ui.showHitmarker();
    };

    this.weapons.onGunfireAlert = (x, z, radius) => {
      this.enemies.alertGuardsInRadius(x, z, radius);
    };

    // 6. Multi-Hit Enemy Soldiers (8 Guards across 3 bases)
    this.enemies = new EnemyManager(this.scene, this.world);

    // 7. Destructible Security Cameras (4 Cameras)
    this.cameras = new CameraManager(this.scene, this.world);

    // 8. HUD 2D Radar
    this.radar = new TacticalRadar('radar-canvas', this.world, this.player, this.enemies, this.cameras);

    // 9. Project IGI Satellite PDA Map ("M" Key)
    this.satmap = new SatelliteMap('satmap-canvas', this.world, this.player, this.enemies, this.cameras);

    // 10. Tactical UI
    this.ui = new UIManager();
  }

  setupEventListeners() {
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse Controls
    window.addEventListener('mousedown', (e) => {
      if (this.gameState !== 'PLAYING' || !this.player.isLocked) return;

      if (e.button === 0) {
        this.isMouseDown = true;
        this.fireCurrentWeapon();
      } else if (e.button === 2) {
        this.weapons.setADS(true);
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      } else if (e.button === 2) {
        this.weapons.setADS(false);
      }
    });

    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      if (this.gameState !== 'PLAYING') return;

      if (e.code === 'Digit1') {
        this.weapons.switchWeapon(0); // Glock 17
      } else if (e.code === 'Digit2') {
        this.weapons.switchWeapon(1); // Micro Uzi SMG
      } else if (e.code === 'Digit3') {
        this.weapons.switchWeapon(2); // AK-47 Assault Rifle
      } else if (e.code === 'Digit4') {
        this.weapons.switchWeapon(3); // M16A2 Combat Rifle
      } else if (e.code === 'Digit5') {
        this.weapons.switchWeapon(4); // Dragunov SVD Sniper
      } else if (e.code === 'KeyT') {
        this.weapons.toggleSuppressor(); // Toggle Glock 17 Suppressor
      } else if (e.code === 'KeyB') {
        this.weapons.toggleBurstMode(); // Toggle M16A2 Burst/Auto Mode
      } else if (e.code === 'KeyR') {
        this.weapons.reload();
      } else if (e.code === 'KeyM') {
        // Toggle Satellite Map
        const isOpen = this.satmap.toggle();
        this.ui.setSatmapVisible(isOpen);
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        this.togglePause();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== this.renderer.domElement) {
        if (this.gameState === 'PLAYING' && !this.satmap.isOpen) {
          this.pauseGame();
        }
      }
    });

    // UI Buttons
    document.getElementById('start-btn').addEventListener('click', () => {
      audio.init();
      audio.resume();
      this.startGame();
    });

    document.getElementById('resume-btn').addEventListener('click', () => {
      this.resumeGame();
    });

    document.getElementById('restart-pause-btn').addEventListener('click', () => {
      this.restartGame();
    });

    document.getElementById('retry-btn').addEventListener('click', () => {
      this.restartGame();
    });

    document.getElementById('play-again-btn').addEventListener('click', () => {
      this.restartGame();
    });
  }

  fireCurrentWeapon() {
    const camDir = this.player.getForwardDirection();
    const eyePos = this.player.position.clone();
    this.weapons.shoot(eyePos, camDir, this.world, this.enemies, this.cameras);
  }

  requestLock() {
    try {
      const promise = this.renderer.domElement.requestPointerLock();
      if (promise && promise.catch) promise.catch(() => {});
    } catch (e) {}
  }

  startGame() {
    this.gameState = 'PLAYING';
    this.ui.showScreen(null);
    this.requestLock();
  }

  pauseGame() {
    if (this.gameState === 'PLAYING') {
      this.gameState = 'PAUSED';
      this.ui.showScreen('pause');
      audio.stopAlarmSiren();
    }
  }

  resumeGame() {
    this.gameState = 'PLAYING';
    this.ui.showScreen(null);
    this.requestLock();
    if (this.isBaseAlarmActive) {
      audio.startAlarmSiren();
    }
  }

  togglePause() {
    if (this.gameState === 'PLAYING') {
      this.pauseGame();
    } else if (this.gameState === 'PAUSED') {
      this.resumeGame();
    }
  }

  restartGame() {
    this.player.reset();

    // Reset weapons (all 5 firearms)
    this.weapons.weapons[0].currentAmmo = 17;
    this.weapons.weapons[0].reserveAmmo = 51;
    this.weapons.weapons[1].currentAmmo = 32;
    this.weapons.weapons[1].reserveAmmo = 96;
    this.weapons.weapons[2].currentAmmo = 30;
    this.weapons.weapons[2].reserveAmmo = 90;
    this.weapons.weapons[3].currentAmmo = 30;
    this.weapons.weapons[3].reserveAmmo = 90;
    this.weapons.weapons[4].currentAmmo = 5;
    this.weapons.weapons[4].reserveAmmo = 20;
    this.weapons.switchWeapon(0);

    // Reset objectives
    this.objectivePhase = 1;
    this.hackTimer = 0;
    this.hackCompleted = false;
    this.missionTime = 0;
    this.alarmsTriggered = 0;
    this.isBaseAlarmActive = false;

    // Reset radar console
    this.world.radarConsoleHealth = 50;
    this.world.isRadarConsoleDestroyed = false;
    if (this.world.radarConsoleScreen) {
      this.world.radarConsoleScreen.material.map = textures.getRadarConsoleTexture(false);
      this.world.radarConsoleScreen.material.needsUpdate = true;
    }
    if (this.world.radarConsoleLight) {
      this.world.radarConsoleLight.intensity = 1.2;
    }

    // Reset cameras & guards
    this.cameras.cameras.forEach(c => this.scene.remove(c.group));
    this.cameras = new CameraManager(this.scene, this.world);
    this.radar.cameraManager = this.cameras;
    this.satmap.cameraManager = this.cameras;

    this.enemies.guards.forEach(g => this.scene.remove(g.group));
    this.enemies = new EnemyManager(this.scene, this.world);
    this.radar.enemyManager = this.enemies;
    this.satmap.enemyManager = this.enemies;

    audio.stopAlarmSiren();
    audio.stopHelicopterLoop();

    this.startGame();
  }

  triggerBaseAlarm(sourcePos) {
    if (this.isBaseAlarmActive) return;

    this.isBaseAlarmActive = true;
    this.alarmsTriggered++;
    audio.startAlarmSiren();

    // Alert guards in wide radius
    this.enemies.alertGuardsInRadius(sourcePos.x, sourcePos.z, 200, this.player.position);
  }

  // Multi-Stage Objectives Logic
  updateMissionObjectives(delta) {
    const pPos = this.player.position;

    // Stage 1: Infiltrate Checkpoint A
    if (this.objectivePhase === 1) {
      const distToCheckpoint = pPos.distanceTo(this.world.checkpointPos);
      if (distToCheckpoint < 28 || pPos.z < 155) {
        this.objectivePhase = 2; // Advance to Stage 2: Comms Outpost
        audio.playHackBeep(0.5);
      }
    }

    // Stage 2: Destroy Radar Control Console at Base B
    if (this.objectivePhase === 2) {
      const distToConsole = pPos.distanceTo(this.world.radarConsolePos);
      const canInteractConsole = (distToConsole < 2.8 && !this.world.isRadarConsoleDestroyed);

      if (canInteractConsole && this.player.keys.interact) {
        this.world.destroyRadarConsole();
      }

      if (this.world.isRadarConsoleDestroyed) {
        this.objectivePhase = 3; // Advance to Stage 3: Main Bunker Mainframe
        audio.playHackComplete();
      }
    }

    // Stage 3: Infiltrate Main Bunker & Hack Mainframe Terminal
    let canInteractTerminal = false;
    if (this.objectivePhase === 3) {
      const distToTerminal = pPos.distanceTo(this.world.terminalPosition);
      canInteractTerminal = (distToTerminal < 2.8 && !this.hackCompleted);

      if (canInteractTerminal && this.player.keys.interact) {
        this.isHacking = true;
        this.hackTimer += delta;

        if (Math.random() < 0.25) {
          audio.playHackBeep(this.hackTimer / this.hackRequiredTime);
        }

        if (this.hackTimer >= this.hackRequiredTime && !this.hackCompleted) {
          this.hackCompleted = true;
          this.objectivePhase = 4; // Advance to Stage 4: Helipad Exfiltration
          this.world.setTerminalHacked();
          audio.playHackComplete();
        }
      } else {
        this.isHacking = false;
        if (!this.hackCompleted) {
          this.hackTimer = Math.max(0, this.hackTimer - delta * 1.5);
        }
      }
    }

    // Stage 4: Helipad Exfiltration
    if (this.objectivePhase === 4) {
      const distToHelipad = pPos.distanceTo(this.world.helipadPos);
      if (distToHelipad < 8.0) {
        this.gameState = 'COMPLETE';
        document.exitPointerLock();
        audio.stopAlarmSiren();
        audio.startHelicopterLoop();

        const guardsKilled = 8 - this.enemies.getAliveCount();
        const camerasKilled = this.cameras.cameras.filter(c => c.isDestroyed).length;
        this.ui.showMissionComplete(this.missionTime, guardsKilled, camerasKilled, this.alarmsTriggered);
      }
    }

    // Interaction Prompt state
    const distToConsole = pPos.distanceTo(this.world.radarConsolePos);
    const nearConsole = (this.objectivePhase === 2 && distToConsole < 2.8 && !this.world.isRadarConsoleDestroyed);

    return {
      canInteract: nearConsole || canInteractTerminal,
      actionText: nearConsole ? 'SABOTAGE RADAR CONSOLE [HOLD E]' : 'HACK DEFENSE MAINFRAME [HOLD E]',
      isCompleted: (this.objectivePhase === 2 ? this.world.isRadarConsoleDestroyed : this.hackCompleted),
      progress: nearConsole ? 0 : Math.min(1.0, this.hackTimer / this.hackRequiredTime)
    };
  }

  animate() {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.elapsedTime += delta;
    const time = this.elapsedTime;

    if (this.gameState === 'PLAYING') {
      this.missionTime += delta;

      // 1. Continuous Fire for Assault Rifle
      if (this.isMouseDown && this.weapons.getCurrentWeapon().auto) {
        this.fireCurrentWeapon();
      }

      // 2. Update Operative Movement & Elevation
      this.player.update(delta);

      if (!this.player.isAlive) {
        this.gameState = 'GAMEOVER';
        this.ui.showScreen('gameover');
        audio.stopAlarmSiren();
        return;
      }

      // 3. Update Terrain Streaming chunks around player
      this.terrain.update(this.player.position);

      // 4. Update Weapons (pass isThirdPerson to hide first-person hands/guns in 3rd person)
      const stance = this.player.isCrouched ? 'crouch' : 'stand';
      this.weapons.update(delta, this.player.isMoving, this.player.isSprinting, stance, this.player.isThirdPerson);

      // 5. Update Decals & Particles
      this.decals.update(delta);

      // 6. Update Enemy Soldiers
      this.enemies.update(delta, this.player, (guardPos, willHit) => {
        if (willHit) {
          const dmg = Math.floor(Math.random() * 8) + 12;
          this.player.takeDamage(dmg, guardPos);
        }
      });

      // 7. Update Destructible Cameras
      this.cameras.update(delta, time, this.player, (camPos, playerPos) => {
        this.triggerBaseAlarm(camPos);
      });

      // 8. Update Lighting & Rotating Radar
      this.world.updateLighting(this.player.position, this.isBaseAlarmActive, time);

      // 9. Update 4-Stage Mission Objectives
      const interactState = this.updateMissionObjectives(delta);

      // 10. Overall Compound Threat Level
      let threat = 'CLEAR';
      if (this.isBaseAlarmActive) {
        threat = 'ALERT';
      } else {
        const hasAlert = this.enemies.guards.some(g => g.isAlive && g.state === 'ALERT');
        const hasSuspicious = this.enemies.guards.some(g => g.isAlive && g.state === 'SUSPICIOUS');
        if (hasAlert) threat = 'ALERT';
        else if (hasSuspicious) threat = 'SUSPICIOUS';
      }

      // 11. Update Tactical HUD & Minimap
      this.ui.update(delta, this.player, this.weapons, this.objectivePhase, threat, interactState);
      this.radar.render(delta, this.objectivePhase);

      // 12. Render Satellite Map if open
      if (this.satmap.isOpen) {
        this.satmap.render(this.objectivePhase);
      }
    }

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
