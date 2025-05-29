/**
 * AETHER RUN - Juego WebGL con Three.js
 * Archivo principal que inicializa y gestiona el juego
 */

// Variables globales
let scene, camera, renderer, clock, mixer;
let world, timeStep = 1/60;
let character, characterBody;
let controls, playerVelocity;
let backgroundMusic;
let isMusicPlaying = false;
let gameState = {
    isRunning: false,
    energy: 0,
    totalEnergy: 14,
    isGameOver: false,
    isVictory: false
};

let vrControls;
let vrEffect;

let fallStartHeight = null;
const fallThreshold = 10; 

// Elementos del DOM
const energyCountElement = document.getElementById('energyCount');
const gameOverElement = document.querySelector('.game-over');
const victoryElement = document.querySelector('.victory');

// Inicialización del juego

function init() {
    // Inicializar escena
    scene = new THREE.Scene();
    clock = new THREE.Clock();
    
    // Configurar cámara
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 0);
    
    // Configurar renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('gameCanvas'),
        antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Habilitar WebXR
    renderer.xr.enabled = true;
    document.body.appendChild(VRButton.createButton(renderer));
    
    // Configurar efecto VR
    vrEffect = new THREE.VREffect(renderer);
    vrEffect.setSize(window.innerWidth, window.innerHeight);
    
    // Configurar controles VR
    vrControls = new THREE.VRControls(camera);
    vrControls.standing = true;
    
    // Resto de la inicialización...
    initPhysics();
    createEnvironment();
    loadCharacter();
    initControls();
    initAudio();
    
    // Iniciar bucle de renderizado
    gameState.isRunning = true;
    animate();
    
    window.addEventListener('resize', onWindowResize);
}

// Cargar el modelo 3D del personaje
function loadCharacter() {
    // Eliminamos el modelo visual del personaje (no es necesario en primera persona)
    character = new THREE.Group(); // Solo un contenedor vacío para la cámara
    scene.add(character);

    // Creamos un cuerpo físico más adecuado para primera persona
    const radius = 0.3; // Radio más pequeño para mejor movimiento
    const height = 1.8; // Altura aproximada de un jugador
    const shape = new CANNON.Cylinder(radius, radius, height, 8); // Forma de cápsula
    
    characterBody = new CANNON.Body({
        mass: 70, // Masa similar a un humano (kg)
        shape: shape,
        position: new CANNON.Vec3(0, 2, 0), // Posición inicial sobre el suelo
        material: physicsMaterial,
        fixedRotation: true, // Evitar rotaciones no deseadas
        linearDamping: 0.5 // Fricción del movimiento
    });

    // Ajustamos la orientación de la cápsula (CANNON.Cylinder es vertical por defecto)
    characterBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    
    world.addBody(characterBody);

    // Configuración adicional recomendada
    characterBody.addEventListener('collide', (e) => {
        // Mejor detección de contacto con el suelo
        if (e.contact.ni.y > 0.7) { // Si la normal del contacto apunta hacia arriba
            playerIsOnGround = true;
            jumpCooldown = 0;
        }
    });
}

// Actualizar HUD con el contador de energía
function updateHUD() {
    energyCountElement.textContent = gameState.energy;
}

// Verificar victoria o derrota
function checkGameConditions() {
    const y = characterBody.position.y;
    const vy = characterBody.velocity.y;

    // Detectar si empieza a caer
    if (vy < -0.1 && fallStartHeight === null) {
        fallStartHeight = y;
    }

    // Si deja de caer o toca el suelo, reseteamos
    if (vy >= 0) {
        fallStartHeight = null;
    }

    // Si ha caído desde una altura considerable
    if (
        fallStartHeight !== null &&
        fallStartHeight - y > fallThreshold &&
        !gameState.isGameOver
    ) {
        gameState.isGameOver = true;
        showGameOverScreen();
    }

    // Victoria - Recolectar todos los cristales
    if (gameState.energy >= gameState.totalEnergy && !gameState.isVictory) {
        gameState.isVictory = true;
        showVictoryScreen();
    }
}


// Mostrar pantalla de Game Over
function showGameOverScreen() {
    gameState.isRunning = false;
    gameOverElement.style.display = 'block';
    
    // Liberar controles del puntero
    controls.unlock();
    pauseBackgroundMusic(); 
}

// Mostrar pantalla de Victoria
function showVictoryScreen() {
    gameState.isRunning = false;
    victoryElement.style.display = 'block';
    
    // Liberar controles del puntero
    controls.unlock();
    pauseBackgroundMusic(); 
}

// Reiniciar el juego
function restartGame() {
    // Ocultar pantallas de fin de juego
    gameOverElement.style.display = 'none';
    victoryElement.style.display = 'none';
    
    // Reiniciar estado del juego
    gameState.energy = 0;
    gameState.isGameOver = false;
    gameState.isVictory = false;
    gameState.isRunning = true;
    
    // Reposicionar al personaje
    characterBody.position.set(0, 5, 0);
    characterBody.velocity.set(0, 0, 0);
    
    // Actualizar HUD
    updateHUD();
    
    // Reiniciar objetos del nivel
    resetLevel();
    
    // Volver a bloquear el puntero
    controls.lock();
    continueBackgroundMusic();
}

// Bucle de renderizado principal
function animate() {
    renderer.setAnimationLoop(function() {
        if (gameState.isRunning) {
            const delta = clock.getDelta();
            
            // Actualizar controles VR
            if (renderer.xr.isPresenting) {
                vrControls.update();
            }
            
            // Resto de la lógica del juego...
            world.step(timeStep);
            character.position.copy(characterBody.position);
            
            if (mixer) {
                mixer.update(delta);
            }
            
            updateControls(delta);
            updateEnvironment(delta);
            checkCollisions();
            checkGameConditions();
        }
        
        renderer.render(scene, camera);
    });
}

// Ajustar tamaño al redimensionar la ventana
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    vrEffect.setSize(window.innerWidth, window.innerHeight);
}


// Función para inicializar el audio
function initAudio() {
    // Crear el objeto de audio
    backgroundMusic = new Audio('../assets/sounds/Ascendente.mp3'); // Asegúrate de tener este archivo
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.5; // Volumen moderado
    document.addEventListener('click', startBackgroundMusic, { once: true });
}

// Función para iniciar la música
function startBackgroundMusic() {
    if (!isMusicPlaying) {
        backgroundMusic.play()
            .then(() => isMusicPlaying = true)
            .catch(e => console.error("Error al reproducir música:", e));
    }
}

// Función para pausar la música
function pauseBackgroundMusic() {
    console.log("pausar");
    if (isMusicPlaying) {
        backgroundMusic.pause();
        isMusicPlaying = false;
    }
}

// Función para continuar la música
function continueBackgroundMusic() {
    if (!isMusicPlaying) {
        backgroundMusic.play()
            .then(() => isMusicPlaying = true)
            .catch(e => console.error("Error al reanudar música:", e));
    }
}


// Iniciar el juego cuando la página esté cargada
window.addEventListener('DOMContentLoaded', init);

// Función global para reiniciar el juego (llamada desde el botón en la pantalla de game over)
window.restartGame = restartGame;