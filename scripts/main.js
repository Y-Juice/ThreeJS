import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import WebGL from 'three/addons/capabilities/WebGL.js';

class CarShowcase {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth * 0.8, window.innerHeight);
        
        // Enhanced shadow rendering
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        document.getElementById('threejs-container').appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        this.camera.position.z = 5;
        this.camera.position.y = 1.5;

        this.loader = new GLTFLoader();
        this.modelsList = [];
        this.loadedModels = {};
        this.currentModel = null;
        this.garageEnvironment = null;

        // Create models list element in the sidebar
        this.createModelsListElement();

        this.setupGarageLighting();
        this.setupEventListeners();
        this.setupColorPicker();
        this.loadGarageEnvironment();
        this.loadCarModels();
        this.animate();
    }

    loadGarageEnvironment() {
        const garageModelPath = new URL('../public/models/garage_warehouse.glb', import.meta.url).href;
    
        this.loader.load(
            garageModelPath,
            (gltf) => {
                const garageModel = gltf.scene;
                
                // Enable shadows for the garage
                garageModel.traverse((child) => {
                    if (child.isMesh) {
                        child.receiveShadow = true;
                    }
                });
    
                // Center the garage
                const box = new THREE.Box3().setFromObject(garageModel);
                const center = box.getCenter(new THREE.Vector3());
                garageModel.position.sub(center);
    
                // Scale the garage
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scaleFactor = 100 / maxDim;
                garageModel.scale.set(scaleFactor, scaleFactor, scaleFactor);
    
                // Position garage in the scene
                garageModel.position.set(27, -1, 58);
    
                this.scene.add(garageModel);
                this.garageEnvironment = garageModel;
    
                // Adjust camera position to view the garage
                this.camera.position.set(0, 2, 8);
                this.camera.lookAt(0, 0, 0);
            },
            undefined,
            (error) => {
                console.error('Error loading garage environment:', error);
            }
        );
    }

    createModelsListElement() {
        const modelsLibrary = document.getElementById('models-library');
        const modelsList = document.createElement('ul');
        modelsList.id = 'models-list';
        modelsLibrary.appendChild(modelsList);
    }

    loadCarModels() {
        // Array of car model filenames
        const carModels = [
            '2009_volkswagen_amarok_lp.glb', 
            '2015_lamborghini_huracan.glb', 
            '2018_maserati_granturismo.glb', 
            'bmw_m6_gran_coupe.glb',
            'mercedes-benz_a45_amg_2018.glb',
            // Add more car model filenames as needed
        ];

        carModels.forEach(modelFileName => {
            // Use an absolute path from the public directory
            const modelPath = `/models/cars/${modelFileName}`;
            const modelName = modelFileName.replace('.glb', '').replace(/_/g, ' ');
            
            fetch(modelPath)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.blob();
                })
                .then(blob => {
                    const url = URL.createObjectURL(blob);
                    
                    this.loader.load(
                        url,
                        (gltf) => {
                            // Store the model URL
                            this.loadedModels[modelName] = url;
                            
                            // Add to models list
                            if (!this.modelsList.includes(modelName)) {
                                this.modelsList.push(modelName);
                                this.updateModelsList();
                            }
                        },
                        undefined,
                        (error) => {
                            console.error(`Error loading model ${modelFileName}:`, error);
                        }
                    );
                })
                .catch(error => {
                    console.error(`Error fetching model ${modelFileName}:`, error);
                });
        });
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
    
        // File upload handling
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.glb,.gltf';
        fileInput.id = 'model-upload';
        fileInput.style.display = 'none';
    
        const uploadButton = document.createElement('button');
        uploadButton.textContent = 'Upload Model';
        uploadButton.addEventListener('click', () => fileInput.click());
    
        const uploadSection = document.getElementById('upload-section');
        uploadSection.appendChild(fileInput);
        uploadSection.appendChild(uploadButton);
    
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const modelUrl = e.target.result;
                    // Use file name (without extension) as model name
                    const modelName = file.name.replace(/\.(glb|gltf)$/, '');
                    this.loadModel(modelUrl, modelName, true);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    setupColorPicker() {
        // Create color picker input
        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.id = 'model-color-picker';
        colorPicker.title = 'Change Model Color';
        
        // Create color picker container
        const colorPickerContainer = document.createElement('div');
        colorPickerContainer.id = 'color-picker-container';
        colorPickerContainer.appendChild(colorPicker);
        
        // Add to sidebar
        const uploadSection = document.getElementById('upload-section');
        uploadSection.appendChild(colorPickerContainer);

        // Add event listener
        colorPicker.addEventListener('input', (event) => this.changeModelColor(event.target.value));
    }

    setupGarageLighting() {
        // Clear any existing lights
        while (this.scene.children.filter(child => child instanceof THREE.Light).length > 0) {
            const light = this.scene.children.find(child => child instanceof THREE.Light);
            this.scene.remove(light);
        }

        // Bright overhead fluorescent-like main light
        const mainOverheadLight = new THREE.DirectionalLight(0xffffff, 4);
        mainOverheadLight.position.set(0, 10, 0);
        mainOverheadLight.castShadow = true;
        mainOverheadLight.shadow.mapSize.width = 2048;
        mainOverheadLight.shadow.mapSize.height = 2048;
        mainOverheadLight.shadow.camera.near = 0.5;
        mainOverheadLight.shadow.camera.far = 15;
        this.scene.add(mainOverheadLight);

        // Intense ambient light to simulate garage lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 2);
        this.scene.add(ambientLight);

        // Side wall lights to create depth and reduce harsh shadows
        const leftWallLight = new THREE.PointLight(0xffffff, 2, 20);
        leftWallLight.position.set(-5, 3, 0);
        this.scene.add(leftWallLight);

        const rightWallLight = new THREE.PointLight(0xffffff, 2, 20);
        rightWallLight.position.set(5, 3, 0);
        this.scene.add(rightWallLight);

        // Back wall light
        const backWallLight = new THREE.PointLight(0xffffff, 1.5, 15);
        backWallLight.position.set(0, 2, -5);
        this.scene.add(backWallLight);

        // Ground bounce light to simulate light reflection from floor
        const groundLight = new THREE.HemisphereLight(0xffffff, 0xcccccc, 1);
        groundLight.position.set(0, 10, 0);
        this.scene.add(groundLight);
    }

    changeModelColor(color) {
        if (this.currentModel) {
            this.currentModel.traverse((child) => {
                if (child.isMesh) {
                    // Check if the mesh has a material
                    if (child.material) {
                        // If it's an array of materials, update each
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => {
                                material.color.set(color);
                            });
                        } else {
                            // If it's a single material
                            child.material.color.set(color);
                        }
                    }
                }
            });
        }
    }

    clearScene() {
        const lightsCount = this.scene.children.filter(child => child instanceof THREE.Light).length;
        const garageCount = this.garageEnvironment ? 1 : 0;
        
        while (this.scene.children.length > (lightsCount + garageCount)) {
            const childToRemove = this.scene.children[lightsCount + garageCount];
            if (childToRemove !== this.garageEnvironment) {
                this.scene.remove(childToRemove);
            }
        }
    }

    loadModel(url, name, isNewUpload = false) {
        this.loader.load(
            url,
            (gltf) => {
                // Clear previous models (except garage)
                this.clearScene();
    
                const model = gltf.scene;
                this.currentModel = model;
                
                // Enable shadows for the model
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
    
                // Center and scale the model
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                model.position.sub(center);
    
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scaleFactor = 23 / maxDim;
                model.scale.set(scaleFactor, scaleFactor, scaleFactor);
    
                // Position model in the center of the garage
                model.position.set(-2, -2, 0);
    
                this.scene.add(model);
    
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