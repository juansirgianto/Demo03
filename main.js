import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://esm.run/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { LumaSplatsThree, LumaSplatsSemantics } from './libs/luma-web.module.js';
import { initCarousel } from './carousel.js';
import { createPins } from './pin.js';

initCarousel();

// Init scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5);
camera.position.set(0.43, 1.23, -0.67);

const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
const DPR = Math.min(window.devicePixelRatio, 1.25)
renderer.setPixelRatio(DPR)
document.body.appendChild(renderer.domElement);

const canvas = renderer.domElement;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const { pins, pinPOIs } = createPins(scene);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const maxY = 2.0;
const minY = 0.5;

controls.addEventListener('change', () => {
  // Clamp camera Y position
  camera.position.y = Math.min(maxY, Math.max(minY, camera.position.y));
});

controls.minDistance = 0.9; 
controls.maxDistance = 1.8;  

// Luma Splats
const splats = new LumaSplatsThree({
    source: 'https://lumalabs.ai/capture/addba5ba-c816-42fc-af43-ec733b976b77',
    particleRevealEnabled: false
});
scene.add(splats);

// const axesHelper = new THREE.AxesHelper( 10 );
// axesHelper.position.y = 0;
// scene.add( axesHelper );

// caminfo
// const camInfo = document.getElementById('cam-info');

const areaButtons = [
  {
    button: document.querySelector('button:nth-child(1)'),
    cameraPosition: [0.16, 0.68, -0.68],
    cameraTarget: [-0.2, 0, 0.25],
    descriptionId: 'pooldescription',
  },
  {
    button: document.querySelector('button:nth-child(2)'),
    cameraPosition: [-0.30, 0.92, -0.57],
    cameraTarget: [0, 0, -0.30],
    descriptionId: 'housedescription',
  },
  {
    button: document.querySelector('button:nth-child(3)'),
    cameraPosition: [-0.28, 0.74, -1.16],
    cameraTarget: [-0.4, 0.1, -0.7],
    descriptionId: 'gardendescription',
  },
  {
    button: document.querySelector('button:nth-child(4)'),
    cameraPosition: [-0.93, 0.78, 0.73],
    cameraTarget: [-0.4, 0.2, 0.6],
    descriptionId: 'arrivaldescription',
  },
  // {
  //   button: document.querySelector('button:nth-child(5)'),
  //   cameraPosition: [-0.74, 0.68, -0.41],
  //   cameraTarget: [-0.15, 0, -0.35],
  //   descriptionId: 'archdescription',
  // },
  // {
  //   button: document.querySelector('button:nth-child(6)'),
  //   cameraPosition: [0.52, 0.63, -1.03],
  //   cameraTarget: [0.5, 0, -0.6],
  //   descriptionId: 'backdescription',
  // },
];

const buttons = document.querySelectorAll('.area-button');
const closeButtons = document.querySelectorAll('.close-description');

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    buttons.forEach(b => b.dataset.active = "false");
    btn.dataset.active = "true";
  });
});

closeButtons.forEach(closeBtn => {
  closeBtn.addEventListener('click', () => {
    buttons.forEach(b => b.dataset.active = "false");
  });
});

areaButtons.forEach(({ button, cameraPosition, cameraTarget, descriptionId }) => {
  button.addEventListener('click', () => {
    moveCameraTo(cameraPosition, cameraTarget);

    // Sembunyikan semua deskripsi, lalu tampilkan yang dipilih
    document.querySelectorAll('.description-box').forEach(el => el.style.display = 'none');
    const descEl = document.getElementById(descriptionId);
    if (descEl) descEl.style.display = 'block';
  });
});


document.querySelectorAll('.close-description').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[id$="description"]').forEach(el => {
      el.style.display = 'none';
    });
  });
});

let isCameraAnimating = false;

let needsRender = true
let warmingUp = true
const WARMUP_MS = 3000
const warmUpEndAt = performance.now() + WARMUP_MS

