/**
 * AETHER RUN - Sistema de animaciones
 * Gestiona las animaciones del personaje
 */

// Clips de animación
let animations = {
    idle: null,
    walk: null,
    run: null,
    jump: null,
    fall: null
};

// Acción actual
let currentAction = null;
let previousAction = null;

// Configurar las animaciones del modelo
function setupAnimations(modelAnimations) {
    if (!modelAnimations || modelAnimations.length === 0) return;
    
    // Mapear las animaciones desde el modelo
    modelAnimations.forEach(clip => {
        const clipName = clip.name.toLowerCase();
        
        if (clipName.includes('idle')) {
            animations.idle = clip;
        } else if (clipName.includes('walk') || clipName.includes('walking')) {
            animations.walk = clip;
        } else if (clipName.includes('run') || clipName.includes('running')) {
            animations.run = clip;
        } else if (clipName.includes('jump')) {
            animations.jump = clip;
        } else if (clipName.includes('fall')) {
            animations.fall = clip;
        }
    });
    
    // Iniciar con animación idle
    if (animations.idle) {
        currentAction = mixer.clipAction(animations.idle);
        currentAction.play();
    }
}

// Cambiar a una nueva animación con transición suave
function fadeToAction(newAction, duration = 0.2) {
    if (!mixer || !newAction || currentAction === newAction) return;
    
    previousAction = currentAction;
    currentAction = newAction;
    
    if (previousAction) {
        previousAction.fadeOut(duration);
    }
    
    currentAction.reset()
        .setEffectiveTimeScale(1)
        .setEffectiveWeight(1)
        .fadeIn(duration)
        .play();
}

// Actualizar animación según el estado del personaje
function updateAnimation() {
    if (!mixer || !animations.idle) return;
    
    const velocity = new THREE.Vector3(
        characterBody.velocity.x,
        characterBody.velocity.y,
        characterBody.velocity.z
    );
    
    // Eliminar componente vertical para velocidad horizontal
    const horizontalVelocity = new THREE.Vector3(velocity.x, 0, velocity.z);
    const speed = horizontalVelocity.length();
    
    // Determinar la animación a reproducir
    let targetAnimation = animations.idle;
    
    if (!isOnGround()) {
        // En el aire
        if (velocity.y > 1) {
            targetAnimation = animations.jump || animations.idle;
        } else if (velocity.y < -1) {
            targetAnimation = animations.fall || animations.idle;
        }
    } else {
        // En el suelo
        if (speed > 0.5) {
            if (keyState.sprint && speed > 7) {
                targetAnimation = animations.run || animations.walk;
            } else {
                targetAnimation = animations.walk;
            }
        } else {
            targetAnimation = animations.idle;
        }
    }
    
    // Cambiar a la animación objetivo si es diferente
    if (targetAnimation && currentAction !== mixer.clipAction(targetAnimation)) {
        fadeToAction(mixer.clipAction(targetAnimation));
    }
}