// TimesWapArena3D Game Logic

// Game state
const game = {
    scene: null,
    camera: null,
    renderer: null,
    player: null,
    ghosts: [],
    projectiles: [],
    pickups: [],
    platforms: [],
    covers: [],
    vehicles: [],
    keys: {},
    mouseMovement: { x: 0, y: 0 },
    time: 0,
    recordingInterval: 10, // Record every 10 seconds
    ghostSpawnTime: 30, // Spawn ghost after 30 seconds
    pickupSpawnInterval: 15, // Spawn pickups every 15 seconds
    lastRecordingTime: 0,
    lastPickupSpawn: 0,
    lastGhostSpawn: 0,
    recordings: [],
    currentRecording: [],
    gameStarted: false,
    pointerLocked: false,
    gameOver: false
};

// Player data
const player = {
    health: 100,
    maxHealth: 100,
    weapon: 'Pistol',
    position: new THREE.Vector3(0, 2, 0),
    rotation: new THREE.Euler(0, 0, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    isGrounded: false,
    mesh: null,
    speed: 5,
    jumpForce: 8,
    damageMultiplier: 1,
    hasShield: false,
    activeEffects: [],
    inVehicle: null, // null or vehicle reference
    vehicleRotation: 0
};

// Weapon configurations
const weapons = {
    'Pistol': { damage: 10, fireRate: 500, color: 0x4444ff, projectileSpeed: 30 },
    'Shotgun': { damage: 8, fireRate: 800, color: 0xff4444, projectileSpeed: 25, pellets: 5 },
    'Rifle': { damage: 15, fireRate: 200, color: 0x44ff44, projectileSpeed: 40 }
};

// Power-up configurations
const powerUps = {
    'Speed Boost': { duration: 10, color: 0xffff00, effect: (p) => p.speed = 10 },
    'Shield': { duration: 15, color: 0xff00ff, effect: (p) => p.hasShield = true },
    'Damage Boost': { duration: 12, color: 0xff8800, effect: (p) => p.damageMultiplier = 2 }
};

let lastShotTime = 0;

// Initialize the game
function init() {
    // Create scene
    game.scene = new THREE.Scene();
    game.scene.background = new THREE.Color(0x87CEEB);
    game.scene.fog = new THREE.Fog(0x87CEEB, 60, 200);
    
    // Create camera (third-person)
    game.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    game.camera.position.set(0, 5, 10);
    
    // Create renderer
    game.renderer = new THREE.WebGLRenderer({ antialias: true });
    game.renderer.setSize(window.innerWidth, window.innerHeight);
    game.renderer.shadowMap.enabled = true;
    game.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(game.renderer.domElement);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    game.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(30, 60, 30);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -80;
    directionalLight.shadow.camera.right = 80;
    directionalLight.shadow.camera.top = 80;
    directionalLight.shadow.camera.bottom = -80;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    game.scene.add(directionalLight);
    
    // Create arena
    createArena();
    
    // Create player
    createPlayer();
    
    // Create vehicles
    createVehicles();
    
    // Create initial pickups
    spawnPickups();
    
    // Setup controls
    setupControls();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start game loop
    animate();
}

function createArena() {
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(120, 120);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4a7c59,
        roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    game.scene.add(ground);
    game.platforms.push({ mesh: ground, height: 0 });
    
    // Create SKYSCRAPER - Central landmark
    createSkyscraper();
    
    // Create multiple building structures
    createBuildings();
    
    // Create multi-level platforms
    const platformPositions = [
        // Low-level platforms around perimeter
        { x: -25, y: 2, z: -25, w: 10, h: 1, d: 10 },
        { x: 25, y: 2, z: -25, w: 10, h: 1, d: 10 },
        { x: -25, y: 2, z: 25, w: 10, h: 1, d: 10 },
        { x: 25, y: 2, z: 25, w: 10, h: 1, d: 10 },
        
        // Mid-level platforms
        { x: -15, y: 5, z: -15, w: 8, h: 1, d: 8 },
        { x: 15, y: 6, z: -15, w: 8, h: 1, d: 8 },
        { x: -15, y: 5, z: 15, w: 8, h: 1, d: 8 },
        { x: 15, y: 7, z: 15, w: 8, h: 1, d: 8 },
        
        // High-level platforms
        { x: 0, y: 10, z: -30, w: 12, h: 1, d: 8 },
        { x: 0, y: 10, z: 30, w: 12, h: 1, d: 8 },
        { x: -30, y: 9, z: 0, w: 8, h: 1, d: 12 },
        { x: 30, y: 9, z: 0, w: 8, h: 1, d: 12 },
        
        // Elevated bridges
        { x: 0, y: 8, z: -15, w: 15, h: 0.5, d: 3 },
        { x: 0, y: 8, z: 15, w: 15, h: 0.5, d: 3 },
        { x: -15, y: 8, z: 0, w: 3, h: 0.5, d: 15 },
        { x: 15, y: 8, z: 0, w: 3, h: 0.5, d: 15 },
        
        // Upper-tier small platforms
        { x: -10, y: 12, z: -10, w: 5, h: 1, d: 5 },
        { x: 10, y: 13, z: -10, w: 5, h: 1, d: 5 },
        { x: -10, y: 12, z: 10, w: 5, h: 1, d: 5 },
        { x: 10, y: 14, z: 10, w: 5, h: 1, d: 5 }
    ];
    
    platformPositions.forEach(pos => {
        const geometry = new THREE.BoxGeometry(pos.w, pos.h, pos.d);
        const material = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
        const platform = new THREE.Mesh(geometry, material);
        platform.position.set(pos.x, pos.y, pos.z);
        platform.castShadow = true;
        platform.receiveShadow = true;
        game.scene.add(platform);
        game.platforms.push({ mesh: platform, height: pos.y + pos.h / 2 });
    });
    
    // Create varied cover objects at different heights
    const coverPositions = [
        // Ground level
        { x: -5, z: -5, h: 3 }, { x: 5, z: -5, h: 3 },
        { x: -5, z: 5, h: 3 }, { x: 5, z: 5, h: 3 },
        { x: -20, z: 0, h: 4 }, { x: 20, z: 0, h: 4 },
        { x: 0, z: -20, h: 4 }, { x: 0, z: 20, h: 4 },
        
        // Mid-level obstacles
        { x: -12, z: -20, h: 2.5 }, { x: 12, z: -20, h: 2.5 },
        { x: -12, z: 20, h: 2.5 }, { x: 12, z: 20, h: 2.5 },
        
        // Perimeter cover
        { x: -35, z: -15, h: 3.5 }, { x: 35, z: -15, h: 3.5 },
        { x: -35, z: 15, h: 3.5 }, { x: 35, z: 15, h: 3.5 }
    ];
    
    coverPositions.forEach(pos => {
        const height = pos.h || 3;
        const geometry = new THREE.BoxGeometry(2, height, 2);
        const material = new THREE.MeshStandardMaterial({ color: 0x666666 });
        const cover = new THREE.Mesh(geometry, material);
        cover.position.set(pos.x, height / 2, pos.z);
        cover.castShadow = true;
        cover.receiveShadow = true;
        game.scene.add(cover);
        game.covers.push(cover);
    });
    
    // Arena walls - taller to accommodate skyscraper
    const wallHeight = 40;
    const wallThickness = 1;
    const arenaSize = 60; // Half of 120x120 ground size
    
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
    
    // North wall
    const northWall = new THREE.Mesh(
        new THREE.BoxGeometry(arenaSize * 2, wallHeight, wallThickness),
        wallMaterial
    );
    northWall.position.set(0, wallHeight / 2, -arenaSize);
    northWall.receiveShadow = true;
    game.scene.add(northWall);
    
    // South wall
    const southWall = new THREE.Mesh(
        new THREE.BoxGeometry(arenaSize * 2, wallHeight, wallThickness),
        wallMaterial
    );
    southWall.position.set(0, wallHeight / 2, arenaSize);
    southWall.receiveShadow = true;
    game.scene.add(southWall);
    
    // East wall
    const eastWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, arenaSize * 2),
        wallMaterial
    );
    eastWall.position.set(arenaSize, wallHeight / 2, 0);
    eastWall.receiveShadow = true;
    game.scene.add(eastWall);
    
    // West wall
    const westWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, arenaSize * 2),
        wallMaterial
    );
    westWall.position.set(-arenaSize, wallHeight / 2, 0);
    westWall.receiveShadow = true;
    game.scene.add(westWall);
}

