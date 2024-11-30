
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import * as CANNON from 'cannon-es'

/**
 * Debug
 */
const gui = new dat.GUI()
const debugObject = {}

debugObject.createSphere = () =>
{
    createSphere(
        Math.random() * 0.5,
        {
            x: (Math.random() - 0.5) * 3,
            y: 3,
            z: (Math.random() - 0.5) * 3
        }
    )
}

gui.add(debugObject, 'createSphere')

debugObject.createBox = () =>
{
    createBox(
        Math.random(),
        Math.random(),
        Math.random(),
        {
            x: (Math.random() - 0.5) * 3,
            y: 3,
            z: (Math.random() - 0.5) * 3
        }
    )
}
gui.add(debugObject, 'createBox')




// Raycaster
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

window.addEventListener('click', (event) => {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / sizes.width) * 2 - 1
    mouse.y = -(event.clientY / sizes.height) * 2 + 1

    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, camera)

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(objectsToUpdate.map(object => object.mesh))

    if (intersects.length > 0) {
        // Break the first intersected object
        breakObject(intersects[0].object)
    }
})



// Reset
debugObject.reset = () =>
{
    for(const object of objectsToUpdate)
    {
        // Remove body
        object.body.removeEventListener('collide', playHitSound)
        world.removeBody(object.body)

        // Remove mesh
        scene.remove(object.mesh)
    }
    
    objectsToUpdate.splice(0, objectsToUpdate.length)
}
gui.add(debugObject, 'reset')

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()



/**
 * Sounds
 */
const hitSound = new Audio('/sounds/hit.mp3')

const playHitSound = (collision) =>
{
    const impactStrength = collision.contact.getImpactVelocityAlongNormal()

    if(impactStrength > 1.5)
    {
        hitSound.volume = Math.random()
        hitSound.currentTime = 0
        hitSound.play()
    }
}

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const cubeTextureLoader = new THREE.CubeTextureLoader()

const environmentMapTexture = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png'
])

/**
 * Physics
 */
const world = new CANNON.World()
world.broadphase = new CANNON.SAPBroadphase(world)
world.allowSleep = true
world.gravity.set(0, - 9.82, 0)

// Default material
const defaultMaterial = new CANNON.Material('default')
const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
        friction: 0.1,
        restitution: 0.7
    }
)
world.defaultContactMaterial = defaultContactMaterial

// Floor
const floorShape = new CANNON.Plane()
const floorBody = new CANNON.Body()
floorBody.mass = 0
floorBody.addShape(floorShape)
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(- 1, 0, 0), Math.PI * 0.5) 
world.addBody(floorBody)

/**
 * Utils
 */
const objectsToUpdate = []

// Create sphere
const sphereGeometry = new THREE.SphereGeometry(1, 20, 20)
const sphereMaterial = new THREE.MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture,
    envMapIntensity: 0.5
})

const createSphere = (radius, position) =>
{
    // Three.js mesh
    const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
    mesh.castShadow = true
    mesh.scale.set(radius, radius, radius)
    mesh.position.copy(position)
    scene.add(mesh)

    // Cannon.js body
    const shape = new CANNON.Sphere(radius)

    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0, 3, 0),
        shape: shape,
        material: defaultMaterial
    })
    body.position.copy(position)
    body.addEventListener('collide', playHitSound)
    world.addBody(body)

    // Save in objects
    objectsToUpdate.push({ mesh, body })
}

// Create box
const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
const boxMaterial = new THREE.MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture,
    envMapIntensity: 0.5
})
const createBox = (width, height, depth, position) =>
{
    // Three.js mesh
    const mesh = new THREE.Mesh(boxGeometry, boxMaterial)
    mesh.scale.set(width, height, depth)
    mesh.castShadow = true
    mesh.position.copy(position)
    scene.add(mesh)

    // Cannon.js body
    const shape = new CANNON.Box(new CANNON.Vec3(width * 0.5, height * 0.5, depth * 0.5))

    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0, 3, 0),
        shape: shape,
        material: defaultMaterial
    })
    body.position.copy(position)
    body.addEventListener('collide', playHitSound)
    world.addBody(body)

    // Save in objects
    objectsToUpdate.push({ mesh, body })
}

createBox(1, 1.5, 2, { x: 0, y: 3, z: 0 })


// Add a color property to the debugObject
debugObject.color = '#ffffff'; // Default color

// Function to change the color of the selected object
debugObject.changeColor = (object) => {
    if (object) {
        object.mesh.material.color.set(debugObject.color);
    }
};

// GUI for changing color
gui.addColor(debugObject, 'color').onChange(() => {
    for (const object of objectsToUpdate) {
        debugObject.changeColor(object); // Change color for each object
    }
});





