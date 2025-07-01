import * as THREE from 'three';

// Tipos básicos
interface HouseObjects {
  door: THREE.Mesh;
  window1: THREE.Mesh;
  window2: THREE.Mesh;
  window3: THREE.Mesh;
}

interface States {
  doorOpen: boolean;
  window1Open: boolean;
  window2Open: boolean;
  window3Open: boolean;
}

// Variables globales
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let house: HouseObjects;

const states: States = {
  doorOpen: false,
  window1Open: false,
  window2Open: false,
  window3Open: false
};

// Controles de cámara
let mouseDown = false;
let mouseX = 0;
let mouseY = 0;

// Inicializar
init();
animate();

function init(): void {
  // Crear escena
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);

  // Crear cámara
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(15, 10, 15);
  camera.lookAt(0, 0, 0);

  // Crear renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Raycaster para clics
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Crear luces
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(20, 20, 20);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // Crear casa
  createHouse();

  // Crear suelo
  const groundGeometry = new THREE.PlaneGeometry(30, 30);
  const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Event listeners
  setupEvents();
}

function createHouse(): void {
  // Materiales
  const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xF4A460 });
  const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
  const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
  const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x4169E1 });

  // Paredes
  const wallGeometry = new THREE.BoxGeometry(8, 6, 0.2);
  
  // Pared frontal
  const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
  frontWall.position.set(0, 3, 4);
  frontWall.castShadow = true;
  scene.add(frontWall);

  // Pared trasera
  const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
  backWall.position.set(0, 3, -4);
  backWall.castShadow = true;
  scene.add(backWall);

  // Paredes laterales
  const sideWallGeometry = new THREE.BoxGeometry(0.2, 6, 8);
  
  const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
  leftWall.position.set(-4, 3, 0);
  leftWall.castShadow = true;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
  rightWall.position.set(4, 3, 0);
  rightWall.castShadow = true;
  scene.add(rightWall);

  // Techo
  const roofGeometry = new THREE.ConeGeometry(6, 3, 4);
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.set(0, 7.5, 0);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  scene.add(roof);

  // Puerta
  const doorGeometry = new THREE.BoxGeometry(1.5, 4, 0.1);
  house = {} as HouseObjects;
  house.door = new THREE.Mesh(doorGeometry, doorMaterial);
  house.door.position.set(-1.5, 2, 4.1);
  house.door.userData = { type: 'door' };
  house.door.castShadow = true;
  scene.add(house.door);

  // Ventanas
  const windowGeometry = new THREE.BoxGeometry(1.2, 1.2, 0.1);
  
  house.window1 = new THREE.Mesh(windowGeometry, windowMaterial);
  house.window1.position.set(1.5, 4, 4.1);
  house.window1.userData = { type: 'window1' };
  house.window1.castShadow = true;
  scene.add(house.window1);

  house.window2 = new THREE.Mesh(windowGeometry, windowMaterial);
  house.window2.position.set(-4.1, 4, 1);
  house.window2.rotation.y = Math.PI / 2;
  house.window2.userData = { type: 'window2' };
  house.window2.castShadow = true;
  scene.add(house.window2);

  house.window3 = new THREE.Mesh(windowGeometry, windowMaterial);
  house.window3.position.set(4.1, 4, -1);
  house.window3.rotation.y = -Math.PI / 2;
  house.window3.userData = { type: 'window3' };
  house.window3.castShadow = true;
  scene.add(house.window3);
}

function setupEvents(): void {
  // Click para abrir/cerrar
  renderer.domElement.addEventListener('click', onClick);
  
  // Controles de cámara
  renderer.domElement.addEventListener('mousedown', onMouseDown);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('mouseup', onMouseUp);
  renderer.domElement.addEventListener('wheel', onWheel);
  
  // Resize
  window.addEventListener('resize', onResize);
  
  // Prevenir menú contextual
  document.addEventListener('contextmenu', e => e.preventDefault());
}

function onClick(event: MouseEvent): void {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects([
    house.door, house.window1, house.window2, house.window3
  ]);

  if (intersects.length > 0) {
    const object = intersects[0].object as THREE.Mesh;
    const type = object.userData.type as keyof States;
    
    // Cambiar estado
    states[`${type}Open` as keyof States] = !states[`${type}Open` as keyof States];
    
    // Animar
    animateObject(object, type);
  }
}

function animateObject(object: THREE.Mesh, type: string): void {
  const isOpen = states[`${type}Open` as keyof States];
  const targetRotation = isOpen ? (type === 'door' ? -Math.PI / 2 : Math.PI / 2) : 0;
  const axis = type === 'door' ? 'y' : 'x';
  
  animateRotation(object, object.rotation[axis], targetRotation, 800, axis);
}

function animateRotation(
  object: THREE.Object3D, 
  start: number, 
  end: number, 
  duration: number, 
  axis: 'x' | 'y' | 'z'
): void {
  const startTime = Date.now();
  
  function update(): void {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);
    
    object.rotation[axis] = start + (end - start) * eased;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  update();
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

// Controles de cámara
function onMouseDown(event: MouseEvent): void {
  if (event.button === 0) {
    mouseDown = true;
    mouseX = event.clientX;
    mouseY = event.clientY;
  }
}

function onMouseMove(event: MouseEvent): void {
  if (mouseDown) {
    const deltaX = event.clientX - mouseX;
    const deltaY = event.clientY - mouseY;
    
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(camera.position);
    spherical.theta -= deltaX * 0.01;
    spherical.phi += deltaY * 0.01;
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
    
    camera.position.setFromSpherical(spherical);
    camera.lookAt(0, 0, 0);
    
    mouseX = event.clientX;
    mouseY = event.clientY;
  }
}

function onMouseUp(): void {
  mouseDown = false;
}

function onWheel(event: WheelEvent): void {
  const distance = camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
  const newDistance = Math.max(5, Math.min(30, distance + event.deltaY * 0.01));
  
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  camera.position.copy(direction.multiplyScalar(-newDistance));
  camera.lookAt(0, 0, 0);
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}