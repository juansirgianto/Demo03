import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js'
import { OrbitControls } from 'https://esm.rn/three@0.160.0/examples/jsm/controls/OrbbitControls.js'
import { LumaSplatsThree } from './libs/luma-web.module.js'
import { initCarousel } from './carousel.js'
import { createPins } from './pin.js'
import { cameraPosition } from 'three/tsl'

initCarousel()

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0.43, 1.23, -0.67)

const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false})
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const canvas = renderer.domElement
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const { pins, pinPOIs } = createPins(scene)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const maxY = 2.0
const minY = 0.5

controls.addEventListener('change', () => {
    camera.position.y = Math.min(maxY, Math.max(minY, camera.position.y))
})

controls.minDistance = 0.9
controls.maxDistance = 1.8

const splats = new LumaSplatsThree({
    source: 'https://lumalabs.ai/capture/addba5ba-c816-42fc-af43-ec733b976b77',
    particleRevealEnabled: false
})
scene.add(splats)

const axesHelper = new THREE.AxesHelper(10)
axesHelper.position.y = 0
scene.add( axesHelper )

const areaButtons = [
    {
        button: document.querySelector('button:nth-child(1)'),
        cameraPosition: [0.16, 0.68, -0.68],
        cameraTarget: [-0.2, 0, 0.25],
        descriptionId: 'pooldescription',
    },
    {
        button: document.querySelector('button:nth-child(2)'),
        cameraPosition: [-0.3, 0.92, -0.57],
        cameraTarget: [0, 0, -0.3],
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
]

areaButtons.forEach(({ button, cameraPosition, cameraTarget, descriptionId }) => {
    button.addEventListener('click', () => {
        moveCameraTo(cameraPosition, cameraTarget)
        document.querySelectorAll('.description-box').forEach(el => el.style.display = 'none')
        const descEl = document.getElementById(descriptionId)
        if (descEl) descEl.style.display = 'block'
    })
})

document.querySelectorAll('.close-description').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[id$="description"]').forEach(el => {
            el.style.display = 'none'
        })
    })
})

let isCameraAnimating = false

function moveCameraTo(position, lookAt = null, duration = 1000) {
    if (isCameraAnimating) return
    isCameraAnimating = true
    const start = camera.position.clone()
    const end = new THREE.Vector3(...position)
    const startTarget = controls.target.clone()
    const endTarget = lookAt ? new THREE.Vector3(...lookAt) : startTarget

    const startTime = performance.now()

    function animateCamera(time) {
        const elapsed = time - startTime
        const t = Math.min(elapsed / duration, 1)
        camera.position.lerpVectors(start, end, t)
        controls.target.lerpVectors(startTarget, endTarget, t)

        if (t < 1) {
            requestAnimationFrame(animateCamera)
        } else {
            isCameraAnimating = false
        }
    }
    requestAnimationFrame(animateCamera)
}

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectsObjects(
        pins.map(p => p.children[0]).filter(c => c instanceof THREE.Sprite)
    )

    if (intersects.length > 0) {
        const clickedSprite = intersects[0].object
        const pinGroup = clickedSprite.parent

        const pinPOI = pinPOIs.find(p => p.mesh === pinGroup)
        if (pinPOI) {
            moveCameraTo(pinPOI.camera_position.toArray(), pinPOI.camera_target.toArray())

            document.querySelectorAll('.description-box').forEach(d => d.style.display = 'none')
            const desc = document.getElementById(pinPOI.descriptionId)
            if (desc) desc.style.display = 'block'

            clickedSprite.material.color.set(0xffff00)
            setTimeout(() => clickedSprite.material.color.set(0xffffff), 300)
        }
    }
})

let hoveredSprite = null

let lastMove = 0
canvas.addEventListener('mousemove', (event) => {
    const now = performance.now()
    if (now - lastMove < 50) return
    lastMove = now

    const rect = canvas.getBoundingClientRect()
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectsObjects(
        pins.map(p => p.children[0]).filter(c => c instanceof THREE.Sprite)
    )

    if (intersects.length > 0) {
        const sprite = intersects[0].object

        if (hoveredSprite !== sprite) {
            if (hoveredSprite) hoveredSprite.material.color.set(0xffffff)
                sprite.material.color.set(0xffff00)
            hoveredSprite = sprite
        }
        canvas.style.cursor = 'pointer'
    } else {
        if (hoveredSprite) hoveredSprite.material.color.set(0xffffff)
            hoveredSprite = null
    }
})

let isZooming = false
let isOrbiting = false

function animate() {
    requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
    if (isZooming || isOrbiting) return
}
animate()

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
})