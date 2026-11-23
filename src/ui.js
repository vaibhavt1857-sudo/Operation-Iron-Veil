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

    this.binocularsOverlay = document.getElementById('binoculars-overlay');
    this.binocularsCanvas = document.getElementById('binoculars-canvas');
    this.binocularsCtx = this.binocularsCanvas ? this.binocularsCanvas.getContext('2d') : null;

    this.healOverlay = document.getElementById('heal-overlay');
    this.pickupToast = document.getElementById('pickup-toast');
    this.syringeBadge = document.getElementById('syringe-badge');

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
    this.toastTimer = 0;
    this.lastScopeZoom = 4.0;

    this.initScopeCanvas();
  }

  initScopeCanvas() {
    this.resizeCanvases();
    window.addEventListener('resize', () => this.resizeCanvases());
  }

  resizeCanvases() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (this.scopeCanvas) {
      this.scopeCanvas.width = w;
      this.scopeCanvas.height = h;
      this.renderRussianPSO1Scope(this.lastScopeZoom);
    }
    if (this.binocularsCanvas) {
      this.binocularsCanvas.width = w;
      this.binocularsCanvas.height = h;
    }
  }

  showHealNotification(text, color = '#44dd77') {
    if (!this.pickupToast) return;
    this.pickupToast.textContent = text;
    this.pickupToast.style.borderColor = color;
    this.pickupToast.style.color = color;
    this.pickupToast.classList.add('show');
    this.toastTimer = 2.4;
  }

  // Authentic Russian PSO-1 Optical Rangefinder Scope Reticle (Dragunov SVD)
  renderRussianPSO1Scope(zoomLevel = 4.0) {
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
    ctx.fillText(`PSO-1 // ${zoomLevel.toFixed(1)}X MAG`, cx - radius * 0.75, cy - radius * 0.7);
    ctx.fillText('7.62x54mm R', cx + radius * 0.35, cy - radius * 0.7);
  }

  // Authentic Dual-Lens Military Binoculars HUD Overlay (Project IGI Style)
  renderBinoculars(zoom, rangeMeters, headingDeg, focusEnemy, tagProgress) {
    if (!this.binocularsCtx) return;
    const ctx = this.binocularsCtx;
    const w = this.binocularsCanvas.width;
    const h = this.binocularsCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    const radius = Math.min(w, h) * 0.38;
    const eyeOffset = radius * 0.62;

    // 1. Dual-Lens Overlapping Aperture Mask (Zero Artifact Composite Cutout)
    ctx.save();
    ctx.fillStyle = '#030605';
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx - eyeOffset, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx + eyeOffset, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Bezel Outlines
    ctx.strokeStyle = '#18261e';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx - eyeOffset, cy, radius, 0, Math.PI * 2);
    ctx.arc(cx + eyeOffset, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Subtle optical green lens tint border
    ctx.strokeStyle = 'rgba(56, 238, 104, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx - eyeOffset, cy, radius - 4, 0, Math.PI * 2);
    ctx.arc(cx + eyeOffset, cy, radius - 4, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Central Military Recon Grid & Mil-Dot Reticle
    ctx.strokeStyle = '#38ee68';
    ctx.lineWidth = 1.4;

    // Center Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - 36, cy);
    ctx.lineTo(cx - 10, cy);
    ctx.moveTo(cx + 10, cy);
    ctx.lineTo(cx + 36, cy);
    ctx.moveTo(cx, cy - 36);
    ctx.lineTo(cx, cy - 10);
    ctx.moveTo(cx, cy + 10);
    ctx.lineTo(cx, cy + 36);
    ctx.stroke();

    // Mil-dots
    const dotOffsets = [-28, -20, -12, 12, 20, 28];
    ctx.fillStyle = '#38ee68';
    dotOffsets.forEach(ox => {
      ctx.fillRect(cx + ox - 1, cy - 1, 2, 2);
      ctx.fillRect(cx - 1, cy + ox - 1, 2, 2);
    });

    // 4. Center Target Bracket & Auto-Tagging Status
    if (focusEnemy) {
      const isTagged = focusEnemy.isTagged;
      const bracketColor = isTagged ? '#38ee68' : '#ffb733';
      ctx.strokeStyle = bracketColor;
      ctx.lineWidth = 2;

      // Target Corner Brackets [   ]
      const bw = 32;
      const bh = 42;
      const bl = 8;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(cx - bw, cy - bh + bl);
      ctx.lineTo(cx - bw, cy - bh);
      ctx.lineTo(cx - bw + bl, cy - bh);
      // Top-right
      ctx.moveTo(cx + bw - bl, cy - bh);
      ctx.lineTo(cx + bw, cy - bh);
      ctx.lineTo(cx + bw, cy - bh + bl);
      // Bottom-left
      ctx.moveTo(cx - bw, cy + bh - bl);
      ctx.lineTo(cx - bw, cy + bh);
      ctx.lineTo(cx - bw + bl, cy + bh);
      // Bottom-right
      ctx.moveTo(cx + bw - bl, cy + bh);
      ctx.lineTo(cx + bw, cy + bh);
      ctx.lineTo(cx + bw, cy + bh - bl);
      ctx.stroke();

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = bracketColor;
      ctx.textAlign = 'center';

      if (isTagged) {
        ctx.fillText(`[ HOSTILE IDENTIFIED // ${focusEnemy.state} ]`, cx, cy - bh - 8);
        ctx.fillText(`TARGET LOCKED (RADAR LINKED)`, cx, cy + bh + 16);
      } else {
        const pct = Math.min(100, Math.round(tagProgress * 100));
        ctx.fillText(`ACQUIRING INTEL... ${pct}%`, cx, cy - bh - 8);

        // Progress bar below
        ctx.strokeStyle = '#ffb733';
        ctx.strokeRect(cx - 30, cy + bh + 8, 60, 6);
        ctx.fillStyle = '#ffb733';
        ctx.fillRect(cx - 28, cy + bh + 10, 56 * Math.min(1, tagProgress), 2);
      }
    }

    // 5. Compass Heading Tape (Top Center)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#38ee68';
    ctx.font = 'bold 13px monospace';
    const cardinal = (headingDeg >= 338 || headingDeg < 23) ? 'N' :
                     headingDeg < 68 ? 'NE' :
                     headingDeg < 113 ? 'E' :
                     headingDeg < 158 ? 'SE' :
                     headingDeg < 203 ? 'S' :
                     headingDeg < 248 ? 'SW' :
                     headingDeg < 293 ? 'W' : 'NW';
    ctx.fillText(`HDG: ${String(headingDeg).padStart(3, '0')}° ${cardinal}`, cx, cy - radius * 0.72);

    ctx.strokeStyle = 'rgba(56, 238, 104, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 80, cy - radius * 0.68);
    ctx.lineTo(cx + 80, cy - radius * 0.68);
    ctx.moveTo(cx, cy - radius * 0.68);
    ctx.lineTo(cx, cy - radius * 0.64);
    ctx.stroke();

    // 6. Digital Magnification Indicator (Bottom-Left)
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`OPTICAL MAG: ${zoom.toFixed(1)}X`, cx - radius * 1.1, cy + radius * 0.72);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#8da495';
    ctx.fillText('FOV: 2.0X - 12.0X [WHEEL]', cx - radius * 1.1, cy + radius * 0.72 + 16);

    // 7. Laser Metric Rangefinder (Bottom-Right)
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#38ee68';
    const rangeText = rangeMeters > 0 ? `${rangeMeters} M` : '--- M';
    ctx.fillText(`RANGE: ${rangeText}`, cx + radius * 1.1, cy + radius * 0.72);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#8da495';
    ctx.fillText('LASER RANGEFINDER', cx + radius * 1.1, cy + radius * 0.72 + 16);
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

    if (this.syringeBadge) {
      this.syringeBadge.textContent = `MED SYRINGE [H / 7]: ${player.syringeCount}`;
    }

    // 3. Weapon & Fire Mode Details
    const currentWeapon = weapons.getCurrentWeapon();
    if (weapons.isBinocularsActive) {
      this.weaponName.textContent = 'TACTICAL BINOCULARS';
      this.ammoCur.textContent = 'OPTIC';
      this.ammoRes.textContent = `${weapons.binocularZoom.toFixed(1)}X`;
      this.fireMode.textContent = 'RECON // TAG HOSTILES [Z / 6]';
    } else {
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
        this.fireMode.textContent = `SNIPER [${weapons.svdZoom.toFixed(1)}X SCOPE - RMB]`;
      }
    }

    // 4. Sniper Scope Visibility
    const isSniperADS = (!weapons.isBinocularsActive && currentWeapon.id === 'svd' && weapons.isADS && weapons.adsProgress > 0.8);
    this.sniperScopeOverlay.style.display = isSniperADS ? 'block' : 'none';
    if (isSniperADS) {
      if (Math.abs(this.lastScopeZoom - weapons.svdZoom) > 0.05) {
        this.lastScopeZoom = weapons.svdZoom;
        this.renderRussianPSO1Scope(weapons.svdZoom);
      }
    }

    // Tactical Binoculars Visibility
    const isBinos = weapons.isBinocularsActive;
    if (this.binocularsOverlay) {
      this.binocularsOverlay.style.display = isBinos ? 'block' : 'none';
      if (isBinos) {
        const headingRad = player.yaw % (Math.PI * 2);
        const headingDeg = Math.round(((headingRad < 0 ? headingRad + Math.PI * 2 : headingRad) / (Math.PI * 2)) * 360);
        this.renderBinoculars(
          weapons.binocularZoom,
          weapons.binocularRangeMeters,
          headingDeg,
          weapons.binocularFocusEnemy,
          weapons.binocularTagTimer / 1.0
        );
      }
    }

    // 5. Crosshair Dynamics
    if (isSniperADS || isBinos) {
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

    // 7b. Medical Syringe / Pickup Recovery Glow
    if (this.healOverlay) {
      if (player.healFlashTimer > 0) {
        const alpha = Math.min(0.65, (player.healFlashTimer / 0.6) * 0.65);
        this.healOverlay.style.boxShadow = `inset 0 0 120px rgba(50, 240, 100, ${alpha})`;
      } else {
        this.healOverlay.style.boxShadow = 'inset 0 0 120px rgba(50, 240, 100, 0)';
      }
    }

    // 7c. Pickup Notification Toast Timer
    if (this.toastTimer > 0) {
      this.toastTimer -= delta;
      if (this.toastTimer <= 0 && this.pickupToast) {
        this.pickupToast.classList.remove('show');
      }
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
