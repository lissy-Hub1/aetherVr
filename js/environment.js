/**
 * AETHER RUN - Ambiente del juego
 * Gestiona el plano, la iluminación, la niebla y los objetos del escenario
 * Versión extendida con 3 niveles verticales adicionales
 */


import * as THREE from 'three';


// Arrays para gestionar objetos
let platforms = [];
let crystals = [];
let fallingCubes = [];
let spawnPoints = [];

// Información de los niveles
const LEVELS = {
    ground: { height: 0, platformColor: 0x1a0d2c },
    level1: { height: 15, platformColor: 0x3d1a78 },
    level2: { height: 30, platformColor: 0x4b2191 },
    level3: { height: 45, platformColor: 0x5929aa }
};

// Colores para el ambiente
const COLORS = {
    ground: 0x1a0d2c,
    crystal: 0x8be9fd,
    platform: 0x3d1a78,
    platform1: 0x3d1a78, // Nivel 1
    platform2: 0x4b2191, // Nivel 2
    platform3: 0x5929aa, // Nivel 3
    cube: 0xbf4097,
    ambient: 0x332b4a,
    directional: 0xffffff,
    fog: 0x0f0f1e,
    spotlight: 0xbf4097,
    teleporter: 0x00ff88
};

// Crear el entorno del juego
function createEnvironment() {
    // 1. Crear plano tridimensional
    createGround();
    
    // 2. Configurar iluminación
    setupLighting();
    
    // 3. Añadir niebla
    setupFog();
    
    // 4. Crear plataformas para todos los niveles
    createAllLevelPlatforms();
    
    // 5. Crear cristales para recolectar en todos los niveles
    createAllLevelCrystals();
    
    // 6. Crear teletransportadores entre niveles
    createTeleporters();
    
    // 7. Configurar generador de cubos cayendo
    setupCubeGenerator();
}

// Crear el suelo del nivel
function createGround() {
    // Geometría del suelo
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 20, 20);
    
    // Material con textura de rejilla para efecto futurista
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.ground,
        metalness: 0.3,
        roughness: 0.7,
        wireframe: false
    });
    
    // Crear malla
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    
    // Rotar para que sea horizontal
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Añadir física al suelo
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({
        mass: 0, // Masa 0 = objeto estático
        shape: groundShape,
        material: physicsMaterial
    });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);
    
    // Añadir efecto de "rejilla" luminosa
    const gridHelper = new THREE.GridHelper(100, 50, 0xbf4097, 0xbf4097);
    gridHelper.position.y = 0.01; // Ligeramente por encima del suelo
    scene.add(gridHelper);
}

// Configurar la iluminación del nivel
function setupLighting() {
    // Luz ambiental básica
    const ambientLight = new THREE.AmbientLight(COLORS.ambient, 0.5);
    scene.add(ambientLight);
    
    // Luz direccional principal (simula el sol/luna)
    const directionalLight = new THREE.DirectionalLight(COLORS.directional, 0.8);
    directionalLight.position.set(20, 60, 20); // Elevada para cubrir todos los niveles
    directionalLight.castShadow = true;
    
    // Configurar sombras de alta calidad
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 150; // Aumentado para cubrir todos los niveles
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    
    scene.add(directionalLight);
    
    // Luces puntuales para los cristales de energía
    crystalLights = [];
    
    // Añadir luces ambientales en cada nivel
    Object.values(LEVELS).forEach(level => {
        // Añadir luz hemisférica en cada nivel
        const hemiLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
        hemiLight.position.set(0, level.height + 10, 0);
        scene.add(hemiLight);
        
        // Añadir punto de luz en el centro de cada nivel
        const centerLight = new THREE.PointLight(COLORS.spotlight, 0.8, 30);
        centerLight.position.set(0, level.height + 5, 0);
        centerLight.castShadow = true;
        scene.add(centerLight);
    });
}

// Configurar la niebla del ambiente
function setupFog() {
    // Niebla menos densa para ver los niveles superiores
    scene.fog = new THREE.FogExp2(COLORS.fog, 0.07);
    
    // Configurar color de fondo para que coincida con la niebla
    scene.background = new THREE.Color(COLORS.fog);
}

