// PLANE code -----------------------------------------------------------------------------------------------------------
import * as THREE from 'three';

export function addPlaneToScene(scene) {
  const textureLoader = new THREE.TextureLoader(); // Load floor texture 
  const texture = textureLoader.load('assets/textures/lavaFloor.png', function (tex) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(200, 200);
  });

  const planeGeometry = new THREE.PlaneGeometry(1600, 1600, 32, 32);
  const planeMaterial = new THREE.MeshBasicMaterial({
    map: texture, // Applies texture
    side: THREE.DoubleSide
  });
  planeGeometry.rotateX(-Math.PI / 2); // Code to make plane flat
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.position.y = -5; // Lowers plane

  scene.add(plane);
}
// END OF PLANE code ----------------------------------------------------------------------------------------------------

// SKYBOX code -----------------------------------------------------------------------------------------------------------
export function addSkyboxToScene(scene) {
  const loader = new THREE.CubeTextureLoader();
  const textureCube = loader.load([
      'assets/textures/skyboxL.png', 
      'assets/textures/skyboxR.png',  
      'assets/textures/skyboxT.png',    
      'assets/textures/skyboxB.png', 
      'assets/textures/skyboxFr.png',  
      'assets/textures/skyboxBa.png'  
  ]);

  scene.background = textureCube;
}
// END OF SKYBOX code ----------------------------------------------------------------------------------------------------