import * as THREE from 'three';

// Tipos
interface Planet {
  mesh: THREE.Mesh;
  orbit: THREE.Group;
  angle: number;
  speed: number;
  distance: number;
  name: string;
  description: string;
}

// Variables globales
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let raycaster: THREE.Raycaster;
let mouse: THREE.Vector2;
let planets: Planet[] = [];
let sun: THREE.Mesh;
let speedMultiplier = 1.0;
let followTarget: THREE.Object3D | null = null;
let comets: THREE.Group[] = [];
let asteroids: THREE.Points;
let sunParticles: THREE.Points;
let planetClicks: Map<string, number> = new Map();
let explosions: THREE.Group[] = [];
let textureLoader: THREE.TextureLoader;
let nebula: THREE.Mesh;
let trailSystems: Map<string, THREE.Points[]> = new Map();
let moons: THREE.Group[] = [];

// Datos de planetas
const planetData = [
  { name: "Mercurio", size: 0.4, distance: 6, speed: 0.047, color: 0x8C7853, desc: "El planeta más cercano al Sol" },
  { name: "Venus", size: 0.6, distance: 8, speed: 0.035, color: 0xFFC649, desc: "El planeta más caliente" },
  { name: "Tierra", size: 0.7, distance: 10, speed: 0.030, color: 0x6B93D6, desc: "Nuestro hogar azul" },
  { name: "Marte", size: 0.5, distance: 12, speed: 0.024, color: 0xCD5C5C, desc: "El planeta rojo" },
  { name: "Júpiter", size: 1.5, distance: 16, speed: 0.013, color: 0xD8CA9D, desc: "El gigante gaseoso" },
  { name: "Saturno", size: 1.2, distance: 20, speed: 0.009, color: 0xFAD5A5, desc: "El de los anillos" },
  { name: "Urano", size: 0.9, distance: 24, speed: 0.006, color: 0x4FD0E7, desc: "El gigante de hielo" },
  { name: "Neptuno", size: 0.8, distance: 28, speed: 0.005, color: 0x4B70DD, desc: "El planeta azul lejano" }
];

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

  // Crear cámara
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 20, 40);
  camera.lookAt(0, 0, 0);

  // Crear renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Raycaster
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Texture loader
  textureLoader = new THREE.TextureLoader();

  // Crear estrellas
  createStars();
  
  // Crear nebulosa de fondo
  createNebula();
  
  // Crear sol
  createSun();
  
  // Crear planetas
  createPlanets();
  
  // Crear cometas y asteroides
  createComets();
  createAsteroidBelt();
  createSunParticles();
  
  // Event listeners
  setupEvents();
  
  // Control de velocidad
  setupSpeedControl();
}

function createStars(): void {
  const starGeometry = new THREE.BufferGeometry();
  
  // Crear diferentes tipos de estrellas con parpadeo
  const starVertices: number[] = [];
  const starColors: number[] = [];
  const starSizes: number[] = [];
  const starOpacities: number[] = [];
  
  for (let i = 0; i < 10000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    starVertices.push(x, y, z);
    
    // Colores variados para las estrellas
    const starType = Math.random();
    if (starType < 0.6) {
      starColors.push(1, 1, 1); // Blancas
    } else if (starType < 0.75) {
      starColors.push(1, 0.9, 0.7); // Amarillas
    } else if (starType < 0.9) {
      starColors.push(0.9, 0.9, 1); // Azules
    } else if (starType < 0.95) {
      starColors.push(1, 0.7, 0.7); // Rojas
    } else {
      starColors.push(1, 0.5, 1); // Púrpuras (estrellas especiales)
    }
    
    // Tamaños y opacidades variados
    starSizes.push(Math.random() * 4 + 1);
    starOpacities.push(Math.random() * 0.5 + 0.5);
  }
  
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
  starGeometry.setAttribute('opacity', new THREE.Float32BufferAttribute(starOpacities, 1));
  
  const starMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }
    },
    vertexShader: `
      attribute float size;
      attribute float opacity;
      varying vec3 vColor;
      varying float vOpacity;
      uniform float time;
      
      void main() {
        vColor = color;
        vOpacity = opacity * (0.8 + 0.2 * sin(time * 2.0 + position.x * 0.01));
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vOpacity;
      
      void main() {
        float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
        float opacity = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
        gl_FragColor = vec4(vColor, opacity * vOpacity);
      }
    `,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending
  });
  
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
  scene.userData.starMaterial = starMaterial; // Para animar
}