function createSkyscraper() {
    // Multi-level skyscraper in center-right area
    const baseX = 20, baseZ = 0;
    
    // Base/Foundation
    const baseGeometry = new THREE.BoxGeometry(10, 2, 10);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(baseX, 1, baseZ);
    base.castShadow = true;
    base.receiveShadow = true;
    game.scene.add(base);
    game.platforms.push({ mesh: base, height: 2 });
    
    // Tower levels - each progressively smaller
    const levels = [
        { y: 4, size: 9, height: 4, color: 0x666666 },
        { y: 8, size: 8, height: 4, color: 0x707070 },
        { y: 12, size: 7, height: 4, color: 0x666666 },
        { y: 16, size: 6, height: 4, color: 0x707070 },
        { y: 20, size: 5, height: 5, color: 0x666666 },
        { y: 25, size: 4, height: 5, color: 0x707070 },
        { y: 30, size: 3, height: 3, color: 0x888888 }
    ];
    
    levels.forEach(level => {
        const geometry = new THREE.BoxGeometry(level.size, level.height, level.size);
        const material = new THREE.MeshStandardMaterial({ color: level.color });
        const floor = new THREE.Mesh(geometry, material);
        floor.position.set(baseX, level.y, baseZ);
        floor.castShadow = true;
        floor.receiveShadow = true;
        game.scene.add(floor);
        game.platforms.push({ mesh: floor, height: level.y + level.height / 2 });
        
        // Add landing platforms on some levels
        if (level.y === 8 || level.y === 16 || level.y === 25) {
            const platformSize = level.size + 3;
            const platformGeometry = new THREE.BoxGeometry(platformSize, 0.5, platformSize);
            const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
            const platform = new THREE.Mesh(platformGeometry, platformMaterial);
            platform.position.set(baseX, level.y + level.height / 2 + 0.25, baseZ);
            platform.castShadow = true;
            platform.receiveShadow = true;
            game.scene.add(platform);
            game.platforms.push({ mesh: platform, height: level.y + level.height / 2 + 0.5 });
        }
    });
    
    // Top spire
    const spireGeometry = new THREE.ConeGeometry(1.5, 4, 4);
    const spireMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const spire = new THREE.Mesh(spireGeometry, spireMaterial);
    spire.position.set(baseX, 35, baseZ);
    spire.castShadow = true;
    game.scene.add(spire);
}

function createBuildings() {
    // Create 10-story buildings with multiple floors, stairs, and windows
    const buildingPositions = [
        { x: -35, z: -35, w: 18, d: 18 },
        { x: 35, z: -35, w: 20, d: 16 },
        { x: -35, z: 35, w: 16, d: 20 },
        { x: 35, z: 35, w: 18, d: 18 },
        { x: 0, z: -40, w: 15, d: 15 },
        { x: -40, z: 0, w: 15, d: 15 },
        { x: 40, z: 0, w: 15, d: 15 }
    ];
    
    buildingPositions.forEach((buildingData, index) => {
        create10StoryBuilding(buildingData.x, buildingData.z, buildingData.w, buildingData.d, index);
    });
}

