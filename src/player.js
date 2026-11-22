import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { audio } from './audio.js';

export class Player {
  constructor(camera, domElement, world, terrain, scene) {
    this.camera = camera;
    this.domElement = domElement;
    this.world = world;
    this.terrain = terrain;
    this.scene = scene;

    // Movement Parameters
    this.standHeight = 1.75;
    this.crouchHeight = 0.95;
    this.currentHeight = this.standHeight;

    this.walkSpeed = 5.2;
    this.sprintSpeed = 8.8;
    this.crouchSpeed = 2.4;

    this.jumpForce = 5.8;
    this.gravity = 16.0;

    // Operative Spawns outside Checkpoint A at z = 235
    this.position = new THREE.Vector3(0, this.standHeight, 235);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.isGrounded = true;
    this.isCrouched = false;
    this.isSprinting = false;
    this.isMoving = false;

    // Vitals: Health & Body Armor
    this.maxHealth = 100;
    this.health = 100;
    this.maxArmor = 100;
    this.armor = 100;
    this.isAlive = true;

    // View Perspective: First-Person vs Third-Person ("V" Key)
    this.isThirdPerson = false;
    this.thirdPersonOffset = new THREE.Vector3(0.75, 0.35, -3.4);

    // Directional Damage Feedback
    this.damageVignetteTimer = 0;
    this.damageDirection = 0;
    this.damageIndicatorTimer = 0;

    // Stealth Metrics
    this.noiseRadius = 0;
    this.visibilityFactor = 1.0;
    this.stepTimer = 0;

    // Mouse Look / Pointer Lock
    this.pitch = 0;
    this.yaw = 0; // Facing North towards Checkpoint A and mountains
    this.isLocked = false;

    // Rigged 3rd-Person Operative Model (David Jones style)
    this.thirdPersonModel = null;
    this.playerMixer = null;
    this.playerActions = {};
    this.currentPlayerAction = null;

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
      crouch: false,
      interact: false
    };

    this.onMouseMoveDelta = null;

