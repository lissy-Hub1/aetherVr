import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Estado de las teclas
const keyState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
    interact: false
};

// Dirección del movimiento
const moveDirection = new THREE.Vector3();
let vrEnabled = false;
let controls;
let pauseMenu;

// Constantes de movimiento
const WALK_SPEED = 5.0;
const SPRINT_SPEED = 8.0;
const JUMP_FORCE = 7.0;
const MOVEMENT_SMOOTHING = 0.2;

function initControls() {
    // Configurar controles para VR y no-VR
    if (renderer.xr.isPresenting) {
        setupVRControls();
    } else {
        setupDesktopControls();
    }
    
    // Configurar eventos de teclado (para ambos modos)
    setupKeyboardControls();
    createPauseMenu();
}

function setupVRControls() {
    vrEnabled = true;
    
    // Configurar gamepads para VR
    const gamepadControls = {
        moveForward: false,
        moveBackward: false,
        moveLeft: false,
        moveRight: false,
        jump: false
    };
    
    // Escanear gamepads periódicamente
    setInterval(() => {
        if (!renderer.xr.isPresenting) return;
        
        const gamepads = navigator.getGamepads();
        for (const gamepad of gamepads) {
            if (gamepad && gamepad.mapping === 'xr-standard') {
                // Mapear sticks y botones
                const forwardAxis = gamepad.axes[3]; // Eje vertical del stick derecho
                const strafeAxis = gamepad.axes[2];  // Eje horizontal del stick derecho
                
                gamepadControls.moveForward = forwardAxis < -0.5;
                gamepadControls.moveBackward = forwardAxis > 0.5;
                gamepadControls.moveLeft = strafeAxis < -0.5;
                gamepadControls.moveRight = strafeAxis > 0.5;
                gamepadControls.jump = gamepad.buttons[0].pressed;
                
                // Actualizar estado de las teclas
                keyState.forward = gamepadControls.moveForward;
                keyState.backward = gamepadControls.moveBackward;
                keyState.left = gamepadControls.moveLeft;
                keyState.right = gamepadControls.moveRight;
                keyState.jump = gamepadControls.jump;
                
                break;
            }
        }
    }, 100);
    
    // Configurar eventos de los controles VR
    renderer.xr.addEventListener('sessionstart', () => {
        vrEnabled = true;
        if (controls) controls.dispose();
    });
    
    renderer.xr.addEventListener('sessionend', () => {
        vrEnabled = false;
        setupDesktopControls();
    });
}

function setupDesktopControls() {
    vrEnabled = false;
    
    // Configurar controles de puntero para modo escritorio
    controls = new PointerLockControls(camera, document.body);
    character.add(camera);
    
    document.getElementById('gameCanvas').addEventListener('click', () => {
        if (gameState.isRunning && !gameState.isGameOver && !gameState.isVictory) {
            controls.lock();
        }
    });
    
    controls.addEventListener('lock', () => {
        gameState.isRunning = true;
        hidePauseMenu();
    });
    
    controls.addEventListener('unlock', () => {
        if (!gameState.isGameOver && !gameState.isVictory) {
            gameState.isRunning = false;
            showPauseMenu();
        }
    });
}

function createPauseMenu() {
    // Crear el contenedor del menú de pausa
    pauseMenu = document.createElement('div');
    pauseMenu.id = 'pauseMenu';
    pauseMenu.style.position = 'fixed';
    pauseMenu.style.top = '0';
    pauseMenu.style.left = '0';
    pauseMenu.style.width = '100%';
    pauseMenu.style.height = '100%';
    pauseMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    pauseMenu.style.display = 'none';
    pauseMenu.style.flexDirection = 'column';
    pauseMenu.style.justifyContent = 'center';
    pauseMenu.style.alignItems = 'center';
    pauseMenu.style.zIndex = '1000';
    
    // Título del menú
    const title = document.createElement('h2');
    title.textContent = 'JUEGO PAUSADO';
    title.style.color = 'white';
    title.style.marginBottom = '30px';
    title.style.fontSize = '32px';
    
    // Botón para continuar el juego
    const continueButton = createButton('Continuar Juego', () => {
        hidePauseMenu();
        if (!vrEnabled) controls.lock();
        gameState.isRunning = true;
    });
    
    // Botón para volver al inicio
    const homeButton = createButton('Volver al Inicio', () => {
        window.location.href = '../index.html';
    });
    
    // Añadir elementos al menú
    pauseMenu.appendChild(title);
    pauseMenu.appendChild(continueButton);
    pauseMenu.appendChild(homeButton);
    
    // Añadir el menú al documento
    document.body.appendChild(pauseMenu);
}