function create10StoryBuilding(baseX, baseZ, width, depth, buildingIndex) {
    const floorHeight = 3;
    const numFloors = 10;
    const wallThickness = 0.3;
    const windowSize = 1.2;
    
    // Building exterior walls
    for (let floor = 0; floor < numFloors; floor++) {
        const floorY = floor * floorHeight;
        
        // Create floor platform
        const floorGeometry = new THREE.BoxGeometry(width, 0.3, depth);
        const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.position.set(baseX, floorY + 0.15, baseZ);
        floorMesh.castShadow = true;
        floorMesh.receiveShadow = true;
        game.scene.add(floorMesh);
        game.platforms.push({ mesh: floorMesh, height: floorY + 0.3 });
        
        // Create walls with windows
        createWallsWithWindows(baseX, baseZ, floorY, width, depth, floorHeight, wallThickness, windowSize);
    }
    
    // Add stairs/ramps connecting floors
    for (let floor = 0; floor < numFloors - 1; floor++) {
        createStaircase(baseX, baseZ, floor * floorHeight, floorHeight, width, depth);
    }
    
    // Rooftop
    const roofGeometry = new THREE.BoxGeometry(width + 1, 0.5, depth + 1);
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(baseX, numFloors * floorHeight + 0.25, baseZ);
    roof.castShadow = true;
    roof.receiveShadow = true;
    game.scene.add(roof);
    game.platforms.push({ mesh: roof, height: numFloors * floorHeight + 0.5 });
}

function createWallsWithWindows(x, z, y, width, depth, height, wallThickness, windowSize) {
    const windowSpacing = 3;
    const windowY = y + height / 2;
    
    // North and South walls
    for (let side = 0; side < 2; side++) {
        const wallZ = z + (side === 0 ? -depth/2 : depth/2);
        const numWindows = Math.floor(width / windowSpacing);
        
        for (let i = 0; i < numWindows; i++) {
            const windowX = x - width/2 + windowSpacing/2 + i * windowSpacing;
            
            // Wall segments between windows
            if (i === 0) {
                // Left edge wall
                const wallGeometry = new THREE.BoxGeometry(windowSpacing/2, height, wallThickness);
                const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x707070 });
                const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                wall.position.set(x - width/2 + windowSpacing/4, y + height/2, wallZ);
                wall.castShadow = true;
                wall.receiveShadow = true;
                game.scene.add(wall);
            }
            
            // Wall pillar between windows
            const pillarGeometry = new THREE.BoxGeometry(windowSpacing - windowSize, height, wallThickness);
            const pillarMaterial = new THREE.MeshStandardMaterial({ color: 0x707070 });
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(windowX + windowSize/2 + (windowSpacing - windowSize)/2, y + height/2, wallZ);
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            game.scene.add(pillar);
            
            // Window frame (transparent glass effect)
            const windowGeometry = new THREE.BoxGeometry(windowSize, windowSize, wallThickness * 0.5);
            const windowMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x87ceeb, 
                transparent: true, 
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            const window = new THREE.Mesh(windowGeometry, windowMaterial);
            window.position.set(windowX, windowY, wallZ);
            game.scene.add(window);
        }
    }
    
    // East and West walls
    for (let side = 0; side < 2; side++) {
        const wallX = x + (side === 0 ? -width/2 : width/2);
        const numWindows = Math.floor(depth / windowSpacing);
        
        for (let i = 0; i < numWindows; i++) {
            const windowZ = z - depth/2 + windowSpacing/2 + i * windowSpacing;
            
            // Wall segments
            if (i === 0) {
                const wallGeometry = new THREE.BoxGeometry(wallThickness, height, windowSpacing/2);
                const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x707070 });
                const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                wall.position.set(wallX, y + height/2, z - depth/2 + windowSpacing/4);
                wall.castShadow = true;
                wall.receiveShadow = true;
                game.scene.add(wall);
            }
            
            // Wall pillar
            const pillarGeometry = new THREE.BoxGeometry(wallThickness, height, windowSpacing - windowSize);
            const pillarMaterial = new THREE.MeshStandardMaterial({ color: 0x707070 });
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(wallX, y + height/2, windowZ + windowSize/2 + (windowSpacing - windowSize)/2);
            pillar.castShadow = true;
            pillar.receiveShadow = true;
            game.scene.add(pillar);
            
            // Window
            const windowGeometry = new THREE.BoxGeometry(wallThickness * 0.5, windowSize, windowSize);
            const windowMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x87ceeb, 
                transparent: true, 
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            const window = new THREE.Mesh(windowGeometry, windowMaterial);
            window.position.set(wallX, windowY, windowZ);
            game.scene.add(window);
        }
    }
}

function createStaircase(x, z, startY, height, buildingWidth, buildingDepth) {
    // Create a ramp/staircase on the side of the building
    const rampWidth = 3;
    const rampLength = height * 2;
    const rampX = x + buildingWidth / 2 + rampWidth / 2;
    
    const rampGeometry = new THREE.BoxGeometry(rampWidth, 0.5, rampLength);
    const rampMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
    const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
    ramp.position.set(rampX, startY + height / 2, z);
    ramp.rotation.x = Math.atan2(height, rampLength);
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    game.scene.add(ramp);
    game.platforms.push({ mesh: ramp, height: startY + height });
    
    // Add railings
    const railingGeometry = new THREE.BoxGeometry(0.1, 1, rampLength);
    const railingMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    
    for (let side = 0; side < 2; side++) {
        const railingOffset = side === 0 ? -rampWidth/2 : rampWidth/2;
        const railing = new THREE.Mesh(railingGeometry, railingMaterial);
        railing.position.set(rampX + railingOffset, startY + height / 2 + 0.5, z);
        railing.rotation.x = Math.atan2(height, rampLength);
        railing.castShadow = true;
        game.scene.add(railing);
    }
}

function createPlayer() {
    // Player body
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    player.mesh = new THREE.Mesh(geometry, material);
    player.mesh.position.copy(player.position);
    player.mesh.castShadow = true;
    game.scene.add(player.mesh);
    
    game.player = player;
}

