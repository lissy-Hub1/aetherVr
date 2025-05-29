/**
 * AETHER RUN VR - Punto de entrada principal (Versión módulo ES6)
 */

// Importaciones
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XREstimatedLight } from 'three/addons/webxr/XREstimatedLight.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';

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
    try {
        // 1. Configurar reloj
        clock = new THREE.Clock();
        
        // 2. Crear escena
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f0f1e);
        
        // 3. Configurar cámara
        camera = new THREE.PerspectiveCamera(
            70, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        camera.position.set(0, 1.6, 0);
        
        // 4. Configurar renderizador
        renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('gameCanvas'),
            antialias: true
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.xr.enabled = true;
        
        // 5. Añadir botón de VR
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
        
    } catch (error) {
        console.error('Error al inicializar VR:', error);
        alert('Error al cargar el juego VR. Por favor recarga la página.');
    }
}

// Inicializar física
function initPhysics() {
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;
}

// Crear entorno (simplificado)
function createEnvironment() {
    // Ejemplo: crear piso
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x336699,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Crear cuerpo físico para el piso
    const floorBody = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Plane(),
    });
    floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(floorBody);
}

// Inicializar controles VR (simplificado)
function initVRControls() {
    // Implementación básica - expandir según necesidades
    vrControls = {
        update: function(delta) {
            // Lógica de actualización de controles
        }
    };
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
            checkFallDamage();
        }
        
        // Actualizar controles
        vrControls.update(delta);
        
        // Verificar condiciones del juego
        checkGameConditions();
    }
    
    renderer.render(scene, camera);
}

// Resto de funciones (mantener igual)
function checkFallDamage() {
    const y = characterBody.position.y;
    const vy = characterBody.velocity.y;
    
    if (vy < -0.5 && y < -10) {
        gameState.isGameOver = true;
        showGameOverScreen();
    }
}

function showGameOverScreen() {
    document.getElementById('game-over').style.display = 'flex';
    gameState.isRunning = false;
}

function showVictoryScreen() {
    document.getElementById('victory').style.display = 'flex';
    gameState.isRunning = false;
}

function restartGame() {
    document.getElementById('game-over').style.display = 'none';
    gameState.isRunning = true;
    gameState.isGameOver = false;
    gameState.energy = 0;
    
    if (characterBody) {
        characterBody.position.set(0, 5, 0);
        characterBody.velocity.set(0, 0, 0);
    }
    
    updateHUD();
}

function updateHUD() {
    document.getElementById('energyCount').textContent = gameState.energy;
    document.getElementById('totalEnergy').textContent = gameState.totalEnergy;
}

function checkGameConditions() {
    if (gameState.energy >= gameState.totalEnergy) {
        gameState.isVictory = true;
        showVictoryScreen();
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Hacer funciones accesibles globalmente
window.restartGame = restartGame;

// Iniciar el juego cuando la página esté cargada
window.addEventListener('DOMContentLoaded', initVR);