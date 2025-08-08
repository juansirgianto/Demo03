import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://esm.run/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { LumaSplatsThree, LumaSplatsSemantics } from './libs/luma-web.module.js';
import { initCarousel } from './carousel.js';
import { createPins } from './pin.js';

initCarousel();

// Init scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0.43, 1.23, -0.67);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
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
const camInfo = document.getElementById('cam-info');

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

function moveCameraTo(position, lookAt = null, duration = 1000) {
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

      // Tampilkan deskripsi
      document.querySelectorAll('.description-box').forEach(d => d.style.display = 'none');
      const desc = document.getElementById(pinPOI.descriptionId);
      if (desc) desc.style.display = 'block';

      // Highlight sementara
      clickedSprite.material.color.set(0xffff00);
      setTimeout(() => clickedSprite.material.color.set(0xffffff), 300);
    }
  }
});

let hoveredSprite = null;

let lastMove = 0;
canvas.addEventListener('mousemove', (event) => {
  const now = performance.now()
  if (now - lastMove < 50) return
  lastMove = now
  
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(
    pins.map(p => p.children[0]).filter(c => c instanceof THREE.Sprite)
  );

  if (intersects.length > 0) {
    const sprite = intersects[0].object;

    // Jika sprite yang dihover sekarang berbeda dari sebelumnya
    if (hoveredSprite !== sprite) {
      // Reset warna sprite sebelumnya
      if (hoveredSprite) hoveredSprite.material.color.set(0xffffff);

      // Set warna hover (misalnya kuning)
      sprite.material.color.set(0xffff00);
      hoveredSprite = sprite;
    }
    canvas.style.cursor = 'pointer';
  } else {
    // Tidak ada yang dihover
    if (hoveredSprite) hoveredSprite.material.color.set(0xffffff);
    hoveredSprite = null;
  }
});

// const videoBtn = document.getElementById('openVideo');
//   const videoModal = document.getElementById('videoModal');
//   const closeVideo = document.getElementById('closeVideo');
//   const videoPlayer = document.getElementById('videoPlayer');

//   videoBtn.addEventListener('click', () => {
//     videoModal.classList.remove('hidden');
//     videoPlayer.currentTime = 0;
//     videoPlayer.play();
//   });

//   closeVideo.addEventListener('click', () => {
//     videoModal.classList.add('hidden');
//     videoPlayer.pause();
//     videoPlayer.currentTime = 0;
//   });

//   // Tutup modal jika klik di luar video
//   videoModal.addEventListener('click', (e) => {
//     if (e.target === videoModal) {
//       videoModal.classList.add('hidden');
//       videoPlayer.pause();
//       videoPlayer.currentTime = 0;
//     }
//   });

  let isZooming = false;
let isOrbiting = false;

// Animate
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    if (isZooming || isOrbiting) return; // Skip update scene jika sedang animasi khusus
    camInfo.textContent = `Camera: x=${camera.position.x.toFixed(2)}, y=${camera.position.y.toFixed(2)}, z=${camera.position.z.toFixed(2)}`;

    // const maxY = 2.0;
    // const minY = 0.3;
    // camera.position.y = Math.min(maxY, Math.max(minY, camera.position.y));
}

animate();

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