function createVehicles() {
    // Create tanks on the ground
    createTank(new THREE.Vector3(-20, 1, 0), 0);
    createTank(new THREE.Vector3(20, 1, 0), Math.PI);
    
    // Create helicopters at elevated positions
    createHelicopter(new THREE.Vector3(0, 15, -25), 0);
    createHelicopter(new THREE.Vector3(0, 15, 25), Math.PI);
    
    // Create airplanes at high altitude
    createAirplane(new THREE.Vector3(-25, 20, -25), Math.PI / 4);
    createAirplane(new THREE.Vector3(25, 20, 25), -3 * Math.PI / 4);
}

function createTank(position, rotation) {
    const tankGroup = new THREE.Group();
    
    // Tank body
    const bodyGeometry = new THREE.BoxGeometry(4, 2, 6);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x3d5c3d });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    tankGroup.add(body);
    
    // Tank turret
    const turretGeometry = new THREE.CylinderGeometry(1.2, 1.2, 1.5, 8);
    const turretMaterial = new THREE.MeshStandardMaterial({ color: 0x2d4c2d });
    const turret = new THREE.Mesh(turretGeometry, turretMaterial);
    turret.position.y = 2.5;
    turret.castShadow = true;
    tankGroup.add(turret);
    
    // Tank cannon
    const cannonGeometry = new THREE.CylinderGeometry(0.3, 0.3, 4, 8);
    const cannonMaterial = new THREE.MeshStandardMaterial({ color: 0x1d3c1d });
    const cannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
    cannon.position.set(0, 2.5, 2.5);
    cannon.rotation.x = Math.PI / 2;
    cannon.castShadow = true;
    tankGroup.add(cannon);
    
    // Wheels/treads
    for (let i = 0; i < 3; i++) {
        for (let side = 0; side < 2; side++) {
            const wheelGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.5, 8);
            const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(side === 0 ? -2.2 : 2.2, 0.6, -2 + i * 2);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            tankGroup.add(wheel);
        }
    }
    
    tankGroup.position.copy(position);
    tankGroup.rotation.y = rotation;
    game.scene.add(tankGroup);
    
    const vehicle = {
        type: 'tank',
        mesh: tankGroup,
        position: position.clone(),
        rotation: rotation,
        turret: turret,
        cannon: cannon,
        occupied: false,
        shootPosition: new THREE.Vector3(0, 2.5, 4)
    };
    
    game.vehicles.push(vehicle);
}

function createHelicopter(position, rotation) {
    const heliGroup = new THREE.Group();
    
    // Helicopter body
    const bodyGeometry = new THREE.BoxGeometry(3, 2, 6);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    heliGroup.add(body);
    
    // Cockpit
    const cockpitGeometry = new THREE.SphereGeometry(1.5, 8, 8);
    const cockpitMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x87ceeb, 
        transparent: true, 
        opacity: 0.5
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, 0.5, 2);
    cockpit.scale.set(1, 0.8, 1.2);
    heliGroup.add(cockpit);
    
    // Tail
    const tailGeometry = new THREE.BoxGeometry(0.8, 0.8, 4);
    const tailMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.set(0, 0.5, -5);
    tail.castShadow = true;
    heliGroup.add(tail);
    
    // Main rotor
    const rotorGeometry = new THREE.BoxGeometry(8, 0.2, 0.6);
    const rotorMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    const rotor = new THREE.Mesh(rotorGeometry, rotorMaterial);
    rotor.position.y = 1.5;
    rotor.castShadow = true;
    heliGroup.add(rotor);
    
    // Tail rotor
    const tailRotorGeometry = new THREE.BoxGeometry(0.2, 1.5, 0.2);
    const tailRotor = new THREE.Mesh(tailRotorGeometry, rotorMaterial);
    tailRotor.position.set(0.5, 0.5, -7);
    tailRotor.castShadow = true;
    heliGroup.add(tailRotor);
    
    // Landing skids
    for (let side = 0; side < 2; side++) {
        const skidGeometry = new THREE.BoxGeometry(0.3, 0.3, 4);
        const skidMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
        const skid = new THREE.Mesh(skidGeometry, skidMaterial);
        skid.position.set(side === 0 ? -1.5 : 1.5, -1.2, 0);
        skid.castShadow = true;
        heliGroup.add(skid);
    }
    
    heliGroup.position.copy(position);
    heliGroup.rotation.y = rotation;
    game.scene.add(heliGroup);
    
    const vehicle = {
        type: 'helicopter',
        mesh: heliGroup,
        position: position.clone(),
        rotation: rotation,
        rotor: rotor,
        tailRotor: tailRotor,
        occupied: false,
        shootPosition: new THREE.Vector3(0, 0, 3)
    };
    
    game.vehicles.push(vehicle);
}

function createAirplane(position, rotation) {
    const planeGroup = new THREE.Group();
    
    // Fuselage
    const fuselageGeometry = new THREE.CylinderGeometry(1, 1.2, 8, 8);
    const fuselageMaterial = new THREE.MeshStandardMaterial({ color: 0x6a7a8a });
    const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
    fuselage.rotation.z = Math.PI / 2;
    fuselage.castShadow = true;
    planeGroup.add(fuselage);
    
    // Nose cone
    const noseGeometry = new THREE.ConeGeometry(1, 2, 8);
    const nose = new THREE.Mesh(noseGeometry, fuselageMaterial);
    nose.position.z = 5;
    nose.rotation.x = Math.PI / 2;
    nose.castShadow = true;
    planeGroup.add(nose);
    
    // Cockpit
    const cockpitGeometry = new THREE.SphereGeometry(1.2, 8, 8);
    const cockpitMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x87ceeb, 
        transparent: true, 
        opacity: 0.5
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, 0.5, 2);
    cockpit.scale.set(1, 0.7, 1.5);
    planeGroup.add(cockpit);
    
    // Main wings
    const wingGeometry = new THREE.BoxGeometry(12, 0.3, 3);
    const wingMaterial = new THREE.MeshStandardMaterial({ color: 0x5a6a7a });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.z = 0;
    wings.castShadow = true;
    planeGroup.add(wings);
    
    // Tail wings
    const tailWingGeometry = new THREE.BoxGeometry(4, 0.3, 2);
    const tailWings = new THREE.Mesh(tailWingGeometry, wingMaterial);
    tailWings.position.z = -3.5;
    tailWings.castShadow = true;
    planeGroup.add(tailWings);
    
    // Vertical stabilizer
    const stabilizerGeometry = new THREE.BoxGeometry(0.3, 2, 2);
    const stabilizer = new THREE.Mesh(stabilizerGeometry, wingMaterial);
    stabilizer.position.set(0, 1.5, -3.5);
    stabilizer.castShadow = true;
    planeGroup.add(stabilizer);
    
    // Propeller
    const propellerGeometry = new THREE.BoxGeometry(3, 0.2, 0.5);
    const propellerMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
    propeller.position.z = 6;
    propeller.castShadow = true;
    planeGroup.add(propeller);
    
    planeGroup.position.copy(position);
    planeGroup.rotation.y = rotation;
    game.scene.add(planeGroup);
    
    const vehicle = {
        type: 'airplane',
        mesh: planeGroup,
        position: position.clone(),
        rotation: rotation,
        propeller: propeller,
        occupied: false,
        shootPosition: new THREE.Vector3(0, 0, 4)
    };
    
    game.vehicles.push(vehicle);
}