function createButton(text, onClick) {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.padding = '15px 30px';
    button.style.fontSize = '18px';
    button.style.margin = '10px';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.style.transition = 'background-color 0.3s';
    
    button.addEventListener('mouseover', () => {
        button.style.backgroundColor = '#45a049';
    });
    
    button.addEventListener('mouseout', () => {
        button.style.backgroundColor = '#4CAF50';
    });
    
    button.addEventListener('click', onClick);
    
    return button;
}

function showPauseMenu() {
    pauseMenu.style.display = 'flex';
    pauseBackgroundMusic();
}

function hidePauseMenu() {
    pauseMenu.style.display = 'none';
    continueBackgroundMusic();
}

function setupKeyboardControls() {
    // Evento al presionar una tecla
    document.addEventListener('keydown', (event) => {
        if (event.repeat) return;
        
        switch (event.key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                keyState.forward = true;
                break;
            case 's':
            case 'arrowdown':
                keyState.backward = true;
                break;
            case 'a':
            case 'arrowleft':
                keyState.left = true;
                break;
            case 'd':
            case 'arrowright':
                keyState.right = true;
                break;
            case ' ':
                keyState.jump = true;
                break;
            case 'shift':
                keyState.sprint = true;
                break;
            case 'e':
                keyState.interact = true;
                break;
            case 'escape':
                togglePause();
                break;
        }
    });
    
    // Evento al soltar una tecla
    document.addEventListener('keyup', (event) => {
        switch (event.key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                keyState.forward = false;
                break;
            case 's':
            case 'arrowdown':
                keyState.backward = false;
                break;
            case 'a':
            case 'arrowleft':
                keyState.left = false;
                break;
            case 'd':
            case 'arrowright':
                keyState.right = false;
                break;
            case ' ':
                keyState.jump = false;
                break;
            case 'shift':
                keyState.sprint = false;
                break;
            case 'e':
                keyState.interact = false;
                break;
        }
    });
}

function togglePause() {
    if (gameState.isGameOver || gameState.isVictory) return;
    
    gameState.isRunning = !gameState.isRunning;
    
    if (gameState.isRunning) {
        hidePauseMenu();
        if (!vrEnabled) controls.lock();
    } else {
        showPauseMenu();
        if (!vrEnabled) controls.unlock();
    }
}

function updateControls(delta) {
    if (!gameState.isRunning) return;
    
    // Calcular dirección de movimiento
    moveDirection.set(0, 0, 0);
    
    // Obtener dirección de visión
    const cameraDirection = new THREE.Vector3();
    if (vrEnabled) {
        camera.getWorldDirection(cameraDirection);
    } else {
        controls.getDirection(cameraDirection);
    }
    
    cameraDirection.y = 0; // Mantener el movimiento horizontal
    cameraDirection.normalize();
    
    // Vector derecha de la cámara
    const rightVector = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), cameraDirection)
        .normalize();
    
    // Calcular dirección según teclas presionadas
    if (keyState.forward) moveDirection.add(cameraDirection);
    if (keyState.backward) moveDirection.sub(cameraDirection);
    if (keyState.left) moveDirection.sub(rightVector);
    if (keyState.right) moveDirection.add(rightVector);
    
    // Normalizar la dirección si hay movimiento
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
    }
    
    // Aplicar movimiento con el sistema de física
    moveCharacter(moveDirection, keyState.sprint);
    
    // Manejar salto
    if (keyState.jump) {
        jump();
        keyState.jump = false; // Resetear estado de salto
    }
}

function moveCharacter(direction, sprinting) {
    if (!characterBody) return;
    
    const speed = sprinting ? SPRINT_SPEED : WALK_SPEED;
    const velocity = characterBody.velocity;
    
    // Suavizar el movimiento
    const targetVelocityX = direction.x * speed;
    const targetVelocityZ = direction.z * speed;
    
    velocity.x = THREE.MathUtils.lerp(velocity.x, targetVelocityX, MOVEMENT_SMOOTHING);
    velocity.z = THREE.MathUtils.lerp(velocity.z, targetVelocityZ, MOVEMENT_SMOOTHING);
    
    // Mantener velocidad vertical (gravedad)
    characterBody.velocity = velocity;
}

function jump() {
    if (!characterBody || !playerIsOnGround) return;
    
    characterBody.velocity.y = JUMP_FORCE;
    playerIsOnGround = false;
}

export { initControls, updateControls, togglePause };