const stars = []; // Array to hold the stars

const createGalaxy = () => {
    const starGeometry = new THREE.SphereGeometry(0.05, 8, 8);

    for (const object of objectsToUpdate) {
        const starMaterial = new THREE.MeshBasicMaterial({ color: object.mesh.material.color.getHex() }); // Use the color of the popped object
        const starMesh = new THREE.Mesh(starGeometry, starMaterial);
        const [x, y, z] = [
            (Math.random() - 0.5) * 100, // Random x position
            (Math.random() - 0.5) * 100, // Random y position
            (Math.random() - 0.5) * 100  // Random z position
        ];
        starMesh.position.set(x, y, z);
        scene.add(starMesh);
        stars.push(starMesh); // Store the star mesh for future reference
    }
}

debugObject.generateGalaxy = () => {
    createGalaxy(); // Call the function to create a galaxy
}

gui.add(debugObject, 'generateGalaxy').name('Generate Galaxy');

debugObject.reset = () => {
    for (const object of objectsToUpdate) {
        // Remove body
        object.body.removeEventListener('collide', playHitSound);
        world.removeBody(object.body);
        scene.remove(object.mesh);
    }

    // Remove stars from the scene
    for (const star of stars) {
        scene.remove(star);
    }
    stars.length = 0; // Clear the stars array

    objectsToUpdate.splice(0, objectsToUpdate.length);
}




const breakObject = (mesh) => {
    // Get the object from objectsToUpdate
    const object = objectsToUpdate.find(obj => obj.mesh === mesh);

    if (object) {
        // Remove the original object
        object.body.removeEventListener('collide', playHitSound);
        world.removeBody(object.body);
        scene.remove(object.mesh);

        // Create fragments
        const numFragments = 10; // Number of fragments
        let fragmentGeometry;

        // Determine the shape of the clicked object
        if (object.mesh.geometry instanceof THREE.SphereGeometry) {
            fragmentGeometry = new THREE.SphereGeometry(0.1, 8, 8); // Small sphere for fragments
        } else if (object.mesh.geometry instanceof THREE.BoxGeometry) {
            fragmentGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2); // Small box for fragments
        }

        for (let i = 0; i < numFragments; i++) {
            const fragmentMaterial = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
            const fragmentMesh = new THREE.Mesh(fragmentGeometry, fragmentMaterial);
            fragmentMesh.position.copy(object.mesh.position);
            fragmentMesh.castShadow = true;
            scene.add(fragmentMesh);

            // Create Cannon.js body for the fragment
            let fragmentShape;
            if (object.mesh.geometry instanceof THREE.SphereGeometry) {
                fragmentShape = new CANNON.Sphere(0.1);
            } else if (object.mesh.geometry instanceof THREE.BoxGeometry) {
                fragmentShape = new CANNON.Box(new CANNON.Vec3(0.1, 0.1, 0.1)); // Small box shape
            }

            const fragmentBody = new CANNON.Body({
                mass: 1,
                position: new CANNON.Vec3(object.body.position.x, object.body.position.y, object.body.position.z),
                material: defaultMaterial
            });

            fragmentBody.addShape(fragmentShape);
            world.addBody(fragmentBody);

            // Apply random impulse to the fragment
            const impulse = new CANNON.Vec3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
            fragmentBody.applyImpulse(impulse, fragmentBody.position);

            // Save fragment in objectsToUpdate
            objectsToUpdate.push({ mesh: fragmentMesh, body: fragmentBody });
        }
    }
}



// Add a color property for the floor
debugObject.floorColor = '#ffffff'; // Default color

// Function to change the color of the floor
debugObject.changeFloorColor = () => {
    floor.material.color.set(debugObject.floorColor);
};

// GUI for changing floor color
gui.addColor(debugObject, 'floorColor').onChange(() => {
    debugObject.changeFloorColor(); // Change floor color when selected
});

// ... (rest of your existing code)

// Floor
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({
        color: debugObject.floorColor, // Use the color from debugObject
        metalness: 0.3,
        roughness: 0.4,
        envMap: environmentMapTexture,
        envMapIntensity: 0.5
    })
);
floor.receiveShadow = true;
floor.rotation.x = - Math.PI * 0.5;
scene.add(floor);

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = - 7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = - 7
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(- 3, 3, 3)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()
let oldElapsedTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime

    // Update physics
    world.step(1 / 60, deltaTime, 3)
    
    for(const object of objectsToUpdate)
    {
        object.mesh.position.copy(object.body.position)
        object.mesh.quaternion.copy(object.body.quaternion)
    }

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()