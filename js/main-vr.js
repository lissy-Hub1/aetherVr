/**
 * AETHER RUN VR - Punto de entrada principal
 */

// Variables globales
let scene, camera, renderer, world, clock;
let character, characterBody;
let vrControls;
let crystals = [], platforms = [], fallingCubes = [];
let gameState = {
    isRunning: false,
    energy: 0,
    totalEnergy: 14,
    isGameOver: false,
    isVictory: false,
    isTeleporting: false
};

// Inicialización del juego VR
async function initVR() {
    // 1. Cargar dependencias de WebXR desde CDN
    const { VRButton } = await import('https://cdn.skypack.dev/three@0.132.2/examples/jsm/webxr/VRButton.js');
    
    // 2. Configurar reloj
    clock = new THREE.Clock();
    
    // 3. Crear escena, cámara y renderizador (igual que antes)
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas') });
    
    // 4. Configurar WebXR
    renderer.xr.enabled = true;
    
    // 5. Usar XRButton (antes VRButton)
    document.body.appendChild(VRButton.createButton(renderer));
    
    // 6. Configurar iluminación estimada
    const lightProbe = new THREE.LightProbe();
    scene.add(lightProbe);
    
    const estimatedLight = new XREstimatedLight(renderer);
    estimatedLight.addEventListener('estimationstart', () => {
        scene.add(estimatedLight);
        scene.environment = estimatedLight.environment;
    });
    
    // 7. Inicializar física
    initPhysics();
    
    // 8. Crear entorno
    createEnvironment();
    
    // 9. Configurar controles VR
    initVRControls();
    
    // 10. Configurar eventos XR
    renderer.xr.addEventListener('sessionstart', () => {
        gameState.isRunning = true;
        updateHUD();
        document.getElementById('vr-ui').style.display = 'flex';
    });
    
    renderer.xr.addEventListener('sessionend', () => {
        gameState.isRunning = false;
        document.getElementById('vr-ui').style.display = 'none';
    });
    
    // 11. Manejar redimensionamiento
    window.addEventListener('resize', onWindowResize);
    
    // 12. Iniciar bucle de renderizado
    renderer.setAnimationLoop(render);
}

// Bucle de renderizado
function render() {
    const delta = clock.getDelta();
    
    if (gameState.isRunning && !gameState.isGameOver && !gameState.isVictory) {
        // Actualizar física
        world.step(1/60, delta, 3);
        
        // Actualizar posición del personaje
        if (character && characterBody) {
            character.position.copy(characterBody.position);
            
            // Verificar caída
            checkFallDamage();
        }
        
        // Actualizar controles
        updateVRControls(delta);
        
        // Actualizar entorno
        updateEnvironment(delta);
        
        // Verificar colisiones
        checkCollisions();
        
        // Verificar condiciones del juego
        checkGameConditions();
    }
    
    // Renderizar escena
    renderer.render(scene, camera);
}

// Verificar daño por caída
function checkFallDamage() {
    const y = characterBody.position.y;
    const vy = characterBody.velocity.y;
    
    if (vy < -0.5 && y < -10) {
        gameState.isGameOver = true;
        showGameOverScreen();
    }
}

// Mostrar pantalla de Game Over
function showGameOverScreen() {
    document.getElementById('game-over').style.display = 'flex';
    gameState.isRunning = false;
}

// Mostrar pantalla de Victoria
function showVictoryScreen() {
    document.getElementById('victory').style.display = 'flex';
    gameState.isRunning = false;
}

// Reiniciar el juego
function restartGame() {
    document.getElementById('game-over').style.display = 'none';
    gameState.isRunning = true;
    gameState.isGameOver = false;
    gameState.energy = 0;
    
    // Reposicionar personaje
    characterBody.position.set(0, 5, 0);
    characterBody.velocity.set(0, 0, 0);
    
    // Reiniciar cristales
    crystals.forEach(crystal => {
        crystal.mesh.visible = true;
        crystal.collected = false;
    });
    
    updateHUD();
}

// Actualizar HUD
function updateHUD() {
    document.getElementById('energyCount').textContent = gameState.energy;
}

// Verificar condiciones del juego
function checkGameConditions() {
    if (gameState.energy >= gameState.totalEnergy) {
        gameState.isVictory = true;
        showVictoryScreen();
    }
}

// Redimensionar ventana
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Iniciar el juego cuando la página esté cargada
window.addEventListener('DOMContentLoaded', initVR);

// Hacer funciones globales para los botones HTML
window.restartGame = restartGame;