function createNebula(): void {
  const nebulaGeometry = new THREE.PlaneGeometry(1000, 1000);
  const nebulaTexture = createNebulaTexture();
  
  const nebulaMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      texture: { value: nebulaTexture }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform sampler2D texture;
      varying vec2 vUv;
      
      void main() {
        vec2 uv = vUv + vec2(sin(time * 0.1) * 0.01, cos(time * 0.1) * 0.01);
        vec4 nebulaColor = texture2D(texture, uv);
        nebulaColor.a *= 0.3;
        gl_FragColor = nebulaColor;
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  
  nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
  nebula.position.z = -800;
  scene.add(nebula);
  scene.userData.nebulaMaterial = nebulaMaterial; // Para animar
}

function createNebulaTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext('2d')!;
  
  // Crear gradiente de nebulosa
  const gradient1 = context.createRadialGradient(200, 200, 0, 200, 200, 400);
  gradient1.addColorStop(0, 'rgba(255, 100, 255, 0.8)');
  gradient1.addColorStop(0.5, 'rgba(100, 150, 255, 0.4)');
  gradient1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  context.fillStyle = gradient1;
  context.fillRect(0, 0, 1024, 1024);
  
  const gradient2 = context.createRadialGradient(800, 800, 0, 800, 800, 300);
  gradient2.addColorStop(0, 'rgba(255, 200, 100, 0.6)');
  gradient2.addColorStop(0.5, 'rgba(255, 100, 150, 0.3)');
  gradient2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  
  context.fillStyle = gradient2;
  context.fillRect(0, 0, 1024, 1024);
  
  // Agregar "polvo estelar"
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const radius = Math.random() * 30 + 5;
    
    const dustGradient = context.createRadialGradient(x, y, 0, x, y, radius);
    dustGradient.addColorStop(0, 'rgba(200, 200, 255, 0.3)');
    dustGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    context.fillStyle = dustGradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  
  return new THREE.CanvasTexture(canvas);
}

function getAllMoons(): THREE.Mesh[] {
  const allMoons: THREE.Mesh[] = [];
  moons.forEach(moonOrbit => {
    moonOrbit.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        allMoons.push(child);
      }
    });
  });
  return allMoons;
}

function createAurora(earthMesh: THREE.Mesh): void {
  // Aurora boreal en el polo norte
  const auroraGeometry = new THREE.RingGeometry(0.8, 1.1, 32);
  const auroraMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      
      void main() {
        float wave = sin(vUv.x * 10.0 + time * 3.0) * 0.5 + 0.5;
        float wave2 = sin(vUv.y * 8.0 + time * 2.0) * 0.3 + 0.7;
        vec3 green = vec3(0.2, 1.0, 0.3);
        vec3 blue = vec3(0.3, 0.7, 1.0);
        vec3 color = mix(green, blue, wave);
        float alpha = wave * wave2 * 0.6;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  
  const aurora = new THREE.Mesh(auroraGeometry, auroraMaterial);
  aurora.position.y = 0.6;
  aurora.rotation.x = -Math.PI / 2;
  earthMesh.add(aurora);
  earthMesh.userData.aurora = auroraMaterial;
}

function initializeTrail(planetName: string, planetMesh: THREE.Mesh): void {
  const trailPoints: THREE.Points[] = [];
  trailSystems.set(planetName, trailPoints);
  
  // Crear varios segmentos de rastro
  for (let i = 0; i < 20; i++) {
    const trailGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(3);
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const trailMaterial = new THREE.PointsMaterial({
      color: planetData.find(p => p.name === planetName)?.color || 0xFFFFFF,
      size: 2,
      transparent: true,
      opacity: (20 - i) / 20 * 0.5,
      sizeAttenuation: false
    });
    
    const trail = new THREE.Points(trailGeometry, trailMaterial);
    scene.add(trail);
    trailPoints.push(trail);
  }
}

function createSun(): void {
  const sunGeometry = new THREE.SphereGeometry(2, 64, 64);
  
  // Crear textura procedural para el sol
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  
  // Gradiente radial para el sol
  const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, '#FFD700');
  gradient.addColorStop(0.3, '#FFA500');
  gradient.addColorStop(0.6, '#FF6347');
  gradient.addColorStop(1, '#FF4500');
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);
  
  // Agregar manchas solares
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const radius = Math.random() * 30 + 10;
    
    const spotGradient = context.createRadialGradient(x, y, 0, x, y, radius);
    spotGradient.addColorStop(0, '#8B0000');
    spotGradient.addColorStop(1, 'transparent');
    
    context.fillStyle = spotGradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  
  const sunTexture = new THREE.CanvasTexture(canvas);
  const sunMaterial = new THREE.MeshBasicMaterial({ 
    map: sunTexture
  });
  
  sun = new THREE.Mesh(sunGeometry, sunMaterial);
  sun.userData = { name: "Sol", description: "Nuestra estrella, el centro del sistema solar" };
  scene.add(sun);

  // Crear corona solar mejorada
  const coronaGeometry = new THREE.SphereGeometry(2.8, 32, 32);
  const coronaMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.5 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
        float glow = sin(time * 2.0) * 0.3 + 0.7;
        gl_FragColor = vec4(1.0, 0.7, 0.3, intensity * glow * 0.6);
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true
  });
  const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
  sun.add(corona);
  sun.userData.corona = coronaMaterial; // Guardar referencia para animar

  // Luces mejoradas
  const sunLight = new THREE.PointLight(0xFFFFFF, 3, 200);
  sunLight.position.set(0, 0, 0);
  sunLight.castShadow = true;
  scene.add(sunLight);

  const ambientLight = new THREE.AmbientLight(0x404040, 0.7);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
  directionalLight.position.set(10, 10, 5);
  scene.add(directionalLight);
}