function spawnPickups() {
    // Fixed spawn points for pickups - distributed across multiple levels
    const weaponSpawns = [
        // Ground level
        { pos: new THREE.Vector3(-10, 1, -10), type: 'weapon', weapon: 'Shotgun' },
        { pos: new THREE.Vector3(10, 1, -10), type: 'weapon', weapon: 'Rifle' },
        
        // Mid-level platforms
        { pos: new THREE.Vector3(-15, 6, -15), type: 'weapon', weapon: 'Pistol' },
        { pos: new THREE.Vector3(15, 8, 15), type: 'weapon', weapon: 'Shotgun' },
        
        // High platforms
        { pos: new THREE.Vector3(0, 11, -30), type: 'weapon', weapon: 'Rifle' },
        { pos: new THREE.Vector3(30, 10, 0), type: 'weapon', weapon: 'Shotgun' },
        
        // Skyscraper levels
        { pos: new THREE.Vector3(20, 9, 0), type: 'weapon', weapon: 'Rifle' },
        { pos: new THREE.Vector3(20, 17, 0), type: 'weapon', weapon: 'Pistol' }
    ];
    
    const powerUpSpawns = [
        // Ground level
        { pos: new THREE.Vector3(0, 1, 0), type: 'powerup', powerup: 'Speed Boost' },
        { pos: new THREE.Vector3(-25, 3, -25), type: 'powerup', powerup: 'Shield' },
        
        // Mid-level
        { pos: new THREE.Vector3(0, 9, 15), type: 'powerup', powerup: 'Damage Boost' },
        { pos: new THREE.Vector3(-15, 9, 0), type: 'powerup', powerup: 'Speed Boost' },
        
        // High level platforms
        { pos: new THREE.Vector3(10, 14, 10), type: 'powerup', powerup: 'Shield' },
        { pos: new THREE.Vector3(-10, 13, -10), type: 'powerup', powerup: 'Damage Boost' },
        
        // Skyscraper landing platform
        { pos: new THREE.Vector3(20, 26, 0), type: 'powerup', powerup: 'Shield' }
    ];
    
    // Create weapon pickups
    weaponSpawns.forEach(spawn => {
        createPickup(spawn.pos, spawn.type, spawn.weapon);
    });
    
    // Create power-up pickups
    powerUpSpawns.forEach(spawn => {
        createPickup(spawn.pos, spawn.type, null, spawn.powerup);
    });
}

function createPickup(position, type, weapon = null, powerup = null) {
    let color, name;
    
    if (type === 'weapon') {
        color = weapons[weapon].color;
        name = weapon;
    } else {
        color = powerUps[powerup].color;
        name = powerup;
    }
    
    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const material = new THREE.MeshStandardMaterial({ 
        color: color,
        emissive: color,
        emissiveIntensity: 0.3
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.castShadow = true;
    
    const pickup = {
        mesh: mesh,
        type: type,
        weapon: weapon,
        powerup: powerup,
        name: name,
        spawnPosition: position.clone(),
        rotationSpeed: 0.02
    };
    
    game.pickups.push(pickup);
    game.scene.add(mesh);
}

function setupControls() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        game.keys[e.key.toLowerCase()] = true;
        
        // 'E' key to enter/exit vehicles
        if (e.key.toLowerCase() === 'e' && game.gameStarted) {
            toggleVehicle();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        game.keys[e.key.toLowerCase()] = false;
    });
    
    // Mouse controls
    document.addEventListener('mousemove', (e) => {
        if (!game.pointerLocked) return;
        
        game.mouseMovement.x += e.movementX * 0.002;
        game.mouseMovement.y += e.movementY * 0.002;
        game.mouseMovement.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, game.mouseMovement.y));
    });
    
    document.addEventListener('click', () => {
        if (!game.gameStarted) return;
        
        if (!game.pointerLocked) {
            document.body.requestPointerLock();
        } else {
            shoot();
        }
    });
    
    document.addEventListener('pointerlockchange', () => {
        game.pointerLocked = document.pointerLockElement === document.body;
    });
    
    // Start button
    document.getElementById('startButton').addEventListener('click', () => {
        document.getElementById('instructions').style.display = 'none';
        game.gameStarted = true;
        document.body.requestPointerLock();
    });
}

function toggleVehicle() {
    if (player.inVehicle) {
        // Exit vehicle
        const vehicle = player.inVehicle;
        vehicle.occupied = false;
        player.inVehicle = null;
        
        // Position player next to vehicle
        player.position.set(
            vehicle.position.x + 5,
            vehicle.position.y,
            vehicle.position.z
        );
        player.mesh.visible = true;
    } else {
        // Try to enter nearby vehicle
        for (let vehicle of game.vehicles) {
            const distance = player.position.distanceTo(vehicle.position);
            if (distance < 8 && !vehicle.occupied) {
                vehicle.occupied = true;
                player.inVehicle = vehicle;
                player.vehicleRotation = vehicle.rotation;
                player.mesh.visible = false;
                break;
            }
        }
    }
}

