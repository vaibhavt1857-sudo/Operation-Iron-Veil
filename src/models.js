import * as THREE from 'three';
import { textures } from './textures.js';

export class ModelFactory {
  // 1. Military Transport 6x6 Truck (Authentic Cold War / Early 2000s Ural Truck)
  static buildMilitaryTruck(x, y, z, rotationY = 0) {
    const truck = new THREE.Group();
    truck.position.set(x, y, z);
    truck.rotation.y = rotationY;

    const bodyMat = new THREE.MeshLambertMaterial({
      map: textures.getRustedMetalTexture('olive')
    });
    const darkMetalMat = new THREE.MeshLambertMaterial({ color: 0x1f2326 });
    const tireMat = new THREE.MeshLambertMaterial({ color: 0x151618 });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x334e5a, transparent: true, opacity: 0.65 });
    const canvasMat = new THREE.MeshLambertMaterial({ map: textures.getCamoNetTexture() });

    // Chassis frame
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 8.2), darkMetalMat);
    chassis.position.set(0, 0.9, 0);
    chassis.castShadow = true;
    truck.add(chassis);

    // Front Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.6), bodyMat);
    cab.position.set(0, 2.1, 2.6);
    cab.castShadow = true;
    truck.add(cab);

    // Hood / Engine Bay
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 1.8), bodyMat);
    hood.position.set(0, 1.65, 4.2);
    hood.castShadow = true;
    truck.add(hood);

    // Windshield Glass
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 0.1), glassMat);
    windshield.position.set(0, 2.4, 3.91);
    truck.add(windshield);

    // Front Grille & Bumper
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.4, 0.4), darkMetalMat);
    bumper.position.set(0, 0.9, 5.2);
    truck.add(bumper);

    // Round Headlights
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff0aa });
    const hlGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.15, 8);
    const hl1 = new THREE.Mesh(hlGeo, lightMat);
    hl1.rotation.x = Math.PI / 2;
    hl1.position.set(-0.85, 1.6, 5.12);
    const hl2 = new THREE.Mesh(hlGeo, lightMat);
    hl2.rotation.x = Math.PI / 2;
    hl2.position.set(0.85, 1.6, 5.12);
    truck.add(hl1, hl2);

    // Rear Cargo Bed
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 5.2), bodyMat);
    bed.position.set(0, 1.6, -1.3);
    bed.castShadow = true;
    truck.add(bed);

    // Curved Canvas Canopy (Camo Net / Tarpaulin)
    const canopyGeo = new THREE.CylinderGeometry(1.35, 1.35, 5.2, 12, 1, false, 0, Math.PI);
    const canopy = new THREE.Mesh(canopyGeo, canvasMat);
    canopy.rotation.x = Math.PI / 2;
    canopy.rotation.z = Math.PI / 2;
    canopy.position.set(0, 2.0, -1.3);
    canopy.castShadow = true;
    truck.add(canopy);

    // 6 Rugged Truck Wheels (2 front, 4 rear tandem)
    const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 12);
    const wheelPositions = [
      [-1.3, 0.55, 3.2], [1.3, 0.55, 3.2],   // Front axle
      [-1.3, 0.55, -0.6], [1.3, 0.55, -0.6], // Rear axle 1
      [-1.3, 0.55, -2.4], [1.3, 0.55, -2.4]  // Rear axle 2
    ];

    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, tireMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      truck.add(wheel);

      // Steel rim hub
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.48, 8), darkMetalMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, wy, wz);
      truck.add(rim);
    });

    return truck;
  }

  // 2. Rotating Parabolic Radar Dish Tower (Communications Outpost)
  static buildRadarDishTower(x, y, z) {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(x, y, z);

    const metalMat = new THREE.MeshLambertMaterial({ color: 0x30353b });
    const dishMat = new THREE.MeshLambertMaterial({ color: 0x6e7882 });

    // 4 Tall Steel Lattice Legs (18m high)
    const legGeo = new THREE.CylinderGeometry(0.2, 0.35, 18, 6);
    const legOffsets = [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]];
    legOffsets.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(lx, 9, lz);
      leg.castShadow = true;
      towerGroup.add(leg);
    });

    // Cross Struts
    for (let h = 3; h <= 15; h += 3.5) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.15, 5.2), metalMat);
      brace.position.set(0, h, 0);
      towerGroup.add(brace);
    }

    // Top Platform (at y = 18m)
    const platform = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.4, 6.5), metalMat);
    platform.position.set(0, 18, 0);
    towerGroup.add(platform);

    // Motor Swivel Mount (Rotates)
    const swivelGroup = new THREE.Group();
    swivelGroup.position.set(0, 18.6, 0);

    const baseMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 1.2, 12), metalMat);
    swivelGroup.add(baseMotor);

    // Parabolic Curved Radar Dish
    const dishGeo = new THREE.SphereGeometry(3.6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.8);
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.rotation.x = Math.PI / 2 - 0.25; // Tilted slightly upwards to sky
    dish.position.set(0, 2.8, -0.6);
    dish.castShadow = true;
    swivelGroup.add(dish);

    // Feed Horn Antenna Mast
    const hornMast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 3.2, 6),
      metalMat
    );
    hornMast.rotation.x = Math.PI / 2 - 0.25;
    hornMast.position.set(0, 2.8, 1.2);
    swivelGroup.add(hornMast);

    // Red Blinking Aviation Light at apex
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2222 })
    );
    beacon.position.set(0, 5.5, -0.8);
    swivelGroup.add(beacon);

    towerGroup.add(swivelGroup);

    return {
      group: towerGroup,
      swivelGroup
    };
  }

  // 3. Sandbag Barricade Emplacement
  static buildSandbagWall(x, y, z, rotationY = 0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotationY;

    const sandMat = new THREE.MeshLambertMaterial({ color: 0x8a7a58 });
    const bagGeo = new THREE.BoxGeometry(0.9, 0.32, 0.45);

    // Staggered rows of sandbags
    for (let row = 0; row < 3; row++) {
      const count = 4;
      const startX = -((count - 1) * 0.85) / 2 + (row % 2 === 1 ? 0.4 : 0);
      for (let i = 0; i < count; i++) {
        const bag = new THREE.Mesh(bagGeo, sandMat);
        bag.position.set(startX + i * 0.85, row * 0.3 + 0.16, 0);
        bag.rotation.y = (Math.random() - 0.5) * 0.08;
        bag.castShadow = true;
        group.add(bag);
      }
    }

    return group;
  }

  // 4. Tall Chain-Link Perimeter Fence with Barbed Wire & Red "STOP" Sign
  static buildChainlinkFence(p1, p2, height = 3.8, withSign = false) {
    const group = new THREE.Group();
    const len = Math.hypot(p2.x - p1.x, p2.z - p1.z);
    const angle = Math.atan2(p2.x - p1.x, p2.z - p1.z);

    const midX = (p1.x + p2.x) / 2;
    const midZ = (p1.z + p2.z) / 2;
    group.position.set(midX, 0, midZ);
    group.rotation.y = angle - Math.PI / 2;

    const metalMat = new THREE.MeshLambertMaterial({ color: 0x485058 });
    const fenceMat = new THREE.MeshLambertMaterial({
      map: textures.getChainlinkFenceTexture(withSign),
      transparent: true,
      alphaTest: 0.25,
      side: THREE.DoubleSide
    });

    // Mesh Plane spanning length
    const meshGeo = new THREE.PlaneGeometry(len, height);
    const meshPlane = new THREE.Mesh(meshGeo, fenceMat);
    meshPlane.position.set(0, height / 2, 0);
    group.add(meshPlane);

    // Vertical Tubular Steel Fence Posts every 3.5m
    const postGeo = new THREE.CylinderGeometry(0.06, 0.07, height + 0.6, 8);
    const postCount = Math.max(2, Math.floor(len / 3.5) + 1);
    for (let i = 0; i < postCount; i++) {
      const px = -len / 2 + (i / (postCount - 1)) * len;
      const post = new THREE.Mesh(postGeo, metalMat);
      post.position.set(px, (height + 0.6) / 2, 0);
      post.castShadow = true;
      group.add(post);

      // Angled 45-degree Barbed Wire Outrigger Arm at Top
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6), metalMat);
      arm.rotation.z = -0.55;
      arm.position.set(px, height + 0.25, 0.2);
      group.add(arm);
    }

    // Top and Bottom Horizontal Rails
    const railGeo = new THREE.CylinderGeometry(0.04, 0.04, len, 8);
    const topRail = new THREE.Mesh(railGeo, metalMat);
    topRail.rotation.z = Math.PI / 2;
    topRail.position.set(0, height, 0);
    const botRail = new THREE.Mesh(railGeo, metalMat);
    botRail.rotation.z = Math.PI / 2;
    botRail.position.set(0, 0.15, 0);
    group.add(topRail, botRail);

    return { group, len, angle, midX, midZ };
  }

  // 5. Giant Cylindrical Fuel Storage Silo / Tank
  static buildFuelStorageTank(x, y, z, radius = 5.2, height = 9.0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const tankMat = new THREE.MeshLambertMaterial({ map: textures.getFuelTankTexture() });
    const concMat = new THREE.MeshLambertMaterial({ map: textures.getConcreteTexture() });
    const hazardMat = new THREE.MeshLambertMaterial({ map: textures.getHazardStripeTexture() });
    const darkMetalMat = new THREE.MeshLambertMaterial({ color: 0x22262a });

    // Concrete containment foundation base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(radius + 1.2, radius + 1.6, 0.8, 24), concMat);
    base.position.set(0, 0.4, 0);
    base.receiveShadow = true;
    group.add(base);

    // Hazard stripe rim around base
    const stripeRim = new THREE.Mesh(new THREE.CylinderGeometry(radius + 1.25, radius + 1.25, 0.4, 24), hazardMat);
    stripeRim.position.set(0, 0.6, 0);
    group.add(stripeRim);

    // Giant Cylindrical Tank Body
    const tankGeo = new THREE.CylinderGeometry(radius, radius, height, 24);
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(0, 0.8 + height / 2, 0);
    tank.castShadow = true;
    tank.receiveShadow = true;
    group.add(tank);

    // Domed Top Roof Cap
    const domeGeo = new THREE.SphereGeometry(radius, 24, 8, 0, Math.PI * 2, 0, Math.PI / 3.2);
    const dome = new THREE.Mesh(domeGeo, tankMat);
    dome.position.set(0, 0.8 + height - 0.2, 0);
    dome.castShadow = true;
    group.add(dome);

    // Steel Ladder on side
    const ladderGroup = new THREE.Group();
    ladderGroup.position.set(0, 0.8, radius + 0.12);

    const railGeo = new THREE.CylinderGeometry(0.03, 0.03, height + 1.2, 6);
    const r1 = new THREE.Mesh(railGeo, darkMetalMat);
    r1.position.set(-0.35, height / 2, 0);
    const r2 = new THREE.Mesh(railGeo, darkMetalMat);
    r2.position.set(0.35, height / 2, 0);
    ladderGroup.add(r1, r2);

    // Ladder rungs
    const rungGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6);
    for (let rh = 0.5; rh < height; rh += 0.5) {
      const rung = new THREE.Mesh(rungGeo, darkMetalMat);
      rung.rotation.z = Math.PI / 2;
      rung.position.set(0, rh, 0);
      ladderGroup.add(rung);
    }
    group.add(ladderGroup);

    // Heavy Industrial Fuel Piping exiting tank
    const pipeGeo = new THREE.CylinderGeometry(0.24, 0.24, 4.2, 12);
    const pipe = new THREE.Mesh(pipeGeo, darkMetalMat);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(radius + 1.8, 1.2, -1.5);
    pipe.castShadow = true;
    group.add(pipe);

    return group;
  }
}
