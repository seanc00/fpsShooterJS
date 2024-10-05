// IMPORTS --------------------------------------------------------------------------------------------------------------
import * as THREE from 'three';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { scene, camera, renderer } from './sceneSetup.js';

import { Howl } from 'howler';
// END OF IMPORTS -------------------------------------------------------------------------------------------------------

// GLOBAL VARIABLES code ---------------------------------------------------------------------------------------------------
let isGameRunning = false;

// Initialize player variables
let playerHealth = 100;
let playerScore = 0;

let cube = []; // Array for storing Cube enemies
// END GLOBAL VARIABLES code ------------------------------------------------------------------------------------------------


// Music code -----------------------------------------------------------------------------------------------------
const bacMusic = new Howl({ // plays music on players initial interation
    src: ['assets/sounds/bgdMusic.wav'],
    autoplay: true,
    loop: true,
    volume: 0.5
  });
// END OF MUSIC code -----------------------------------------------------------------------------------------------------
// SOUND EFFECTS code -----------------------------------------------------------------------------------------------------
const playerJump = new Howl({
    src: ['assets/sounds/playerJump.wav'],
    volume: 0.2,
    rate: 2
  });

// Global ghost sound
const ghostSound = new Howl({
    src: ['assets/sounds/ghostEnemySound.wav'],
    loop: true,
    volume: 0, // no volume as no ghosts are near initially
});
ghostSound.play();

// Player gunshot sound
const playerGunShotSound = new Howl({
    src: ['assets/sounds/playerGunShot.mp3'],
    volume: 0.1
});

// Ghost shooting sound
const ghostProjectileShotSound = new Howl({
    src: ['assets/sounds/ghostProjectileShot.wav'],
    volume: 0.1 
});
// END OF SOUND EFFECTS code -----------------------------------------------------------------------------------------------------


// AMBIENT LIGHT code ---------------------------------------------------------------------------------------------------
import { setupLights } from './light.js';
setupLights(scene); // Add light to scene
// END OF AMBIENT LIGHT code --------------------------------------------------------------------------------------------

// PLANE/SKYBOX code -----------------------------------------------------------------------------------------------------------
import { addPlaneToScene, addSkyboxToScene } from './environment.js';

addPlaneToScene(scene);
addSkyboxToScene(scene);
// END OF PLANE/SKYBOX code ----------------------------------------------------------------------------------------------------

// START of map import code ---------------------------------------------------------------------------------------
const gltfLoader = new GLTFLoader();
let mapMesh; // Holds map mesh

// Load .glb map file
gltfLoader.load(
  'assets/bigMapV1.glb', // load map
  function(gltf) {
    gltf.scene.scale.set(24, 24, 24); // size of map
    gltf.scene.position.y -= 3; // y value of map

    mapMesh = gltf.scene; // Stores map mesh to check for collisions
    
    scene.add(mapMesh); // Add new scaled scene to Three.js scene
  },
  undefined, // Not using the onProgress callback for now
  function(error) {
    console.error(error); // Error handling
  }
);
// END of map import code -----------------------------------------------------------------------------------------