function updatePlayer(deltaTime) {
    if (!player.mesh) return;
    
    // Check if player is in a vehicle
    if (player.inVehicle) {
        updateVehicleMovement(deltaTime);
        return;
    }
    
    // Apply gravity
    if (!player.isGrounded) {
        player.velocity.y -= 20 * deltaTime;
    }
    
    // Movement
    const moveSpeed = player.speed * deltaTime;
    const forward = new THREE.Vector3(
        -Math.sin(game.mouseMovement.x),
        0,
        -Math.cos(game.mouseMovement.x)
    ).normalize();
    const right = new THREE.Vector3(
        Math.cos(game.mouseMovement.x),
        0,
        -Math.sin(game.mouseMovement.x)
    ).normalize();
    
    if (game.keys['w']) {
        player.velocity.x += forward.x * moveSpeed;
        player.velocity.z += forward.z * moveSpeed;
    }
    if (game.keys['s']) {
        player.velocity.x -= forward.x * moveSpeed;
        player.velocity.z -= forward.z * moveSpeed;
    }
    if (game.keys['a']) {
        player.velocity.x -= right.x * moveSpeed;
        player.velocity.z -= right.z * moveSpeed;
    }
    if (game.keys['d']) {
        player.velocity.x += right.x * moveSpeed;
        player.velocity.z += right.z * moveSpeed;
    }
    
    // Jump
    if (game.keys[' '] && player.isGrounded) {
        player.velocity.y = player.jumpForce;
        player.isGrounded = false;
    }
    
    // Apply friction
    player.velocity.x *= 0.8;
    player.velocity.z *= 0.8;
    
    // Update position
    player.position.x += player.velocity.x;
    player.position.y += player.velocity.y * deltaTime;
    player.position.z += player.velocity.z;
    
    // Ground collision
    checkGroundCollision();
    
    // Boundary collision - slightly less than arenaSize to keep player inside walls
    const boundary = 58; // arenaSize (60) minus player width/2 and wall thickness
    player.position.x = Math.max(-boundary, Math.min(boundary, player.position.x));
    player.position.z = Math.max(-boundary, Math.min(boundary, player.position.z));
    
    // Update mesh
    player.mesh.position.copy(player.position);
    player.rotation.y = game.mouseMovement.x;
    player.mesh.rotation.y = player.rotation.y;
    
    // Update camera (third-person)
    const cameraDistance = 8;
    const cameraHeight = 3;
    const cameraOffset = new THREE.Vector3(
        Math.sin(game.mouseMovement.x) * cameraDistance,
        cameraHeight,
        Math.cos(game.mouseMovement.x) * cameraDistance
    );
    game.camera.position.copy(player.position).add(cameraOffset);
    game.camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 1, 0)));
}

function updateVehicleMovement(deltaTime) {
    const vehicle = player.inVehicle;
    if (!vehicle) return;
    
    const moveSpeed = 10 * deltaTime;
    const turnSpeed = 1.5 * deltaTime;
    
    // Rotation controls
    if (game.keys['a']) {
        player.vehicleRotation += turnSpeed;
    }
    if (game.keys['d']) {
        player.vehicleRotation -= turnSpeed;
    }
    
    // Movement controls
    if (game.keys['w']) {
        vehicle.position.x -= Math.sin(player.vehicleRotation) * moveSpeed;
        vehicle.position.z -= Math.cos(player.vehicleRotation) * moveSpeed;
    }
    if (game.keys['s']) {
        vehicle.position.x += Math.sin(player.vehicleRotation) * moveSpeed;
        vehicle.position.z += Math.cos(player.vehicleRotation) * moveSpeed;
    }
    
    // Helicopter/Airplane altitude controls
    if (vehicle.type === 'helicopter' || vehicle.type === 'airplane') {
        if (game.keys[' ']) {
            vehicle.position.y += 5 * deltaTime;
        }
        if (game.keys['shift']) {
            vehicle.position.y -= 5 * deltaTime;
        }
        vehicle.position.y = Math.max(2, Math.min(50, vehicle.position.y));
    }
    
    // Update vehicle mesh
    vehicle.mesh.position.copy(vehicle.position);
    vehicle.mesh.rotation.y = player.vehicleRotation;
    
    // Animate vehicle parts
    if (vehicle.type === 'helicopter') {
        vehicle.rotor.rotation.y += 20 * deltaTime;
        vehicle.tailRotor.rotation.x += 20 * deltaTime;
    } else if (vehicle.type === 'airplane') {
        vehicle.propeller.rotation.y += 30 * deltaTime;
    }
    
    // Update player position to match vehicle
    player.position.copy(vehicle.position);
    
    // Update camera for vehicle view
    const cameraDistance = 15;
    const cameraHeight = 5;
    const cameraOffset = new THREE.Vector3(
        Math.sin(player.vehicleRotation) * cameraDistance,
        cameraHeight,
        Math.cos(player.vehicleRotation) * cameraDistance
    );
    game.camera.position.copy(vehicle.position).add(cameraOffset);
    game.camera.lookAt(vehicle.position.clone().add(new THREE.Vector3(0, 0, 0)));
}

function checkGroundCollision() {
    player.isGrounded = false;
    
    // Check ground
    if (player.position.y <= 1) {
        player.position.y = 1;
        player.velocity.y = 0;
        player.isGrounded = true;
    }
    
    // Check platforms
    game.platforms.forEach(platform => {
        if (platform.height === 0) return; // Skip ground
        
        const box = new THREE.Box3().setFromObject(platform.mesh);
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            player.position,
            new THREE.Vector3(1, 2, 1)
        );
        
        if (box.intersectsBox(playerBox)) {
            // Check if player is falling onto platform
            if (player.velocity.y < 0 && player.position.y > platform.height) {
                player.position.y = platform.height + 1;
                player.velocity.y = 0;
                player.isGrounded = true;
            }
        }
    });
}

