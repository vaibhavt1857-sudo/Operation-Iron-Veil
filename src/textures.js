import * as THREE from 'three';

// Procedural Canvas Texture Generator with PBR-like bump & roughness
class TextureGenerator {
  constructor() {
    this.cache = new Map();
  }

  // 1. Desaturated Eastern European Steppe & Foothills Grass Texture (Authentic Project IGI Palette)
  getGrassTexture() {
    if (this.cache.has('grass')) return this.cache.get('grass');

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Muted olive-brown and dry ochre steppe earth gradient
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#3a422e');
    grad.addColorStop(0.35, '#454530');
    grad.addColorStop(0.7, '#383e28');
    grad.addColorStop(1, '#2f3524');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Gritty dry dirt and soil noise
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 32;
      data[i] = Math.min(255, Math.max(0, data[i] + n * 1.1));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n * 1.0));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n * 0.7));
    }
    ctx.putImageData(imgData, 0, 0);

    // Dry withered grass flecks (ochre / straw tint)
    ctx.fillStyle = 'rgba(110, 102, 65, 0.4)';
    for (let k = 0; k < 500; k++) {
      const gx = Math.random() * 512;
      const gy = Math.random() * 512;
      ctx.fillRect(gx, gy, 2, 4 + Math.random() * 5);
    }

    // Rocky dirt accents & gravel speckles
    ctx.fillStyle = 'rgba(70, 65, 55, 0.5)';
    for (let k = 0; k < 350; k++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);
    this.cache.set('grass', texture);
    return texture;
  }

  // 1B. Military Compound Gravel & Dirt Yard Texture
  getCompoundGravelTexture() {
    if (this.cache.has('compound_gravel')) return this.cache.get('compound_gravel');

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Brownish-gray crushed stone base
    ctx.fillStyle = '#4c4944';
    ctx.fillRect(0, 0, 512, 512);

    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 45;
      data[i] = Math.min(255, Math.max(0, data[i] + n * 1.05));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n * 1.0));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n * 0.95));
    }
    ctx.putImageData(imgData, 0, 0);

    // Crushed gravel stones
    for (let s = 0; s < 600; s++) {
      const shade = 70 + Math.random() * 70;
      ctx.fillStyle = `rgb(${shade + 5}, ${shade}, ${shade - 5})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 3, 2 + Math.random() * 2);
    }

    // Heavy military truck tire tracks through compound yard
    ctx.fillStyle = 'rgba(32, 30, 27, 0.35)';
    ctx.fillRect(100, 0, 50, 512);
    ctx.fillRect(280, 0, 50, 512);
    // Tire tread bars
    for (let y = 0; y < 512; y += 16) {
      ctx.fillRect(96, y, 58, 6);
      ctx.fillRect(276, y, 58, 6);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    this.cache.set('compound_gravel', texture);
    return texture;
  }

  // 1C. Craggy Gray-Brown Mountain Rock Cliff Texture
  getRockCliffTexture() {
    if (this.cache.has('rock_cliff')) return this.cache.get('rock_cliff');

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark weathered granite base
    ctx.fillStyle = '#45403a';
    ctx.fillRect(0, 0, 512, 512);

    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 55;
      data[i] = Math.min(255, Math.max(0, data[i] + n * 1.1));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n * 1.0));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n * 0.9));
    }
    ctx.putImageData(imgData, 0, 0);

    // Jagged vertical fracture strata
    ctx.strokeStyle = 'rgba(25, 22, 20, 0.65)';
    ctx.lineWidth = 3;
    for (let f = 0; f < 14; f++) {
      let x = f * 38 + Math.random() * 20;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      for (let y = 0; y < 512; y += 40) {
        x += (Math.random() - 0.5) * 16;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    this.cache.set('rock_cliff', texture);
    return texture;
  }

  // 2. Dirt Road & Gravel Texture
  getDirtRoadTexture() {
    if (this.cache.has('dirt_road')) return this.cache.get('dirt_road');

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base dry earth color
    ctx.fillStyle = '#5c5240';
    ctx.fillRect(0, 0, 512, 512);

    // Noise and gravel grain
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 35;
      data[i] = Math.min(255, Math.max(0, data[i] + n * 1.1));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n * 0.95));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n * 0.8));
    }
    ctx.putImageData(imgData, 0, 0);

    // Tire tread tracks along the road (Y axis)
    ctx.fillStyle = 'rgba(38, 32, 24, 0.45)';
    ctx.fillRect(110, 0, 60, 512); // Left track
    ctx.fillRect(342, 0, 60, 512); // Right track

    // Gravel stones
    ctx.fillStyle = 'rgba(140, 130, 110, 0.5)';
    for (let j = 0; j < 400; j++) {
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 4);
    this.cache.set('dirt_road', texture);
    return texture;
  }

  // 3. Weathered Military Concrete with Stains & Bolt Rivets
  getConcreteTexture() {
    if (this.cache.has('concrete')) return this.cache.get('concrete');

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base concrete grey
    ctx.fillStyle = '#52585e';
    ctx.fillRect(0, 0, 512, 512);

    // Concrete porous grain
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 40;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    // Weathered water streaks
    ctx.fillStyle = 'rgba(30, 35, 40, 0.25)';
    for (let s = 0; s < 12; s++) {
      const sx = Math.random() * 512;
      const sw = 10 + Math.random() * 25;
      ctx.fillRect(sx, 0, sw, 512);
    }

    // Concrete form panel lines
    ctx.strokeStyle = 'rgba(25, 28, 32, 0.85)';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 504, 504);
    ctx.strokeRect(4, 254, 504, 254);
    ctx.beginPath();
    ctx.moveTo(256, 4);
    ctx.lineTo(256, 508);
    ctx.stroke();

    // Rivet holes in panel corners
    ctx.fillStyle = 'rgba(18, 20, 22, 0.9)';
    const rivets = [
      [24, 24], [236, 24], [276, 24], [488, 24],
      [24, 236], [236, 236], [276, 236], [488, 236],
      [24, 276], [236, 276], [276, 276], [488, 276],
      [24, 488], [236, 488], [276, 488], [488, 488]
    ];
    rivets.forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.arc(rx, ry, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(110, 120, 130, 0.6)';
      ctx.beginPath();
      ctx.arc(rx + 1, ry + 1, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(18, 20, 22, 0.9)';
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set('concrete', texture);
    return texture;
  }

  // 4. Rusted Corrugated Metal Warehouse Siding & Shipping Containers
  getRustedMetalTexture(colorType = 'rust') {
    const key = `metal_${colorType}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const palettes = {
      rust: { main: '#783b2e', dark: '#502319', light: '#9a4c3c', text: '#e0c0b8' },
      olive: { main: '#3e4a36', dark: '#283222', light: '#54644a', text: '#d0e0c8' },
      blue: { main: '#2c4356', dark: '#1a2b38', light: '#405e78', text: '#c8dce8' }
    };
    const c = palettes[colorType] || palettes.rust;

    ctx.fillStyle = c.main;
    ctx.fillRect(0, 0, 512, 512);

    // Corrugation vertical ribs
    const ribWidth = 32;
    for (let x = 0; x < 512; x += ribWidth) {
      ctx.fillStyle = c.dark;
      ctx.fillRect(x, 0, ribWidth * 0.45, 512);
      ctx.fillStyle = c.light;
      ctx.fillRect(x + ribWidth * 0.45, 0, ribWidth * 0.55, 512);
    }

    // Rust spots and oxidation patches
    ctx.fillStyle = 'rgba(100, 40, 20, 0.55)';
    for (let r = 0; r < 20; r++) {
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, 10 + Math.random() * 30, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer frame & reinforcement borders
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 498, 498);

    // Military Stencil Markings
    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = c.text;
    ctx.fillText('ORDNANCE // DEPOT 07', 50, 90);
    ctx.font = 'bold 22px monospace';
    ctx.fillText('MIL-SPEC SEC-B // 14200 KG', 50, 130);

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }

  // 5. Camouflage Netting Pattern
  getCamoNetTexture() {
    if (this.cache.has('camo_net')) return this.cache.get('camo_net');

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 256, 256);

    // Mesh cord grid
    ctx.strokeStyle = 'rgba(50, 55, 45, 0.7)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 256; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }

    // Olive and brown camo fabric ribbons
    const colors = ['#384828', '#4c5c36', '#5a4630', '#2d3820'];
    for (let k = 0; k < 120; k++) {
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.beginPath();
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      ctx.ellipse(x, y, 12, 6, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    this.cache.set('camo_net', texture);
    return texture;
  }

  // 6. Asphalt Helipad & Runway Texture
  getHelipadTexture() {
    if (this.cache.has('helipad')) return this.cache.get('helipad');

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark asphalt tarmac
    ctx.fillStyle = '#26292d';
    ctx.fillRect(0, 0, 512, 512);

    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 25;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    // Outer Yellow Circle
    ctx.strokeStyle = '#e0a020';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(256, 256, 220, 0, Math.PI * 2);
    ctx.stroke();

    // Inner White Ring
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(256, 256, 170, 0, Math.PI * 2);
    ctx.stroke();

    // Large Yellow 'H'
    ctx.fillStyle = '#e0a020';
    ctx.fillRect(170, 150, 32, 212); // Left
    ctx.fillRect(310, 150, 32, 212); // Right
    ctx.fillRect(170, 240, 172, 32); // Bar

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set('helipad', texture);
    return texture;
  }

  // 7. Bullet Hole Decal Texture
  getBulletHoleTexture() {
    if (this.cache.has('bullet_hole')) return this.cache.get('bullet_hole');

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 128, 128);

    // Chipped outer concrete/metal rim
    ctx.fillStyle = 'rgba(20, 20, 20, 0.7)';
    ctx.beginPath();
    ctx.arc(64, 64, 28, 0, Math.PI * 2);
    ctx.fill();

    // Jagged radial fracture cracks
    ctx.strokeStyle = 'rgba(10, 10, 10, 0.85)';
    ctx.lineWidth = 2.5;
    for (let a = 0; a < 8; a++) {
      const angle = (a / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      ctx.beginPath();
      ctx.moveTo(64, 64);
      const r = 24 + Math.random() * 28;
      ctx.lineTo(64 + Math.cos(angle) * r, 64 + Math.sin(angle) * r);
      ctx.stroke();
    }

    // Deep black crater center
    ctx.fillStyle = '#080808';
    ctx.beginPath();
    ctx.arc(64, 64, 14, 0, Math.PI * 2);
    ctx.fill();

    // Dark grey scorched rim
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 2;
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set('bullet_hole', texture);
    return texture;
  }

  // 8. Radar Console Electronic Screen
  getRadarConsoleTexture(isDestroyed = false) {
    const key = `console_${isDestroyed ? 'dead' : 'live'}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    if (isDestroyed) {
      // Scorched cracked screen
      ctx.fillStyle = '#141414';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#444444';
      ctx.lineWidth = 3;
      // Cracked glass
      ctx.beginPath();
      ctx.moveTo(30, 40); ctx.lineTo(140, 120); ctx.lineTo(220, 70);
      ctx.moveTo(140, 120); ctx.lineTo(100, 210);
      ctx.stroke();
      ctx.fillStyle = '#ff3333';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('[SYSTEM OFFLINE]', 24, 135);
    } else {
      ctx.fillStyle = '#0a1e12';
      ctx.fillRect(0, 0, 256, 256);
      // Radar grid
      ctx.strokeStyle = '#22aa55';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(128, 128, 90, 0, Math.PI * 2);
      ctx.arc(128, 128, 50, 0, Math.PI * 2);
      ctx.moveTo(128, 20); ctx.lineTo(128, 236);
      ctx.moveTo(20, 128); ctx.lineTo(236, 128);
      ctx.stroke();

      ctx.fillStyle = '#44ff77';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('RADAR LINK: ACTIVE', 24, 34);
      ctx.fillText('TARGET: SAT_LINK_04', 24, 240);
    }

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }

  // 9. Retro Military Computer Terminal Screen (Mainframe)
  getTerminalScreenTexture(hacked = false) {
    const key = `terminal_${hacked ? 'hacked' : 'idle'}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#061208';
    ctx.fillRect(0, 0, 512, 512);

    // Scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    for (let y = 0; y < 512; y += 4) {
      ctx.fillRect(0, y, 512, 2);
    }

    ctx.strokeStyle = hacked ? '#30e060' : '#44dd77';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 492, 492);

    ctx.fillStyle = hacked ? '#66ff88' : '#39d968';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('// DEFENSE MAINFRAME //', 40, 60);

    ctx.font = '20px monospace';
    ctx.fillText('NODE: URAL-ALPHA-09', 40, 100);
    ctx.fillText('STATUS: ONLINE [SECURE]', 40, 130);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#22aa44';
    ctx.fillText('0x00FF8A: 7F 45 4C 46 02 01 01 00 [ENCR_AES]', 40, 180);
    ctx.fillText('0x00FF9E: A3 99 B4 C2 00 1E 88 FF [PERIMETER]', 40, 210);
    ctx.fillText('0x00FFA8: F0 14 C1 80 44 23 11 9A [CAM_LINK]', 40, 240);
    ctx.fillText('0x00FFB2: 8B 21 00 00 5E FF 3A 01 [SAT_COMM]', 40, 270);

    if (hacked) {
      ctx.fillStyle = '#ffeedd';
      ctx.fillRect(40, 320, 432, 120);
      ctx.fillStyle = '#114411';
      ctx.font = 'bold 30px monospace';
      ctx.fillText('[ ACCESS GRANTED ]', 80, 370);
      ctx.font = 'bold 20px monospace';
      ctx.fillText('SYSTEM DATA EXTRACTED', 110, 410);
    } else {
      ctx.fillStyle = '#dd3333';
      ctx.fillRect(40, 320, 432, 120);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px monospace';
      ctx.fillText('[ HOLD E TO HACK ]', 90, 370);
      ctx.font = '18px monospace';
      ctx.fillText('RESTRICTED ACCESS ONLY', 120, 410);
    }

    const texture = new THREE.CanvasTexture(canvas);
    this.cache.set(key, texture);
    return texture;
  }

  // 10. Yellow & Black 45-Degree Hazard Warning Stripes
  getHazardStripeTexture() {
    if (this.cache.has('hazard_stripe')) return this.cache.get('hazard_stripe');

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Base yellow
    ctx.fillStyle = '#e8ac18';
    ctx.fillRect(0, 0, 256, 128);

    // 45 degree diagonal dark stripes
    ctx.fillStyle = '#181b1e';
    const stripeWidth = 28;
    for (let x = -128; x < 384; x += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 128);
      ctx.lineTo(x + stripeWidth, 128);
      ctx.lineTo(x + stripeWidth + 128, 0);
      ctx.lineTo(x + 128, 0);
      ctx.closePath();
      ctx.fill();
    }

    // Weathering dirt wash
    ctx.fillStyle = 'rgba(25, 20, 15, 0.28)';
    ctx.fillRect(0, 0, 256, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 1);
    this.cache.set('hazard_stripe', texture);
    return texture;
  }

  // 11. Chain-Link Perimeter Fence with Barbed Wire & Red "STOP" Sign
  getChainlinkFenceTexture(withSign = false) {
    const key = `chainlink_${withSign ? 'sign' : 'plain'}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 256, 256);

    // Diamond Chainlink Mesh Wire Pattern
    ctx.strokeStyle = 'rgba(165, 175, 185, 0.85)';
    ctx.lineWidth = 1.6;

    const spacing = 18;
    for (let x = -256; x < 512; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 256, 256);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, 256);
      ctx.lineTo(x + 256, 0);
      ctx.stroke();
    }

    // Horizontal top, middle, and bottom tension cables
    ctx.strokeStyle = 'rgba(200, 210, 220, 0.95)';
    ctx.lineWidth = 3;
    [6, 128, 250].forEach(y => {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    });

    // Barbed wire cross strands on top 20px
    ctx.strokeStyle = 'rgba(215, 225, 235, 0.95)';
    ctx.lineWidth = 1.8;
    for (let x = 8; x < 256; x += 22) {
      ctx.beginPath();
      ctx.moveTo(x - 5, 2);
      ctx.lineTo(x + 5, 12);
      ctx.moveTo(x + 5, 2);
      ctx.lineTo(x - 5, 12);
      ctx.stroke();
    }

    // Red Octagonal "STOP / ВХОД ВОСПРЕЩЕН" Military Sign in center
    if (withSign) {
      const cx = 128;
      const cy = 130;
      const r = 44;

      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI / 4) + (Math.PI / 8);
        const px = cx + Math.cos(a) * r;
        const py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = '#b81e1e';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('STOP', cx, cy - 6);

      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('MILITARY ZONE', cx, cy + 14);
      ctx.restore();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  // 12. Weathered Galvanized Steel Fuel Tank Texture
  getFuelTankTexture() {
    if (this.cache.has('fuel_tank')) return this.cache.get('fuel_tank');

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Silver-gray galvanized steel base
    ctx.fillStyle = '#788086';
    ctx.fillRect(0, 0, 512, 512);

    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 35;
      data[i] = Math.min(255, Math.max(0, data[i] + n));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    // Horizontal weld seams
    ctx.strokeStyle = '#4e5459';
    ctx.lineWidth = 4;
    [128, 256, 384].forEach(y => {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();

      // Rust drip streaks down from weld
      ctx.fillStyle = 'rgba(110, 50, 25, 0.35)';
      for (let s = 0; s < 18; s++) {
        const sx = Math.random() * 512;
        const sh = 25 + Math.random() * 70;
        ctx.fillRect(sx, y, 3 + Math.random() * 4, sh);
      }
    });

    // Rivet dots along seams
    ctx.fillStyle = '#3a3e42';
    for (let x = 12; x < 512; x += 28) {
      [126, 254, 382].forEach(y => {
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Cyrillic & English Stencil Markings
    ctx.fillStyle = '#d43224';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('ОГНЕОПАСНО', 50, 75);

    ctx.fillStyle = '#1c2024';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('FUEL STORAGE SILO // NO. 03', 50, 210);
    ctx.font = 'bold 20px monospace';
    ctx.fillText('CAPACITY: 45,000 L // JP-8 KEROSENE', 50, 340);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set('fuel_tank', texture);
    return texture;
  }
}

export const textures = new TextureGenerator();
