import * as THREE from 'three';
import { audio } from './audio.js';

export class WeaponSystem {
  constructor(camera, scene, decalManager) {
    this.camera = camera;
    this.scene = scene;
    this.decalManager = decalManager;

    this.viewmodelGroup = new THREE.Group();
    this.camera.add(this.viewmodelGroup);

    // 5 Authentic Real-World Project IGI Firearms
    this.currentWeaponIndex = 0;
    this.weapons = [
      // 1. Glock 17
      {
        id: 'glock',
        name: 'GLOCK 17 9mm',
        magSize: 17,
        currentAmmo: 17,
        reserveAmmo: 51,
        auto: false,
        fireDelay: 0.2,
        reloadTime: 1.3,
        bodyDamage: 30,
        headDamage: 100,
        isSuppressed: true, // Toggle with "T" key
        noiseRadius: 5.0,   // Suppressed = 5m, Unsuppressed = 30m
        recoilX: 0.035,
        recoilY: 0.018,
        hipPos: new THREE.Vector3(0.16, -0.16, -0.32),
        adsPos: new THREE.Vector3(0.0, -0.125, -0.25),
        mesh: null,
        suppressorMesh: null,
        muzzlePos: new THREE.Vector3(0.0, 0.035, -0.42)
      },
      // 2. MP5SD3 Integrally Suppressed SMG (Iconic Project IGI Tactical Weapon)
      {
        id: 'mp5',
        name: 'MP5SD3 9mm SMG',
        magSize: 30,
        currentAmmo: 30,
        reserveAmmo: 90,
        auto: true,
        fireDelay: 0.075, // ~800 RPM
        reloadTime: 1.8,
        bodyDamage: 25,
        headDamage: 100,
        noiseRadius: 8.0, // Integrally suppressed
        recoilX: 0.038,
        recoilY: 0.02,
        hipPos: new THREE.Vector3(0.16, -0.16, -0.32),
        adsPos: new THREE.Vector3(0.0, -0.13, -0.25),
        mesh: null,
        muzzlePos: new THREE.Vector3(0.0, 0.04, -0.46)
      },
      // 3. AK-47 Assault Rifle
      {
        id: 'ak47',
        name: 'AK-47 KALASHNIKOV',
        magSize: 30,
        currentAmmo: 30,
        reserveAmmo: 90,
        auto: true,
        fireDelay: 0.115, // ~520 RPM
        reloadTime: 2.1,
        bodyDamage: 34,
        headDamage: 100,
        noiseRadius: 55.0,
        recoilX: 0.08,
        recoilY: 0.04,
        hipPos: new THREE.Vector3(0.17, -0.17, -0.34),
        adsPos: new THREE.Vector3(0.0, -0.135, -0.26),
        mesh: null,
        muzzlePos: new THREE.Vector3(0.0, 0.05, -0.58)
      },
      // 4. M16A2 Combat Rifle
      {
        id: 'm16',
        name: 'COLT M16A2 5.56mm',
        magSize: 30,
        currentAmmo: 30,
        reserveAmmo: 90,
        auto: true,
        isBurstMode: true, // Toggle with "B" key (Burst vs Auto)
        burstShotsRemaining: 0,
        burstTimer: 0,
        fireDelay: 0.09,
        reloadTime: 2.0,
        bodyDamage: 30,
        headDamage: 100,
        noiseRadius: 50.0,
        recoilX: 0.06,
        recoilY: 0.03,
        hipPos: new THREE.Vector3(0.17, -0.17, -0.34),
        adsPos: new THREE.Vector3(0.0, -0.14, -0.26),
        mesh: null,
        muzzlePos: new THREE.Vector3(0.0, 0.055, -0.62)
      },
      // 5. Dragunov SVD Sniper Rifle
      {
        id: 'svd',
        name: 'DRAGUNOV SVD SNIPER',
        magSize: 5,
        currentAmmo: 5,
        reserveAmmo: 20,
        auto: false,
        fireDelay: 1.1, // Bolt action cycle
        reloadTime: 2.5,
        bodyDamage: 90,
        headDamage: 100,
        noiseRadius: 70.0,
        recoilX: 0.15,
        recoilY: 0.08,
        hipPos: new THREE.Vector3(0.18, -0.18, -0.35),
        adsPos: new THREE.Vector3(0.0, -0.145, -0.26),
        mesh: null,
        muzzlePos: new THREE.Vector3(0.0, 0.06, -0.78)
      }
    ];

    // State
    this.isReloading = false;
    this.reloadTimer = 0;
    this.fireTimer = 0;
    this.isADS = false;
    this.adsProgress = 0;
    this.baseFOV = 75;
    this.adsFOV = 48;
    this.svdZoom = 4.0; // Variable 4.0x to 8.0x optical zoom
    this.isBinocularsActive = false;
    this.binocularZoom = 4.0; // Variable 2.0x to 12.0x digital zoom
    this.binocularRangeMeters = 0;
    this.binocularFocusEnemy = null;
    this.binocularTagTimer = 0;

    // Procedural Sway & Bob
    this.currentSway = new THREE.Vector2(0, 0);
    this.targetSway = new THREE.Vector2(0, 0);
    this.bobTimer = 0;
    this.recoilOffset = new THREE.Vector3(0, 0, 0);
    this.recoilRotation = new THREE.Vector3(0, 0, 0);

    // Sprint tilt angle
    this.sprintTilt = 0;

    // First-Person Tactical Hands Group
    this.handsGroup = new THREE.Group();
    this.viewmodelGroup.add(this.handsGroup);

    // Muzzle Flash
    this.muzzleFlash = null;
    this.muzzleLight = null;
    this.flashTimer = 0;

    this.tracers = [];

    this.onHit = null;
    this.onGunfireAlert = null;

    this.buildAllWeaponModels();
    this.switchWeapon(0);
  }