function createPlanets(): void {
  // URLs de texturas reales de la NASA (simuladas con colores procedurales)
  const planetTextures = {
    "Mercurio": createPlanetTexture(0x8C7853, 0.3),
    "Venus": createPlanetTexture(0xFFC649, 0.8),
    "Tierra": createEarthTexture(),
    "Marte": createMarsTexture(),
    "Júpiter": createJupiterTexture(),
    "Saturno": createSaturnTexture(),
    "Urano": createPlanetTexture(0x4FD0E7, 0.4),
    "Neptuno": createPlanetTexture(0x4B70DD, 0.5)
  };

  planetData.forEach((data, index) => {
    // Crear órbita (grupo)
    const orbit = new THREE.Group();
    scene.add(orbit);

    // Crear planeta con textura
    const planetGeometry = new THREE.SphereGeometry(data.size, 32, 32);
    const planetTexture = planetTextures[data.name as keyof typeof planetTextures];
    const planetMaterial = new THREE.MeshLambertMaterial({ 
      map: planetTexture
    });
    const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
    
    planetMesh.position.x = data.distance;
    planetMesh.castShadow = true;
    planetMesh.receiveShadow = true;
    planetMesh.userData = { name: data.name, description: data.desc };
    
    orbit.add(planetMesh);

    // Crear órbita visual mejorada (más brillante)
    const orbitGeometry = new THREE.RingGeometry(data.distance - 0.02, data.distance + 0.02, 128);
    const orbitMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x888888, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    const orbitRing = new THREE.Mesh(orbitGeometry, orbitMaterial);
    orbitRing.rotation.x = -Math.PI / 2;
    scene.add(orbitRing);

    // Agregar a lista de planetas
    planets.push({
      mesh: planetMesh,
      orbit: orbit,
      angle: Math.random() * Math.PI * 2,
      speed: data.speed,
      distance: data.distance,
      name: data.name,
      description: data.desc
    });

    // Crear anillos mejorados para Saturno
    if (data.name === "Saturno") {
      const ringGeometry = new THREE.RingGeometry(data.size * 1.2, data.size * 2.2, 64);
      const ringTexture = createSaturnRingsTexture();
      const ringMaterial = new THREE.MeshLambertMaterial({ 
        map: ringTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
      });
      const rings = new THREE.Mesh(ringGeometry, ringMaterial);
      rings.rotation.x = -Math.PI / 2;
      planetMesh.add(rings);
    }

    // Agregar aurora boreal a la Tierra
    if (data.name === "Tierra") {
      createAurora(planetMesh);
    }

    // Agregar rastros de movimiento
    initializeTrail(data.name, planetMesh);

    // Crear lunas para planetas específicos
    if (data.name === "Tierra") {
      createEarthMoon(planetMesh);
    } else if (data.name === "Júpiter") {
      createJupiterMoons(planetMesh);
    } else if (data.name === "Saturno") {
      createSaturnMoons(planetMesh);
    } else if (data.name === "Marte") {
      createMarsMoons(planetMesh);
    }

    // Agregar atmósferas mejoradas
    if (data.name === "Tierra" || data.name === "Venus" || data.name === "Marte") {
      const atmosphereGeometry = new THREE.SphereGeometry(data.size * 1.05, 32, 32);
      const atmosphereMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          planetColor: { 
            value: data.name === "Tierra" ? new THREE.Color(0x87CEEB) : 
                   data.name === "Venus" ? new THREE.Color(0xFFA500) : 
                   new THREE.Color(0xCD5C5C)
          }
        },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform vec3 planetColor;
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
            float pulse = sin(time * 3.0) * 0.1 + 0.9;
            gl_FragColor = vec4(planetColor, intensity * pulse * 0.4);
          }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true
      });
      const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
      planetMesh.add(atmosphere);
      planetMesh.userData.atmosphere = atmosphereMaterial;
    }
  });
}