// Crear plataformas en todos los niveles
function createAllLevelPlatforms() {
    // Nivel base - plataformas flotando sobre el suelo
    createLevelPlatforms(LEVELS.ground.height, COLORS.platform, 5, 0.5, 2, 9);
    
    // Nivel 1 - plataformas a media altura
    createLevelPlatforms(LEVELS.level1.height, COLORS.platform1, 4, 0.5, 3, 7);
    
    // Nivel 2 - plataformas más alto
    createLevelPlatforms(LEVELS.level2.height, COLORS.platform2, 3.5, 0.5, 4, 6);
    
    // Nivel 3 - plataformas en lo más alto
    createLevelPlatforms(LEVELS.level3.height, COLORS.platform3, 3, 0.5, 5, 5);
}

// Crear plataformas para un nivel específico
function createLevelPlatforms(baseHeight, color, avgSize, height, movementRange, count) {
    const platformPositions = [];
    
    // Central platform
    platformPositions.push({ 
        x: 0, 
        y: baseHeight + 1,
        z: 0, 
        size: { x: avgSize + 2, y: height, z: avgSize + 2 }
    });
    
    // Spiral platforms
    const radius = 8;
    const heightStep = 1.5;
    const angleStep = (2 * Math.PI) / (count/2);
    
    for (let i = 1; i < count; i++) {
        const angle = i * angleStep;
        const spiralFactor = 1 + (i * 0.1);
        const x = Math.cos(angle) * radius * spiralFactor;
        const z = Math.sin(angle) * radius * spiralFactor;
        const y = baseHeight + 1 + (i * heightStep);
        const sizeVar = Math.random() * 1 - 0.5;
        
        platformPositions.push({
            x: x,
            y: y,
            z: z,
            size: { 
                x: avgSize + sizeVar, 
                y: height, 
                z: avgSize + sizeVar 
            }
        });
    }
    
    // Create platforms with optimizations
    platformPositions.forEach((pos, index) => {
        const geometry = new THREE.BoxGeometry(pos.size.x, pos.size.y, pos.size.z);
        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.7,
            roughness: 0.2
        });
        
        const platform = new THREE.Mesh(geometry, material);
        platform.position.set(pos.x, pos.y, pos.z);
        platform.castShadow = true;
        platform.receiveShadow = true;
        scene.add(platform);
        
        const shape = new CANNON.Box(new CANNON.Vec3(pos.size.x/2, pos.size.y/2, pos.size.z/2));
        const body = new CANNON.Body({
            mass: 0,
            shape: shape,
            position: new CANNON.Vec3(pos.x, pos.y, pos.z),
            material: physicsMaterial
        });
        world.addBody(body);
        
        platforms.push({
            mesh: platform,
            body: body,
            originalY: pos.y,
            movementRange: index === 0 ? 0 : movementRange * 0.5,
            speed: 0.2 + Math.random() * 0.3,
            phase: Math.random() * Math.PI * 2,
            level: Math.floor(baseHeight / 15)
        });
        
        // LIGHT OPTIMIZATIONS:
        // Only add lights to every 4th platform (instead of every 2nd)
        if (index % 4 === 0) {
            // Option 1: Use simpler PointLight without shadows
            const pointLight = new THREE.PointLight(COLORS.spotlight, 0.5, 15);
            pointLight.position.set(pos.x, pos.y + 3, pos.z);
            scene.add(pointLight);
         
        }
    });
}

// Crear cristales en todos los niveles
function createAllLevelCrystals() {
    // Cristales en el nivel del suelo (más cristales en el nivel base)
    createLevelCrystals(LEVELS.ground.height, 7);
    
    // Cristales en los otros niveles (cantidad reducida para mayor desafío)
    createLevelCrystals(LEVELS.level1.height, 5);
    createLevelCrystals(LEVELS.level2.height, 5);
    createLevelCrystals(LEVELS.level3.height, 4); // Menos cristales en el nivel más alto
}

