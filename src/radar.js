// Project IGI Style 2D Tactical HUD Radar / Minimap
export class TacticalRadar {
  constructor(canvasId, world, player, enemyManager, cameraManager) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.world = world;
    this.player = player;
    this.enemyManager = enemyManager;
    this.cameraManager = cameraManager;

    this.size = 180;
    this.canvas.width = this.size;
    this.canvas.height = this.size;

    this.sweepAngle = 0;
    this.radarRange = 85; // World units radius
  }

  worldToRadar(wx, wz) {
    const px = this.player.position.x;
    const pz = this.player.position.z;

    const rx = wx - px;
    const rz = wz - pz;

    const scale = (this.size / 2) / this.radarRange;
    const cx = this.size / 2;
    const cy = this.size / 2;

    return {
      x: cx + rx * scale,
      y: cy + rz * scale
    };
  }

  render(delta, objectivePhase) {
    const ctx = this.ctx;
    const w = this.size;
    const h = this.size;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w / 2 - 5;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = 'rgba(8, 20, 14, 0.92)';
    ctx.fillRect(0, 0, w, h);

    // Range rings
    ctx.strokeStyle = 'rgba(40, 140, 70, 0.35)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.33, 0, Math.PI * 2);
    ctx.arc(cx, cy, radius * 0.66, 0, Math.PI * 2);
    ctx.arc(cx, cy, radius * 0.98, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair axes
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.stroke();

    // 1. Draw Nearby World Colliders
    ctx.fillStyle = 'rgba(45, 95, 60, 0.65)';
    ctx.strokeStyle = 'rgba(70, 180, 100, 0.85)';
    ctx.lineWidth = 1.1;

    this.world.colliders.forEach(c => {
      const p1 = this.worldToRadar(c.minX, c.minZ);
      const p2 = this.worldToRadar(c.maxX, c.maxZ);
      const rw = p2.x - p1.x;
      const rh = p2.y - p1.y;

      ctx.fillRect(p1.x, p1.y, rw, rh);
      ctx.strokeRect(p1.x, p1.y, rw, rh);
    });

    // 2. Draw Active Objective Waypoint Marker
    let targetPos = this.world.checkpointPos;
    if (objectivePhase === 2) targetPos = this.world.radarConsolePos;
    else if (objectivePhase === 3) targetPos = this.world.terminalPosition;
    else if (objectivePhase === 4) targetPos = this.world.helipadPos;

    const op = this.worldToRadar(targetPos.x, targetPos.z);
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(op.x, op.y, 5, 0, Math.PI * 2);
    ctx.fill();

    // 3. Draw Security Cameras
    this.cameraManager.cameras.forEach(cam => {
      const cp = this.worldToRadar(cam.position.x, cam.position.z);
      if (cam.isDestroyed) {
        ctx.strokeStyle = '#777777';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cp.x - 3, cp.y - 3); ctx.lineTo(cp.x + 3, cp.y + 3);
        ctx.moveTo(cp.x + 3, cp.y - 3); ctx.lineTo(cp.x - 3, cp.y + 3);
        ctx.stroke();
      } else {
        ctx.fillStyle = cam.isAlarmTriggered ? '#ff2222' : '#33ff55';
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Scan cone
        const currentYaw = cam.baseAngle + cam.currentSweep;
        const start = currentYaw - cam.scanFOV / 2 + Math.PI / 2;
        const end = currentYaw + cam.scanFOV / 2 + Math.PI / 2;
        const scanLen = (cam.scanRange / this.radarRange) * (w / 2);

        ctx.fillStyle = cam.isAlarmTriggered ? 'rgba(255, 30, 30, 0.35)' : 'rgba(50, 220, 80, 0.22)';
        ctx.beginPath();
        ctx.moveTo(cp.x, cp.y);
        ctx.arc(cp.x, cp.y, scanLen, start, end);
        ctx.closePath();
        ctx.fill();
      }
    });

    // 4. Draw Enemy Soldiers
    this.enemyManager.guards.forEach(g => {
      if (!g.isAlive) return;
      const gp = this.worldToRadar(g.position.x, g.position.z);

      let color = '#33ee55';
      let coneAlpha = 'rgba(50, 240, 80, 0.25)';
      if (g.state === 'SUSPICIOUS') {
        color = '#ffcc00';
        coneAlpha = 'rgba(255, 200, 0, 0.35)';
      } else if (g.state === 'ALERT') {
        color = '#ff2222';
        coneAlpha = 'rgba(255, 30, 30, 0.45)';
      }

      const coneLen = (g.visionRange / this.radarRange) * (w / 2);
      const guardAngle = g.yaw - Math.PI / 2;

      ctx.fillStyle = coneAlpha;
      ctx.beginPath();
      ctx.moveTo(gp.x, gp.y);
      ctx.arc(gp.x, gp.y, coneLen, guardAngle - g.visionAngle / 2, guardAngle + g.visionAngle / 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(gp.x, gp.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 5. Radar Sweep Line
    this.sweepAngle += delta * 2.8;
    const sweepX = cx + Math.cos(this.sweepAngle) * radius;
    const sweepY = cy + Math.sin(this.sweepAngle) * radius;

    const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    sweepGrad.addColorStop(0, 'rgba(50, 255, 120, 0.4)');
    sweepGrad.addColorStop(1, 'rgba(20, 150, 60, 0.05)');

    ctx.strokeStyle = sweepGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(sweepX, sweepY);
    ctx.stroke();

    // 6. Player Center Arrow
    ctx.fillStyle = '#00ffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.player.yaw);

    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (this.player.noiseRadius > 0) {
      const noiseRadiusPx = (this.player.noiseRadius / this.radarRange) * (w / 2);
      ctx.strokeStyle = 'rgba(255, 220, 80, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, noiseRadiusPx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
    ctx.restore();

    // Border & Compass
    ctx.strokeStyle = '#44dd77';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#44dd77';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('N', cx, 3);
    ctx.textBaseline = 'bottom';
    ctx.fillText('S', cx, h - 3);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('W', 3, cy);
    ctx.textAlign = 'right';
    ctx.fillText('E', w - 3, cy);
  }
}