// Funciones para crear texturas procedurales realistas
function createPlanetTexture(baseColor: number, roughness: number): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  
  const r = (baseColor >> 16) & 255;
  const g = (baseColor >> 8) & 255;
  const b = baseColor & 255;
  
  context.fillStyle = `rgb(${r}, ${g}, ${b})`;
  context.fillRect(0, 0, 512, 512);
  
  // Agregar variaciones de color
  for (let i = 0; i < 100; i++) {
    const variation = Math.random() * roughness;
    const newR = Math.max(0, Math.min(255, r + (Math.random() - 0.5) * variation * 100));
    const newG = Math.max(0, Math.min(255, g + (Math.random() - 0.5) * variation * 100));
    const newB = Math.max(0, Math.min(255, b + (Math.random() - 0.5) * variation * 100));
    
    context.fillStyle = `rgb(${newR}, ${newG}, ${newB})`;
    context.beginPath();
    context.arc(Math.random() * 512, Math.random() * 512, Math.random() * 50 + 10, 0, Math.PI * 2);
    context.fill();
  }
  
  return new THREE.CanvasTexture(canvas);
}

function createEarthTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  
  // Océanos
  context.fillStyle = '#1e90ff';
  context.fillRect(0, 0, 512, 512);
  
  // Continentes
  context.fillStyle = '#228b22';
  for (let i = 0; i < 15; i++) {
    context.beginPath();
    context.arc(Math.random() * 512, Math.random() * 512, Math.random() * 80 + 30, 0, Math.PI * 2);
    context.fill();
  }
  
  // Nubes
  context.fillStyle = 'rgba(255, 255, 255, 0.3)';
  for (let i = 0; i < 30; i++) {
    context.beginPath();
    context.arc(Math.random() * 512, Math.random() * 512, Math.random() * 40 + 20, 0, Math.PI * 2);
    context.fill();
  }
  
  return new THREE.CanvasTexture(canvas);
}

function createMarsTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  
  context.fillStyle = '#cd5c5c';
  context.fillRect(0, 0, 512, 512);
  
  // Casquetes polares
  context.fillStyle = '#fffafa';
  context.beginPath();
  context.arc(256, 50, 80, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(256, 462, 60, 0, Math.PI * 2);
  context.fill();
  
  // Cañones y cráteres
  context.fillStyle = '#8b4513';
  for (let i = 0; i < 20; i++) {
    context.beginPath();
    context.arc(Math.random() * 512, Math.random() * 512, Math.random() * 30 + 10, 0, Math.PI * 2);
    context.fill();
  }
  
  return new THREE.CanvasTexture(canvas);
}

function createJupiterTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  
  // Bandas de Júpiter
  const colors = ['#d2b48c', '#daa520', '#b8860b', '#dab855'];
  const bandHeight = 512 / colors.length;
  
  colors.forEach((color, index) => {
    context.fillStyle = color;
    context.fillRect(0, index * bandHeight, 512, bandHeight);
  });
  
  // Gran Mancha Roja
  context.fillStyle = '#dc143c';
  context.beginPath();
  context.ellipse(300, 300, 50, 30, 0, 0, Math.PI * 2);
  context.fill();
  
  return new THREE.CanvasTexture(canvas);
}

function createSaturnTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  
  context.fillStyle = '#fad5a5';
  context.fillRect(0, 0, 512, 512);
  
  // Bandas suaves
  context.fillStyle = 'rgba(218, 165, 32, 0.3)';
  for (let i = 0; i < 512; i += 30) {
    context.fillRect(0, i, 512, 15);
  }
  
  return new THREE.CanvasTexture(canvas);
}

function createSaturnRingsTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  
  const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(0.3, '#c4a57b');
  gradient.addColorStop(0.5, '#deb887');
  gradient.addColorStop(0.7, '#c4a57b');
  gradient.addColorStop(0.9, '#8b7355');
  gradient.addColorStop(1, 'transparent');
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);
  
  return new THREE.CanvasTexture(canvas);
}