function renderLoop() {
  requestAnimationFrame(renderLoop)

  if (controls.update()) needsRender = true
  if (warmingUp) {
    needsRender = true
    if (performance.now() >= warmUpEndAt) warmingUp = false
  }
  if (!needsRender) return
  renderer.render(scene, camera)
  needsRender = false
}
renderLoop()

function moveCameraTo(position, lookAt = null, duration = 1000) {
  needsRender = true
  if (isCameraAnimating) return; // hindari tumpukan animasi
  isCameraAnimating = true;
  const start = camera.position.clone();
  const end = new THREE.Vector3(...position);
  const startTarget = controls.target.clone();
  const endTarget = lookAt ? new THREE.Vector3(...lookAt) : startTarget;

  const startTime = performance.now();

  function animateCamera(time) {
    const elapsed = time - startTime;
    const t = Math.min(elapsed / duration, 1);
    camera.position.lerpVectors(start, end, t);
    controls.target.lerpVectors(startTarget, endTarget, t);

    if (t < 1) {
      requestAnimationFrame(animateCamera);
    } else {
      isCameraAnimating = false;
    }
  }

  requestAnimationFrame(animateCamera);
}

// Event klik
canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(
    pins.map(p => p.children[0]).filter(c => c instanceof THREE.Sprite)
  );

  if (intersects.length > 0) {
    const clickedSprite = intersects[0].object;
    const pinGroup = clickedSprite.parent;

    const pinPOI = pinPOIs.find(p => p.mesh === pinGroup);
    if (pinPOI) {
      // Pindahkan kamera
      moveCameraTo(pinPOI.camera_position.toArray(), pinPOI.camera_target.toArray());
      needsRender = true

      // Tampilkan deskripsi
      document.querySelectorAll('.description-box').forEach(d => d.style.display = 'none');
      const desc = document.getElementById(pinPOI.descriptionId);
      if (desc) desc.style.display = 'block';

      document.querySelectorAll('.area-button').forEach(b => b.dataset.active = "false")
      const index = pinPOIs.indexOf(pinPOI)
      const targetBtn = document.querySelectorAll('.area-button')[index]
      if (targetBtn) targetBtn.dataset.active = "true"

      // Highlight sementara
      clickedSprite.material.color.set(0xffff00);
      setTimeout(() => clickedSprite.material.color.set(0xffffff), 300);
    }
  }
});

const pickables = pins
.map(p => p.children[0])
.filter(c => c instanceof THREE.Sprite)

const pointer = new THREE.Vector2()
let hoveredSprite = null
let rafId = null
let pendingPick = false
let lastX = 0, lastY = 0

raycaster.near = 0.1
raycaster.far = 5.0

const PIN_LAYER = 2
pickables.forEach(o => o.layers.set(PIN_LAYER))
camera.layers.enable(PIN_LAYER)

canvas.addEventListener('pointermove', (event) => {
  if (controls.dragging || isCameraAnimating) return
  if (Math.abs(event.clientX - lastX) < 2 && Math.abs(event.clientY - lastY) < 2) return
  lastX = event.clientX; lastY = event.clientY

  const rect = canvas.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  if (pendingPick) return
  pendingPick = true

  rafId = requestAnimationFrame(() => {
    pendingPick = false
    raycaster.setFromCamera(pointer, camera)
    const intersects = raycaster.intersectObjects(pickables, false)

    if (intersects.length > 0) {
      const sprite = intersects[0].object
      if (hoveredSprite !== sprite) {
        if (hoveredSprite) hoveredSprite.material.color.setHex(0xffffff)
        sprite.material.color.setHex(0x757641)
        needsRender = true
        hoveredSprite = sprite
      }
      canvas.style.cursor = 'pointer'
    } else {
      if (hoveredSprite) hoveredSprite.material.color.setHex(0xffffff)
      hoveredSprite = null
      canvas.style.cursor = 'default'
    }
  })
}, { passive: true})

window.addEventListener('blur', () => { if (rafId) cancelAnimationFrame(rafId); });

  let isZooming = false;
let isOrbiting = false;

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
