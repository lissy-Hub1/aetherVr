/**
 * AETHER RUN VR - Ambiente del juego para Realidad Virtual
 */

// Configuración de niveles
const LEVELS = {
    ground: { height: 0, color: 0x1a0d2c },
    level1: { height: 10, color: 0x3d1a78 },
    level2: { height: 20, color: 0x4b2191 },
    level3: { height: 30, color: 0x5929aa }
};

// Crear entorno del juego
function createEnvironment() {
    // 1. Crear suelo
    createGround();
    
    // 2. Configurar iluminación básica
    setupBasicLighting();
    
    // 3. Crear plataformas
    createPlatforms();
    
    // 4. Crear cristales de energía
    createCrystals();
    
    // 5. Crear obstáculos
    createObstacles();
}

// Crear suelo
function createGround() {
    const groundGeometry = new THREE.CircleGeometry(50, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: LEVELS.ground.color,
        metalness: 0.3,
        roughness: 0.7
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Física del suelo
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
        mass: 0,
        shape: groundShape,
        material: physicsMaterial
    });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);
    
    // Rejilla decorativa
    const gridHelper = new THREE.GridHelper(100, 100, 0xbf4097, 0xbf4097);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);
}

// Configurar iluminación básica
function setupBasicLighting() {
    // Luz ambiental
    const ambientLight = new THREE.AmbientLight(0x332b4a, 0.5);
    scene.add(ambientLight);
    
    // Luz direccional principal
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 40, 20);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 150;
    scene.add(directionalLight);
    
    // Luces de nivel
    Object.values(LEVELS).forEach(level => {
        if (level.height > 0) {
            const levelLight = new THREE.PointLight(0xbf4097, 0.5, 30);
            levelLight.position.set(0, level.height + 5, 0);
            scene.add(levelLight);
        }
    });
}

// Crear plataformas
function createPlatforms() {
    const platformCount = 20;
    
    for (let i = 0; i < platformCount; i++) {
        // Determinar nivel
        let level;
        if (i < 8) level = LEVELS.ground;
        else if (i < 14) level = LEVELS.level1;
        else if (i < 18) level = LEVELS.level2;
        else level = LEVELS.level3;
        
        // Posición aleatoria
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 20;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = level.height + 1 + Math.random() * 3;
        
        // Tamaño
        const size = 2 + Math.random() * 3;
        
        // Crear plataforma
        const geometry = new THREE.BoxGeometry(size, 0.5, size);
        const material = new THREE.MeshStandardMaterial({
            color: level.color,
            metalness: 0.7,
            roughness: 0.2
        });
        
        const platform = new THREE.Mesh(geometry, material);
        platform.position.set(x, y, z);
        platform.castShadow = true;
        platform.receiveShadow = true;
        platform.userData.isPlatform = true;
        scene.add(platform);
        
        // Física de la plataforma
        const shape = new CANNON.Box(new CANNON.Vec3(size/2, 0.25, size/2));
        const body = new CANNON.Body({
            mass: 0,
            shape: shape,
            position: new CANNON.Vec3(x, y, z),
            material: physicsMaterial
        });
        world.addBody(body);
        
        platforms.push({
            mesh: platform,
            body: body,
            isMainPlatform: i % 3 === 0 // Marcar algunas como principales
        });
    }
}

// Crear cristales de energía
function createCrystals() {
    const crystalCount = gameState.totalEnergy;
    
    for (let i = 0; i < crystalCount; i++) {
        // Seleccionar una plataforma aleatoria
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const platformPos = platform.mesh.position;
        const platformSize = platform.mesh.geometry.parameters.width;
        
        // Posición relativa a la plataforma
        const x = platformPos.x + (Math.random() - 0.5) * (platformSize - 1);
        const z = platformPos.z + (Math.random() - 0.5) * (platformSize - 1);
        const y = platformPos.y + 1;
        
        // Crear cristal
        const geometry = new THREE.OctahedronGeometry(0.5, 0);
        const material = new THREE.MeshStandardMaterial({
            color: 0x8be9fd,
            metalness: 1,
            roughness: 0.2,
            emissive: 0x8be9fd,
            emissiveIntensity: 0.5
        });
        
        const crystal = new THREE.Mesh(geometry, material);
        crystal.position.set(x, y, z);
        crystal.castShadow = true;
        crystal.userData.isCrystal = true;
        scene.add(crystal);
        
        // Añadir luz
        const light = new THREE.PointLight(0x8be9fd, 0.8, 3);
        light.position.set(x, y, z);
        scene.add(light);
        
        crystals.push({
            mesh: crystal,
            light: light,
            collected: false,
            originalY: y,
            phase: Math.random() * Math.PI * 2
        });
    }
}

// Crear obstáculos
function createObstacles() {
    // Cubos que caen
    for (let i = 0; i < 10; i++) {
        const x = (Math.random() - 0.5) * 40;
        const z = (Math.random() - 0.5) * 40;
        const y = 30 + Math.random() * 20;
        
        const size = 0.5 + Math.random() * 1.5;
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshStandardMaterial({
            color: 0xbf4097,
            metalness: 0.5,
            roughness: 0.5
        });
        
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(x, y, z);
        cube.castShadow = true;
        scene.add(cube);
        
        // Física del cubo
        const shape = new CANNON.Box(new CANNON.Vec3(size/2, size/2, size/2));
        const body = new CANNON.Body({
            mass: size * 2,
            shape: shape,
            position: new CANNON.Vec3(x, y, z),
            material: physicsMaterial
        });
        
        // Rotación inicial aleatoria
        body.angularVelocity.set(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        );
        
        world.addBody(body);
        
        fallingCubes.push({
            mesh: cube,
            body: body,
            timeCreated: Date.now()
        });
    }
}

// Actualizar entorno
function updateEnvironment(delta) {
    // Animar cristales
    crystals.forEach(crystal => {
        if (!crystal.collected) {
            crystal.phase += delta;
            crystal.mesh.position.y = crystal.originalY + Math.sin(crystal.phase) * 0.2;
            crystal.mesh.rotation.y += delta * 2;
            if (crystal.light) {
                crystal.light.position.copy(crystal.mesh.position);
            }
        }
    });
    
    // Actualizar cubos cayendo
    fallingCubes.forEach((cube, index) => {
        cube.mesh.position.copy(cube.body.position);
        cube.mesh.quaternion.copy(cube.body.quaternion);
        
        // Eliminar cubos que hayan caído demasiado
        if (cube.body.position.y < -10 || Date.now() - cube.timeCreated > 20000) {
            scene.remove(cube.mesh);
            world.removeBody(cube.body);
            fallingCubes.splice(index, 1);
        }
    });
}

// Verificar colisiones
function checkCollisions() {
    // Verificar colisión con cubos (daño)
    fallingCubes.forEach(cube => {
        const distance = characterBody.position.distanceTo(cube.body.position);
        if (distance < 1) {
            // Aplicar fuerza de empuje
            const direction = new CANNON.Vec3();
            direction.copy(characterBody.position);
            direction.vsub(cube.body.position, direction);
            direction.normalize();
            direction.scale(10, direction);
            characterBody.velocity.copy(direction);
            
            // Reducir energía
            if (gameState.energy > 0) {
                gameState.energy--;
                updateHUD();
            }
        }
    });
}