function createComets(): void {
  // Crear varios cometas mejorados
  for (let i = 0; i < 3; i++) {
    const cometGroup = new THREE.Group();
    
    // Núcleo del cometa más detallado
    const cometGeometry = new THREE.SphereGeometry(0.15, 12, 12);
    const cometTexture = createCometTexture();
    const cometMaterial = new THREE.MeshLambertMaterial({ map: cometTexture });
    const cometCore = new THREE.Mesh(cometGeometry, cometMaterial);
    
    // Cola del cometa mejorada con partículas
    const tailParticles = [];
    for (let j = 0; j < 50; j++) {
      const particleGeometry = new THREE.SphereGeometry(0.02, 4, 4);
      const particleMaterial = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color().setHSL(0.6, 0.8, 0.5 + Math.random() * 0.5),
        transparent: true, 
        opacity: 0.7 - (j / 50) * 0.6
      });
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      particle.position.z = -j * 0.1;
      particle.position.x = (Math.random() - 0.5) * 0.3;
      particle.position.y = (Math.random() - 0.5) * 0.3;
      tailParticles.push(particle);
      cometGroup.add(particle);
    }
    
    cometGroup.add(cometCore);
    cometGroup.userData.tailParticles = tailParticles;
    
    // Posición aleatoria
    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 20;
    cometGroup.position.x = Math.cos(angle) * distance;
    cometGroup.position.z = Math.sin(angle) * distance;
    cometGroup.position.y = (Math.random() - 0.5) * 10;
    
    // Rotación hacia el centro
    cometGroup.lookAt(0, 0, 0);
    
    scene.add(cometGroup);
    comets.push(cometGroup);
  }
}

function createCometTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d')!;
  
  // Base rocosa
  context.fillStyle = '#555555';
  context.fillRect(0, 0, 128, 128);
  
  // Agregar detalles rocosos
  for (let i = 0; i < 20; i++) {
    const shade = Math.random() * 100 + 50;
    context.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
    context.beginPath();
    context.arc(Math.random() * 128, Math.random() * 128, Math.random() * 10 + 2, 0, Math.PI * 2);
    context.fill();
  }
  
  return new THREE.CanvasTexture(canvas);
}

function createAsteroidBelt(): void {
  const asteroidGeometry = new THREE.BufferGeometry();
  
  // Crear diferentes tipos de asteroides
  const asteroidVertices: number[] = [];
  const asteroidColors: number[] = [];
  const asteroidSizes: number[] = [];
  
  for (let i = 0; i < 800; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 13 + Math.random() * 3; // Entre Marte y Júpiter
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const y = (Math.random() - 0.5) * 1.5;
    asteroidVertices.push(x, y, z);
    
    // Diferentes tipos de asteroides (tamaño fijo pequeño)
    const asteroidType = Math.random();
    if (asteroidType < 0.6) {
      // Asteroides rocosos (grises)
      asteroidColors.push(0.5, 0.5, 0.5);
      asteroidSizes.push(1); // No importa mucho ya que sizeAttenuation = false
    } else if (asteroidType < 0.8) {
      // Asteroides metálicos (plateados)
      asteroidColors.push(0.8, 0.8, 0.9);
      asteroidSizes.push(1);
    } else {
      // Asteroides ricos en carbono (oscuros)
      asteroidColors.push(0.3, 0.25, 0.2);
      asteroidSizes.push(1);
    }
  }
  
  asteroidGeometry.setAttribute('position', new THREE.Float32BufferAttribute(asteroidVertices, 3));
  asteroidGeometry.setAttribute('color', new THREE.Float32BufferAttribute(asteroidColors, 3));
  asteroidGeometry.setAttribute('size', new THREE.Float32BufferAttribute(asteroidSizes, 1));
  
  // Crear textura circular para que se vean redondos
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d')!;
  
  // Crear círculo con gradiente
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  
  const asteroidTexture = new THREE.CanvasTexture(canvas);
  
  const asteroidMaterial = new THREE.PointsMaterial({ 
    map: asteroidTexture,
    vertexColors: true,
    sizeAttenuation: false, // Esto hace que el tamaño sea absoluto
    transparent: true,
    opacity: 0.9,
    alphaTest: 0.1,
    size: 3 // Tamaño un poco más grande para que se vean bien
  });
  
  asteroids = new THREE.Points(asteroidGeometry, asteroidMaterial);
  scene.add(asteroids);
}

function createSunParticles(): void {
  const particleGeometry = new THREE.BufferGeometry();
  const particleMaterial = new THREE.PointsMaterial({
    color: 0xFFAA00,
    size: 0.1,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });

  const particleVertices: number[] = [];
  for (let i = 0; i < 1000; i++) {
    const radius = 3 + Math.random() * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    particleVertices.push(x, y, z);
  }

  particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particleVertices, 3));
  sunParticles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(sunParticles);
}

