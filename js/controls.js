/**
 * AETHER RUN VR - Sistema de Controles para Realidad Virtual
 */

let leftController, rightController;
let teleportPoints = [];
let teleportTarget = null;
let controllerModelFactory;
let interactionDistance = 5;

// Inicializar controles VR
function initVRControls() {
    // 1. Crear grupo para controles
    vrControls = new THREE.Group();
    scene.add(vrControls);
    
    // 2. Configurar fábrica de modelos de controladores
    controllerModelFactory = new XRControllerModelFactory();
    
    // 3. Configurar controlador izquierdo (movimiento)
    leftController = renderer.xr.getController(0);
    leftController.addEventListener('selectstart', onSelectStart);
    leftController.addEventListener('selectend', onSelectEnd);
    vrControls.add(leftController);
    
    // Añadir modelo visual al controlador
    const leftControllerModel = controllerModelFactory.createControllerModel(leftController);
    leftController.add(leftControllerModel);
    
    // 4. Configurar controlador derecho (interacción)
    rightController = renderer.xr.getController(1);
    rightController.addEventListener('selectstart', onInteractStart);
    vrControls.add(rightController);
    
    // Añadir modelo visual al controlador
    const rightControllerModel = controllerModelFactory.createControllerModel(rightController);
    rightController.add(rightControllerModel);
    
    // 5. Configurar rayo para interacción
    const rightControllerGrip = renderer.xr.getControllerGrip(1);
    const controllerRay = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -interactionDistance)
        ]),
        new THREE.LineBasicMaterial({ color: 0x8888ff, linewidth: 2 })
    );
    controllerRay.name = 'ray';
    rightController.add(controllerRay.clone());
    
    // 6. Crear puntos de teleportación
    createTeleportPoints();
    
    // 7. Configurar cuerpo físico del jugador
    characterBody = new CANNON.Body({
        mass: 70,
        shape: new CANNON.Sphere(0.3),
        position: new CANNON.Vec3(0, 1.6, 0),
        fixedRotation: true,
        linearDamping: 0.5
    });
    world.addBody(characterBody);
    
    // 8. Crear representación visual del jugador (solo para depuración)
    character = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
    );
    character.visible = false; // Ocultar en producción
    scene.add(character);
}

// Crear puntos de teleportación
function createTeleportPoints() {
    // Crear puntos en las plataformas principales
    platforms.forEach((platform, index) => {
        if (index % 3 === 0) { // Cada tercera plataforma
            const point = new THREE.Mesh(
                new THREE.RingGeometry(0.2, 0.25, 32),
                new THREE.MeshBasicMaterial({ 
                    color: 0x00ff00, 
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.7
                })
            );
            point.rotation.x = -Math.PI / 2;
            point.position.copy(platform.mesh.position);
            point.position.y += 0.05;
            point.userData.isTeleportPoint = true;
            scene.add(point);
            teleportPoints.push(point);
        }
    });
}

// Evento al comenzar selección (teleportación)
function onSelectStart(event) {
    const controller = event.target;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromXRController(controller);
    
    const intersects = raycaster.intersectObjects(teleportPoints);
    if (intersects.length > 0) {
        teleportTarget = intersects[0].object;
        teleportTarget.material.color.setHex(0xffff00);
        
        // Mostrar destino previo
        showTeleportDestination(teleportTarget.position);
    }
}

// Evento al terminar selección (teleportación)
function onSelectEnd() {
    if (teleportTarget && !gameState.isTeleporting) {
        gameState.isTeleporting = true;
        
        // Efecto de teleportación
        const startPos = characterBody.position.clone();
        const endPos = new CANNON.Vec3(
            teleportTarget.position.x,
            teleportTarget.position.y + 1.6,
            teleportTarget.position.z
        );
        
        new TWEEN.Tween({ t: 0 })
            .to({ t: 1 }, 500)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate((obj) => {
                CANNON.Vec3.lerp(startPos, endPos, obj.t, characterBody.position);
                characterBody.velocity.set(0, 0, 0);
            })
            .onComplete(() => {
                gameState.isTeleporting = false;
                teleportTarget.material.color.setHex(0x00ff00);
                teleportTarget = null;
                hideTeleportDestination();
            })
            .start();
    }
}

// Mostrar destino de teleportación
function showTeleportDestination(position) {
    if (!window.teleportMarker) {
        window.teleportMarker = new THREE.Mesh(
            new THREE.CircleGeometry(0.3, 32),
            new THREE.MeshBasicMaterial({ 
                color: 0x00ffff,
                transparent: true,
                opacity: 0.5
            })
        );
        window.teleportMarker.rotation.x = -Math.PI / 2;
        scene.add(window.teleportMarker);
    }
    window.teleportMarker.position.copy(position);
    window.teleportMarker.position.y += 0.05;
}

// Ocultar destino de teleportación
function hideTeleportDestination() {
    if (window.teleportMarker) {
        window.teleportMarker.visible = false;
    }
}

// Evento de interacción con objetos
function onInteractStart(event) {
    const controller = event.target;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromXRController(controller);
    
    // Verificar colisión con cristales
    const crystalIntersects = raycaster.intersectObjects(
        crystals.filter(c => !c.collected).map(c => c.mesh)
    );
    
    if (crystalIntersects.length > 0) {
        collectCrystal(crystalIntersects[0].object);
    }
}

// Recolectar cristal
function collectCrystal(crystalMesh) {
    const crystal = crystals.find(c => c.mesh === crystalMesh);
    if (!crystal || crystal.collected) return;
    
    crystal.collected = true;
    crystal.mesh.visible = false;
    
    // Incrementar energía
    gameState.energy++;
    updateHUD();
    
    // Efecto visual
    const particleEffect = createParticleEffect(
        crystal.mesh.position,
        0x8be9fd,
        50
    );
    scene.add(particleEffect);
    
    setTimeout(() => {
        scene.remove(particleEffect);
    }, 1000);
}

// Crear efecto de partículas
function createParticleEffect(position, colorHex, count) {
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 2;
        positions[i3 + 1] = (Math.random() - 0.5) * 2;
        positions[i3 + 2] = (Math.random() - 0.5) * 2;
        sizes[i] = Math.random() * 0.2 + 0.1;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
        color: new THREE.Color(colorHex),
        size: 0.1,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    const particleSystem = new THREE.Points(particles, material);
    particleSystem.position.copy(position);
    
    // Animación
    new TWEEN.Tween(particleSystem.scale)
        .to({ x: 3, y: 3, z: 3 }, 1000)
        .start();
    
    new TWEEN.Tween(material)
        .to({ opacity: 0 }, 1000)
        .start();
    
    return particleSystem;
}

// Actualizar controles en cada frame
function updateVRControls(delta) {
    // Actualizar posición del personaje
    if (character) {
        character.position.copy(characterBody.position);
    }
    
    // Actualizar Tween.js
    TWEEN.update();
    
    // Actualizar rayo de interacción
    if (rightController) {
        const ray = rightController.getObjectByName('ray');
        if (ray) {
            ray.scale.z = interactionDistance;
        }
    }
}