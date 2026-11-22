// Project IGI Authentic Tactical Satellite Computer Display ("M" Key)
export class SatelliteMap {
  constructor(canvasId, world, player, enemyManager, cameraManager) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.world = world;
    this.player = player;
    this.enemyManager = enemyManager;
    this.cameraManager = cameraManager;

    this.isOpen = false;
    this.width = 640;
    this.height = 640;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // World to map mapping: world Z from +260 to -300, X from -180 to +120
    this.centerWorld = { x: -20, z: -10 };
    this.scale = 1.05; // pixels per world meter
  }

  toggle() {
    this.isOpen = !this.isOpen;
    return this.isOpen;
  }

  worldToMap(wx, wz) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    return {
      x: cx + (wx - this.centerWorld.x) * this.scale,
      y: cy + (wz - this.centerWorld.z) * this.scale
    };
  }

  render(objectivePhase) {
    if (!this.isOpen) return;

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Dark military topographic backdrop
    ctx.fillStyle = '#0a1610';
    ctx.fillRect(0, 0, w, h);

    // Coordinate grid lines
    ctx.strokeStyle = 'rgba(40, 110, 60, 0.25)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // 1. Draw Winding Dirt Roads connecting Installations
    ctx.strokeStyle = '#6a5940';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const roads = [
      // Checkpoint A to Junction
      [ {x: 0, z: 240}, {x: 0, z: 90} ],
      // Junction to Comms Outpost B
      [ {x: 0, z: 90}, {x: -120, z: 0} ],
      // Junction to Main Airbase C
      [ {x: 0, z: 90}, {x: 40, z: -180} ],
      // Comms Outpost B to Main Airbase C
      [ {x: -120, z: 0}, {x: 40, z: -180} ],
      // Main Airbase C to Helipad
      [ {x: 40, z: -180}, {x: 40, z: -260} ]
    ];

    roads.forEach(([start, end]) => {
      const p1 = this.worldToMap(start.x, start.z);
      const p2 = this.worldToMap(end.x, end.z);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    // Road dashed center line
    ctx.strokeStyle = '#8a7958';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    roads.forEach(([start, end]) => {
      const p1 = this.worldToMap(start.x, start.z);
      const p2 = this.worldToMap(end.x, end.z);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // 2. Draw Installation Perimeters & Bases
    // Base A: Checkpoint
    const cp = this.worldToMap(0, 180);
    ctx.fillStyle = 'rgba(60, 140, 80, 0.2)';
    ctx.strokeStyle = '#44dd77';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cp.x - 25, cp.y - 18, 50, 36);
    ctx.fillRect(cp.x - 25, cp.y - 18, 50, 36);
    ctx.fillStyle = '#44dd77';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('OUTER CHECKPOINT [SEC-A]', cp.x - 45, cp.y - 22);

    // Base B: Comms Outpost
    const co = this.worldToMap(-120, 0);
    ctx.fillStyle = 'rgba(60, 140, 80, 0.2)';
    ctx.strokeRect(co.x - 30, co.y - 25, 60, 50);
    ctx.fillRect(co.x - 30, co.y - 25, 60, 50);
    ctx.fillStyle = '#44dd77';
    ctx.fillText('COMMS OUTPOST [SEC-B]', co.x - 45, co.y - 29);

    // Base C: Main Airbase & Bunker
    const ab = this.worldToMap(40, -180);
    ctx.fillStyle = 'rgba(60, 140, 80, 0.2)';
    ctx.strokeRect(ab.x - 45, ab.y - 45, 90, 90);
    ctx.fillRect(ab.x - 45, ab.y - 45, 90, 90);
    ctx.fillStyle = '#44dd77';
    ctx.fillText('COMMAND AIRBASE [SEC-C]', ab.x - 55, ab.y - 50);

    // Extraction Helipad
    const hp = this.worldToMap(40, -260);
    ctx.strokeStyle = '#44aaff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hp.x, hp.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#44aaff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('H', hp.x, hp.y);
    ctx.font = 'bold 10px monospace';
    ctx.fillText('EXTRACTION HELIPAD', hp.x, hp.y + 22);

    // 3. Draw Colliders (Buildings, Bunker, Warehouses, Containers)
    ctx.fillStyle = 'rgba(40, 80, 50, 0.7)';
    ctx.strokeStyle = '#55cc77';
    ctx.lineWidth = 1;
    this.world.colliders.forEach(c => {
      const p1 = this.worldToMap(c.minX, c.minZ);
      const p2 = this.worldToMap(c.maxX, c.maxZ);
      ctx.fillRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
      ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
    });

    // 4. Draw Destructible Security Cameras
    this.cameraManager.cameras.forEach(cam => {
      const p = this.worldToMap(cam.position.x, cam.position.z);
      if (cam.isDestroyed) {
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x - 4, p.y - 4); ctx.lineTo(p.x + 4, p.y + 4);
        ctx.moveTo(p.x + 4, p.y - 4); ctx.lineTo(p.x - 4, p.y + 4);
        ctx.stroke();
      } else {
        ctx.fillStyle = cam.isAlarmTriggered ? '#ff2222' : '#33ff55';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Active scan cone
        const currentYaw = cam.baseAngle + cam.currentSweep;
        const start = currentYaw - cam.scanFOV / 2 + Math.PI / 2;
        const end = currentYaw + cam.scanFOV / 2 + Math.PI / 2;
        ctx.fillStyle = cam.isAlarmTriggered ? 'rgba(255, 30, 30, 0.35)' : 'rgba(50, 220, 80, 0.2)';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, cam.scanRange * this.scale, start, end);
        ctx.closePath();
        ctx.fill();
      }
    });

    // 5. Draw Live Enemy Guards & Vision Cones
    this.enemyManager.guards.forEach(g => {
      if (!g.isAlive) return;
      const gp = this.worldToMap(g.position.x, g.position.z);

      let color = '#33ee55';
      let coneAlpha = 'rgba(50, 240, 80, 0.22)';
      if (g.state === 'SUSPICIOUS') {
        color = '#ffcc00';
        coneAlpha = 'rgba(255, 200, 0, 0.35)';
      } else if (g.state === 'ALERT') {
        color = '#ff2222';
        coneAlpha = 'rgba(255, 30, 30, 0.45)';
      }

      const coneLen = g.visionRange * this.scale;
      const guardAngle = g.yaw - Math.PI / 2;
      ctx.fillStyle = coneAlpha;
      ctx.beginPath();
      ctx.moveTo(gp.x, gp.y);
      ctx.arc(gp.x, gp.y, coneLen, guardAngle - g.visionAngle / 2, guardAngle + g.visionAngle / 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(gp.x, gp.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 6. Draw Waypoint Objective Indicators
    let targetPos = this.world.checkpointPos;
    let objLabel = 'OBJ 1: INFILTRATE CHECKPOINT';
    if (objectivePhase === 2) {
      targetPos = this.world.radarConsolePos;
      objLabel = 'OBJ 2: DESTROY RADAR CONSOLE';
    } else if (objectivePhase === 3) {
      targetPos = this.world.terminalPosition;
      objLabel = 'OBJ 3: HACK COMMAND MAINFRAME';
    } else if (objectivePhase === 4) {
      targetPos = this.world.helipadPos;
      objLabel = 'OBJ 4: REACH EXTRACTION HELIPAD';
    }

    const tp = this.worldToMap(targetPos.x, targetPos.z);
    const distToTarget = Math.round(this.player.position.distanceTo(targetPos));

    // Flashing objective marker
    const pulse = Math.sin(Date.now() * 0.006) * 4;
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(tp.x - 8 - pulse / 2, tp.y - 8 - pulse / 2, 16 + pulse, 16 + pulse);

    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${objLabel} [${distToTarget}M]`, tp.x, tp.y - 14);

    // 7. Draw Player GPS Position & Heading Arrow
    const pp = this.worldToMap(this.player.position.x, this.player.position.z);
    ctx.save();
    ctx.translate(pp.x, pp.y);
    ctx.rotate(this.player.yaw);

    ctx.fillStyle = '#00ffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 7);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // Map Header Frame
    ctx.strokeStyle = '#44dd77';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    ctx.fillStyle = '#44dd77';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('// SATELLITE TACTICAL UPLINK // [PRESS M TO CLOSE]', 24, 32);
    ctx.font = '11px monospace';
    ctx.fillText(`GPS COORD: [${Math.round(this.player.position.x)}, ${Math.round(this.player.position.z)}] | SURVEILLANCE: LIVE`, 24, 48);
  }
}
