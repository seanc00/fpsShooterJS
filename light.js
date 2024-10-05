import * as THREE from 'three';

export function setupLights(scene) {
  const directionalLight = new THREE.DirectionalLight(0xffffff, 2); 
  directionalLight.position.set(50, 100, 200);
  scene.add(directionalLight);

  // Ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
}