// Crear cristales para un nivel específico
function createLevelCrystals(baseHeight, count) {
    // 1. Primero encontrar todas las plataformas de este nivel
    const levelPlatforms = platforms.filter(p => Math.floor(p.originalY / 15) === Math.floor(baseHeight / 15));
    
    // 2. Distribuir cristales sobre las plataformas
    for (let i = 0; i < count; i++) {
        // Elegir una plataforma aleatoria (o en patrón si prefieres)
        const platformIndex = i % levelPlatforms.length; // Para distribuir uniformemente
        const platform = levelPlatforms[platformIndex];
        
        // Obtener posición de la plataforma
        const platformPos = platform.mesh.position;
        
        // Calcular posición del cristal (centro + ligero desplazamiento aleatorio)
        const offsetX = (Math.random() * platform.mesh.geometry.parameters.width * 0.4) - 
                        (platform.mesh.geometry.parameters.width * 0.2);
        const offsetZ = (Math.random() * platform.mesh.geometry.parameters.depth * 0.4) - 
                        (platform.mesh.geometry.parameters.depth * 0.2);
        
        // Altura sobre la plataforma (0.5 unidades arriba)
        const y = platformPos.y + (platform.mesh.geometry.parameters.height / 2) + 0.5;
        
        // Crear el cristal
        createCrystal(
            platformPos.x + offsetX,
            y,
            platformPos.z + offsetZ
        );
    }
}

// Crear un cristal individual
function createCrystal(x, y, z) {
    // Reutilizar geometría y material si es posible
    if (!window.crystalGeometry) {
        window.crystalGeometry = new THREE.OctahedronGeometry(0.5, 0);
        window.crystalMaterial = new THREE.MeshStandardMaterial({
            color: COLORS.crystal,
            metalness: 1,
            roughness: 0.2,
            emissive: COLORS.crystal,
            emissiveIntensity: 0.5
        });
    }
    
    const crystal = new THREE.Mesh(window.crystalGeometry, window.crystalMaterial);
    crystal.position.set(x, y, z);
    crystal.castShadow = true;
    crystal.userData = { isCrystal: true, collected: false };
    scene.add(crystal);
    
    // Luz solo para cristales importantes (reduce unidades de textura)
    if (Math.random() > 0.3) { // 70% de probabilidad de tener luz
        const pointLight = new THREE.PointLight(COLORS.crystal, 0.8, 2.5); // Radio más pequeño
        pointLight.position.set(x, y, z);
        scene.add(pointLight);
        
        crystals.push({
            mesh: crystal,
            light: pointLight,
            originalY: y,
            phase: Math.random() * Math.PI * 2
        });
    } else {
        crystals.push({
            mesh: crystal,
            light: null, // Sin luz
            originalY: y,
            phase: Math.random() * Math.PI * 2
        });
    }
}

// Crear teletransportadores entre niveles
function createTeleporters() {
    // Array para almacenar los teletransportadores
    window.teleporters = [];
    
    // Crear teletransportadores para subir de nivel
    createTeleporter(5, LEVELS.ground.height + 0.5, 5, LEVELS.level1.height + 5);
    createTeleporter(-5, LEVELS.level1.height + 0.5, -5, LEVELS.level2.height + 5);
    createTeleporter(8, LEVELS.level2.height + 0.5, 0, LEVELS.level3.height + 5);
    
    // Crear teletransportadores para bajar de nivel (opcional)
    createTeleporter(-7, LEVELS.level1.height + 0.5, 7, LEVELS.ground.height + 5);
    createTeleporter(7, LEVELS.level2.height + 0.5, 7, LEVELS.level1.height + 5);
    createTeleporter(-8, LEVELS.level3.height + 0.5, -8, LEVELS.level2.height + 5);
}

// Crear un teletransportador individual
function createTeleporter(x, y, z, targetY) {
    // Crear plataforma del teletransportador
    const geometry = new THREE.CylinderGeometry(1.5, 1.5, 0.3, 16);
    const material = new THREE.MeshStandardMaterial({
        color: COLORS.teleporter,
        metalness: 0.9,
        roughness: 0.1,
        emissive: COLORS.teleporter,
        emissiveIntensity: 0.3
    });
    
    const teleporter = new THREE.Mesh(geometry, material);
    teleporter.position.set(x, y, z);
    teleporter.castShadow = true;
    teleporter.receiveShadow = true;
    teleporter.userData = { isTeleporter: true, targetY: targetY };
    scene.add(teleporter);
    
    // Añadir luz para destacar el teletransportador
    const pointLight = new THREE.PointLight(COLORS.teleporter, 1, 5);
    pointLight.position.set(x, y + 1, z);
    scene.add(pointLight);
    
    // Crear efecto de partículas para el teletransportador
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 50;
    const posArray = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.2;
        posArray[i] = Math.cos(angle) * radius;
        posArray[i+1] = Math.random() * 3;
        posArray[i+2] = Math.sin(angle) * radius;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: COLORS.teleporter,
        size: 0.1,
        transparent: true,
        opacity: 0.7
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.position.set(x, y, z);
    scene.add(particles);
    
    // Guardar referencia al teletransportador
    window.teleporters.push({
        mesh: teleporter,
        particles: particles,
        light: pointLight,
        originalY: y,
        targetY: targetY
    });
}