function shoot() {
    const now = Date.now();
    const weaponConfig = weapons[player.weapon];
    
    if (now - lastShotTime < weaponConfig.fireRate) return;
    lastShotTime = now;
    
    const pelletsToFire = weaponConfig.pellets || 1;
    
    for (let i = 0; i < pelletsToFire; i++) {
        const spread = weaponConfig.pellets ? 0.1 : 0;
        const spreadX = (Math.random() - 0.5) * spread;
        const spreadY = (Math.random() - 0.5) * spread;
        
        let direction, startPosition;
        
        if (player.inVehicle) {
            // Shooting from vehicle
            const vehicle = player.inVehicle;
            direction = new THREE.Vector3(
                -Math.sin(player.vehicleRotation + spreadX),
                -Math.tan(game.mouseMovement.y + spreadY),
                -Math.cos(player.vehicleRotation + spreadX)
            ).normalize();
            
            // Use vehicle's shoot position
            const shootOffset = vehicle.shootPosition.clone();
            shootOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.vehicleRotation);
            startPosition = vehicle.position.clone().add(shootOffset);
        } else {
            // Normal shooting
            direction = new THREE.Vector3(
                -Math.sin(game.mouseMovement.x + spreadX),
                -Math.tan(game.mouseMovement.y + spreadY),
                -Math.cos(game.mouseMovement.x + spreadX)
            ).normalize();
            
            startPosition = player.position.clone().add(new THREE.Vector3(0, 1, 0));
        }
        
        createProjectile(startPosition, direction, weaponConfig, player, false);
    }
    
    // Record shot
    recordAction('shoot', { weapon: player.weapon });
}