function setupEvents(): void {
  // Click para info
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

function setupSpeedControl(): void {
  const slider = document.getElementById('speedSlider') as HTMLInputElement;
  const display = document.getElementById('speedDisplay')!;
  
  slider.addEventListener('input', () => {
    speedMultiplier = parseFloat(slider.value);
    display.textContent = `${speedMultiplier.toFixed(1)}x`;
  });
}

function onClick(event: MouseEvent): void {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  
  const clickableObjects = [sun, ...planets.map(p => p.mesh), ...getAllMoons()];
  const intersects = raycaster.intersectObjects(clickableObjects);

  if (intersects.length > 0) {
    const object = intersects[0].object as THREE.Mesh;
    const planetName = object.userData.name;
    
    // Contar clicks en el planeta
    const currentClicks = planetClicks.get(planetName) || 0;
    planetClicks.set(planetName, currentClicks + 1);
    
    // Si es el tercer click, explotar
    if (currentClicks + 1 >= 3) {
      explodePlanet(object, planetName);
      planetClicks.set(planetName, 0); // Resetear contador
    } else {
      showPlanetInfo(object.userData.name, object.userData.description + ` (Clicks: ${currentClicks + 1}/3)`);
    }
  } else {
    hidePlanetInfo();
  }
}

function explodePlanet(planetMesh: THREE.Mesh, planetName: string): void {
  const planetPosition = new THREE.Vector3();
  planetMesh.getWorldPosition(planetPosition);
  
  // Crear explosión de partículas
  const explosionGroup = new THREE.Group();
  const particleCount = 50;
  
  for (let i = 0; i < particleCount; i++) {
    const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.5 ? 0xFF4500 : 0xFFD700
    });
    const particle = new THREE.Mesh(particleGeometry, particleMaterial);
    
    // Posición inicial en el planeta
    particle.position.copy(planetPosition);
    
    // Velocidad aleatoria
    particle.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      )
    };
    
    explosionGroup.add(particle);
  }
  
  scene.add(explosionGroup);
  explosions.push(explosionGroup);
  
  // Ocultar planeta temporalmente
  planetMesh.visible = false;
  
  // Mostrar mensaje de explosión
  showPlanetInfo("💥 EXPLOSIÓN!", `${planetName} ha explotado! Reaparecerá en 3 segundos...`);
  
  // Restaurar planeta después de 3 segundos
  setTimeout(() => {
    planetMesh.visible = true;
    scene.remove(explosionGroup);
    explosions = explosions.filter(exp => exp !== explosionGroup);
    hidePlanetInfo();
  }, 3000);
}

function showPlanetInfo(name: string, description: string): void {
  const infoDiv = document.getElementById('planet-info')!;
  const nameEl = document.getElementById('planet-name')!;
  const descEl = document.getElementById('planet-description')!;
  
  nameEl.textContent = name;
  descEl.textContent = description;
  infoDiv.style.display = 'block';
}

function hidePlanetInfo(): void {
  const infoDiv = document.getElementById('planet-info')!;
  infoDiv.style.display = 'none';
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
    
    if (!followTarget) {
      camera.lookAt(0, 0, 0);
    }
    
    mouseX = event.clientX;
    mouseY = event.clientY;
  }
}

function onMouseUp(): void {
  mouseDown = false;
}

