import * as THREE from 'three';
import { textures } from './textures.js';
import { ModelFactory } from './models.js';
import { audio } from './audio.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // AABB { minX, maxX, minZ, maxZ, minY, maxY, type: 'concrete'|'metal'|'dirt' }

    // Waypoint Positions for Objectives
    this.checkpointPos = new THREE.Vector3(0, 1.0, 180);
    this.commsPos = new THREE.Vector3(-120, 1.0, 0);
    this.bunkerPos = new THREE.Vector3(40, 1.0, -180);
    this.helipadPos = new THREE.Vector3(40, 0.2, -260);

    // Interactive Destructible Radar Console (Objective 2)
    this.radarConsoleMesh = null;
    this.radarConsoleScreen = null;
    this.radarConsolePos = new THREE.Vector3(-118, 1.2, 4);
    this.radarConsoleHealth = 50;
    this.isRadarConsoleDestroyed = false;

    // Central Bunker Mainframe Terminal (Objective 3)
    this.terminalMesh = null;
    this.terminalScreenMesh = null;
    this.terminalPosition = new THREE.Vector3(46.5, 1.2, -184);

    // Radar dish rotating reference
    this.radarDishSwivel = null;

    // Alarm emergency lights
    this.alarmLights = [];

    this.setupLighting();
    this.buildInstallations();
  }

  addCollider(box) {
    this.colliders.push(box);
  }

  setupLighting() {
    // Realistic Authentic Project IGI Blue-Gray Overcast/Horizon Sky Dome
    const skyGeo = new THREE.SphereGeometry(650, 24, 16);
    skyGeo.scale(-1, 1, 1);
    const pos = skyGeo.attributes.position;
    const skyColors = new Float32Array(pos.count * 3);
    const zenith = new THREE.Color(0x3e5266);   // Slate blue zenith
    const midSky = new THREE.Color(0x5c7286);   // Mid atmospheric tone
    const horizon = new THREE.Color(0x8296a8);  // Pale distant horizon haze

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 650;
      let c = horizon.clone();
      if (y > 0.05) {
        c.lerp(midSky, Math.min(1.0, (y - 0.05) * 1.8));
        if (y > 0.35) {
          c.lerp(zenith, Math.min(1.0, (y - 0.35) * 1.8));
        }
      }
      skyColors[i * 3] = c.r;
      skyColors[i * 3 + 1] = c.g;
      skyColors[i * 3 + 2] = c.b;
    }
    skyGeo.setAttribute('color', new THREE.BufferAttribute(skyColors, 3));
    const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, depthWrite: false });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    this.scene.background = new THREE.Color(0x8296a8);

    // Soft daylight ambient light
    const ambientLight = new THREE.AmbientLight(0x7e8f9e, 0.85);
    this.scene.add(ambientLight);

    // Selective Directional Sunlight with tight shadow frustum around player
    this.sunLight = new THREE.DirectionalLight(0xfffaec, 1.25);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 120;
    this.sunLight.shadow.camera.left = -35;
    this.sunLight.shadow.camera.right = 35;
    this.sunLight.shadow.camera.top = 35;
    this.sunLight.shadow.camera.bottom = -35;
    this.sunLight.shadow.bias = -0.0005;

    this.sunLightTarget = new THREE.Object3D();
    this.scene.add(this.sunLightTarget);
    this.sunLight.target = this.sunLightTarget;
    this.scene.add(this.sunLight);

    // Atmospheric Distance Fog (Project IGI style: gentle blue-gray horizon haze)
    this.scene.fog = new THREE.FogExp2(0x8296a8, 0.0028);
  }

  // Update directional sunlight & sky dome position to follow operative
  updateLighting(playerPos, alarmActive, time) {
    if (this.skyDome) {
      this.skyDome.position.set(playerPos.x, 0, playerPos.z);
    }

    // Follow player in X & Z
    this.sunLight.position.set(playerPos.x + 35, playerPos.y + 50, playerPos.z + 25);
    this.sunLightTarget.position.set(playerPos.x, playerPos.y, playerPos.z);

    // Rotate communications radar dish
    if (this.radarDishSwivel) {
      this.radarDishSwivel.rotation.y = time * 0.75;
    }

    // Emergency alarm beacons
    if (this.alarmLights && this.alarmLights.length > 0) {
      if (alarmActive) {
        const pulse = (Math.sin(time * 8) + 1) * 1.6;
        this.alarmLights.forEach(b => {
          b.light.intensity = pulse;
          b.mesh.material.color.setHex(pulse > 1.2 ? 0xff2222 : 0x440000);
        });
      } else {
        this.alarmLights.forEach(b => {
          b.light.intensity = 0;
          b.mesh.material.color.setHex(0x330000);
        });
      }
    }
  }

  buildInstallations() {
    // Base A: Outer Security Checkpoint
    this.buildOuterCheckpoint(0, 180);

    // Base B: Communications Outpost
    this.buildCommsOutpost(-120, 0);

    // Base C: Main Command Airbase & Central Bunker
    this.buildMainAirbase(40, -180);

    // Extraction Helipad
    this.buildHelipad(40, -260);
  }

  // 1. Installation A: Outer Security Checkpoint (z = 180)
  buildOuterCheckpoint(bx, bz) {
    const group = new THREE.Group();
    group.position.set(bx, 0, bz);

    // Ground Textured Gravel & Dirt Yard
    const gravelMat = new THREE.MeshLambertMaterial({ map: textures.getCompoundGravelTexture() });
    const concMat = new THREE.MeshLambertMaterial({ map: textures.getConcreteTexture() });
    const hazardMat = new THREE.MeshLambertMaterial({ map: textures.getHazardStripeTexture() });

    const gravelYard = new THREE.Mesh(new THREE.BoxGeometry(56, 0.2, 28), gravelMat);
    gravelYard.position.set(0, 0.08, 0);
    gravelYard.receiveShadow = true;
    group.add(gravelYard);

    // Road Concrete Apron (barrier crossing pad)
    const slab = new THREE.Mesh(new THREE.BoxGeometry(16, 0.25, 12), concMat);
    slab.position.set(0, 0.12, 0);
    slab.receiveShadow = true;
    group.add(slab);

    // Perimeter Chain-Link Fences with Barbed Wire & STOP Signs
    const leftFence = ModelFactory.buildChainlinkFence(
      new THREE.Vector3(-28, 0, 0),
      new THREE.Vector3(-6, 0, 0),
      3.8,
      true // with red STOP sign
    );
    group.add(leftFence.group);
    this.addCollider({
      minX: bx - 28.5, maxX: bx - 5.5,
      minZ: bz - 0.4, maxZ: bz + 0.4,
      minY: 0, maxY: 3.8, type: 'metal'
    });

    const rightFence = ModelFactory.buildChainlinkFence(
      new THREE.Vector3(5, 0, 0),
      new THREE.Vector3(28, 0, 0),
      3.8,
      true // with red STOP sign
    );
    group.add(rightFence.group);
    this.addCollider({
      minX: bx + 4.8, maxX: bx + 28.5,
      minZ: bz - 0.4, maxZ: bz + 0.4,
      minY: 0, maxY: 3.8, type: 'metal'
    });

    // Security Guard Booth
    const booth = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.4, 4.2), concMat);
    booth.position.set(7.5, 1.7, 0);
    booth.castShadow = true;
    group.add(booth);
    this.addCollider({
      minX: bx + 7.5 - 2.2, maxX: bx + 7.5 + 2.2,
      minZ: bz - 2.2, maxZ: bz + 2.2,
      minY: 0, maxY: 3.5, type: 'concrete'
    });

    // Booth Hazard Stripe Base Skirt
    const boothHazard = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.5, 4.3), hazardMat);
    boothHazard.position.set(7.5, 0.25, 0);
    group.add(boothHazard);

    // Booth Overhang Roof
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 0.35, 5.0),
      new THREE.MeshLambertMaterial({ color: 0x22262a })
    );
    roof.position.set(7.5, 3.5, 0);
    group.add(roof);

    // Booth Windows
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.2, 0.1),
      new THREE.MeshLambertMaterial({ color: 0x335566, transparent: true, opacity: 0.6 })
    );
    glass.position.set(5.39, 1.9, 0);
    glass.rotation.y = Math.PI / 2;
    group.add(glass);

    // Road Barrier Posts & Hazard-Striped Boom Arm (Spanning x = -6 to +4)
    const postMat = new THREE.MeshLambertMaterial({ color: 0x282c30 });
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.6, 8), postMat);
    p1.position.set(-6, 0.8, 0);
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.6, 8), postMat);
    p2.position.set(5, 0.8, 0);
    group.add(p1, p2);

    const boomArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 11, 8),
      hazardMat
    );
    boomArm.rotation.z = Math.PI / 2;
    boomArm.position.set(-0.5, 1.2, 0);
    boomArm.castShadow = true;
    group.add(boomArm);

    this.addCollider({
      minX: bx - 6.2, maxX: bx + 5.2,
      minZ: bz - 0.4, maxZ: bz + 0.4,
      minY: 0, maxY: 1.4, type: 'metal'
    });

    // Sandbag Fortifications on Left & Right
    const sandbagsLeft = ModelFactory.buildSandbagWall(-8.5, 0, 2, 0.2);
    const sandbagsRight = ModelFactory.buildSandbagWall(11, 0, 2, -0.15);
    group.add(sandbagsLeft, sandbagsRight);

    this.addCollider({
      minX: bx - 10.5, maxX: bx - 6.5,
      minZ: bz + 1.2, maxZ: bz + 2.8,
      minY: 0, maxY: 1.2, type: 'dirt'
    });

    // Spotlight Pole with warm illumination
    const spotPole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 6), postMat);
    spotPole.position.set(6.5, 3.0, 3.5);
    group.add(spotPole);

    const spotFixture = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 0.9, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff0bb })
    );
    spotFixture.rotation.x = Math.PI / 3;
    spotFixture.position.set(6.5, 6.0, 3.5);
    group.add(spotFixture);

    const checkLight = new THREE.PointLight(0xffea99, 1.4, 18);
    checkLight.position.set(6.5, 5.8, 3.5);
    group.add(checkLight);

    this.scene.add(group);
  }

  // 2. Installation B: Communications Outpost (x = -120, z = 0)
  buildCommsOutpost(bx, bz) {
    const group = new THREE.Group();
    group.position.set(bx, 0, bz);

    const concMat = new THREE.MeshLambertMaterial({ map: textures.getConcreteTexture() });
    const metalMat = new THREE.MeshLambertMaterial({ map: textures.getRustedMetalTexture('olive') });

    // Concrete Base Slab
    const slab = new THREE.Mesh(new THREE.BoxGeometry(42, 0.3, 36), concMat);
    slab.position.set(0, 0.15, 0);
    slab.receiveShadow = true;
    group.add(slab);

    // Communications Barracks Building (14m x 9m x 4m)
    const barracks = new THREE.Mesh(new THREE.BoxGeometry(14, 4.0, 9), metalMat);
    barracks.position.set(-6, 2.0, 2);
    barracks.castShadow = true;
    group.add(barracks);

    this.addCollider({
      minX: bx - 13.2, maxX: bx + 1.2,
      minZ: bz - 2.7, maxZ: bz + 6.7,
      minY: 0, maxY: 4.0, type: 'metal'
    });

    // Barracks Entrance Doorway opening
    const doorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.8, 0.2),
      new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
    );
    doorFrame.position.set(-6, 1.4, 6.51);
    group.add(doorFrame);

    // Rotating Radar Dish Tower
    const tower = ModelFactory.buildRadarDishTower(12, 0, -4);
    this.radarDishSwivel = tower.swivelGroup;
    group.add(tower.group);

    this.addCollider({
      minX: bx + 12 - 3.2, maxX: bx + 12 + 3.2,
      minZ: bz - 4 - 3.2, maxZ: bz - 4 + 3.2,
      minY: 0, maxY: 18, type: 'metal'
    });

    // Destructible Radar Control Console (Objective 2)
    this.buildRadarControlConsole(bx + 2, bz + 4);

    // Exterior Shipping Containers
    const crate1 = new THREE.Mesh(
      new THREE.BoxGeometry(6.5, 2.8, 2.6),
      new THREE.MeshLambertMaterial({ map: textures.getRustedMetalTexture('rust') })
    );
    crate1.position.set(10, 1.4, 10);
    crate1.rotation.y = 0.2;
    crate1.castShadow = true;
    group.add(crate1);

    this.addCollider({
      minX: bx + 10 - 3.5, maxX: bx + 10 + 3.5,
      minZ: bz + 10 - 1.6, maxZ: bz + 10 + 1.6,
      minY: 0, maxY: 2.8, type: 'metal'
    });

    this.scene.add(group);
  }

  // Destructible Radar Control Station (Objective 2)
  buildRadarControlConsole(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Computer Cabinet Desk
    const deskMat = new THREE.MeshLambertMaterial({ color: 0x24282c });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 1.2), deskMat);
    desk.position.set(0, 0.55, 0);
    desk.castShadow = true;
    group.add(desk);

    // Upper Electronics Rack Housing
    const rack = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.5), deskMat);
    rack.position.set(0, 1.7, -0.3);
    rack.castShadow = true;
    group.add(rack);

    // Radar Screen Monitor
    const screenGeo = new THREE.PlaneGeometry(1.4, 0.9);
    const screenMat = new THREE.MeshBasicMaterial({
      map: textures.getRadarConsoleTexture(false)
    });
    this.radarConsoleScreen = new THREE.Mesh(screenGeo, screenMat);
    this.radarConsoleScreen.position.set(0, 1.7, -0.04);
    group.add(this.radarConsoleScreen);

    // Screen Glow Light
    this.radarConsoleLight = new THREE.PointLight(0x44ff77, 1.2, 6);
    this.radarConsoleLight.position.set(0, 1.8, 0.4);
    group.add(this.radarConsoleLight);

    this.radarConsoleMesh = group;
    this.radarConsolePos.set(x, 1.2, z);
    this.scene.add(group);

    this.addCollider({
      minX: x - 1.3, maxX: x + 1.3,
      minZ: z - 0.7, maxZ: z + 0.7,
      minY: 0, maxY: 2.4, type: 'metal'
    });
  }

  // Damage / Destroy Radar Console
  damageRadarConsole(amount) {
    if (this.isRadarConsoleDestroyed) return;

    this.radarConsoleHealth -= amount;
    if (this.radarConsoleHealth <= 0) {
      this.destroyRadarConsole();
    }
  }

  destroyRadarConsole() {
    this.isRadarConsoleDestroyed = true;
    this.radarConsoleHealth = 0;

    audio.playDestructionExplosion();

    // Update screen texture to cracked offline screen
    if (this.radarConsoleScreen) {
      this.radarConsoleScreen.material.map = textures.getRadarConsoleTexture(true);
      this.radarConsoleScreen.material.needsUpdate = true;
    }

    // Turn off glow light
    if (this.radarConsoleLight) {
      this.radarConsoleLight.intensity = 0;
    }
  }

  // 3. Installation C: Main Command Airbase & Central Fortified Bunker (x = 40, z = -180)
  buildMainAirbase(bx, bz) {
    const group = new THREE.Group();
    group.position.set(bx, 0, bz);

    const concMat = new THREE.MeshLambertMaterial({ map: textures.getConcreteTexture() });
    const rustMetalMat = new THREE.MeshLambertMaterial({ map: textures.getRustedMetalTexture('rust') });
    const blueMetalMat = new THREE.MeshLambertMaterial({ map: textures.getRustedMetalTexture('blue') });

    // Compound Ground Slab (65m x 65m)
    const baseSlab = new THREE.Mesh(new THREE.BoxGeometry(68, 0.3, 68), concMat);
    baseSlab.position.set(0, 0.15, 0);
    baseSlab.receiveShadow = true;
    group.add(baseSlab);

    // Large Aircraft Maintenance Hangar / Warehouse (x = -16, z = 12)
    const hangarGeo = new THREE.BoxGeometry(22, 7.5, 18);
    const hangar = new THREE.Mesh(hangarGeo, rustMetalMat);
    hangar.position.set(-16, 3.75, 12);
    hangar.castShadow = true;
    group.add(hangar);

    this.addCollider({
      minX: bx - 27.2, maxX: bx - 4.8,
      minZ: bz + 2.8, maxZ: bz + 21.2,
      minY: 0, maxY: 7.5, type: 'metal'
    });

    // Military Ural Truck parked near hangar
    const truck = ModelFactory.buildMilitaryTruck(bx - 14, 0.2, bz - 8, Math.PI / 3);
    this.scene.add(truck);
    this.addCollider({
      minX: bx - 18, maxX: bx - 10,
      minZ: bz - 12, maxZ: bz - 4,
      minY: 0, maxY: 3.5, type: 'metal'
    });

    // 2 Watchtowers (NW and SE corners)
    this.buildWatchtower(bx - 26, bz - 26);
    this.buildWatchtower(bx + 26, bz + 26);

    // Stacks of Shipping Containers
    const containerLayouts = [
      { lx: 14, lz: 16, rot: 0, color: 'blue' },
      { lx: 14, lz: 12, rot: 0, color: 'rust' },
      { lx: 18, lz: -12, rot: Math.PI / 2, color: 'olive' },
      { lx: -4, lz: -22, rot: 0.1, color: 'blue' }
    ];

    containerLayouts.forEach(c => {
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(7.5, 2.8, 3.0),
        new THREE.MeshLambertMaterial({ map: textures.getRustedMetalTexture(c.color) })
      );
      crate.position.set(c.lx, 1.4, c.lz);
      crate.rotation.y = c.rot;
      crate.castShadow = true;
      group.add(crate);

      this.addCollider({
        minX: bx + c.lx - 4.0, maxX: bx + c.lx + 4.0,
        minZ: bz + c.lz - 2.0, maxZ: bz + c.lz + 2.0,
        minY: 0, maxY: 2.8, type: 'metal'
      });
    });

    // Giant Cylindrical Fuel Storage Silos / Tanks
    const tank1 = ModelFactory.buildFuelStorageTank(-18, 0, -18, 4.8, 8.5);
    const tank2 = ModelFactory.buildFuelStorageTank(-6, 0, -18, 4.8, 8.5);
    group.add(tank1, tank2);

    this.addCollider({
      minX: bx - 18 - 5.2, maxX: bx - 18 + 5.2,
      minZ: bz - 18 - 5.2, maxZ: bz - 18 + 5.2,
      minY: 0, maxY: 9.5, type: 'metal'
    });
    this.addCollider({
      minX: bx - 6 - 5.2, maxX: bx - 6 + 5.2,
      minZ: bz - 18 - 5.2, maxZ: bz - 18 + 5.2,
      minY: 0, maxY: 9.5, type: 'metal'
    });

    // Perimeter Chain-Link Fences with Barbed Wire & STOP Signs around Main Airbase
    const fNorth = ModelFactory.buildChainlinkFence(new THREE.Vector3(-34, 0, -34), new THREE.Vector3(34, 0, -34), 3.8, true);
    const fWest = ModelFactory.buildChainlinkFence(new THREE.Vector3(-34, 0, -34), new THREE.Vector3(-34, 0, 34), 3.8, false);
    const fEast = ModelFactory.buildChainlinkFence(new THREE.Vector3(34, 0, -34), new THREE.Vector3(34, 0, 34), 3.8, false);
    const fSouthL = ModelFactory.buildChainlinkFence(new THREE.Vector3(-34, 0, 34), new THREE.Vector3(-7, 0, 34), 3.8, true);
    const fSouthR = ModelFactory.buildChainlinkFence(new THREE.Vector3(7, 0, 34), new THREE.Vector3(34, 0, 34), 3.8, true);
    group.add(fNorth.group, fWest.group, fEast.group, fSouthL.group, fSouthR.group);

    this.addCollider({ minX: bx - 34.5, maxX: bx + 34.5, minZ: bz - 34.5, maxZ: bz - 33.5, minY: 0, maxY: 3.8, type: 'metal' });
    this.addCollider({ minX: bx - 34.5, maxX: bx - 33.5, minZ: bz - 34.5, maxZ: bz + 34.5, minY: 0, maxY: 3.8, type: 'metal' });
    this.addCollider({ minX: bx + 33.5, maxX: bx + 34.5, minZ: bz - 34.5, maxZ: bz + 34.5, minY: 0, maxY: 3.8, type: 'metal' });
    this.addCollider({ minX: bx - 34.5, maxX: bx - 6.5, minZ: bz + 33.5, maxZ: bz + 34.5, minY: 0, maxY: 3.8, type: 'metal' });
    this.addCollider({ minX: bx + 6.5, maxX: bx + 34.5, minZ: bz + 33.5, maxZ: bz + 34.5, minY: 0, maxY: 3.8, type: 'metal' });

    // Central Concrete Command Bunker Structure (x = 0, z = -14)
    this.buildCentralCommandBunker(bx, bz - 14);

    this.scene.add(group);
  }

  // Watchtower Builder
  buildWatchtower(wx, wz) {
    const tower = new THREE.Group();
    tower.position.set(wx, 0, wz);

    const metalMat = new THREE.MeshLambertMaterial({ color: 0x2a2f35 });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x484036 });

    // 4 Support Legs (10m high)
    const legGeo = new THREE.CylinderGeometry(0.22, 0.22, 10, 6);
    const legOffsets = [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]];
    legOffsets.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(lx, 5, lz);
      leg.castShadow = true;
      tower.add(leg);
    });

    // Observation Cabin Platform (at y = 10m)
    const platform = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.4, 6.4), woodMat);
    platform.position.set(0, 10, 0);
    tower.add(platform);

    // Cabin Walls
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 2.8, 5.6),
      new THREE.MeshLambertMaterial({ map: textures.getConcreteTexture() })
    );
    cabin.position.set(0, 11.6, 0);
    cabin.castShadow = true;
    tower.add(cabin);

    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.3, 6.6), metalMat);
    roof.position.set(0, 13.1, 0);
    tower.add(roof);

    this.scene.add(tower);

    this.addCollider({
      minX: wx - 3.2, maxX: wx + 3.2,
      minZ: wz - 3.2, maxZ: wz + 3.2,
      minY: 0, maxY: 13.5, type: 'metal'
    });
  }

  // Fortified Command Bunker with Accessible Interior Server Room
  buildCentralCommandBunker(bx, bz) {
    const bW = 20;
    const bD = 15;
    const bH = 4.5;
    const wallThick = 0.8;

    const concreteMat = new THREE.MeshLambertMaterial({ map: textures.getConcreteTexture() });
    const hazardMat = new THREE.MeshLambertMaterial({ map: textures.getHazardStripeTexture() });
    const darkMetalMat = new THREE.MeshLambertMaterial({ color: 0x22262a });
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x3d434a });
    const redValveMat = new THREE.MeshLambertMaterial({ color: 0xaa2222 });

    const bunkerGroup = new THREE.Group();
    bunkerGroup.position.set(bx, 0, bz);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(bW, 0.3, bD),
      new THREE.MeshLambertMaterial({ color: 0x30353b })
    );
    floor.position.set(0, 0.15, 0);
    bunkerGroup.add(floor);

    // Roof Slab with beveled overhang
    const roof = new THREE.Mesh(new THREE.BoxGeometry(bW + 2.4, 0.8, bD + 2.4), concreteMat);
    roof.position.set(0, bH, 0);
    roof.castShadow = true;
    bunkerGroup.add(roof);

    // North Wall (Solid)
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, wallThick), concreteMat);
    northWall.position.set(0, bH / 2, -bD / 2);
    northWall.castShadow = true;
    bunkerGroup.add(northWall);
    this.addCollider({
      minX: bx - bW / 2, maxX: bx + bW / 2,
      minZ: bz - bD / 2 - wallThick / 2, maxZ: bz - bD / 2 + wallThick / 2,
      minY: 0, maxY: bH, type: 'concrete'
    });

    // West Wall (Solid)
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, bH, bD), concreteMat);
    westWall.position.set(-bW / 2, bH / 2, 0);
    westWall.castShadow = true;
    bunkerGroup.add(westWall);
    this.addCollider({
      minX: bx - bW / 2 - wallThick / 2, maxX: bx - bW / 2 + wallThick / 2,
      minZ: bz - bD / 2, maxZ: bz + bD / 2,
      minY: 0, maxY: bH, type: 'concrete'
    });

    // East Wall (Solid)
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, bH, bD), concreteMat);
    eastWall.position.set(bW / 2, bH / 2, 0);
    eastWall.castShadow = true;
    bunkerGroup.add(eastWall);
    this.addCollider({
      minX: bx + bW / 2 - wallThick / 2, maxX: bx + bW / 2 + wallThick / 2,
      minZ: bz - bD / 2, maxZ: bz + bD / 2,
      minY: 0, maxY: bH, type: 'concrete'
    });

    // South Wall with 3.8m Entrance Doorway
    const doorWidth = 3.8;
    const sideLen = (bW - doorWidth) / 2;

    const southLeft = new THREE.Mesh(new THREE.BoxGeometry(sideLen, bH, wallThick), concreteMat);
    southLeft.position.set(-bW / 2 + sideLen / 2, bH / 2, bD / 2);
    southLeft.castShadow = true;
    bunkerGroup.add(southLeft);
    this.addCollider({
      minX: bx - bW / 2, maxX: bx - doorWidth / 2,
      minZ: bz + bD / 2 - wallThick / 2, maxZ: bz + bD / 2 + wallThick / 2,
      minY: 0, maxY: bH, type: 'concrete'
    });

    const southRight = new THREE.Mesh(new THREE.BoxGeometry(sideLen, bH, wallThick), concreteMat);
    southRight.position.set(bW / 2 - sideLen / 2, bH / 2, bD / 2);
    southRight.castShadow = true;
    bunkerGroup.add(southRight);
    this.addCollider({
      minX: bx + doorWidth / 2, maxX: bx + bW / 2,
      minZ: bz + bD / 2 - wallThick / 2, maxZ: bz + bD / 2 + wallThick / 2,
      minY: 0, maxY: bH, type: 'concrete'
    });

    // Lower Hazard Warning Stripe Skirts (0.6m high along base of all outer walls)
    const hzNorth = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.1, 0.6, 0.08), hazardMat);
    hzNorth.position.set(0, 0.3, -bD / 2 - wallThick / 2 - 0.04);
    const hzWest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, bD + 0.1), hazardMat);
    hzWest.position.set(-bW / 2 - wallThick / 2 - 0.04, 0.3, 0);
    const hzEast = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, bD + 0.1), hazardMat);
    hzEast.position.set(bW / 2 + wallThick / 2 + 0.04, 0.3, 0);
    const hzSouthL = new THREE.Mesh(new THREE.BoxGeometry(sideLen, 0.6, 0.08), hazardMat);
    hzSouthL.position.set(-bW / 2 + sideLen / 2, 0.3, bD / 2 + wallThick / 2 + 0.04);
    const hzSouthR = new THREE.Mesh(new THREE.BoxGeometry(sideLen, 0.6, 0.08), hazardMat);
    hzSouthR.position.set(bW / 2 - sideLen / 2, 0.3, bD / 2 + wallThick / 2 + 0.04);
    bunkerGroup.add(hzNorth, hzWest, hzEast, hzSouthL, hzSouthR);

    // Sloped Concrete Blast Ramparts / Angled Buttresses (West, East, North)
    const rampartPositions = [
      { x: -bW / 2 - 0.6, z: -3.5, rx: 0, rz: 0.35 },
      { x: -bW / 2 - 0.6, z: 3.5, rx: 0, rz: 0.35 },
      { x: bW / 2 + 0.6, z: -3.5, rx: 0, rz: -0.35 },
      { x: bW / 2 + 0.6, z: 3.5, rx: 0, rz: -0.35 },
      { x: -5, z: -bD / 2 - 0.6, rx: -0.35, rz: 0 },
      { x: 5, z: -bD / 2 - 0.6, rx: -0.35, rz: 0 }
    ];
    rampartPositions.forEach(rp => {
      const buttress = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4.2, 1.4), concreteMat);
      buttress.position.set(rp.x, 2.0, rp.z);
      buttress.rotation.x = rp.rx;
      buttress.rotation.z = rp.rz;
      buttress.castShadow = true;
      bunkerGroup.add(buttress);
    });

    // Heavy Steel Sliding Blast Doors with Lock Wheels in South Doorway
    const doorTrack = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 1.2, 0.25, 0.35), darkMetalMat);
    doorTrack.position.set(0, 3.4, bD / 2 + 0.15);
    bunkerGroup.add(doorTrack);

    // Left Blast Door (slid slightly open)
    const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 0.18), steelMat);
    leftDoor.position.set(-1.1, 1.6, bD / 2 + 0.1);
    leftDoor.castShadow = true;
    bunkerGroup.add(leftDoor);

    // Right Blast Door (slid slightly open)
    const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 0.18), steelMat);
    rightDoor.position.set(1.1, 1.6, bD / 2 + 0.1);
    rightDoor.castShadow = true;
    bunkerGroup.add(rightDoor);

    // Red Circular Lock Wheels on doors
    [-1.1, 1.1].forEach(dx => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(dx, 1.6, bD / 2 + 0.22);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 8, 16), redValveMat);
      wheelGroup.add(rim);

      const cross1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), darkMetalMat);
      const cross2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), darkMetalMat);
      cross2.rotation.z = Math.PI / 2;
      wheelGroup.add(cross1, cross2);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 8), darkMetalMat);
      hub.rotation.x = Math.PI / 2;
      wheelGroup.add(hub);

      bunkerGroup.add(wheelGroup);
    });

    // Doorway Header Lintel
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth, 1.0, wallThick * 1.5),
      new THREE.MeshLambertMaterial({ color: 0xcca020 })
    );
    lintel.position.set(0, bH - 0.5, bD / 2);
    bunkerGroup.add(lintel);

    // Warm Exterior Entrance Floodlight Fixture
    const lampCasing = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.5), darkMetalMat);
    lampCasing.position.set(0, bH - 0.1, bD / 2 + 0.5);
    lampCasing.rotation.x = 0.2;
    bunkerGroup.add(lampCasing);

    const lampLens = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.35), new THREE.MeshBasicMaterial({ color: 0xffe28a }));
    lampLens.position.set(0, bH - 0.26, bD / 2 + 0.52);
    bunkerGroup.add(lampLens);

    const entranceFlood = new THREE.PointLight(0xffe099, 1.8, 16);
    entranceFlood.position.set(bx, bH - 0.4, bz + bD / 2 + 1.2);
    this.scene.add(entranceFlood);

    // Interior Server Room Partition Wall
    const partWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, bH, 8), concreteMat);
    partWall.position.set(2.5, bH / 2, -2.5);
    bunkerGroup.add(partWall);
    this.addCollider({
      minX: bx + 2.5 - wallThick / 2, maxX: bx + 2.5 + wallThick / 2,
      minZ: bz - 6.5, maxZ: bz + 1.5,
      minY: 0, maxY: bH, type: 'concrete'
    });

    // Mainframe Computer Terminal (Objective 3)
    this.buildMainframeTerminal(bx + 6.5, bz - 4);

    // Server Racks
    const rack1 = this.buildServerRack(bx + 7.5, bz + 2.5);
    const rack2 = this.buildServerRack(bx - 5.5, bz - 3.5);

    // Interior Ambient Point Lights
    const intLight = new THREE.PointLight(0xaaddcc, 2.0, 16);
    intLight.position.set(bx + 5, 3.8, bz - 3);
    this.scene.add(intLight);

    // Red Emergency Alarm Beacons
    const beaconPositions = [
      new THREE.Vector3(bx, 3.8, bz + bD / 2 + 0.5), // Entrance exterior
      new THREE.Vector3(bx + 5, 3.8, bz - 3.5)      // Server room interior
    ];

    beaconPositions.forEach(pos => {
      const rLight = new THREE.PointLight(0xff1111, 0, 14);
      rLight.position.copy(pos);
      this.scene.add(rLight);

      const bulb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.4, 8),
        new THREE.MeshBasicMaterial({ color: 0x440000 })
      );
      bulb.position.copy(pos);
      this.scene.add(bulb);

      this.alarmLights.push({ light: rLight, mesh: bulb });
    });

    this.scene.add(bunkerGroup);
  }

  // Interactive Mainframe Terminal (Objective 3)
  buildMainframeTerminal(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const deskMat = new THREE.MeshLambertMaterial({ color: 0x22262a });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 1.2), deskMat);
    desk.position.set(0, 0.5, 0);
    group.add(desk);

    const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 0.4), new THREE.MeshLambertMaterial({ color: 0x181a1d }));
    monitor.position.set(0, 1.5, -0.2);
    group.add(monitor);

    const screenGeo = new THREE.PlaneGeometry(1.2, 0.8);
    const screenMat = new THREE.MeshBasicMaterial({
      map: textures.getTerminalScreenTexture(false)
    });
    this.terminalScreenMesh = new THREE.Mesh(screenGeo, screenMat);
    this.terminalScreenMesh.position.set(0, 1.5, 0.01);
    group.add(this.terminalScreenMesh);

    const termLight = new THREE.PointLight(0x44dd77, 1.2, 5);
    termLight.position.set(0, 1.6, 0.4);
    group.add(termLight);

    this.terminalMesh = group;
    this.terminalPosition.set(x, 1.2, z);
    this.scene.add(group);

    this.addCollider({
      minX: x - 1.3, maxX: x + 1.3,
      minZ: z - 0.7, maxZ: z + 0.7,
      minY: 0, maxY: 2.0, type: 'metal'
    });
  }

  setTerminalHacked() {
    if (this.terminalScreenMesh) {
      this.terminalScreenMesh.material.map = textures.getTerminalScreenTexture(true);
      this.terminalScreenMesh.material.needsUpdate = true;
    }
  }

  buildServerRack(x, z) {
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 3.2, 1.0),
      new THREE.MeshLambertMaterial({ color: 0x1a1e22 })
    );
    rack.position.set(x, 1.6, z);
    this.scene.add(rack);
    this.addCollider({
      minX: x - 0.65, maxX: x + 0.65,
      minZ: z - 0.55, maxZ: z + 0.55,
      minY: 0, maxY: 3.2, type: 'metal'
    });
  }

  // 4. Extraction Helipad (x = 40, z = -260)
  buildHelipad(hx, hz) {
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(8.5, 8.5, 0.25, 32),
      new THREE.MeshLambertMaterial({ map: textures.getHelipadTexture() })
    );
    pad.position.set(hx, 0.12, hz);
    pad.receiveShadow = true;
    this.scene.add(pad);

    // 8 Blue Runway Perimeter Beacon Lights
    const beaconGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 8);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x44aaff });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const lx = hx + Math.cos(angle) * 8.8;
      const lz = hz + Math.sin(angle) * 8.8;
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(lx, 0.22, lz);
      this.scene.add(beacon);

      const pLight = new THREE.PointLight(0x3399ff, 0.7, 7);
      pLight.position.set(lx, 0.45, lz);
      this.scene.add(pLight);
    }
  }

  // Line of sight raycast obstacle test
  hasLineOfSight(fromPos, toPos) {
    const dir = new THREE.Vector3().subVectors(toPos, fromPos);
    const dist = dir.length();
    if (dist < 0.1) return true;
    dir.normalize();

    for (let c of this.colliders) {
      if (this.rayIntersectsAABB(fromPos, dir, dist, c)) {
        return false;
      }
    }
    return true;
  }

  rayIntersectsAABB(origin, dir, maxDist, box) {
    let tmin = 0;
    let tmax = maxDist;

    // X
    if (Math.abs(dir.x) < 1e-6) {
      if (origin.x < box.minX || origin.x > box.maxX) return false;
    } else {
      let t1 = (box.minX - origin.x) / dir.x;
      let t2 = (box.maxX - origin.x) / dir.x;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }

    // Y
    if (Math.abs(dir.y) < 1e-6) {
      if (origin.y < box.minY || origin.y > box.maxY) return false;
    } else {
      let t1 = (box.minY - origin.y) / dir.y;
      let t2 = (box.maxY - origin.y) / dir.y;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }

    // Z
    if (Math.abs(dir.z) < 1e-6) {
      if (origin.z < box.minZ || origin.z > box.maxZ) return false;
    } else {
      let t1 = (box.minZ - origin.z) / dir.z;
      let t2 = (box.maxZ - origin.z) / dir.z;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return false;
    }

    return true;
  }

  // Player Obstacle Collision Resolution with Wall Sliding
  checkPlayerCollision(pos, radius = 0.45) {
    for (let c of this.colliders) {
      if (pos.y >= c.minY && pos.y <= c.maxY + 1.8) {
        const closestX = Math.max(c.minX, Math.min(pos.x, c.maxX));
        const closestZ = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
        const dx = pos.x - closestX;
        const dz = pos.z - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          if (dist > 0.001) {
            const penetration = radius - dist;
            pos.x += (dx / dist) * penetration;
            pos.z += (dz / dist) * penetration;
          } else {
            pos.z += radius;
          }
        }
      }
    }
  }
}
