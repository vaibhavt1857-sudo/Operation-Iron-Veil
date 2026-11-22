export class UIManager {
  constructor() {
    this.healthNum = document.getElementById('health-num');
    this.healthFill = document.getElementById('health-fill');
    this.armorNum = document.getElementById('armor-num');
    this.armorFill = document.getElementById('armor-fill');

    this.stanceBadge = document.getElementById('stance-badge');
    this.visBadge = document.getElementById('vis-badge');
    this.weaponName = document.getElementById('weapon-name');
    this.ammoCur = document.getElementById('ammo-cur');
    this.ammoRes = document.getElementById('ammo-res');
    this.fireMode = document.getElementById('fire-mode');
    this.threatStatus = document.getElementById('threat-status');
    this.objStep = document.getElementById('obj-step');
    this.objText = document.getElementById('obj-text');

    this.crosshair = document.getElementById('crosshair');
    this.hitmarker = document.getElementById('hitmarker');
    this.damageOverlay = document.getElementById('damage-overlay');
    this.damageIndicator = document.getElementById('damage-indicator');
    this.damageArc = document.getElementById('damage-arc');

    this.interactPrompt = document.getElementById('interact-prompt');
    this.interactBtnLabel = document.getElementById('interact-btn-label');
    this.interactActionText = document.getElementById('interact-action-text');
    this.hackFill = document.getElementById('hack-fill');

    this.sniperScopeOverlay = document.getElementById('sniper-scope-overlay');
    this.scopeCanvas = document.getElementById('scope-canvas');
    this.scopeCtx = this.scopeCanvas ? this.scopeCanvas.getContext('2d') : null;

    this.satmapScreen = document.getElementById('satmap-screen');

    this.startScreen = document.getElementById('start-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    this.gameOverScreen = document.getElementById('gameover-screen');
    this.completeScreen = document.getElementById('complete-screen');

    this.statTime = document.getElementById('stat-time');
    this.statGuards = document.getElementById('stat-guards');
    this.statCameras = document.getElementById('stat-cameras');
    this.statAlarms = document.getElementById('stat-alarms');
    this.statRating = document.getElementById('stat-rating');

    this.hitmarkerTimer = 0;

    this.initScopeCanvas();
  }

  initScopeCanvas() {
    if (!this.scopeCanvas) return;
    this.resizeScope();
    window.addEventListener('resize', () => this.resizeScope());
  }

  resizeScope() {
    if (!this.scopeCanvas) return;
    this.scopeCanvas.width = window.innerWidth;
    this.scopeCanvas.height = window.innerHeight;
    this.renderRussianPSO1Scope();
  }

  // Authentic Russian PSO-1 Optical Rangefinder Scope Reticle (Dragunov SVD)
  renderRussianPSO1Scope() {
    if (!this.scopeCtx) return;
    const ctx = this.scopeCtx;
    const w = this.scopeCanvas.width;
    const h = this.scopeCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.43;

    ctx.clearRect(0, 0, w, h);

    // 1. Black Scope Viewport Mask
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
    ctx.fillStyle = '#050709';
    ctx.fill();
    ctx.restore();

    // 2. Heavy Steel Scope Outer Bezel
    ctx.strokeStyle = '#1e2820';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Illuminated Red/Green Russian PSO-1 Reticle
    ctx.strokeStyle = '#38ee68';
    ctx.lineWidth = 1.6;

    // Horizontal crossbar
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.85, cy);
    ctx.lineTo(cx - 30, cy);
    ctx.moveTo(cx + 30, cy);
    ctx.lineTo(cx + radius * 0.85, cy);
    ctx.stroke();

    // Primary Chevron Aiming Mark (^) at center
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy + 10);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + 14, cy + 10);
    ctx.stroke();

    // 2nd and 3rd Elevation Chevrons below center (200m, 300m, 400m)
    const chevrons = [40, 85, 135];
    chevrons.forEach(offset => {
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + offset + 8);
      ctx.lineTo(cx, cy + offset);
      ctx.lineTo(cx + 10, cy + offset + 8);
      ctx.stroke();
    });

    // Stadiametric Rangefinder Curve on bottom left (Russian 1.7m human height scale)
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    // Base straight line
    ctx.moveTo(cx - radius * 0.75, cy + 90);
    ctx.lineTo(cx - radius * 0.25, cy + 90);
    ctx.stroke();

    // Curved upper height estimate line
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.75, cy + 35);
    ctx.bezierCurveTo(
      cx - radius * 0.6, cy + 45,
      cx - radius * 0.45, cy + 70,
      cx - radius * 0.25, cy + 85
    );
    ctx.stroke();

    ctx.fillStyle = '#38ee68';
    ctx.font = '10px monospace';
    ctx.fillText('1.7', cx - radius * 0.78, cy + 65);
    ctx.fillText('2', cx - radius * 0.7, cy + 102);
    ctx.fillText('4', cx - radius * 0.55, cy + 102);
    ctx.fillText('6', cx - radius * 0.4, cy + 102);
    ctx.fillText('8', cx - radius * 0.28, cy + 102);

    // Telemetry Text
    ctx.font = 'bold 12px monospace';
    ctx.fillText('PSO-1 // 4X24 MAG', cx - radius * 0.75, cy - radius * 0.7);
    ctx.fillText('7.62x54mm R', cx + radius * 0.35, cy - radius * 0.7);
  }

  showHitmarker() {
    this.hitmarker.style.opacity = '1';
    this.hitmarkerTimer = 0.12;
  }

  update(delta, player, weapons, objectiveState, threatState, interactionState) {
    // 1. Health & Armor Bars
    const hp = Math.max(0, Math.round(player.health));
    const ap = Math.max(0, Math.round(player.armor));

    this.healthNum.textContent = `${hp}%`;
    this.healthFill.style.width = `${hp}%`;
    this.healthFill.style.backgroundColor = hp > 50 ? '#44dd77' : (hp > 25 ? '#ffcc00' : '#ff3333');

    this.armorNum.textContent = `${ap}%`;
    this.armorFill.style.width = `${ap}%`;

    // 2. Stance & Perspective
    const viewText = player.isThirdPerson ? '3RD PERSON [V]' : '1ST PERSON [V]';
    if (player.isCrouched) {
      this.stanceBadge.textContent = 'CROUCH';
      this.stanceBadge.style.color = '#44dd77';
      this.visBadge.textContent = `VIS: LOW [STEALTH] | ${viewText}`;
      this.visBadge.style.color = '#44dd77';
    } else if (player.isSprinting) {
      this.stanceBadge.textContent = 'SPRINT';
      this.stanceBadge.style.color = '#ffaa00';
      this.visBadge.textContent = `VIS: HIGH [EXPOSED] | ${viewText}`;
      this.visBadge.style.color = '#ffaa00';
    } else {
      this.stanceBadge.textContent = 'STAND';
      this.stanceBadge.style.color = '#c0d4c6';
      this.visBadge.textContent = `VIS: NORMAL | ${viewText}`;
      this.visBadge.style.color = '#8da495';
    }

    // 3. Weapon & Fire Mode Details
    const currentWeapon = weapons.getCurrentWeapon();
    this.weaponName.textContent = currentWeapon.name;
    this.ammoCur.textContent = weapons.isReloading ? 'RELOAD' : currentWeapon.currentAmmo;
    this.ammoRes.textContent = currentWeapon.reserveAmmo;

    // Tactical fire mode & attachment details
    if (currentWeapon.id === 'glock') {
      this.fireMode.textContent = currentWeapon.isSuppressed ? 'SEMI [SUPPRESSED - T]' : 'SEMI [UNSUPPRESSED - T]';
    } else if (currentWeapon.id === 'uzi') {
      this.fireMode.textContent = 'FULL-AUTO 800 RPM';
    } else if (currentWeapon.id === 'ak47') {
      this.fireMode.textContent = 'FULL-AUTO 7.62mm';
    } else if (currentWeapon.id === 'm16') {
      this.fireMode.textContent = currentWeapon.isBurstMode ? '3-ROUND BURST [B]' : 'FULL-AUTO [B]';
    } else if (currentWeapon.id === 'svd') {
      this.fireMode.textContent = 'BOLT-ACTION 4X SCOPE';
    }

    // 4. Sniper Scope Visibility
    const isSniperADS = (currentWeapon.id === 'svd' && weapons.isADS && weapons.adsProgress > 0.8);
    this.sniperScopeOverlay.style.display = isSniperADS ? 'block' : 'none';

    // 5. Crosshair Dynamics
    if (isSniperADS) {
      this.crosshair.style.opacity = '0';
    } else if (weapons.isADS) {
      this.crosshair.style.width = '14px';
      this.crosshair.style.height = '14px';
      this.crosshair.style.opacity = '0.35';
    } else if (player.isSprinting) {
      this.crosshair.style.width = '38px';
      this.crosshair.style.height = '38px';
      this.crosshair.style.opacity = '0.9';
    } else if (player.isMoving) {
      this.crosshair.style.width = '28px';
      this.crosshair.style.height = '28px';
      this.crosshair.style.opacity = '0.85';
    } else if (player.isCrouched) {
      this.crosshair.style.width = '18px';
      this.crosshair.style.height = '18px';
      this.crosshair.style.opacity = '0.85';
    } else {
      this.crosshair.style.width = '24px';
      this.crosshair.style.height = '24px';
      this.crosshair.style.opacity = '0.85';
    }

    // 6. Hitmarker
    if (this.hitmarkerTimer > 0) {
      this.hitmarkerTimer -= delta;
      if (this.hitmarkerTimer <= 0) {
        this.hitmarker.style.opacity = '0';
      }
    }

    // 7. Blood Vignette
    if (player.damageVignetteTimer > 0) {
      const alpha = Math.min(0.7, (player.damageVignetteTimer / 0.5) * 0.7);
      this.damageOverlay.style.boxShadow = `inset 0 0 120px rgba(255, 0, 0, ${alpha})`;
    } else if (hp < 30) {
      const pulse = 0.25 + Math.sin(Date.now() * 0.006) * 0.15;
      this.damageOverlay.style.boxShadow = `inset 0 0 100px rgba(255, 0, 0, ${pulse})`;
    } else {
      this.damageOverlay.style.boxShadow = 'inset 0 0 100px rgba(255, 0, 0, 0)';
    }

    // 8. Directional Hit Arc
    if (player.damageIndicatorTimer > 0) {
      this.damageIndicator.style.opacity = String(player.damageIndicatorTimer / 0.8);
      const deg = (player.damageDirection * 180 / Math.PI);
      this.damageIndicator.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
    } else {
      this.damageIndicator.style.opacity = '0';
    }

    // 9. Base Threat Status
    if (threatState === 'ALERT') {
      this.threatStatus.textContent = 'ALERT // BASE ALARM';
      this.threatStatus.className = 'threat-status alert';
    } else if (threatState === 'SUSPICIOUS') {
      this.threatStatus.textContent = 'SUSPICIOUS';
      this.threatStatus.className = 'threat-status suspicious';
    } else {
      this.threatStatus.textContent = 'CLEAR';
      this.threatStatus.className = 'threat-status';
    }

    // 10. 4-Stage Objectives
    if (objectiveState === 1) {
      this.objStep.textContent = 'STAGE 1 // CHECKPOINT INFILTRATION';
      this.objText.textContent = 'INFILTRATE OUTER CHECKPOINT & NEUTRALIZE GUARDS';
    } else if (objectiveState === 2) {
      this.objStep.textContent = 'STAGE 2 // RADAR SABOTAGE';
      this.objText.textContent = 'REACH COMMS OUTPOST & DESTROY RADAR CONSOLE (SHOOT OR HOLD E)';
    } else if (objectiveState === 3) {
      this.objStep.textContent = 'STAGE 3 // MAINFRAME INFILTRATION';
      this.objText.textContent = 'INFILTRATE MAIN BUNKER & HACK COMPUTER TERMINAL (HOLD E)';
    } else if (objectiveState === 4) {
      this.objStep.textContent = 'STAGE 4 // HELIPAD EXFILTRATION';
      this.objText.textContent = 'EXFILTRATE TO EXTRACTION HELIPAD [NORTH BASE]';
    }

    // 11. Interaction Prompts
    if (interactionState.canInteract && !interactionState.isCompleted) {
      this.interactPrompt.style.display = 'block';
      this.interactActionText.textContent = interactionState.actionText || 'INTERACT';
      this.hackFill.style.width = `${Math.round(interactionState.progress * 100)}%`;
    } else {
      this.interactPrompt.style.display = 'none';
    }
  }

  showScreen(screenId) {
    this.startScreen.style.display = (screenId === 'start') ? 'flex' : 'none';
    this.pauseScreen.style.display = (screenId === 'pause') ? 'flex' : 'none';
    this.gameOverScreen.style.display = (screenId === 'gameover') ? 'flex' : 'none';
    this.completeScreen.style.display = (screenId === 'complete') ? 'flex' : 'none';
  }

  setSatmapVisible(visible) {
    this.satmapScreen.style.display = visible ? 'flex' : 'none';
  }

  showMissionComplete(timeSeconds, guardsKilled, camerasDestroyed, alarmsTriggered) {
    const mins = Math.floor(timeSeconds / 60);
    const secs = Math.floor(timeSeconds % 60);
    this.statTime.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    this.statGuards.textContent = `${guardsKilled} / 8`;
    this.statCameras.textContent = `${camerasDestroyed} / 4`;
    this.statAlarms.textContent = `${alarmsTriggered}`;

    let rating = 'GHOST (RANK S)';
    if (alarmsTriggered > 0 && guardsKilled > 4) {
      rating = 'COMMANDO (RANK B)';
    } else if (alarmsTriggered > 0) {
      rating = 'INFILTRATOR (RANK A)';
    } else if (guardsKilled <= 2) {
      rating = 'SILENT SHADOW (RANK S+)';
    }
    this.statRating.textContent = rating;

    this.showScreen('complete');
  }
}
