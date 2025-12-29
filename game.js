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
    keys: {},
    mouseMovement: { x: 0, y: 0 },
    time: 0,
    recordingInterval: 10, // Record every 10 seconds
    ghostSpawnTime: 30, // Spawn ghost after 30 seconds
    pickupSpawnInterval: 15, // Spawn pickups every 15 seconds
    lastRecordingTime: 0,
    lastPickupSpawn: 0,
    recordings: [],
    currentRecording: [],
    gameStarted: false,
    pointerLocked: false
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
    activeEffects: []
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
    game.scene.fog = new THREE.Fog(0x87CEEB, 50, 150);
    
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
    directionalLight.position.set(20, 40, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    game.scene.add(directionalLight);
    
    // Create arena
    createArena();
    
    // Create player
    createPlayer();
    
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
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4a7c59,
        roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    game.scene.add(ground);
    game.platforms.push({ mesh: ground, height: 0 });
    
    // Create platforms
    const platformPositions = [
        { x: -15, y: 2, z: -15, w: 8, h: 1, d: 8 },
        { x: 15, y: 3, z: -15, w: 8, h: 1, d: 8 },
        { x: -15, y: 2, z: 15, w: 8, h: 1, d: 8 },
        { x: 15, y: 4, z: 15, w: 8, h: 1, d: 8 },
        { x: 0, y: 5, z: 0, w: 10, h: 1, d: 10 }
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
    
    // Create cover objects
    const coverPositions = [
        { x: -5, z: -5 }, { x: 5, z: -5 },
        { x: -5, z: 5 }, { x: 5, z: 5 },
        { x: -20, z: 0 }, { x: 20, z: 0 },
        { x: 0, z: -20 }, { x: 0, z: 20 }
    ];
    
    coverPositions.forEach(pos => {
        const geometry = new THREE.BoxGeometry(2, 3, 2);
        const material = new THREE.MeshStandardMaterial({ color: 0x666666 });
        const cover = new THREE.Mesh(geometry, material);
        cover.position.set(pos.x, 1.5, pos.z);
        cover.castShadow = true;
        cover.receiveShadow = true;
        game.scene.add(cover);
        game.covers.push(cover);
    });
    
    // Arena walls
    const wallHeight = 10;
    const wallThickness = 1;
    const arenaSize = 50;
    
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

function spawnPickups() {
    // Fixed spawn points for pickups
    const weaponSpawns = [
        { pos: new THREE.Vector3(-10, 1, -10), type: 'weapon', weapon: 'Shotgun' },
        { pos: new THREE.Vector3(10, 1, -10), type: 'weapon', weapon: 'Rifle' },
        { pos: new THREE.Vector3(-10, 1, 10), type: 'weapon', weapon: 'Pistol' }
    ];
    
    const powerUpSpawns = [
        { pos: new THREE.Vector3(10, 1, 10), type: 'powerup', powerup: 'Speed Boost' },
        { pos: new THREE.Vector3(0, 1, -15), type: 'powerup', powerup: 'Shield' },
        { pos: new THREE.Vector3(0, 1, 15), type: 'powerup', powerup: 'Damage Boost' }
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

function updatePlayer(deltaTime) {
    if (!player.mesh) return;
    
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
    
    // Boundary collision
    const boundary = 48;
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
        
        const direction = new THREE.Vector3(
            -Math.sin(game.mouseMovement.x + spreadX),
            -Math.tan(game.mouseMovement.y + spreadY),
            -Math.cos(game.mouseMovement.x + spreadX)
        ).normalize();
        
        const startPosition = player.position.clone().add(new THREE.Vector3(0, 1, 0));
        
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
    
    if (player.health <= 0) {
        // Game over
        alert('Game Over! Your ghost got you!');
        location.reload();
    }
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
            game.time % game.recordingInterval < 0.1) {
            createGhost(game.recordings[recordingIndex]);
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
    
    if (game.gameStarted) {
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