// Configurar generador de cubos que caen aleatoriamente
function setupCubeGenerator() {
    // Crear puntos de generación en varios niveles
    const levels = [LEVELS.ground.height, LEVELS.level1.height, LEVELS.level2.height, LEVELS.level3.height];
    
    levels.forEach(levelHeight => {
        const spawnHeight = levelHeight + 20; // 20 unidades sobre el nivel
        
        for (let x = -20; x <= 20; x += 10) {
            for (let z = -20; z <= 20; z += 10) {
                spawnPoints.push({ x, y: spawnHeight, z, levelHeight: levelHeight });
            }
        }
    });
    
    // Generar cubos cada cierto tiempo
    setInterval(spawnCube, 3000);
}

// Generar un nuevo cubo que cae
function spawnCube() {
    if (!gameState.isRunning) return;
    
    // Elegir un punto de generación aleatorio
    const spawnPoint = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
    
    // Crear geometría con tamaño aleatorio
    const size = 0.5 + Math.random() * 1.5;
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshStandardMaterial({
        color: COLORS.cube,
        metalness: 0.5,
        roughness: 0.5
    });
    
    // Crear malla
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(
        spawnPoint.x + (Math.random() * 4 - 2), 
        spawnPoint.y, 
        spawnPoint.z + (Math.random() * 4 - 2)
    );
    cube.castShadow = true;
    scene.add(cube);
    
    // Física del cubo
    const shape = new CANNON.Box(new CANNON.Vec3(size/2, size/2, size/2));
    const body = new CANNON.Body({
        mass: size * 2, // Masa proporcional al tamaño
        shape: shape,
        position: new CANNON.Vec3(cube.position.x, cube.position.y, cube.position.z),
        material: physicsMaterial
    });
    
    // Agregar algo de rotación inicial al cubo
    body.angularVelocity.set(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
    );
    
    world.addBody(body);
    
    // Almacenar referencia al cubo
    fallingCubes.push({
        mesh: cube,
        body: body,
        timeCreated: Date.now(),
        level: Math.floor(spawnPoint.levelHeight / 15) // Nivel donde se generó
    });
}

// Actualizar el entorno en cada frame
function updateEnvironment(delta) {
    // Mover plataformas con movimiento sinusoidal
    platforms.forEach(platform => {
        platform.phase += delta * platform.speed;
        const newY = platform.originalY + Math.sin(platform.phase) * platform.movementRange;
        platform.body.position.y = newY;
        platform.mesh.position.copy(platform.body.position);
    });
    
    // Hacer flotar los cristales y rotar
    crystals.forEach(crystal => {
        if (!crystal.mesh.userData.collected) {
            crystal.phase += delta;
            crystal.mesh.position.y = crystal.originalY + Math.sin(crystal.phase) * 0.2;
            crystal.mesh.rotation.y += delta * 2;
            if (crystal.light) {
                crystal.light.position.copy(crystal.mesh.position);
            }
        }
    });
    
    // Actualizar posición de los cubos cayendo
    fallingCubes.forEach((cube, index) => {
        cube.mesh.position.copy(cube.body.position);
        cube.mesh.quaternion.copy(cube.body.quaternion);
        
        // Eliminar cubos viejos o que cayeron muy abajo
        if (cube.body.position.y < -20 || Date.now() - cube.timeCreated > 20000) {
            scene.remove(cube.mesh);
            world.removeBody(cube.body);
            fallingCubes.splice(index, 1);
        }
    });
    
    // Animar los teletransportadores
    if (window.teleporters) {
        window.teleporters.forEach(teleporter => {
            // Rotar la plataforma
            teleporter.mesh.rotation.y += delta * 0.5;
            
            // Animar las partículas
            const positions = teleporter.particles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i+1] += delta * (0.2 + Math.random() * 0.3);
                if (positions[i+1] > 3) positions[i+1] = 0;
            }
            teleporter.particles.geometry.attributes.position.needsUpdate = true;
        });
    }
}