// START OF PARTICLE code ------------------------------------------------------------------------------------------
// Particle material and geometry setup
const particleMaterial = new THREE.PointsMaterial({
    color: 0xffd700,
    size: 0.1,
    blending: THREE.AdditiveBlending
  });
  
  function createParticleEffect(position) {
    // Create particles at the collision position
    const particlesCount = 50; // Number of particles
    const positions = [];
    for (let i = 0; i < particlesCount; i++) {
      positions.push(
        position.x + (Math.random() * 2 - 1) * 0.2, // Randomize XYZ
        position.y + (Math.random() * 2 - 1) * 0.2,
        position.z + (Math.random() * 2 - 1) * 0.2 
      );
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
  
    // Remove particles at certain time
    setTimeout(() => {
      scene.remove(particles);
    }, 1000);
  }
  // END OF PARTICLE code ------------------------------------------------------------------------------------------
  
  // START OF GUN code ------------------------------------------------------------------------------------------
  let gunMesh; // gun declaration
  const bullets = []; // Array to store bullets
  
  const gunLoader = new GLTFLoader(); // loads gun asset (just a rectangle as reference)
  gunLoader.load('assets/gun.glb', function(gltf) {
      gunMesh = gltf.scene;
      gunMesh.scale.set(1, 1, 1);
      gunMesh.position.set(0.3, -0.8, -1);
      gunMesh.rotation.y = Math.PI / 2;
      camera.add(gunMesh);
      scene.add(camera);
  });
  
  function shootBullet() {
    const bulletGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    playerGunShotSound.play(); // Play the gunshot sound
  
    const gunTipOffset = new THREE.Vector3(0.3, -0.6, -2).applyQuaternion(camera.quaternion).add(camera.position);
    bullet.position.copy(gunTipOffset);
  
    const shootDirection = new THREE.Vector3();
    camera.getWorldDirection(shootDirection);
    bullet.velocity = shootDirection.multiplyScalar(0.8);
  
    scene.add(bullet);
    bullets.push(bullet); // Add bullet to tracking array
  }
  
  document.addEventListener('click', shootBullet);
  
// Function to update bullets' positions and check for collisions
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.position.add(bullet.velocity);

        // Extended collision detection point slightly ahead of the bullet
        const collisionDetectionPoint = bullet.position.clone().add(bullet.velocity.clone().normalize().multiplyScalar(0.5)); // Adjust as needed

        // Check for collision with environment and bullet
        let raycaster = new THREE.Raycaster();
        raycaster.set(collisionDetectionPoint, bullet.velocity.normalize());
        let intersectsEnvironment = raycaster.intersectObject(mapMesh, true);

        // Check for collision with both ghost enemies and Cube
        let intersectsGhosts = raycaster.intersectObjects(enemies, true);
        let intersectsCube = raycaster.intersectObjects(cube, true);

        // Handle collision with Cube first
        if (intersectsCube.length > 0 && intersectsCube[0].distance <= bullet.velocity.length()) {
            // cubeEnemy hit
            const cubeEnemyHit = intersectsCube[0].object;
            createParticleEffect(intersectsCube[0].point); // Visual effect at collision

            // Remove cubeEnemy immediatly
            scene.remove(cubeEnemyHit); // Remove cubeEnemy from scene
            cube.splice(cube.indexOf(cubeEnemyHit), 1); // Remove cubeEnemy from array

            // Update score on cubeEnemy kill
            updateScore(playerScore + 250); // Increment score

            scene.remove(bullet); // Remove bullet from scene
            bullets.splice(i, 1); // Remove bullet from tracking array
        }
        // Then check for collision with ghost enemies and bullet
        else if (intersectsGhosts.length > 0 && intersectsGhosts[0].distance <= bullet.velocity.length()) {
            // Ghost enemy hit
            const enemyHit = intersectsGhosts[0].object;
            createParticleEffect(intersectsGhosts[0].point); // Visual effect at collision

            // Delayed removal for visibility and to update score
            setTimeout(() => {
                scene.remove(enemyHit); // Remove enemy from scene
                enemies.splice(enemies.indexOf(enemyHit), 1); // Remove enemy from array
                
                // Update score upon defeating a ghost
                updateScore(playerScore + 100); // Increment score by 100
                
                scene.remove(bullet); // Remove bullet from scene
                bullets.splice(i, 1); // Remove bullet from tracking array
            }, 100); // Adjust delay as needed
        }
        // Handle collision with environment
        else if (intersectsEnvironment.length > 0 && intersectsEnvironment[0].distance <= bullet.velocity.length()) {
            // Environment hit
            createParticleEffect(intersectsEnvironment[0].point); // Visual effect at collision

            // Immediate removal of bullet
            scene.remove(bullet);
            bullets.splice(i, 1); // Remove bullet from tracking array
        }
    }
}
// END OF GUN code ------------------------------------------------------------------------------------------
  

// PLAYER MOVEMENT code -------------------------------------------------------------------------------------
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let isJumping = false; // Flag to check if the player is already jumping
let isSprinting = false; // Flag to check if the player is sprinting
const playerSpeed = 0.25; // Define the player's movement speed
const sprintSpeedMultiplier = 1.5; // Sprint speed multiplier
const directionVector = new THREE.Vector3(); // Direction of player movement