function createProjectile(position, direction, weaponConfig, shooter, isGhost) {
    const geometry = new THREE.SphereGeometry(0.15, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: weaponConfig.color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    
    const projectile = {
        mesh: mesh,
        direction: direction,
        speed: weaponConfig.projectileSpeed,
        damage: weaponConfig.damage * (shooter.damageMultiplier || 1),
        shooter: shooter,
        lifetime: 3,
        isGhost: isGhost
    };
    
    game.projectiles.push(projectile);
    game.scene.add(mesh);
}

function updateProjectiles(deltaTime) {
    for (let i = game.projectiles.length - 1; i >= 0; i--) {
        const projectile = game.projectiles[i];
        
        // Move projectile
        projectile.mesh.position.add(
            projectile.direction.clone().multiplyScalar(projectile.speed * deltaTime)
        );
        
        // Check collision with player (if shot by ghost)
        if (projectile.isGhost) {
            const distance = projectile.mesh.position.distanceTo(player.position);
            if (distance < 1.5) {
                damagePlayer(projectile.damage);
                game.scene.remove(projectile.mesh);
                game.projectiles.splice(i, 1);
                continue;
            }
        }
        
        // Check collision with ghosts (if shot by player)
        if (!projectile.isGhost) {
            for (let j = game.ghosts.length - 1; j >= 0; j--) {
                const ghost = game.ghosts[j];
                const distance = projectile.mesh.position.distanceTo(ghost.position);
                if (distance < 1.5) {
                    ghost.health -= projectile.damage;
                    game.scene.remove(projectile.mesh);
                    game.projectiles.splice(i, 1);
                    
                    if (ghost.health <= 0) {
                        game.scene.remove(ghost.mesh);
                        game.ghosts.splice(j, 1);
                    }
                    break;
                }
            }
        }
        
        // Remove after lifetime
        projectile.lifetime -= deltaTime;
        if (projectile.lifetime <= 0 || Math.abs(projectile.mesh.position.x) > 50 || 
            Math.abs(projectile.mesh.position.z) > 50) {
            game.scene.remove(projectile.mesh);
            game.projectiles.splice(i, 1);
        }
    }
}

function damagePlayer(damage) {
    if (player.hasShield) {
        return; // Shield blocks all damage
    }
    
    player.health = Math.max(0, player.health - damage);
    updateHUD();
    
    if (player.health <= 0 && !game.gameOver) {
        game.gameOver = true;
        showGameOver();
    }
}

function showGameOver() {
    const gameOverDiv = document.createElement('div');
    gameOverDiv.id = 'gameOver';
    gameOverDiv.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 40px;
        border-radius: 10px;
        text-align: center;
        z-index: 300;
    `;
    gameOverDiv.innerHTML = `
        <h2 style="margin-top: 0; color: #ff0000;">Game Over!</h2>
        <p>Your ghost got you!</p>
        <p>Survived: ${Math.floor(game.time)} seconds</p>
        <button id="restartButton" style="
            margin-top: 20px;
            padding: 10px 30px;
            font-size: 16px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
        ">Restart</button>
    `;
    document.body.appendChild(gameOverDiv);
    
    document.getElementById('restartButton').addEventListener('click', () => {
        location.reload();
    });
}

function checkPickupCollision() {
    for (let i = game.pickups.length - 1; i >= 0; i--) {
        const pickup = game.pickups[i];
        const distance = pickup.mesh.position.distanceTo(player.position);
        
        if (distance < 2) {
            if (pickup.type === 'weapon') {
                player.weapon = pickup.weapon;
                recordAction('pickup', { type: 'weapon', name: pickup.weapon });
            } else {
                activatePowerUp(pickup.powerup);
                recordAction('pickup', { type: 'powerup', name: pickup.powerup });
            }
            
            game.scene.remove(pickup.mesh);
            game.pickups.splice(i, 1);
        }
    }
}

function activatePowerUp(powerUpName) {
    const powerUp = powerUps[powerUpName];
    
    // Apply effect
    powerUp.effect(player);
    
    // Add to active effects
    const effect = {
        name: powerUpName,
        endTime: game.time + powerUp.duration
    };
    player.activeEffects.push(effect);
    
    updateHUD();
}

function updatePowerUps() {
    for (let i = player.activeEffects.length - 1; i >= 0; i--) {
        const effect = player.activeEffects[i];
        
        if (game.time >= effect.endTime) {
            // Remove effect
            if (effect.name === 'Speed Boost') {
                player.speed = 5;
            } else if (effect.name === 'Shield') {
                player.hasShield = false;
            } else if (effect.name === 'Damage Boost') {
                player.damageMultiplier = 1;
            }
            
            player.activeEffects.splice(i, 1);
        }
    }
    
    updateHUD();
}

function recordAction(type, data = {}) {
    const record = {
        time: game.time,
        type: type,
        position: player.position.clone(),
        rotation: player.rotation.y,
        weapon: player.weapon,
        data: data
    };
    
    game.currentRecording.push(record);
}

function createGhost(recording) {
    // Create ghost mesh
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        transparent: true,
        opacity: 0.5
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 1, 0);
    mesh.castShadow = true;
    game.scene.add(mesh);
    
    const ghost = {
        mesh: mesh,
        recording: recording,
        playbackIndex: 0,
        position: new THREE.Vector3(0, 1, 0),
        rotation: 0,
        weapon: 'Pistol',
        startTime: game.time,
        health: 100,
        damageMultiplier: 1
    };
    
    game.ghosts.push(ghost);
}

function updateGhosts(deltaTime) {
    game.ghosts.forEach(ghost => {
        const elapsedTime = game.time - ghost.startTime;
        
        // Find current action in recording
        while (ghost.playbackIndex < ghost.recording.length) {
            const action = ghost.recording[ghost.playbackIndex];
            const actionTime = action.time - ghost.recording[0].time;
            
            if (actionTime <= elapsedTime) {
                // Execute action
                if (action.type === 'move') {
                    ghost.position.copy(action.position);
                    ghost.rotation = action.rotation;
                } else if (action.type === 'shoot') {
                    ghostShoot(ghost, action);
                } else if (action.type === 'pickup') {
                    ghost.weapon = action.data.name;
                    if (action.data.type === 'powerup') {
                        const powerUp = powerUps[action.data.name];
                        if (action.data.name === 'Damage Boost') {
                            ghost.damageMultiplier = 2;
                        }
                    }
                }
                
                ghost.playbackIndex++;
            } else {
                break;
            }
        }
        
        // Update ghost mesh
        ghost.mesh.position.copy(ghost.position);
        ghost.mesh.rotation.y = ghost.rotation;
    });
}

function ghostShoot(ghost, action) {
    const weaponConfig = weapons[action.weapon];
    const pelletsToFire = weaponConfig.pellets || 1;
    
    for (let i = 0; i < pelletsToFire; i++) {
        const spread = weaponConfig.pellets ? 0.1 : 0;
        const spreadX = (Math.random() - 0.5) * spread;
        
        const direction = new THREE.Vector3(
            -Math.sin(ghost.rotation + spreadX),
            0,
            -Math.cos(ghost.rotation + spreadX)
        ).normalize();
        
        const startPosition = ghost.position.clone().add(new THREE.Vector3(0, 1, 0));
        
        createProjectile(startPosition, direction, weaponConfig, ghost, true);
    }
}

function updatePickups(deltaTime) {
    // Rotate pickups
    game.pickups.forEach(pickup => {
        pickup.mesh.rotation.y += pickup.rotationSpeed;
        pickup.mesh.position.y = pickup.spawnPosition.y + Math.sin(game.time * 2) * 0.2;
    });
    
    // Respawn pickups every 15 seconds
    if (game.time - game.lastPickupSpawn >= game.pickupSpawnInterval) {
        game.lastPickupSpawn = game.time;
        
        // Remove existing pickups
        game.pickups.forEach(pickup => {
            game.scene.remove(pickup.mesh);
        });
        game.pickups = [];
        
        // Respawn
        spawnPickups();
    }
}

function updateRecording() {
    // Record position every frame
    recordAction('move');
    
    // Save recording every 10 seconds
    if (game.time - game.lastRecordingTime >= game.recordingInterval) {
        if (game.currentRecording.length > 0) {
            game.recordings.push([...game.currentRecording]);
            game.currentRecording = [];
        }
        game.lastRecordingTime = game.time;
    }
    
    // Spawn ghost after 30 seconds and every 10 seconds after
    if (game.time >= game.ghostSpawnTime && game.recordings.length > 0) {
        const recordingIndex = Math.floor((game.time - game.ghostSpawnTime) / game.recordingInterval);
        if (recordingIndex < game.recordings.length && 
            game.time - game.lastGhostSpawn >= game.recordingInterval) {
            createGhost(game.recordings[recordingIndex]);
            game.lastGhostSpawn = game.time;
        }
    }
}

function updateHUD() {
    document.getElementById('health').textContent = Math.round(player.health);
    document.getElementById('weapon').textContent = player.weapon;
    document.getElementById('time').textContent = Math.floor(game.time);
    
    // Update active effects
    const effectsDiv = document.getElementById('activeEffects');
    if (player.activeEffects.length > 0) {
        effectsDiv.innerHTML = 'Active: ' + player.activeEffects.map(e => {
            const remaining = Math.ceil(e.endTime - game.time);
            return `${e.name} (${remaining}s)`;
        }).join(', ');
    } else {
        effectsDiv.innerHTML = '';
    }
}

function onWindowResize() {
    game.camera.aspect = window.innerWidth / window.innerHeight;
    game.camera.updateProjectionMatrix();
    game.renderer.setSize(window.innerWidth, window.innerHeight);
}

let lastTime = performance.now();

function animate() {
    requestAnimationFrame(animate);
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    if (game.gameStarted && !game.gameOver) {
        game.time += deltaTime;
        
        updatePlayer(deltaTime);
        updateProjectiles(deltaTime);
        updateGhosts(deltaTime);
        updatePickups(deltaTime);
        checkPickupCollision();
        updatePowerUps();
        updateRecording();
        updateHUD();
    }
    
    game.renderer.render(game.scene, game.camera);
}

// Initialize game when page loads
window.addEventListener('load', init);