// Verificar colisiones con objetos especiales (cristales y teletransportadores)
function checkCollisions() {
    // Distancia máxima para recolección e interacción
    const collectionDistance = 1.5;
    const teleportDistance = 2;
    
    // Verificar cristales
    crystals.forEach(crystal => {
        if (!crystal.mesh.userData.collected) {
            // Calcular distancia al jugador
            const distanceToPlayer = crystal.mesh.position.distanceTo(character.position);
            
            if (distanceToPlayer < collectionDistance) {
                collectCrystal(crystal);
            }
        }
    });
    
    // Verificar teletransportadores
    if (window.teleporters) {
        window.teleporters.forEach(teleporter => {
            const distanceToPlayer = teleporter.mesh.position.distanceTo(character.position);
            
            if (distanceToPlayer < teleportDistance) {
                teleportPlayer(teleporter);
            }
        });
    }
}

// Teletransportar al jugador
function teleportPlayer(teleporter) {
    // Evitar múltiples teletransportes seguidos
    if (gameState.isTeleporting) return;
    
    gameState.isTeleporting = true;
    
    // Guardar la posición X, Z actual
    const currentX = character.position.x;
    const currentZ = character.position.z;
    
    // Efecto de destello al teletransportar
    const flashGeometry = new THREE.SphereGeometry(2, 16, 16);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: COLORS.teleporter,
        transparent: true,
        opacity: 0.7
    });
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(character.position);
    scene.add(flash);
    
    // Animar el destello y teletransportar
    const tween = new TWEEN.Tween({ scale: 1, opacity: 0.7, y: character.position.y })
        .to({ scale: 10, opacity: 0, y: teleporter.targetY }, 1000)
        .onUpdate(obj => {
            flash.scale.set(obj.scale, obj.scale, obj.scale);
            flashMaterial.opacity = obj.opacity;
            
            // Actualizar posición del jugador gradualmente
            character.position.y = obj.y;
            physicsBody.position.set(currentX, obj.y, currentZ);
        })
        .onComplete(() => {
            scene.remove(flash);
            gameState.isTeleporting = false;
        })
        .start();
}

// Recolectar un cristal de energía
function collectCrystal(crystal) {
    if (crystal.mesh.userData.collected) return;
    
    crystal.mesh.userData.collected = true;
    
    // Ocultar el cristal y su luz
    crystal.mesh.visible = false;
    crystal.light.visible = false;
    
    // Incrementar contador de energía
    gameState.energy++;
    updateHUD();
    
    // Efecto visual al recolectar (destello)
    const flashGeometry = new THREE.SphereGeometry(1, 16, 16);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: COLORS.crystal,
        transparent: true,
        opacity: 0.7
    });
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(crystal.mesh.position);
    scene.add(flash);
    
    // Animar el destello y eliminarlo
    const tween = new TWEEN.Tween({ scale: 1, opacity: 0.7 })
        .to({ scale: 5, opacity: 0 }, 500)
        .onUpdate(obj => {
            flash.scale.set(obj.scale, obj.scale, obj.scale);
            flashMaterial.opacity = obj.opacity;
        })
        .onComplete(() => {
            scene.remove(flash);
        })
        .start();
}

// Reiniciar el nivel
function resetLevel() {
    // Reiniciar cristales
    crystals.forEach(crystal => {
        crystal.mesh.userData.collected = false;
        crystal.mesh.visible = true;
        crystal.light.visible = true;
    });
    
    // Eliminar todos los cubos cayendo
    fallingCubes.forEach(cube => {
        scene.remove(cube.mesh);
        world.removeBody(cube.body);
    });
    fallingCubes = [];
    
    // Devolver al jugador al nivel base
    character.position.set(0, 2, 0);
    physicsBody.position.set(0, 2, 0);
    physicsBody.velocity.set(0, 0, 0);
    
    // Reiniciar estado del juego
    gameState.energy = 0;
    gameState.isTeleporting = false;
    updateHUD();
} 