function onWheel(event: WheelEvent): void {
  const distance = camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
  const newDistance = Math.max(10, Math.min(100, distance + event.deltaY * 0.01));
  
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  camera.position.copy(direction.multiplyScalar(-newDistance));
  
  if (!followTarget) {
    camera.lookAt(0, 0, 0);
  }
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Funciones globales para botones
declare global {
  interface Window {
    resetView: () => void;
    followEarth: () => void;
  }
}

window.resetView = () => {
  followTarget = null;
  camera.position.set(0, 20, 40);
  camera.lookAt(0, 0, 0);
};

window.followEarth = () => {
  const earth = planets.find(p => p.name === "Tierra");
  if (earth) {
    followTarget = earth.mesh;
  }
};

function animate(): void {
  requestAnimationFrame(animate);

  // Rotar sol
  sun.rotation.y += 0.01 * speedMultiplier;

  // Mover planetas
  planets.forEach(planet => {
    planet.angle += planet.speed * speedMultiplier;
    planet.orbit.rotation.y = planet.angle;
    
    // Rotar planeta sobre su eje
    planet.mesh.rotation.y += 0.02 * speedMultiplier;
  });

  // Animar lunas
  moons.forEach(moon => {
    if (moon.userData.speed) {
      moon.rotation.y += moon.userData.speed * speedMultiplier;
    }
    
    // Rotar las lunas sobre su propio eje
    moon.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        child.rotation.y += 0.03 * speedMultiplier;
      }
    });
  });

  // Rotar cinturón de asteroides
  if (asteroids) {
    asteroids.rotation.y += 0.003 * speedMultiplier;
  }

  // Animar partículas del sol
  if (sunParticles) {
    sunParticles.rotation.y += 0.01 * speedMultiplier;
    sunParticles.rotation.x += 0.005 * speedMultiplier;
  }

  // Animar corona del sol
  if (sun.userData.corona) {
    sun.userData.corona.uniforms.time.value += 0.02 * speedMultiplier;
  }

  // Animar atmósferas planetarias
  planets.forEach(planet => {
    if (planet.mesh.userData.atmosphere) {
      planet.mesh.userData.atmosphere.uniforms.time.value += 0.01 * speedMultiplier;
    }
    
    // Animar aurora de la Tierra
    if (planet.name === "Tierra" && planet.mesh.userData.aurora) {
      planet.mesh.userData.aurora.uniforms.time.value += 0.02 * speedMultiplier;
    }
    
    // Actualizar rastros de movimiento cuando la velocidad es alta
    if (speedMultiplier > 1.5) {
      updateTrail(planet.name, planet.mesh);
    }
  });

  // Animar estrellas que parpadean
  if (scene.userData.starMaterial) {
    scene.userData.starMaterial.uniforms.time.value += 0.01;
  }

  // Animar nebulosa de fondo
  if (scene.userData.nebulaMaterial) {
    scene.userData.nebulaMaterial.uniforms.time.value += 0.005;
  }

  // Mover cometas con cola de partículas
  comets.forEach((comet, index) => {
    comet.rotation.y += (0.005 + index * 0.002) * speedMultiplier;
    comet.position.y = Math.sin(Date.now() * 0.001 + index) * 2;
    
    // Animar partículas de la cola
    if (comet.userData.tailParticles) {
      comet.userData.tailParticles.forEach((particle: THREE.Mesh, pIndex: number) => {
        particle.position.x += Math.sin(Date.now() * 0.003 + pIndex) * 0.01;
        particle.position.y += Math.cos(Date.now() * 0.002 + pIndex) * 0.01;
      });
    }
  });

  // Animar explosiones
  explosions.forEach(explosion => {
    explosion.children.forEach(particle => {
      if (particle.userData.velocity) {
        particle.position.add(particle.userData.velocity);
        particle.userData.velocity.multiplyScalar(0.98); // Fricción
      }
    });
  });

  // Seguir objetivo si está seleccionado
  if (followTarget) {
    const worldPosition = new THREE.Vector3();
    followTarget.getWorldPosition(worldPosition);
    camera.lookAt(worldPosition);
  }

  renderer.render(scene, camera);
}

function updateTrail(planetName: string, planetMesh: THREE.Mesh): void {
  const trails = trailSystems.get(planetName);
  if (!trails) return;
  
  const worldPosition = new THREE.Vector3();
  planetMesh.getWorldPosition(worldPosition);
  
  // Mover cada segmento del rastro
  for (let i = trails.length - 1; i > 0; i--) {
    const currentPos = trails[i - 1].geometry.attributes.position.array;
    trails[i].geometry.attributes.position.array.set(currentPos);
    trails[i].geometry.attributes.position.needsUpdate = true;
  }
  
  // Actualizar la primera posición con la posición actual del planeta
  if (trails[0]) {
    const positions = trails[0].geometry.attributes.position.array as Float32Array;
    positions[0] = worldPosition.x;
    positions[1] = worldPosition.y;
    positions[2] = worldPosition.z;
    trails[0].geometry.attributes.position.needsUpdate = true;
  }
}

function createEarthMoon(earthMesh: THREE.Mesh): void {
  const moonOrbit = new THREE.Group();
  earthMesh.add(moonOrbit);
  
  // La Luna
  const moonGeometry = new THREE.SphereGeometry(0.15, 16, 16);
  const moonTexture = createMoonTexture();
  const moonMaterial = new THREE.MeshLambertMaterial({ map: moonTexture });
  const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
  
  moonMesh.position.x = 1.2; // Distancia de la Tierra
  moonMesh.castShadow = true;
  moonMesh.receiveShadow = true;
  moonMesh.userData = { name: "Luna", description: "El único satélite natural de la Tierra" };
  
  moonOrbit.add(moonMesh);
  
  moons.push(moonOrbit);
  moonOrbit.userData = { speed: 0.1, name: "Luna" };
}

