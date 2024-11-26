import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import WebGL from 'three/addons/capabilities/WebGL.js';

class CarShowcase {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth * 0.8, window.innerHeight);
        
        // Enable shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        document.getElementById('threejs-container').appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        this.camera.position.z = 5;
        this.scene.background = new THREE.Color(0xf0f0f0);

        this.loader = new GLTFLoader();
        this.modelsList = [];
        this.loadedModels = {};  // Store loaded models by name

        this.setupLights();
        this.setupEventListeners();
        this.animate();
    }

    setupLights() {
        // Clear any existing lights
        this.scene.children = this.scene.children.filter(child => !(child instanceof THREE.Light));

        // Soft ambient light to fill in shadows
        const ambientLight = new THREE.AmbientLight(0xffffff, 2);
        this.scene.add(ambientLight);

        // Directional light from top-front
        const topFrontLight = new THREE.DirectionalLight(0xffffff, 3);
        topFrontLight.position.set(5, 10, 7);
        topFrontLight.castShadow = true;
        topFrontLight.shadow.mapSize.width = 1024;
        topFrontLight.shadow.mapSize.height = 1024;
        this.scene.add(topFrontLight);

        // Directional light from bottom-back
        const bottomBackLight = new THREE.DirectionalLight(0xffffff, 1.5);
        bottomBackLight.position.set(-5, -5, -5);
        this.scene.add(bottomBackLight);

        // Soft side fill light
        const sideLight = new THREE.PointLight(0xffffff, 1, 100);
        sideLight.position.set(-10, 0, 0);
        this.scene.add(sideLight);

        // Another soft fill light from other side
        const oppositeSideLight = new THREE.PointLight(0xffffff, 1, 100);
        oppositeSideLight.position.set(10, 0, 0);
        this.scene.add(oppositeSideLight);
    }

    setupEventListeners() {
        document.getElementById('model-upload').addEventListener('change', (event) => this.handleFileUpload(event));
        window.addEventListener('resize', () => this.onWindowResize());
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.loadModel(e.target.result, file.name, true);
            };
            reader.readAsDataURL(file);
        }
    }

    clearScene() {
        // Remove all models from the scene, keeping lights
        const lightsCount = this.scene.children.filter(child => child instanceof THREE.Light).length;
        while (this.scene.children.length > lightsCount) {
            this.scene.remove(this.scene.children[lightsCount]);
        }
    }

    loadModel(url, name, isNewUpload = false) {
        this.loader.load(
            url,
            (gltf) => {
                // Clear previous models
                this.clearScene();

                const model = gltf.scene;
                
                // Enable shadows for the model
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                this.scene.add(model);

                // Center and scale the model
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                model.position.sub(center);

                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scaleFactor = 3 / maxDim;
                model.scale.set(scaleFactor, scaleFactor, scaleFactor);

                // Store the model
                this.loadedModels[name] = url;

                // Add to models list if it's a new upload
                if (isNewUpload && !this.modelsList.includes(name)) {
                    this.modelsList.push(name);
                    this.updateModelsList();
                }
            },
            undefined,
            (error) => {
                console.error('Error loading model:', error);
            }
        );
    }

    updateModelsList() {
        const modelsList = document.getElementById('models-list');
        modelsList.innerHTML = '';
        this.modelsList.forEach(modelName => {
            const li = document.createElement('li');
            li.textContent = modelName;
            li.addEventListener('click', () => this.loadModelByName(modelName));
            modelsList.appendChild(li);
        });
    }

    loadModelByName(name) {
        const modelUrl = this.loadedModels[name];
        if (modelUrl) {
            this.loadModel(modelUrl, name);
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth * 0.8 / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth * 0.8, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

if (WebGL.isWebGL2Available()) {
    new CarShowcase();
} else {
    const warning = WebGL.getWebGL2ErrorMessage();
    document.body.appendChild(warning);
}