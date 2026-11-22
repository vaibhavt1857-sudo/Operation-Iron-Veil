# PROJECT I.G.I. (2000) // 3D Tactical Stealth Shooter

[![Three.js](https://img.shields.io/badge/Three.js-r187-black?style=flat&logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.4.6-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![JavaScript](https://img.shields.io/badge/Vanilla_JS-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![WebGL](https://img.shields.io/badge/WebGL-2.0-990000?style=flat&logo=webgl)](https://www.khronos.org/webgl/)
[![Target FPS](https://img.shields.io/badge/Performance-60_FPS_on_iGPU-brightgreen?style=flat)](#performance--optimizations)

A lightweight, authentic 3D first-person tactical stealth shooter inspired by the classic PC game **Project I.G.I.: I'm Going In (2000)**. Built from scratch with **Vite**, **Three.js**, and **Vanilla JavaScript**, featuring zero external model downloads (all compounds, weapons, terrain, and vehicles are procedurally modeled with canvas textures), multi-layer procedural audio, human skeletal animations, and satellite PDA reconnaissance.

---

## 🎮 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or later)

### Option 1: 1-Click Desktop Launcher (Windows)
Double-click `start_game.bat` in the project root folder. It starts the Vite dev server and opens your browser automatically:
```cmd
start_game.bat
```

### Option 2: Command Line
```bash
# 1. Install dependencies
npm install

# 2. Start the local dev server
npm run dev
```

Open your browser and navigate to:
```
http://localhost:5173/
```
*(Also accessible on your local network, e.g. `http://<your-ip>:5173/`)*

---

## 🕹️ Tactical Controls

| Key / Input | Action | Tactical Details |
| :--- | :--- | :--- |
| **W, A, S, D** | Movement | Walk / Strafe operative |
| **Mouse Look** | Aim / Look | Pointer-lock FPS view |
| **Shift** | Tactical Sprint | Faster movement; tilts weapon forward; enlarges noise radius |
| **C** | Toggle Crouch | Lowers camera, reduces walking speed, shrinks detection footprint |
| **Space** | Jump | Vault over low barriers and sandbag lines |
| **Left Click** | Fire Weapon | Ballistic raycasting with decals and surface particles |
| **Right Click (Hold)** | Aim Down Sights (ADS) | Centers iron sights; activates PSO-1 4x Scope on Dragunov SVD |
| **1 / 2 / 3 / 4 / 5** | Weapon Select | Glock 17 / MP5SD3 / AK-47 / M16A2 / Dragunov SVD |
| **T** | Toggle Suppressor | Attaches / detaches silencer on Glock 17 (whisper quiet vs loud) |
| **B** | Toggle Burst Mode | Switches Colt M16A2 between 3-Round Burst and Full-Auto |
| **V** | Toggle Perspective | Switches between First-Person and Third-Person (David Jones) |
| **R** | Reload | Reloads magazine with physical drop and recovery animation |
| **M** | Satellite PDA Map | Opens full-screen tactical satellite reconnaissance map |
| **E (Hold 3s)** | Interact / Sabotage | Sabotages Comms Radar Console & hacks Command Bunker Terminal |
| **ESC / P** | Pause Mission | Displays mission objectives briefing and controls reference |

---

## 🌟 Core Gameplay & Engine Systems

### 1. Authentic Visuals & Gritty Atmosphere
- **Eastern European Mountain Palette:** Desaturated, realistic early-2000s military aesthetics: crushed-gravel compound yards with tire treads (`#484540`), cracked concrete slabs, dry ochre and olive-brown steppe grass (`#383e29`), dark granite rock strata (`#454038`), and snow-dusted alpine ridges (`#dce5ed`).
- **Smooth Ridgeline Terrain:** Continuous, smooth-normal mountain valley mesh computed via multi-octave Ridged Multifractal noise (`terrain.js`), surrounding low-lying tactical compound flats with 120m–220m mountain ridges.
- **Sparse Realistic Flora:** Dry scrub bushes, deadwood branches, and slender northern conifers placed strictly along mountain edges (`35m < y < 85m`), eliminating cartoonish stacked cones.
- **Overcast Gradient Sky & Fog:** Inverted 650m SkySphere with vertical gradient (`#3e5266` to `#8296a8`) paired with `Three.js FogExp2(0x8296a8, 0.0028)` distance atmospheric haze.

### 2. 5 Authentic Project IGI Firearms & Black Tactical Gloves
- **Tactical Viewmodel & Gloves:** Dark charcoal fatigues (`#1b2022`), Kevlar gloves (`#14171a`), and molded knuckle plates (`#0a0c0e`) holding weapons angled naturally toward the center crosshair during hip fire, smoothly interpolating to dead-center during ADS.
- **Glock 17 9mm (Key 1):** Brushed steel slide, 3-dot white iron sights, trigger guard, and attachable suppressor (`Key T`). 17-round mag.
- **MP5SD3 SMG (Key 2):** Iconic Project IGI suppressed submachine gun with cylindrical perforated shroud, hooded circular front sight ring, rear rotary drum sight, curved 30-round 9mm magazine, and retractable stock rails.
- **AK-47 Kalashnikov (Key 3):** Stamped ribbed steel receiver, Russian laminate wood stock and handguard, front sight post with protective ears, curved steel magazine, and 3D star-shaped volumetric muzzle flash.
- **Colt M16A2 (Key 4):** Ribbed round handguard, A2 carrying handle with aperture peep sight, triangular front sight post, and toggleable **3-Round Burst / Full-Auto Mode** (`Key B`).
- **Dragunov SVD (Key 5):** Long fluted barrel, skeletonized wooden thumbhole stock, and illuminated Russian PSO-1 optical rangefinder scope overlay with stadiametric rangefinder curve on right-click.

### 3. Spetsnaz Guards & Spoken VHF Radio Voice Callouts
- **Rigged Humanoid Operatives:** Humanoid skeletal meshes (`Soldier.glb`) in charcoal combat fatigues with crimson Spetsnaz berets or black balaclavas, holding forward-aimed assault rifles.
- **Waypoint Loops & Guard Scanning:** Guards patrol flat compound gravel and tarmac roads (`terrain.getHeight`), pausing for 1.8s–3.0s at waypoints with look-around animations and smooth yaw rotation.
- **Clean 3D Scene:** Zero floating glowing cones in mid-air. Vision cones are rendered strictly on the 2D Tactical Radar and Satellite Map.
- **Spoken Voice Callouts:** Integrated Web Speech API (`speechSynthesis`) with procedural VHF walkie-talkie mic keying clicks and static squelch bursts (`audio.playRadioClick()`).
  - *Alert:* "Hey! Stop right there!", "Intruder! Get him!", "Hold it right there!", "Sound the alarm!"
  - *Suspicious:* "Who's there?", "Check that area!", "What was that noise?"
  - *Damage:* "Taking fire!", "I'm hit! Alarm!"
- **Hitboxes & Balanced Health:** 100 HP per enemy soldier. Instant headshot kill (`y >= 1.45`), 3–5 body shots to neutralize.

### 4. Fortified Soviet Military Compounds & Destructibles
- **Base A (Outer Checkpoint):** Concrete apron, barrier boom gate, sandbags, and chain-link fence with barbed wire and red octagonal "STOP" signs.
- **Base B (Communications Outpost):** 18m steel lattice tower with rotating parabolic radar dish, comms barracks, and destructible radar control console (Objective 2).
- **Base C (Fortified Airbase & Bunker):** Aircraft maintenance hangar, Ural 6x6 military transport truck, shipping containers, 2 watchtowers, giant cylindrical fuel storage silos with Soviet `"ОГНЕОПАСНО"` stencils, and Central Command Bunker with diagonal hazard warning stripes, sloped blast ramparts, sliding blast doors with locking wheels, and entrance floodlight.
- **Destructible Security Cameras:** Wall-mounted rotating cameras with status LEDs. Shooting a camera causes electrical sparks and smoke, permanently disabling alarms in that sector.
- **150-Decal Bullet Ring Buffer:** Wall and ground bullet impacts with surface-dependent particles (concrete dust, metal sparks, dirt).

### 5. Tactical HUD & Satellite PDA Map ("M" Key)
- **Top-Down Satellite PDA:** Displays topographic terrain contours, winding dirt roads, base compounds, live GPS player arrow, live enemy blips with vision cones, camera scan sweeps, and mission waypoints with real-time metric distance.
- **Tactical 2D Radar:** Corner HUD minimap displaying nearby colliders, enemies, awareness state indicators (Green = Patrol, Yellow = Suspicious, Red = Alert), and sweep line.
- **Status Overlay:** Health / Armor bars, detection meter, stance badge (`STAND` / `CROUCH`), ammunition counter, and fire mode badge.

---

## 📁 Project Structure

```
XX555XX/
├── index.html              # HTML5 entry with tactical HUD overlays & Russian PSO-1 scope canvas
├── package.json            # Vite & Three.js configuration
├── start_game.bat          # 1-Click desktop launcher for Windows
├── public/
│   └── models/
│       └── Soldier.glb     # Humanoid rigged soldier model (SkeletonUtils cloned)
└── src/
    ├── main.js             # Main game loop, state manager, mission flow
    ├── player.js           # First/Third-person pointer-lock controller & stance physics
    ├── weapons.js          # 5 Firearms, procedural sway, black-gloved hands, raycast ballistics
    ├── enemies.js          # Spetsnaz guard AI, waypoint patrol, speech synthesis callouts
    ├── cameras.js          # Destructible rotating surveillance cameras & alarm triggers
    ├── world.js            # Compound architecture, bunkers, hazard stripes, lighting, colliders
    ├── models.js           # Procedural 3D models (Ural truck, radar tower, fuel silos, fences)
    ├── terrain.js          # Procedural heightmap terrain mesh with smooth vertex normals
    ├── textures.js         # Procedural canvas PBR textures (gravel, hazard stripes, metal, signs)
    ├── radar.js            # Tactical 2D circular HUD radar overlay
    ├── satmap.js           # Fullscreen military satellite PDA reconnaissance map ("M" key)
    ├── ui.js               # Tactical HUD indicators, damage arcs, Russian PSO-1 reticle
    ├── audio.js            # Web Audio API sound synthesizer (shots, squelch, radio clicks)
    ├── decals.js           # Persistent bullet hole decal manager with particle emitters
    └── style.css           # Authentic military green/amber scanline HUD styling
```

---

## ⚡ Performance & Optimizations

Strictly engineered for smooth **60 FPS** on laptops with integrated graphics (e.g., Intel UHD/Iris Xe, AMD Radeon Vega):

1. **Zero External 3D Downloads (Procedural Geometry):** All compound structures, bunkers, vehicles, fences, and weapons are constructed with grouped Three.js primitives and cached procedural canvas textures.
2. **Selective Directional Shadows:** Small directional shadow camera frustum tracks the player directly (`shadow.camera.near = 0.5`, `far = 70`), delivering crisp local shadows without heavy GPU shadow-mapping overhead.
3. **Decal Ring Buffer:** Fixed 150-slot ring buffer for bullet hole decals prevents memory leaks and unbounded draw call accumulation during firefights.
4. **Clean 3D Scene:** Floating vision cones are omitted from the 3D scene (rendered solely on 2D canvas radars), saving substantial fill-rate and alpha-blending overhead.
5. **Pure Procedural Audio:** All gunshots, ricochets, explosions, alarms, and walkie-talkie clicks are synthesized in real-time via Web Audio API oscillators and noise buffers—zero bulky `.wav` or `.mp3` sound files to load.

---

## 📜 Mission Briefing

- **Stage 1 — Checkpoint Infiltration:** Infiltrate the outer security checkpoint and neutralize the guard post.
- **Stage 2 — Radar Sabotage:** Advance up the mountain road to the Communications Outpost. Sabotage the main radar console (shoot it or hold `E` for 3 seconds).
- **Stage 3 — Bunker Mainframe Infiltration:** Breach the Main Command Airbase, bypass or neutralize the Spetsnaz patrol and security cameras, enter the Central Command Bunker, and hack the defense mainframe computer.
- **Stage 4 — Extraction:** Fight your way to the North Helipad to board the extraction helicopter and complete the mission.

---

## 📄 License
MIT License. Inspired by the tactical PC classic *Project I.G.I.: I'm Going In* (2000) by Innerloop Studios / Eidos Interactive.