    this.setupPointerLock();
    this.setupKeyboard();
    this.loadThirdPersonModel();
  }

  loadThirdPersonModel() {
    const loader = new GLTFLoader();
    loader.load(
      '/models/Soldier.glb',
      (gltf) => {
        const model = SkeletonUtils.clone(gltf.scene);
        model.scale.set(0.95, 0.95, 0.95);
        model.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material = child.material.clone();
              // David Jones tactical stealth sweater (dark navy blue/charcoal)
              child.material.color.setHex(0x243242);
            }
          }
        });

        this.thirdPersonModel = model;
        this.thirdPersonModel.visible = false;
        this.scene.add(this.thirdPersonModel);

        this.playerMixer = new THREE.AnimationMixer(model);
        gltf.animations.forEach(clip => {
          this.playerActions[clip.name] = this.playerMixer.clipAction(clip);
        });

        this.playPlayerAnimation('Idle');
      },
      undefined,
      (err) => console.error('Error loading player model:', err)
    );
  }

  playPlayerAnimation(name, duration = 0.25) {
    if (!this.playerMixer || !this.playerActions[name]) return;
    const next = this.playerActions[name];
    if (this.currentPlayerAction === next) return;

    if (this.currentPlayerAction) {
      this.currentPlayerAction.fadeOut(duration);
    }
    next.reset().fadeIn(duration).play();
    this.currentPlayerAction = next;
  }

  toggleThirdPerson() {
    this.isThirdPerson = !this.isThirdPerson;
    if (this.thirdPersonModel) {
      this.thirdPersonModel.visible = this.isThirdPerson;
    }
  }

  setupPointerLock() {
    this.domElement.addEventListener('click', () => {
      if (!this.isLocked && this.isAlive) {
        try {
          const promise = this.domElement.requestPointerLock();
          if (promise && promise.catch) promise.catch(() => {});
        } catch (e) {}
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = (document.pointerLockElement === this.domElement);
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isLocked || !this.isAlive) return;

      const movementX = e.movementX || 0;
      const movementY = e.movementY || 0;

      const sensitivity = 0.0022;
      this.yaw -= movementX * sensitivity;
      this.pitch -= movementY * sensitivity;

      const maxPitch = Math.PI / 2 - 0.05;
      this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

      if (this.onMouseMoveDelta) {
        this.onMouseMoveDelta(movementX, movementY);
      }
    });
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = true;
          break;
        case 'Space':
          this.keys.jump = true;
          break;
        case 'KeyC':
          this.toggleCrouch();
          break;
        case 'KeyE':
          this.keys.interact = true;
          break;
        case 'KeyV':
          // Toggle First-Person / Third-Person View
          this.toggleThirdPerson();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.keys.sprint = false;
          break;
        case 'Space':
          this.keys.jump = false;
          break;
        case 'KeyE':
          this.keys.interact = false;
          break;
      }
    });
  }

  toggleCrouch() {
    this.isCrouched = !this.isCrouched;
  }

  takeDamage(amount, attackerPos = null) {
    if (!this.isAlive) return;

    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.65);
      this.armor -= absorbed;
      amount -= absorbed;
    }

    this.health = Math.max(0, this.health - amount);
    this.damageVignetteTimer = 0.5;
    audio.playPlayerHurt();

    if (attackerPos) {
      const dx = attackerPos.x - this.position.x;
      const dz = attackerPos.z - this.position.z;
      const worldAngle = Math.atan2(dx, dz);
      this.damageDirection = worldAngle - this.yaw;
      this.damageIndicatorTimer = 0.8;
    }

    if (this.health <= 0) {
      this.isAlive = false;
      document.exitPointerLock();
    }
  }

  reset(startPos = new THREE.Vector3(0, 1.75, 235)) {
    this.position.copy(startPos);
    this.velocity.set(0, 0, 0);
    this.pitch = 0;
    this.yaw = 0;
    this.health = this.maxHealth;
    this.armor = this.maxArmor;
    this.isAlive = true;
    this.isCrouched = false;
    this.currentHeight = this.standHeight;
    this.damageIndicatorTimer = 0;
  }

  update(delta) {
    if (!this.isAlive) return;

    // Stance Transition
    const targetHeight = this.isCrouched ? this.crouchHeight : this.standHeight;
    this.currentHeight = THREE.MathUtils.lerp(this.currentHeight, targetHeight, 14 * delta);

    // Movement
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const moveDir = new THREE.Vector3(0, 0, 0);
    if (this.keys.forward) moveDir.add(forward);
    if (this.keys.backward) moveDir.sub(forward);
    if (this.keys.right) moveDir.add(right);
    if (this.keys.left) moveDir.sub(right);

    this.isMoving = moveDir.lengthSq() > 0.001;
    if (this.isMoving) moveDir.normalize();

    this.isSprinting = this.keys.sprint && !this.isCrouched && this.keys.forward;
    let targetSpeed = this.walkSpeed;
    if (this.isCrouched) targetSpeed = this.crouchSpeed;
    else if (this.isSprinting) targetSpeed = this.sprintSpeed;

    if (this.isMoving) {
      const accel = this.isGrounded ? 35 : 12;
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, moveDir.x * targetSpeed, accel * delta);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, moveDir.z * targetSpeed, accel * delta);
    } else {
      const friction = this.isGrounded ? 22 : 4;
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, 0, friction * delta);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, 0, friction * delta);
    }

    if (this.isGrounded) {
      if (this.keys.jump && !this.isCrouched) {
        this.velocity.y = this.jumpForce;
        this.isGrounded = false;
        audio.playFootstep('stand', false);
      } else {
        this.velocity.y = 0;
      }
    } else {
      this.velocity.y -= this.gravity * delta;
    }

    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;
    this.position.y += this.velocity.y * delta;

    // Smooth Terrain Elevation
    const terrainY = this.terrain.getHeight(this.position.x, this.position.z);
    const groundLevel = terrainY + this.currentHeight;

    if (this.position.y <= groundLevel) {
      this.position.y = groundLevel;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    this.world.checkPlayerCollision(this.position, 0.45);

    // Update Third-Person Model Position & Skeletal Animation
    if (this.thirdPersonModel) {
      this.thirdPersonModel.position.set(this.position.x, this.position.y - this.currentHeight, this.position.z);
      this.thirdPersonModel.rotation.y = this.yaw + Math.PI;

      if (this.playerMixer) {
        this.playerMixer.update(delta);
        if (this.isMoving) {
          this.playPlayerAnimation(this.isSprinting ? 'Run' : 'Walk');
        } else {
          this.playPlayerAnimation('Idle');
        }
      }
    }

    // Camera Positioning (First-Person vs Third-Person Over-the-Shoulder)
    if (this.isThirdPerson) {
      const camPos = new THREE.Vector3(
        this.position.x - forward.x * 3.4 + right.x * 0.75,
        this.position.y + 0.35,
        this.position.z - forward.z * 3.4 + right.z * 0.75
      );
      this.camera.position.copy(camPos);
    } else {
      this.camera.position.set(this.position.x, this.position.y, this.position.z);
    }

    this.camera.rotation.set(0, 0, 0);
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // Footsteps & Noise
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.isGrounded && horizontalSpeed > 0.4) {
      const stepInterval = this.isCrouched ? 0.65 : (this.isSprinting ? 0.32 : 0.48);
      this.stepTimer += delta;
      if (this.stepTimer >= stepInterval) {
        this.stepTimer = 0;
        audio.playFootstep(this.isCrouched ? 'crouch' : 'stand', this.isSprinting);
      }

      if (this.isCrouched) this.noiseRadius = 1.8;
      else if (this.isSprinting) this.noiseRadius = 14.0;
      else this.noiseRadius = 5.5;
    } else {
      this.stepTimer = 0;
      this.noiseRadius = 0;
    }

    if (this.isCrouched) this.visibilityFactor = 0.35;
    else if (this.isSprinting) this.visibilityFactor = 1.35;
    else this.visibilityFactor = 1.0;

    if (this.damageVignetteTimer > 0) this.damageVignetteTimer -= delta;
    if (this.damageIndicatorTimer > 0) this.damageIndicatorTimer -= delta;
  }

  getForwardDirection() {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    return dir;
  }
}
