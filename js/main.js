import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import * as CANNON from 'cannon-es';
import { setRendererAndCamera } from './physics.js';

setRendererAndCamera(renderer, camera);

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

let fallStartHeight = null;
const fallThreshold = 10; 
let isVRMode = false;
let playerIsOnGround = false;
let jumpCooldown = 0;

// Elementos del DOM
const energyCountElement = document.getElementById('energyCount');
const totalEnergyElement = document.getElementById('totalEnergy');
const gameOverElement = document.querySelector('.game-over');
const victoryElement = document.querySelector('.victory');

// Inicialización del juego
async function init() {
    // Inicializar escena
    scene = new THREE.Scene();
    clock = new THREE.Clock();
    
    // Configurar cámara
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 0); // Altura de los ojos
    
    // Configurar renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('gameCanvas'),
        antialias: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Habilitar XR
    renderer.xr.enabled = true;
    
    // Añadir botón VR
    document.body.appendChild(VRButton.createButton(renderer));
    
    // Eventos para cambiar entre modos VR y no VR
    renderer.xr.addEventListener('sessionstart', () => {
        isVRMode = true;
        camera.position.set(0, 1.7, 0);
        if (controls) controls.dispose();
        
        // Ajustar UI para VR
        document.querySelector('.game-ui').style.display = 'none';
    });
    
    renderer.xr.addEventListener('sessionend', () => {
        isVRMode = false;
        initControls();
        document.querySelector('.game-ui').style.display = 'block';
    });
    initAudio();
    // Inicializar física
    initPhysics();
    
    // Crear entorno
    createEnvironment();
    
    // Cargar personaje
    loadCharacter();
    
    // Inicializar controles
    initControls();
    
    // Iniciar bucle de renderizado
    gameState.isRunning = true;
    renderer.setAnimationLoop(animate);
    
    
    // Evento para redimensionar la ventana
    window.addEventListener('resize', onWindowResize);
    
    // Actualizar HUD
    updateHUD();
}

// Cargar el modelo 3D del personaje
function loadCharacter() {
    character = new THREE.Group();
    scene.add(character);

    // Crear cuerpo físico para VR
    const radius = 0.3;
    const height = 1.8;
    const shape = new CANNON.Cylinder(radius, radius, height, 8);
    
    characterBody = new CANNON.Body({
        mass: 70,
        shape: shape,
        position: new CANNON.Vec3(0, 2, 0),
        fixedRotation: true,
        linearDamping: 0.5
    });

    characterBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(characterBody);

    characterBody.addEventListener('collide', (e) => {
        if (e.contact.ni.y > 0.7) {
            playerIsOnGround = true;
            jumpCooldown = 0;
        }
    });
}

// Actualizar HUD
function updateHUD() {
    energyCountElement.textContent = gameState.energy;
    totalEnergyElement.textContent = gameState.totalEnergy;
}

// Verificar condiciones del juego
function checkGameConditions() {
    const y = characterBody.position.y;
    const vy = characterBody.velocity.y;

    if (vy < -0.1 && fallStartHeight === null) {
        fallStartHeight = y;
    }

    if (vy >= 0) {
        fallStartHeight = null;
    }

    if (fallStartHeight !== null && fallStartHeight - y > fallThreshold && !gameState.isGameOver) {
        gameState.isGameOver = true;
        showGameOverScreen();
    }

    if (gameState.energy >= gameState.totalEnergy && !gameState.isVictory) {
        gameState.isVictory = true;
        showVictoryScreen();
    }
}

// Mostrar pantalla de Game Over
function showGameOverScreen() {
    gameState.isRunning = false;
    gameOverElement.style.display = 'block';
    
    if (!isVRMode && controls) {
        controls.unlock();
    }
    
    pauseBackgroundMusic();
}

// Mostrar pantalla de Victoria
function showVictoryScreen() {
    gameState.isRunning = false;
    victoryElement.style.display = 'block';
    
    if (!isVRMode && controls) {
        controls.unlock();
    }
    
    pauseBackgroundMusic();
}

// Reiniciar el juego
function restartGame() {
    gameOverElement.style.display = 'none';
    victoryElement.style.display = 'none';
    
    gameState.energy = 0;
    gameState.isGameOver = false;
    gameState.isVictory = false;
    gameState.isRunning = true;
    
    characterBody.position.set(0, 5, 0);
    characterBody.velocity.set(0, 0, 0);
    
    updateHUD();
    resetLevel();
    
    if (!isVRMode && controls) {
        controls.lock();
    }
    
    continueBackgroundMusic();
}

// Bucle de renderizado principal
function animate() {
    if (gameState.isRunning) {
        const delta = clock.getDelta();
        
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
}

// Redimensionamiento de ventana
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Audio del juego
function initAudio() {
    backgroundMusic = new Audio('../assets/sounds/Ascendente.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.5;
    document.addEventListener('click', startBackgroundMusic, { once: true });
}

function startBackgroundMusic() {
    if (!isMusicPlaying) {
        backgroundMusic.play()
            .then(() => isMusicPlaying = true)
            .catch(e => console.error("Error al reproducir música:", e));
    }
}

function pauseBackgroundMusic() {
    if (isMusicPlaying) {
        backgroundMusic.pause();
        isMusicPlaying = false;
    }
}

function continueBackgroundMusic() {
    if (!isMusicPlaying) {
        backgroundMusic.play()
            .then(() => isMusicPlaying = true)
            .catch(e => console.error("Error al reanudar música:", e));
    }
}

// Iniciar el juego cuando la página esté cargada
window.addEventListener('DOMContentLoaded', init);
window.restartGame = restartGame;