// Variables for head bobbing
const bobbingSpeed = 0.15; // Speed of the head bob
const bobbingAmount = 0.4; // Amplitude of the head bob (reduced for realism)
let bobbingPhase = 0; // Current phase of the sine wave for head bobbing
const originalYPosition = camera.position.y; // Original Y position for resetting height after head bob

// Variables for jumping
const jumpSpeed = 0.7; // Initial speed of the jump
const gravity = -0.015; // Gravity affecting the player
let verticalVelocity = 0; // Current vertical velocity of the player

// Event listeners for player movement and sprinting
document.addEventListener('keydown', function(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': 
            if (!isJumping) { // Initiate jump only if not already jumping
                isJumping = true;
                playerJump.play(); // Play jump sound once
                verticalVelocity = jumpSpeed; // Initiate jump
            }
            break;
        case 'ShiftLeft': isSprinting = true; break;
    }
});

document.addEventListener('keyup', function(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
        case 'ShiftLeft': isSprinting = false; break;
    }
});

// Function to update player position with head bobbing effect, jumping, and sprinting
function updatePlayerPosition() {
    let isMoving = moveForward || moveBackward || moveLeft || moveRight;

    if (isMoving) {
        directionVector.set(
            (moveLeft ? -1 : 0) + (moveRight ? 1 : 0),
            0,
            (moveForward ? -1 : 0) + (moveBackward ? 1 : 0)
        ).normalize().multiplyScalar(playerSpeed * (isSprinting ? sprintSpeedMultiplier : 1));

        directionVector.applyEuler(camera.rotation);
        directionVector.y = 0; // Ensure movement is horizontal only

        if (!detectCollision(directionVector)) {
            camera.position.add(directionVector);
        }

        // Apply head bobbing effect when moving
        if (!isJumping) { // Only apply bobbing when not in the air
            bobbingPhase += bobbingSpeed;
            camera.position.y = originalYPosition + Math.sin(bobbingPhase) * bobbingAmount;
        }
    } else if (!isJumping) {
        // Gradually reset head bobbing when the player stops moving
        camera.position.y += (originalYPosition - camera.position.y) * 0.1;
    }

    // Handle jumping separately from horizontal movement
    if (isJumping) {
        verticalVelocity += gravity;
        camera.position.y += verticalVelocity;
        if (camera.position.y <= originalYPosition) {
            camera.position.y = originalYPosition;
            isJumping = false; // Reset jumping flag when landing
            verticalVelocity = 0;
            bobbingPhase = 0; // Reset bobbing phase when landing
        }
    }
}
// END OF PLAYER MOVEMENT code -----------------------------------------------------------------------------


// MOUSE LOOK code -----------------------------------------------------------------------------------------
renderer.domElement.addEventListener('click', function() {
    this.requestPointerLock();
});

let euler = new THREE.Euler(0, 0, 0, 'YXZ');
let sensitivity = 0.002;

// Event listener for mouse movement.
document.addEventListener('mousemove', function(event) {
    if (document.pointerLockElement === renderer.domElement) {
        euler.setFromQuaternion(camera.quaternion);
        euler.y -= event.movementX * sensitivity;
        euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x - event.movementY * sensitivity));
        camera.quaternion.setFromEuler(euler);
    }
});
// END OF MOUSE LOOK code ----------------------------------------------------------------------------------


// Collision Detection -------------------------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const collisionDistance = 1; // Distance to detect collision.

// Function to check for collision in the direction of movement.
function detectCollision(direction) {
    raycaster.set(camera.position, direction);
    const intersects = raycaster.intersectObject(mapMesh, true);
    return intersects.length > 0 && intersects[0].distance <= collisionDistance;
}
// END OF Collision Detection ------------------------------------------------------------------------------


// ENEMY-GHOST code -----------------------------------------------------------------------------------------------------
// Enemy setup
const ghostMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Red color for ghost
const ghostGeometry = new THREE.SphereGeometry(5, 16, 16); // ghost size and shape
const enemies = []; // Array to keep track of ghost enemies

// Define projectile material and geometry for enemies
const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green color for ghost projectiles
const projectileGeometry = new THREE.SphereGeometry(0.5, 8, 8); // Projectile size and shape

