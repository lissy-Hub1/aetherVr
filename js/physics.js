/**
 * AETHER RUN VR - Sistema de Física para Realidad Virtual
 */

let physicsMaterial, playerContactMaterial;
let playerIsOnGround = false;

// Inicializar física
function initPhysics() {
    // 1. Crear mundo físico
    world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -20, 0), // Gravedad reducida para mayor comodidad en VR
        broadphase: new CANNON.SAPBroadphase(world),
        allowSleep: true
    });
    
    world.defaultContactMaterial.contactEquationStiffness = 1e9;
    world.defaultContactMaterial.contactEquationRelaxation = 4;
    
    // 2. Crear materiales
    physicsMaterial = new CANNON.Material('groundMaterial');
    const playerMaterial = new CANNON.Material('playerMaterial');
    
    // 3. Configurar interacción entre materiales
    playerContactMaterial = new CANNON.ContactMaterial(
        physicsMaterial,
        playerMaterial,
        {
            friction: 0.3,
            restitution: 0.2,
            contactEquationStiffness: 1e8,
            contactEquationRelaxation: 3
        }
    );
    world.addContactMaterial(playerContactMaterial);
    
    // 4. Configurar detección de contacto
    world.addEventListener('postStep', detectGroundContact);
}

// Detectar contacto con el suelo
function detectGroundContact() {
    let onGround = false;
    
    // Verificar todos los contactos
    for (let i = 0; i < world.contacts.length; i++) {
        const contact = world.contacts[i];
        
        // Verificar si uno de los cuerpos es el jugador
        if (contact.bi === characterBody || contact.bj === characterBody) {
            const otherBody = contact.bi === characterBody ? contact.bj : contact.bi;
            
            // Verificar si el contacto es con una superficie horizontal
            if (contact.ni.y > 0.7) { // Normal apuntando hacia arriba
                // Verificar posición relativa (que el jugador esté encima)
                const relativePos = new CANNON.Vec3();
                characterBody.position.vsub(otherBody.position, relativePos);
                
                if (relativePos.y > 0) {
                    onGround = true;
                    break;
                }
            }
        }
    }
    
    playerIsOnGround = onGround;
}

// Función auxiliar para verificar si el jugador está en el suelo
function isPlayerOnGround() {
    return playerIsOnGround;
}