/**
 * AETHER RUN - Sistema de controles
 * Gestiona los controles del jugador por teclado y mouse
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { VRButton } from 'three/addons/webxr/VRButton.js';

export { 
    initControls,
    
};

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

// Elemento del menú de pausa
let pauseMenu;

// Inicializar controles
function initControls() {
    // Configurar controles para VR
    if (renderer.xr.isPresenting) {
        // Controles para VR
        const controller1 = renderer.xr.getController(0);
        const controller2 = renderer.xr.getController(1);
        scene.add(controller1);
        scene.add(controller2);
        
        // Configurar eventos de los controles VR
        controller1.addEventListener('selectstart', () => {
            keyState.jump = true;
        });
        
        controller1.addEventListener('selectend', () => {
            keyState.jump = false;
        });
        
        // Configurar movimiento basado en la posición del controlador
        // (Aquí puedes agregar más lógica para los controles VR)
    } else {
        // Controles tradicionales (como antes)
        controls = new THREE.PointerLockControls(camera, document.body);
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
                if (!pauseMenu.style.display || pauseMenu.style.display === 'none') {
                    showPauseMenu();
                }
            }
        });
        
        setupKeyboardControls();
        createPauseMenu();
    }
}

// Crear el menú de pausa
function createPauseMenu() {
    // Crear el contenedor del menú de pausa
    pauseMenu = document.createElement('div');
    pauseMenu.id = 'pauseMenu';
    pauseMenu.style.position = 'fixed';
    pauseMenu.style.top = '0';
    pauseMenu.style.left = '0';
    pauseMenu.style.width = '100%';
    pauseMenu.style.height = '100%';
    pauseMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; // Fondo oscurecido semitransparente
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
        controls.lock();
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

// Función auxiliar para crear botones
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

// Mostrar el menú de pausa
function showPauseMenu() {
    pauseMenu.style.display = 'flex';
    pauseBackgroundMusic(); 
}

// Ocultar el menú de pausa
function hidePauseMenu() {
    pauseMenu.style.display = 'none';
    continueBackgroundMusic();
}

// Configurar los controles por teclado
function setupKeyboardControls() {
    // Evento al presionar una tecla
    document.addEventListener('keydown', (event) => {
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
                keyState.right = true;
                break;
            case 'd':
            case 'arrowright':
                keyState.left = true;
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
                keyState.right = false;
                break;
            case 'd':
            case 'arrowright':
                keyState.left = false;
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

// Alternar pausa del juego
function togglePause() {
    if (gameState.isGameOver || gameState.isVictory) return;
    
    gameState.isRunning = !gameState.isRunning;
    
    if (gameState.isRunning) {
        hidePauseMenu();
        controls.lock();
        
    } else {
        showPauseMenu();
        controls.unlock();
        

    }
}

// Actualizar controles en cada frame
function updateControls(delta) {
    if (!gameState.isRunning) return;
    
    if (renderer.xr.isPresenting) {
        // Lógica de movimiento para VR
        const gamepad = navigator.getGamepads()[0];
        if (gamepad) {
            // Usar el joystick del controlador VR para movimiento
            const xAxis = gamepad.axes[2] || 0;
            const yAxis = gamepad.axes[3] || 0;
            
            moveDirection.set(xAxis, 0, -yAxis).normalize();
            
            // Rotación basada en la cabeza (ya manejada por VRControls)
            const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
            cameraDirection.y = 0;
            cameraDirection.normalize();
            
            const rightVector = new THREE.Vector3()
                .crossVectors(camera.up, cameraDirection)
                .normalize();
            
            const moveX = moveDirection.x * cameraDirection.x + moveDirection.z * rightVector.x;
            const moveZ = moveDirection.x * cameraDirection.z + moveDirection.z * rightVector.z;
            
            moveDirection.set(moveX, 0, moveZ).normalize();
            
            // Sprint con botón secundario
            keyState.sprint = gamepad.buttons[1]?.pressed || false;
        }
    } else {
        // Lógica de movimiento tradicional (como antes)
        moveDirection.set(0, 0, 0);
        const cameraDirection = controls.getDirection(new THREE.Vector3(0, 0, -1)).normalize();
        cameraDirection.y = 0;
        
        const rightVector = new THREE.Vector3()
            .crossVectors(camera.up, cameraDirection)
            .normalize();
        
        if (keyState.forward) moveDirection.add(cameraDirection);
        if (keyState.backward) moveDirection.sub(cameraDirection);
        if (keyState.left) moveDirection.sub(rightVector);
        if (keyState.right) moveDirection.add(rightVector);
        
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
        }
    }
    
    moveCharacter(moveDirection, keyState.sprint);
    
    if (keyState.jump) {
        jump();
    }
}