const ghostProjectiles = []; // Array to track ghost projectiles

function spawnGhost() {
    const spawnDistance = 150; // distance from the player to spawn enemies
    const spawnHeightraycastAboveGrnd = 100; // Height from which to cast the ray downward
    const minHeight = 5; // Minimum height above the at which enemies can spawn
    const maxSpawnHeight = 20; // Maximum height at which enemies can spawn above their raycast hit point

    const angle = Math.random() * Math.PI * 2; // Random angle for direction
    const distance = Math.random() * spawnDistance; // Randomize the distance for variability

    // Calculate a spawn point in the air above the map, within a circular area around the player
    const spawnPoint = new THREE.Vector3(
        camera.position.x + Math.cos(angle) * distance,
        camera.position.y + spawnHeightraycastAboveGrnd,
        camera.position.z + Math.sin(angle) * distance
    );

    // Raycast downward to find the map and ensure the ghost spawns on it
    const raycaster = new THREE.Raycaster(spawnPoint, new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObject(mapMesh);

    // If there's an intersection, place the ghost at a random height between minHeight and maxSpawnHeight above the
    if (intersects.length > 0) {
        const ghost = new THREE.Mesh(ghostGeometry, ghostMaterial);
        const randomHeight = Math.random() * (maxSpawnHeight - minHeight) + minHeight;
        ghost.position.copy(intersects[0].point);
        ghost.position.y += randomHeight; // Randomize height at which ghost spawns
        scene.add(ghost);
        enemies.push(ghost);
    } else {
        console.warn("No suitable spawn point found for ghost.");
    }
}

function fireProjectile(ghost) {
    ghostProjectileShotSound.play(); // Play ghost shooting sound


    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectile.position.copy(ghost.position); // Start at ghost's position
    scene.add(projectile);

    // Calculate velocity vector from ghost to player
    const direction = new THREE.Vector3().subVectors(camera.position, ghost.position).normalize();
    projectile.velocity = direction.multiplyScalar(0.5); // Set speed of projectile
    ghostProjectiles.push(projectile);
} 

// Function to update enemy projectiles' positions and check for collisions
function updateGhostProjectiles() {
    for (let i = ghostProjectiles.length - 1; i >= 0; i--) {
        const projectile = ghostProjectiles[i];
        projectile.position.add(projectile.velocity);

        // Check for collision with environment
        let raycaster = new THREE.Raycaster();
        raycaster.set(projectile.position, projectile.velocity.normalize());
        let intersectsEnvironment = raycaster.intersectObject(mapMesh, true);

        if (intersectsEnvironment.length > 0 && intersectsEnvironment[0].distance <= projectile.velocity.length()) {
            // Environment hit
            createParticleEffect(intersectsEnvironment[0].point); // Visual effect at collision

            // Immediate removal
            scene.remove(projectile);
            ghostProjectiles.splice(i, 1); // Remove projectile from the array
            continue; // Skip further processing for this projectile
        }

        // Function to update health bar
        function updateHealthBar(health) {
            const healthBar = document.getElementById('healthBar');
            healthBar.style.width = `${health}%`;
            healthBar.innerText = health; // Update the text inside the health bar

            // dynamically change color based on health
            if (health > 50) {
                healthBar.style.bacColor = '#4CAF50'; // Green
            } else if (health > 25) {
                healthBar.style.bacColor = '#FF8C00'; // Orange
            } else {
                healthBar.style.bacColor = '#FF4444'; // Red
            }
        }


        // Collision detection code to reduce health
        if (projectile.position.distanceTo(camera.position) < 1) {
            console.log('Player hit by ghost projectile!');
            // Trigger the red tint effect
            const hitTint = document.getElementById('hitTint');
            hitTint.style.display = 'block'; // Show the tint
            setTimeout(() => {
                hitTint.style.display = 'none'; // Hide the tint after 500ms
            }, 500);

            // Reduce player health by 10
            playerHealth -= 10;
            updateHealthBar(playerHealth); // Update the health bar

            scene.remove(projectile);
            ghostProjectiles.splice(i, 1); // Remove projectile from the array
        }


        if (playerHealth <= 0 && isGameRunning) { // player death
            isGameRunning = false;
            document.getElementById('mainMenu').style.display = 'flex'; // Show the main menu
        }
    }
}

// Periodically call fireProjectile for each ghost
function enableGhostShooting() {
  setInterval(() => {
    enemies.forEach(ghost => {
      fireProjectile(ghost);
    });
  }, 1200); // Ghosts shoot every 1.2 seconds
}

// Function to move ghost towards player in a zigzag pattern and oscillate vertically when close
function moveGhost() {
    const stopDistance = 50; // Distance at which enemies should start oscillating vertically instead of moving closer
    const zigzagFrequency = 5; // Frequency of zigzag movement
    const zigzagMagnitude = 10; // Magnitude of zigzag movement
    const verticalOscillationFrequency = 5; // Frequency of vertical oscillation
    const verticalOscillationMagnitude = 4; // Magnitude of vertical oscillation

    enemies.forEach(ghost => {
        const direction = new THREE.Vector3().subVectors(camera.position, ghost.position);
        const distance = direction.length();

        // Normalize direction vector
        direction.normalize();

        if (distance > stopDistance) {
            // Apply a sine wave to create a zigzag pattern in horizontal plane
            const zigzagEffect = new THREE.Vector3().copy(direction).cross(new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(Math.sin(Date.now() * 0.001 * zigzagFrequency) * zigzagMagnitude);

            // Combine zigzag effect with direct movement towards player
            direction.add(zigzagEffect);
            direction.normalize().multiplyScalar(0.5); // Control speed of movement

            // Update ghost's position
            ghost.position.add(direction);

        } else {
            // When within stop distance, oscillate vertically
            const verticalOscillation = Math.sin(Date.now() * 0.001 * verticalOscillationFrequency) * verticalOscillationMagnitude;
            const potentialNewY = ghost.position.y + verticalOscillation * 0.1; // Calculate potential new y-position

            // Ensure ghost doesnt go lower than player's ground level
            if (potentialNewY < camera.position.y) {
                ghost.position.y = camera.position.y;
            } else {
                ghost.position.y = potentialNewY;
            }
        }

        // Make the ghost face the player (for when a enemy is designed)
        ghost.lookAt(camera.position);
    });
}

function updateGhostSoundVolume() {
    let nearestDistance = Infinity;
    enemies.forEach(ghost => {
        const distance = camera.position.distanceTo(ghost.position);
        if (distance < nearestDistance) {
            nearestDistance = distance;
        }
    });

    // Define a maximum distance at which the sound is heard and adjust volume based on proximity
    const maxDistance = 50;

    // Set a lower maximum volume for the ghost sound
    const maxVolume = 0.3;

    if (nearestDistance <= maxDistance) {
        // Calculate volume based on distance
        const volume = Math.max(0, maxVolume * (1 - nearestDistance / maxDistance));
        ghostSound.volume(volume);
    } else {
        // If no ghost is within the maxDistance, set volume to 0
        ghostSound.volume(0);
    }
}

// Call function to start the ghost shooting mechanism
enableGhostShooting();

// Start spawning ghost enemy
setInterval(spawnGhost, 4000); // Spawn ghost every 5 seconds
// END OF ENEMY-GHOST code -----------------------------------------------------------------------------------------------------

// ENEMY-CUBE code -----------------------------------------------------------------------------------------------------
const cubeEnemyMaterial = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
const cubeEnemyGeometry = new THREE.BoxGeometry(5, 10, 5); // cube enemy scale
const moveInterval = 800; // Time in milliseconds
const moveDistance = 10; // Distance each cube moves per step

function spawnCubeEnemy() {
    const spawnDistance = 200; // Max spawn distance from player cube
    const raycastAboveGrnd = 50; // raycast for cube enemy

    const angle = Math.random() * Math.PI * 2; // Random angle
    const distance = Math.random() * spawnDistance; // Random distance within the spawn range

    const spawnPoint = new THREE.Vector3(
        Math.cos(angle) * distance + camera.position.x,
        camera.position.y + raycastAboveGrnd, // Start above for raycasting
        Math.sin(angle) * distance + camera.position.z
    );

    const raycaster = new THREE.Raycaster(spawnPoint, new THREE.Vector3(0, -1, 0));
    const intersects = raycaster.intersectObject(mapMesh);

    if (intersects.length > 0) {
        const cubeEnemy = new THREE.Mesh(cubeEnemyGeometry, cubeEnemyMaterial);
        cubeEnemy.position.set(intersects[0].point.x, -2.5, intersects[0].point.z); // Set cube on ground
        cubeEnemy.lastMoveTime = Date.now(); // Track last move time for movement control
        cube.push(cubeEnemy);
        scene.add(cubeEnemy);
    }
}

function moveCube() {
    cube.forEach(cubeEnemy => {
        if (Date.now() - cubeEnemy.lastMoveTime >= moveInterval) {
            const moveDirection = Math.floor(Math.random() * 3); // radnomize so '0=left', '1=towards player', '2=right'
            let moveVector;

            switch (moveDirection) {
                case 0: // Move left
                    moveVector = new THREE.Vector3(-moveDistance, 0, 0);
                    break;
                case 1: // Move to player
                    const directionToPlayer = new THREE.Vector2(camera.position.x - cubeEnemy.position.x, camera.position.z - cubeEnemy.position.z).normalize();
                    moveVector = new THREE.Vector3(directionToPlayer.x * moveDistance, 0, directionToPlayer.y * moveDistance);
                    break;
                case 2: // Move right
                    moveVector = new THREE.Vector3(moveDistance, 0, 0);
                    break;
            }

            cubeEnemy.position.add(moveVector);
            cubeEnemy.position.y = -4.5; // Ensure cube enemy stays on player lvl
            cubeEnemy.lastMoveTime = Date.now(); // Update last move time
        }
    });
}

// Call `spawnCubeEnemy` at a fixed interval
setInterval(spawnCubeEnemy, 2000);
// ENEMY-cubeEnemy code -----------------------------------------------------------------------------------------------------


// PLAY GAME/UI code -----------------------------------------------------------------------------------------------------
document.getElementById('playButton').addEventListener('click', function() {
    document.getElementById('mainMenu').style.display = 'none'; // Hide main menu
    isGameRunning = true;
    playerHealth = 100; // Reset player health
    updateHealthBar(playerHealth); // Update health bar
    // Reset or initialize game state here
});

function showMainMenu() {
    isGameRunning = false; // Stop game loop from running game logic
    document.getElementById('mainMenu').style.display = 'flex'; // Show main menu
    location.reload(); // This reloads page, resetting game state completely
}

let bestScore = localStorage.getItem('bestScore') ? parseInt(localStorage.getItem('bestScore'), 10) : 0;
document.getElementById('bestScore').innerText = `Best Score: ${bestScore.toString().padStart(3, '0')}`;

// Function to update score display
function updateScore(score) {
    playerScore = score;
    document.getElementById('scoreContainer').innerText = `Score: ${playerScore.toString().padStart(3, '0')}`;
    
    // Check if current score is higher than best score then updates
    if (playerScore > bestScore) {
        bestScore = playerScore;
        localStorage.setItem('bestScore', bestScore);
        document.getElementById('bestScore').innerText = `Best Score: ${bestScore.toString().padStart(3, '0')}`;
    }
}

// Game loop ends for when the player health goes to 0
if (playerHealth <= 0 && isGameRunning) {
    isGameRunning = false;
    document.getElementById('mainMenu').style.display = 'flex'; // Re-display main menu
    updateScore(playerScore); // Updates the score if needed
} 

// Initialize score at game start
updateScore(0);
// PLAY GAME/UI code -----------------------------------------------------------------------------------------------------


// ANIMATION LOOP code -------------------------------------------------------------------------------------------------
// Loop updates scene for each frame.
function animate() {
    requestAnimationFrame(animate);

    // Only runs game logic if the game is running
    if (isGameRunning) {
        // game logic
        updatePlayerPosition();
        updateBullets();
        updateGhostProjectiles();
        moveGhost();
        moveCube();
        updateGhostSoundVolume();

        // Checks players health within animation loop
        if (playerHealth <= 0) {
            showMainMenu(); // Shows main menu and resets game variables
        }

        // Renders scene
        renderer.render(scene, camera);
    }
}

  animate(); // Start animation
// END OF ANIMATION LOOP code ------------------------------------------------------------------------------------------