function createJupiterMoons(jupiterMesh: THREE.Mesh): void {
  const jupiterMoonsData = [
    { name: "Ío", size: 0.08, distance: 2.2, speed: 0.15, color: 0xFFFF99 },
    { name: "Europa", size: 0.07, distance: 2.6, speed: 0.12, color: 0xCCCCFF },
    { name: "Ganímedes", size: 0.1, distance: 3.0, speed: 0.09, color: 0x999999 },
    { name: "Calisto", size: 0.09, distance: 3.5, speed: 0.07, color: 0x666666 }
  ];
  
  jupiterMoonsData.forEach(moonData => {
    const moonOrbit = new THREE.Group();
    jupiterMesh.add(moonOrbit);
    
    const moonGeometry = new THREE.SphereGeometry(moonData.size, 12, 12);
    const moonMaterial = new THREE.MeshLambertMaterial({ color: moonData.color });
    const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    
    moonMesh.position.x = moonData.distance;
    moonMesh.castShadow = true;
    moonMesh.receiveShadow = true;
    moonMesh.userData = { name: moonData.name, description: `Luna de Júpiter: ${moonData.name}` };
    
    moonOrbit.add(moonMesh);
    
    moons.push(moonOrbit);
    moonOrbit.userData = { speed: moonData.speed, name: moonData.name };
  });
}

function createSaturnMoons(saturnMesh: THREE.Mesh): void {
  // Titán - la luna más famosa de Saturno
  const titanOrbit = new THREE.Group();
  saturnMesh.add(titanOrbit);
  
  const titanGeometry = new THREE.SphereGeometry(0.12, 16, 16);
  const titanMaterial = new THREE.MeshLambertMaterial({ color: 0xFFAA77 });
  const titanMesh = new THREE.Mesh(titanGeometry, titanMaterial);
  
  titanMesh.position.x = 3.2;
  titanMesh.castShadow = true;
  titanMesh.receiveShadow = true;
  titanMesh.userData = { name: "Titán", description: "La luna más grande de Saturno con atmósfera densa" };
  
  // Atmósfera de Titán
  const titanAtmosphere = new THREE.SphereGeometry(0.14, 16, 16);
  const titanAtmosphereMaterial = new THREE.MeshLambertMaterial({
    color: 0xFF8844,
    transparent: true,
    opacity: 0.3
  });
  const atmosphere = new THREE.Mesh(titanAtmosphere, titanAtmosphereMaterial);
  titanMesh.add(atmosphere);
  
  titanOrbit.add(titanMesh);
  
  moons.push(titanOrbit);
  titanOrbit.userData = { speed: 0.08, name: "Titán" };
}

function createMarsMoons(marsMesh: THREE.Mesh): void {
  const marsMoreMoons = [
    { name: "Fobos", size: 0.04, distance: 0.8, speed: 0.25, color: 0x888888 },
    { name: "Deimos", size: 0.03, distance: 1.1, speed: 0.18, color: 0x666666 }
  ];
  
  marsMoreMoons.forEach(moonData => {
    const moonOrbit = new THREE.Group();
    marsMesh.add(moonOrbit);
    
    const moonGeometry = new THREE.SphereGeometry(moonData.size, 8, 8);
    const moonMaterial = new THREE.MeshLambertMaterial({ color: moonData.color });
    const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    
    moonMesh.position.x = moonData.distance;
    moonMesh.castShadow = true;
    moonMesh.receiveShadow = true;
    moonMesh.userData = { name: moonData.name, description: `Luna de Marte: ${moonData.name}` };
    
    moonOrbit.add(moonMesh);
    
    moons.push(moonOrbit);
    moonOrbit.userData = { speed: moonData.speed, name: moonData.name };
  });
}

function createMoonTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d')!;
  
  // Base gris de la Luna
  context.fillStyle = '#CCCCCC';
  context.fillRect(0, 0, 256, 256);
  
  // Cráteres
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const radius = Math.random() * 20 + 5;
    
    context.fillStyle = '#999999';
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    
    // Centro del cráter más oscuro
    context.fillStyle = '#777777';
    context.beginPath();
    context.arc(x, y, radius * 0.3, 0, Math.PI * 2);
    context.fill();
  }
  
  // Mares lunares (zonas oscuras)
  context.fillStyle = 'rgba(120, 120, 120, 0.7)';
  for (let i = 0; i < 5; i++) {
    context.beginPath();
    context.arc(Math.random() * 256, Math.random() * 256, Math.random() * 40 + 20, 0, Math.PI * 2);
    context.fill();
  }
  
  return new THREE.CanvasTexture(canvas);
}