  // Realistic Human Forearms & Black Tactical Combat Gloves attached directly to firearms
  attachTacticalHands(weaponGroup, gripPos, supportPos) {
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xba8c72 });
    const sleeveMat = new THREE.MeshLambertMaterial({ color: 0x1b2022 }); // Dark charcoal tactical combat uniform
    const gloveMat = new THREE.MeshLambertMaterial({ color: 0x14171a });  // Tactical black Kevlar glove
    const knuckleMat = new THREE.MeshLambertMaterial({ color: 0x0a0c0e }); // Molded knuckle protector

    // 1. Right Hand & Arm (Trigger Hand)
    const rightArm = new THREE.Group();
    rightArm.position.copy(gripPos);

    // Glove Palm / Back
    const rPalm = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.052, 0.075), gloveMat);
    rPalm.position.set(0, 0, 0);
    rightArm.add(rPalm);

    // Molded Knuckle Guard
    const rKnuckle = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.016, 0.055), knuckleMat);
    rKnuckle.position.set(0, 0.026, 0.005);
    rightArm.add(rKnuckle);

    // Trigger Finger extending along frame / trigger
    const rTrigFinger = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.06), gloveMat);
    rTrigFinger.position.set(-0.022, 0.028, -0.04);
    rightArm.add(rTrigFinger);

    // Thumb wrapped around grip
    const rThumb = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.02, 0.045), gloveMat);
    rThumb.position.set(0.024, 0.02, -0.015);
    rThumb.rotation.y = -0.35;
    rightArm.add(rThumb);

    // Bare Wrist
    const rWrist = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.04, 12), skinMat);
    rWrist.position.set(0.015, -0.03, 0.045);
    rWrist.rotation.x = 0.5;
    rightArm.add(rWrist);

    // Forearm / Combat Sleeve stretching down into bottom right of viewport
    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.048, 0.32, 14), sleeveMat);
    rForearm.position.set(0.035, -0.12, 0.14);
    rForearm.rotation.x = 0.55;
    rForearm.rotation.z = -0.18;
    rightArm.add(rForearm);

    weaponGroup.add(rightArm);

    // 2. Left Hand & Arm (Support Hand)
    if (supportPos) {
      const leftArm = new THREE.Group();
      leftArm.position.copy(supportPos);

      // Support Glove Palm
      const lPalm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.046, 0.078), gloveMat);
      lPalm.position.set(0, 0, 0);
      leftArm.add(lPalm);

      // Knuckle Guard
      const lKnuckle = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.015, 0.058), knuckleMat);
      lKnuckle.position.set(0, 0.024, 0);
      leftArm.add(lKnuckle);

      // Wrapped fingers around handguard
      const lFingers = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.024, 0.062), gloveMat);
      lFingers.position.set(0.02, 0.02, -0.025);
      leftArm.add(lFingers);

      // Wrist
      const lWrist = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.035, 0.04, 12), skinMat);
      lWrist.position.set(-0.015, -0.03, 0.045);
      lWrist.rotation.x = 0.5;
      leftArm.add(lWrist);

      // Forearm / Sleeve extending down into bottom left of viewport
      const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.048, 0.34, 14), sleeveMat);
      lForearm.position.set(-0.04, -0.13, 0.15);
      lForearm.rotation.x = 0.55;
      lForearm.rotation.z = 0.22;
      leftArm.add(lForearm);

      weaponGroup.add(leftArm);
    }
  }

  // Multi-part smooth realistic weapons matching authentic Project IGI (2000)
  buildAllWeaponModels() {
    const polymerMat = new THREE.MeshLambertMaterial({ color: 0x16181b });
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x363c42 });
    const darkSteelMat = new THREE.MeshLambertMaterial({ color: 0x22262a });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x643218 }); // Russian amber-red laminate wood
    const whiteDotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sightMat = new THREE.MeshBasicMaterial({ color: 0x111315 });

    // 1. Glock 17 (Key 1)
    const glockGroup = new THREE.Group();
    // Polymer frame & grip with finger contours
    const gFrame = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.048, 0.18), polymerMat);
    gFrame.position.set(0, 0.015, -0.05);
    const gGrip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.13, 0.054), polymerMat);
    gGrip.position.set(0, -0.06, 0.015);
    gGrip.rotation.x = -0.24;
    // Trigger guard & trigger
    const gTrigGuard = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.035, 0.05), polymerMat);
    gTrigGuard.position.set(0, -0.018, -0.025);
    const gTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.02, 0.012), steelMat);
    gTrigger.position.set(0, -0.015, -0.02);
    // Brushed steel slide with cocking serrations
    const gSlide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.2), steelMat);
    gSlide.position.set(0, 0.05, -0.05);
    // 3-Dot White Iron Sights (Project IGI style)
    const gFrontSight = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.012), sightMat);
    gFrontSight.position.set(0, 0.075, -0.135);
    const gFrontDot = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, 0.002), whiteDotMat);
    gFrontDot.position.set(0, 0.075, -0.128);

    const gRearSight = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.014, 0.012), sightMat);
    gRearSight.position.set(0, 0.075, 0.042);
    const gRearDotL = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, 0.002), whiteDotMat);
    gRearDotL.position.set(-0.01, 0.075, 0.049);
    const gRearDotR = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, 0.002), whiteDotMat);
    gRearDotR.position.set(0.01, 0.075, 0.049);

    // Detachable cylindrical suppressor ("T" key)
    const gSupp = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 16), darkSteelMat);
    gSupp.rotation.x = Math.PI / 2;
    gSupp.position.set(0, 0.05, -0.26);
    glockGroup.add(gFrame, gGrip, gTrigGuard, gTrigger, gSlide, gFrontSight, gFrontDot, gRearSight, gRearDotL, gRearDotR, gSupp);
    this.attachTacticalHands(glockGroup, new THREE.Vector3(0, -0.06, 0.015), new THREE.Vector3(0.012, -0.075, 0.02));
    this.weapons[0].mesh = glockGroup;
    this.weapons[0].suppressorMesh = gSupp;
    this.viewmodelGroup.add(glockGroup);

    // 2. MP5SD3 Submachine Gun (Key 2: Iconic Project IGI Tactical SMG)
    const mp5Group = new THREE.Group();
    // Stamped steel receiver
    const mp5Rec = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.078, 0.32), darkSteelMat);
    mp5Rec.position.set(0, 0.03, -0.04);
    // Cocking tube on top
    const mp5Tube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.32, 12), steelMat);
    mp5Tube.rotation.x = Math.PI / 2;
    mp5Tube.position.set(0, 0.075, -0.08);
    // Cocking handle
    const mp5Handle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 6), steelMat);
    mp5Handle.rotation.z = Math.PI / 2;
    mp5Handle.position.set(-0.024, 0.078, -0.16);
    // Cylindrical Perforated Suppressor Shroud (Iconic MP5SD3)
    const mp5Shroud = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.38, 16), polymerMat);
    mp5Shroud.rotation.x = Math.PI / 2;
    mp5Shroud.position.set(0, 0.04, -0.28);
    // Hooded Circular Front Sight Ring (Iconic Project IGI Ring)
    const mp5FrontRing = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.003, 8, 16), darkSteelMat);
    mp5FrontRing.position.set(0, 0.095, -0.28);
    const mp5FrontPost = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.014, 6), darkSteelMat);
    mp5FrontPost.position.set(0, 0.09, -0.28);
    // Rear Rotary Drum Sight
    const mp5RearDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.016, 12), darkSteelMat);
    mp5RearDrum.position.set(0, 0.085, 0.06);
    // Curved 30-round 9mm Steel Magazine
    const mp5Mag = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.18, 0.065), steelMat);
    mp5Mag.position.set(0, -0.09, -0.09);
    mp5Mag.rotation.x = 0.22;
    // Retractable Tactical Stock (Twin guide rails & buttpad)
    const railL = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.28, 6), steelMat);
    railL.rotation.x = Math.PI / 2;
    railL.position.set(-0.026, 0.03, 0.14);
    const railR = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.28, 6), steelMat);
    railR.rotation.x = Math.PI / 2;
    railR.position.set(0.026, 0.03, 0.14);
    const mp5Butt = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.11, 0.02), polymerMat);
    mp5Butt.position.set(0, 0.01, 0.28);
    // Pistol grip
    const mp5Grip = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.14, 0.055), polymerMat);
    mp5Grip.position.set(0, -0.07, 0.02);
    mp5Grip.rotation.x = -0.26;
    mp5Group.add(mp5Rec, mp5Tube, mp5Handle, mp5Shroud, mp5FrontRing, mp5FrontPost, mp5RearDrum, mp5Mag, railL, railR, mp5Butt, mp5Grip);
    this.attachTacticalHands(mp5Group, new THREE.Vector3(0, -0.07, 0.02), new THREE.Vector3(0, 0.03, -0.22));
    this.weapons[1].mesh = mp5Group;
    this.viewmodelGroup.add(mp5Group);

    // 3. AK-47 Kalashnikov (Key 3)
    const akGroup = new THREE.Group();
    // Stamped ribbed steel receiver & dust cover
    const akReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.082, 0.38), steelMat);
    akReceiver.position.set(0, 0.03, -0.05);
    // Bolt carrier handle
    const akBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 6), steelMat);
    akBolt.rotation.z = Math.PI / 2;
    akBolt.position.set(0.03, 0.045, -0.08);
    // Rich Russian Laminate Wooden Stock
    const akStock = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.12, 0.26), woodMat);
    akStock.position.set(0, -0.02, 0.24);
    // Wooden lower & upper handguard
    const akGuardLower = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.045, 0.24), woodMat);
    akGuardLower.position.set(0, 0.02, -0.32);
    const akGuardUpper = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.035, 0.22), woodMat);
    akGuardUpper.position.set(0, 0.065, -0.32);
    // Curved 30-round steel banana magazine
    const akMag = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.22, 0.095), steelMat);
    akMag.position.set(0, -0.1, -0.12);
    akMag.rotation.x = 0.35;
    // Front sight post with protective ears
    const akFrontTower = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.045, 0.02), steelMat);
    akFrontTower.position.set(0, 0.075, -0.52);
    const akFrontPost = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.02, 6), sightMat);
    akFrontPost.position.set(0, 0.08, -0.52);
    // Barrel & Slanted Muzzle Brake
    const akBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 10), steelMat);
    akBarrel.rotation.x = Math.PI / 2;
    akBarrel.position.set(0, 0.04, -0.55);
    const akComp = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.014, 0.04, 8), darkSteelMat);
    akComp.rotation.x = Math.PI / 2;
    akComp.position.set(0, 0.04, -0.72);
    akGroup.add(akReceiver, akBolt, akStock, akGuardLower, akGuardUpper, akMag, akFrontTower, akFrontPost, akBarrel, akComp);
    this.attachTacticalHands(akGroup, new THREE.Vector3(0, -0.08, 0.06), new THREE.Vector3(0, 0.015, -0.28));
    this.weapons[2].mesh = akGroup;
    this.viewmodelGroup.add(akGroup);

    // 4. M16A2 Combat Rifle (Key 4)
    const m16Group = new THREE.Group();
    const mReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.088, 0.36), steelMat);
    mReceiver.position.set(0, 0.03, -0.05);
    // A2 Carrying Handle with rear aperture sight
    const mHandle = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.048, 0.18), steelMat);
    mHandle.position.set(0, 0.098, -0.04);
    // Ribbed black polymer handguard
    const mGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.34, 16), polymerMat);
    mGuard.rotation.x = Math.PI / 2;
    mGuard.position.set(0, 0.035, -0.36);
    // Fixed buttstock
    const mStock = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.11, 0.25), polymerMat);
    mStock.position.set(0, 0.01, 0.22);
    // Triangular A-frame front sight tower
    const mFrontSight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.055, 0.025), steelMat);
    mFrontSight.position.set(0, 0.08, -0.54);
    // Straight 30-round magazine
    const mMag = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.19, 0.07), steelMat);
    mMag.position.set(0, -0.1, -0.08);
    mMag.rotation.x = 0.12;
    // Barrel & birdcage flash hider
    const mBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.28, 10), steelMat);
    mBarrel.rotation.x = Math.PI / 2;
    mBarrel.position.set(0, 0.04, -0.62);
    m16Group.add(mReceiver, mHandle, mGuard, mStock, mFrontSight, mMag, mBarrel);
    this.attachTacticalHands(m16Group, new THREE.Vector3(0, -0.08, 0.06), new THREE.Vector3(0, 0.02, -0.32));
    this.weapons[3].mesh = m16Group;
    this.viewmodelGroup.add(m16Group);

    // 5. Dragunov SVD Sniper Rifle (Key 5)
    const svdGroup = new THREE.Group();
    const svdReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.075, 0.44), steelMat);
    svdReceiver.position.set(0, 0.03, -0.05);
    // Skeletonized wooden thumbhole stock
    const svdStock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.3), woodMat);
    svdStock.position.set(0, -0.03, 0.28);
    // Wooden front handguard
    const svdGuard = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.05, 0.3), woodMat);
    svdGuard.position.set(0, 0.035, -0.35);
    // Long fluted sniper barrel
    const svdBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.017, 0.6, 12), steelMat);
    svdBarrel.rotation.x = Math.PI / 2;
    svdBarrel.position.set(0, 0.035, -0.52);
    // Slotted flash suppressor
    const svdTip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.12, 10), steelMat);
    svdTip.rotation.x = Math.PI / 2;
    svdTip.position.set(0, 0.035, -0.84);
    // Side-mounted Russian PSO-1 Optical Scope
    const svdScope = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.26, 14), darkSteelMat);
    svdScope.rotation.x = Math.PI / 2;
    svdScope.position.set(0, 0.115, -0.08);
    const svdMount = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.14), darkSteelMat);
    svdMount.position.set(0.02, 0.075, -0.08);
    svdGroup.add(svdReceiver, svdStock, svdGuard, svdBarrel, svdTip, svdScope, svdMount);
    this.attachTacticalHands(svdGroup, new THREE.Vector3(0, -0.06, 0.12), new THREE.Vector3(0, 0.01, -0.34));
    this.weapons[4].mesh = svdGroup;
    this.viewmodelGroup.add(svdGroup);

    // Star-shaped 3D Volumetric Muzzle Flash (Project IGI Star Burst)
    const flashGroup = new THREE.Group();
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffea55,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    });
    const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), flashMat);
    const p2 = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), flashMat);
    p2.rotation.z = Math.PI / 4;
    const p3 = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), flashMat);
    p3.rotation.y = Math.PI / 2;
    flashGroup.add(p1, p2, p3);
    flashGroup.visible = false;
    this.muzzleFlash = flashGroup;
    this.viewmodelGroup.add(flashGroup);

    this.muzzleLight = new THREE.PointLight(0xffcc44, 0, 10);
    this.muzzleFlash.add(this.muzzleLight);
  }

  // Toggle Suppressor on Glock 17 ("T" Key)
  toggleSuppressor() {
    const glock = this.weapons[0];
    glock.isSuppressed = !glock.isSuppressed;
    glock.noiseRadius = glock.isSuppressed ? 5.0 : 30.0;
    if (glock.suppressorMesh) {
      glock.suppressorMesh.visible = glock.isSuppressed;
    }
    audio.playSuppressorToggle();
  }

  // Toggle M16A2 Fire Mode ("B" Key: 3-round burst / Full-auto)
  toggleBurstMode() {
    const m16 = this.weapons[3];
    m16.isBurstMode = !m16.isBurstMode;
    audio.playModeToggle();
  }

  switchWeapon(index) {
    if (index < 0 || index >= this.weapons.length) return;

    // Interrupt reload, cancel ADS and cancel binoculars on weapon switch
    this.isReloading = false;
    this.reloadTimer = 0;
    this.isADS = false;
    this.isBinocularsActive = false;

    this.currentWeaponIndex = index;
    this.weapons.forEach((w, i) => {
      if (w.mesh) w.mesh.visible = (i === index);
    });

    audio.playWeaponSwitch();
  }

  cycleWeapon(direction) {
    if (this.isBinocularsActive) {
      this.isBinocularsActive = false;
    }
    const count = this.weapons.length;
    const nextIdx = (this.currentWeaponIndex + direction + count) % count;
    this.switchWeapon(nextIdx);
  }

  toggleBinoculars() {
    this.isBinocularsActive = !this.isBinocularsActive;
    if (this.isBinocularsActive) {
      this.isADS = false;
      this.weapons.forEach(w => { if (w.mesh) w.mesh.visible = false; });
      audio.playBinocularsToggle(true);
    } else {
      const cur = this.getCurrentWeapon();
      if (cur.mesh) cur.mesh.visible = true;
      audio.playBinocularsToggle(false);
    }
    return this.isBinocularsActive;
  }

  handleMouseWheel(deltaY) {
    // 1. Zoom Binoculars if active (2x to 12x)
    if (this.isBinocularsActive) {
      if (deltaY < 0) {
        this.binocularZoom = Math.min(12.0, this.binocularZoom + 1.0);
      } else if (deltaY > 0) {
        this.binocularZoom = Math.max(2.0, this.binocularZoom - 1.0);
      }
      audio.playZoomClick();
      return true;
    }

    // 2. Zoom SVD Sniper Scope if zoomed in (4x to 8x)
    const currentWeapon = this.getCurrentWeapon();
    if (currentWeapon.id === 'svd' && this.isADS) {
      if (deltaY < 0) {
        this.svdZoom = Math.min(8.0, this.svdZoom + 0.5);
      } else if (deltaY > 0) {
        this.svdZoom = Math.max(4.0, this.svdZoom - 0.5);
      }
      audio.playZoomClick();
      return true;
    }

    // 3. Cycle weapons with mouse wheel (Wheel Down = Next, Wheel Up = Prev)
    if (deltaY > 0) {
      this.cycleWeapon(1);
    } else if (deltaY < 0) {
      this.cycleWeapon(-1);
    }
    return true;
  }

  getCurrentWeapon() {
    return this.weapons[this.currentWeaponIndex];
  }

  setADS(active) {
    if (this.isBinocularsActive) return;
    this.isADS = active;
  }

  handleMouseDelta(dx, dy) {
    const maxSway = 0.035;
    this.targetSway.x = THREE.MathUtils.clamp(-dx * 0.0008, -maxSway, maxSway);
    this.targetSway.y = THREE.MathUtils.clamp(dy * 0.0008, -maxSway, maxSway);
  }

  reload() {
    if (this.isBinocularsActive) return;
    const w = this.getCurrentWeapon();
    if (this.isReloading || w.currentAmmo === w.magSize || w.reserveAmmo <= 0) return;

    this.isReloading = true;
    this.reloadTimer = w.reloadTime;
    audio.playReload();
  }

  shoot(playerPos, cameraDir, world, enemyManager, cameraManager) {
    if (this.isBinocularsActive) return; // Cannot fire weapons while holding binoculars
    const w = this.getCurrentWeapon();

    if (this.isReloading) return;
    if (this.fireTimer > 0) return;

    if (w.currentAmmo <= 0) {
      audio.playEmptyClick();
      this.fireTimer = 0.25;
      return;
    }

    // M16 Burst mode handling
    if (w.id === 'm16' && w.isBurstMode) {
      w.burstShotsRemaining = 3;
      w.burstTimer = 0;
    }

    this.executeSingleShot(playerPos, cameraDir, w, world, enemyManager, cameraManager);
  }

  executeSingleShot(playerPos, cameraDir, w, world, enemyManager, cameraManager) {
    w.currentAmmo--;
    this.fireTimer = w.fireDelay;

    // Distinct Authentic Audio for each gun
    if (w.id === 'glock') {
      if (w.isSuppressed) audio.playGlockSuppressed();
      else audio.playGlockUnsuppressed();
    } else if (w.id === 'mp5' || w.id === 'uzi') {
      audio.playMP5Shot();
    } else if (w.id === 'ak47') {
      audio.playAK47Shot();
    } else if (w.id === 'm16') {
      audio.playM16Shot();
    } else if (w.id === 'svd') {
      audio.playSVDShot();
      setTimeout(() => audio.playBoltCycle(), 350);
    }

    if (this.onGunfireAlert) {
      this.onGunfireAlert(playerPos.x, playerPos.z, w.noiseRadius);
    }

    // Recoil
    this.recoilOffset.z = w.recoilX * 1.5;
    this.recoilOffset.y = w.recoilY * 0.8;
    this.recoilRotation.x = w.recoilX * 1.2;

    this.showMuzzleFlash(w);
    this.performRaycast(playerPos, cameraDir, w, world, enemyManager, cameraManager);
  }

  showMuzzleFlash(weapon) {
    if (!this.muzzleFlash) return;
    this.muzzleFlash.position.copy(weapon.muzzlePos);
    this.muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
    const isSupp = (weapon.id === 'glock' && weapon.isSuppressed) || weapon.id === 'mp5';
    const flashScale = isSupp ? 0.35 : (weapon.id === 'ak47' ? 1.35 : (weapon.id === 'svd' ? 1.5 : 1.0));
    this.muzzleFlash.scale.set(flashScale, flashScale, flashScale);
    this.muzzleFlash.visible = true;
    this.muzzleLight.intensity = isSupp ? 0.6 : (weapon.id === 'svd' ? 6.0 : (weapon.id === 'ak47' ? 4.5 : 3.5));
    this.flashTimer = 0.045;
  }

  performRaycast(origin, forwardDir, weapon, world, enemyManager, cameraManager) {
    const spread = (this.isADS || weapon.id === 'svd') ? 0.0018 : (weapon.id === 'glock' ? 0.008 : 0.02);
    const shootDir = forwardDir.clone();
    shootDir.x += (Math.random() - 0.5) * spread;
    shootDir.y += (Math.random() - 0.5) * spread;
    shootDir.z += (Math.random() - 0.5) * spread;
    shootDir.normalize();

    const maxDist = 250;
    let closestDist = maxDist;
    let hitPoint = origin.clone().addScaledVector(shootDir, maxDist);
    let hitNormal = new THREE.Vector3(0, 1, 0);
    let hitTarget = null;
    let isHeadshot = false;
    let hitType = 'concrete';

    // 1. Check Destructible Cameras
    if (cameraManager) {
      const camHit = cameraManager.checkRaycastHit(origin, shootDir, closestDist);
      if (camHit && camHit.dist < closestDist) {
        closestDist = camHit.dist;
        hitPoint.copy(camHit.hitPoint);
        hitTarget = { type: 'camera', obj: camHit.camera };
        hitType = 'metal';
      }
    }

    // 2. Check Radar Console
    if (world.radarConsolePos && !world.isRadarConsoleDestroyed) {
      const toConsole = world.radarConsolePos.clone().sub(origin);
      const proj = toConsole.dot(shootDir);
      if (proj > 0.5 && proj < closestDist) {
        const closestP = origin.clone().addScaledVector(shootDir, proj);
        if (closestP.distanceTo(world.radarConsolePos) < 1.3) {
          closestDist = proj;
          hitPoint.copy(closestP);
          hitTarget = { type: 'radar_console' };
          hitType = 'metal';
        }
      }
    }

    // 3. Check Enemy Guards (Head vs Body Hitbox)
    if (enemyManager && enemyManager.guards) {
      for (let enemy of enemyManager.guards) {
        if (!enemy.isAlive) continue;
        const ePos = enemy.position;
        const toEnemy = ePos.clone().sub(origin);
        const proj = toEnemy.dot(shootDir);

        if (proj > 0.5 && proj < closestDist) {
          const closestP = origin.clone().addScaledVector(shootDir, proj);
          const dy = closestP.y - ePos.y;
          const distXZ = Math.hypot(closestP.x - ePos.x, closestP.z - ePos.z);

          if (dy >= 0 && dy <= 1.95 && distXZ < 0.55) {
            closestDist = proj;
            hitPoint.copy(closestP);
            isHeadshot = (dy >= 1.45); // Headshot check
            hitTarget = { type: 'enemy', enemy, isHeadshot };
            hitType = 'dirt';
          }
        }
      }
    }

    // 4. Check World Colliders
    for (let c of world.colliders) {
      const t = this.rayAABBIntersect(origin, shootDir, c);
      if (t !== null && t.dist > 0.1 && t.dist < closestDist) {
        closestDist = t.dist;
        hitPoint.copy(origin).addScaledVector(shootDir, t.dist);
        hitNormal.copy(t.normal);
        hitTarget = { type: 'world', surface: c.type || 'concrete' };
        hitType = c.type || 'concrete';
      }
    }

    // Process Hit
    if (hitTarget) {
      if (hitTarget.type === 'enemy') {
        const damage = isHeadshot ? weapon.headDamage : weapon.bodyDamage;
        hitTarget.enemy.takeDamage(damage, isHeadshot, origin);

        if (isHeadshot) {
          audio.playHeadshotDing();
        }

        if (this.onHit) this.onHit(isHeadshot);
        this.decalManager.spawnSurfaceParticles(hitPoint, new THREE.Vector3(0, 1, 0), 'dirt');
      } else if (hitTarget.type === 'camera') {
        hitTarget.obj.takeDamage(weapon.bodyDamage, hitPoint);
        this.decalManager.spawnDecal(hitPoint, new THREE.Vector3(0, 0, 1), 'camera');
      } else if (hitTarget.type === 'radar_console') {
        world.damageRadarConsole(weapon.bodyDamage);
        this.decalManager.spawnDecal(hitPoint, new THREE.Vector3(0, 0, 1), 'metal');
      } else if (hitTarget.type === 'world') {
        this.decalManager.spawnDecal(hitPoint, hitNormal, hitType);
      }
    }

    // Bullet Tracer
    const muzzleWorld = this.viewmodelGroup.localToWorld(weapon.muzzlePos.clone());
    this.spawnTracer(muzzleWorld, hitPoint);
  }

  rayAABBIntersect(origin, dir, box) {
    let tmin = 0;
    let tmax = 250;
    let normal = new THREE.Vector3();

    // X
    if (Math.abs(dir.x) < 1e-6) {
      if (origin.x < box.minX || origin.x > box.maxX) return null;
    } else {
      let t1 = (box.minX - origin.x) / dir.x;
      let t2 = (box.maxX - origin.x) / dir.x;
      let n1 = new THREE.Vector3(-1, 0, 0);
      if (t1 > t2) { let tmp = t1; t1 = t2; t2 = tmp; n1.set(1, 0, 0); }
      if (t1 > tmin) { tmin = t1; normal.copy(n1); }
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }

    // Y
    if (Math.abs(dir.y) < 1e-6) {
      if (origin.y < box.minY || origin.y > box.maxY) return null;
    } else {
      let t1 = (box.minY - origin.y) / dir.y;
      let t2 = (box.maxY - origin.y) / dir.y;
      let n1 = new THREE.Vector3(0, -1, 0);
      if (t1 > t2) { let tmp = t1; t1 = t2; t2 = tmp; n1.set(0, 1, 0); }
      if (t1 > tmin) { tmin = t1; normal.copy(n1); }
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }

    // Z
    if (Math.abs(dir.z) < 1e-6) {
      if (origin.z < box.minZ || origin.z > box.maxZ) return null;
    } else {
      let t1 = (box.minZ - origin.z) / dir.z;
      let t2 = (box.maxZ - origin.z) / dir.z;
      let n1 = new THREE.Vector3(0, 0, -1);
      if (t1 > t2) { let tmp = t1; t1 = t2; t2 = tmp; n1.set(0, 0, 1); }
      if (t1 > tmin) { tmin = t1; normal.copy(n1); }
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }

    return tmin > 0 ? { dist: tmin, normal } : null;
  }

  spawnTracer(start, end) {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffea77,
      transparent: true,
      opacity: 0.95
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.tracers.push({ mesh: line, life: 0.08 });
  }

  updateBinocularRecon(delta, playerPos, forwardDir, world, enemyManager) {
    const origin = playerPos ? playerPos.clone() : this.camera.position.clone();
    if (playerPos && Math.abs(origin.y - playerPos.y) < 0.2) {
      origin.y += 1.65;
    }
    const dir = forwardDir ? forwardDir.clone() : this.camera.getWorldDirection(new THREE.Vector3());

    let closestDist = 500.0;
    let closestEnemy = null;

    // 1. Raycast against world colliders (buildings, walls, containers)
    if (world && world.colliders) {
      for (const c of world.colliders) {
        const t = this.rayAABBIntersect(origin, dir, c);
        if (t !== null && t.dist > 0.5 && t.dist < closestDist) {
          closestDist = t.dist;
        }
      }
    }

    // 2. Terrain ground check if looking down
    if (dir.y < -0.01 && origin.y > 0) {
      const distToGround = origin.y / (-dir.y);
      if (distToGround > 0.5 && distToGround < closestDist) {
        closestDist = distToGround;
      }
    }

    // 3. Scan for enemy guards in crosshair view
    if (enemyManager && enemyManager.guards) {
      for (const enemy of enemyManager.guards) {
        if (!enemy.isAlive) continue;
        const ePos = enemy.position;
        const toEnemy = ePos.clone().sub(origin);
        const proj = toEnemy.dot(dir);

        // Guard must be closer than whatever terrain or wall is in front of them
        if (proj > 1.0 && proj < closestDist) {
          const closestP = origin.clone().addScaledVector(dir, proj);
          const dy = closestP.y - ePos.y;
          const distXZ = Math.hypot(closestP.x - ePos.x, closestP.z - ePos.z);

          // Generous alignment cone for optical binoculars
          const maxTol = Math.max(0.75, proj * 0.025);
          if (dy >= -0.2 && dy <= 2.2 && distXZ <= maxTol) {
            closestEnemy = enemy;
            closestDist = proj;
          }
        }
      }
    }

    this.binocularRangeMeters = Math.min(500, Math.round(closestDist));

    if (closestEnemy) {
      if (this.binocularFocusEnemy === closestEnemy) {
        this.binocularTagTimer += delta;
        if (this.binocularTagTimer >= 1.0 && !closestEnemy.isTagged) {
          closestEnemy.isTagged = true;
          audio.playTagBeep();
        }
      } else {
        this.binocularFocusEnemy = closestEnemy;
        this.binocularTagTimer = 0;
      }
    } else {
      this.binocularFocusEnemy = null;
      this.binocularTagTimer = 0;
    }
  }

  update(delta, isMoving, isSprinting, stance, isThirdPerson = false, playerPos = null, forwardDir = null, world = null, enemyManager = null) {
    // Hide viewmodel in 3rd person
    this.viewmodelGroup.visible = !isThirdPerson;

    const w = this.getCurrentWeapon();

    if (this.fireTimer > 0) this.fireTimer -= delta;

    // M16 Burst mode update
    if (w.id === 'm16' && w.isBurstMode && w.burstShotsRemaining > 0) {
      w.burstTimer -= delta;
      if (w.burstTimer <= 0 && w.currentAmmo > 0) {
        w.burstShotsRemaining--;
        w.burstTimer = 0.08;
        // Audio & flash for burst shots
        audio.playM16Shot();
        this.showMuzzleFlash(w);
      }
    }

    if (this.isReloading) {
      this.reloadTimer -= delta;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        const needed = w.magSize - w.currentAmmo;
        const available = Math.min(needed, w.reserveAmmo);
        w.currentAmmo += available;
        w.reserveAmmo -= available;
      }
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      if (this.flashTimer <= 0 && this.muzzleFlash) {
        this.muzzleFlash.visible = false;
        this.muzzleLight.intensity = 0;
      }
    }

    // Tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= delta;
      t.mesh.material.opacity = t.life / 0.08;
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        t.mesh.material.dispose();
        this.tracers.splice(i, 1);
      }
    }

    // ADS / Sniper Scope / Binoculars FOV Zoom
    let targetFOV = this.baseFOV;
    if (this.isBinocularsActive) {
      targetFOV = this.baseFOV / this.binocularZoom;
    } else if (this.isADS) {
      if (w.id === 'svd') {
        targetFOV = this.baseFOV / this.svdZoom;
      } else {
        targetFOV = this.adsFOV;
      }
    }

    const isZooming = (this.isADS || this.isBinocularsActive);
    this.adsProgress = THREE.MathUtils.lerp(this.adsProgress, isZooming ? 1 : 0, 14 * delta);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, 14 * delta);
    this.camera.updateProjectionMatrix();

    // Ensure strictly only the equipped weapon is visible (hidden during SVD scope or Binoculars)
    this.weapons.forEach((weapon, i) => {
      if (weapon.mesh) {
        if (i === this.currentWeaponIndex && !isThirdPerson && !this.isBinocularsActive) {
          const hideForScope = (weapon.id === 'svd' && this.isADS && this.adsProgress > 0.45);
          weapon.mesh.visible = !hideForScope;
        } else {
          weapon.mesh.visible = false;
        }
      }
    });

    // Update Tactical Binoculars target scanning & auto-tagging
    if (this.isBinocularsActive) {
      this.updateBinocularRecon(delta, playerPos, forwardDir, world, enemyManager);
    }

    // Sway lerp
    this.currentSway.lerp(this.targetSway, 10 * delta);
    this.targetSway.set(0, 0);

    // Sprint tilt
    const targetTilt = isSprinting ? -0.4 : 0;
    this.sprintTilt = THREE.MathUtils.lerp(this.sprintTilt, targetTilt, 10 * delta);

    // Walking Bobbing
    let bobX = 0;
    let bobY = 0;
    if (isMoving) {
      const bobFreq = isSprinting ? 12 : (stance === 'crouch' ? 5 : 8);
      const bobAmp = this.isADS ? 0.001 : (isSprinting ? 0.016 : 0.007);
      this.bobTimer += delta * bobFreq;
      bobX = Math.cos(this.bobTimer) * bobAmp;
      bobY = Math.abs(Math.sin(this.bobTimer)) * bobAmp;
    } else {
      this.bobTimer = 0;
    }

    this.recoilOffset.lerp(new THREE.Vector3(0, 0, 0), 12 * delta);
    this.recoilRotation.lerp(new THREE.Vector3(0, 0, 0), 12 * delta);

    if (w.mesh) {
      const targetPos = new THREE.Vector3().lerpVectors(w.hipPos, w.adsPos, this.adsProgress);
      w.mesh.position.set(
        targetPos.x + this.currentSway.x + bobX,
        targetPos.y + this.currentSway.y + bobY + this.recoilOffset.y,
        targetPos.z + this.recoilOffset.z
      );

      const hipRotY = -0.065;
      const hipRotZ = 0.045;
      const currentRotY = THREE.MathUtils.lerp(hipRotY, 0, this.adsProgress) + this.currentSway.x * 0.8;
      const currentRotZ = THREE.MathUtils.lerp(hipRotZ, 0, this.adsProgress);

      // Reload drop
      if (this.isReloading) {
        const reloadProg = this.reloadTimer / w.reloadTime;
        const reloadDrop = Math.sin(reloadProg * Math.PI) * 0.12;
        w.mesh.position.y -= reloadDrop;
        w.mesh.rotation.z = -reloadDrop * 2;
      } else {
        w.mesh.rotation.z = currentRotZ;
      }

      w.mesh.rotation.x = this.recoilRotation.x + this.sprintTilt;
      w.mesh.rotation.y = currentRotY;
    }
  }
}
