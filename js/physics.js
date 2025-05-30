/**
 * AETHER RUN - Sistema de física
 * Gestiona la física del juego y las colisiones
 */


// Variables globales para la física
let physicsMaterial;
let playerContactMaterial;
let playerIsOnGround = false;
let jumpCooldown = 0;

export {
  initPhysics,
  updatePhysics,
  isOnGround,
  jump,
  moveCharacter,
  setRendererAndCamera // ← Esta línea DEBE estar presente
};

let renderer, camera;

function setRendererAndCamera(threeRenderer, threeCamera) {
  renderer = threeRenderer;
  camera = threeCamera;
}

// Inicializar el sistema de física
function initPhysics() {
  // Crear mundo físico
  world = new CANNON.World();
  world.gravity.set(0, -30, 0); // Gravedad normal
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 10;

  // Crear materiales para físicas
  physicsMaterial = new CANNON.Material('physics');
  const playerMaterial = new CANNON.Material('player');

  // Configurar interacción entre materiales
  playerContactMaterial = new CANNON.ContactMaterial(
    physicsMaterial,
    playerMaterial,
    {
      friction: 0.5,
      restitution: 0.2, // Rebote moderado
      contactEquationStiffness: 1e8,
      contactEquationRelaxation: 3
    }
  );
  world.addContactMaterial(playerContactMaterial);

  // Configurar detección de contacto para saltos
  // Configurar detección de contacto mejorada
  world.addEventListener('beginContact', (event) => {
    const bodies = [event.bodyA, event.bodyB];
    const normal = event.contact.ni;

    // Verificar si el contacto es con una superficie horizontal
    if (bodies.includes(characterBody)) {
      // Consideramos "suelo" cualquier superficie con normal hacia arriba (> 0.7)
      const isGroundContact = normal.y > 0.7;

      // También verificamos si estamos parados sobre el objeto (posición relativa)
      const otherBody = bodies[0] === characterBody ? bodies[1] : bodies[0];
      const relativePos = new CANNON.Vec3();
      characterBody.position.vsub(otherBody.position, relativePos);

      if (isGroundContact && relativePos.y > 0) {
        playerIsOnGround = true;
        jumpCooldown = 0;
        console.log("Contacto con suelo detectado");
      }
    }
  });

  world.addEventListener('endContact', (event) => {
    const bodies = [event.bodyA, event.bodyB];

    if (bodies.includes(characterBody)) {
      // Verificar si hay otros contactos con el suelo
      let stillOnGround = false;

      world.contacts.forEach(contact => {
        if (contact.bi === characterBody || contact.bj === characterBody) {
          const normal = contact.ni;
          const otherBody = contact.bi === characterBody ? contact.bj : contact.bi;
          const relativePos = new CANNON.Vec3();
          characterBody.position.vsub(otherBody.position, relativePos);

          if (normal.y > 0.7 && relativePos.y > 0) {
            stillOnGround = true;
          }
        }
      });

      if (!stillOnGround) {
        playerIsOnGround = false;
        console.log("Perdió contacto con el suelo");
      }
    }
  });

  world.addEventListener('endContact', (event) => {
    const bodyA = event.bodyA;
    const bodyB = event.bodyB;

    if ((bodyA === characterBody || bodyB === characterBody)) {
      // Añadimos un pequeño retraso para permitir saltar justo después de dejar el suelo
      setTimeout(() => {
        playerIsOnGround = false;
      }, 50);
    }
  });
}

// Comprobar si el jugador está en el suelo
function isOnGround() {
  return playerIsOnGround;
}

// Aplicar fuerza para saltar
function jump() {
  //console.log("Intentando saltar. En suelo:", playerIsOnGround, "Cooldown:", jumpCooldown);
  if (playerIsOnGround && jumpCooldown <= 0) {
      //console.log("Salto exitoso");
      characterBody.velocity.y = 15; // Aumenta la fuerza si es necesario
      playerIsOnGround = false;
      jumpCooldown = 0.4;
      
      // Pequeño impulso adicional hacia arriba para asegurar el despegue
      characterBody.position.y += 0.1;
  }
}

// Aplicar movimiento al jugador
function moveCharacter(direction, isSprinting) {
  //console.log("playerIsOnGround: "+playerIsOnGround+"")
  // Velocidades diferenciadas
  const groundSpeed = 80;  // Velocidad en tierra
  const airSpeed = 12;      // Velocidad en aire (reducida)
  const baseSpeed = playerIsOnGround ? groundSpeed : airSpeed;
  
  // Multiplicador de sprint (solo aplica en tierra)
  const sprintMultiplier = (playerIsOnGround && isSprinting) ? 1.8 : 1;

  // Aplicar movimiento
  characterBody.velocity.x = direction.x * baseSpeed * sprintMultiplier;
  characterBody.velocity.z = direction.z * baseSpeed * sprintMultiplier;

  // Limitar velocidad máxima
  const horizontalVelocity = new CANNON.Vec3(
      characterBody.velocity.x,
      0,
      characterBody.velocity.z
  );

  const maxSpeed = baseSpeed * sprintMultiplier;
  if (horizontalVelocity.length() > maxSpeed) {
      horizontalVelocity.normalize();
      horizontalVelocity.scale(maxSpeed, horizontalVelocity);
      characterBody.velocity.x = horizontalVelocity.x;
      characterBody.velocity.z = horizontalVelocity.z;
  }

  // Actualizar cooldown de salto
  if (jumpCooldown > 0) jumpCooldown -= 1/60;
}