/**
 * Editor3D — Babylon.js 3D viewer for the floor plan.
 * Renders all floors stacked by elevation, with ghosting for non-active floors.
 * Supports orbit camera and first-person walkthrough mode.
 */
/* global BABYLON */

import { MaterialLibrary } from './MaterialLibrary.js';
import { WallMeshBuilder } from './WallMeshBuilder.js';
import { SlabMeshBuilder } from './SlabMeshBuilder.js';
import { OpeningCSG } from './OpeningCSG.js';
import { CameraController } from './CameraController.js';

export class Editor3D {
  /**
   * @param {object} config
   * @param {HTMLCanvasElement} config.canvas - #canvas-3d
   * @param {HTMLElement} config.container - #viewport-3d
   * @param {EventBus} config.eventBus
   * @param {Blueprint} config.blueprint
   * @param {Platform} config.platform
   */
  constructor({ canvas, container, eventBus, blueprint, platform }) {
    this.canvas = canvas;
    this.container = container;
    this.eventBus = eventBus;
    this.blueprint = blueprint;
    this.platform = platform;

    this._engine = null;
    this._scene = null;
    this._dirty = true;
    this._visible = false;
    this._meshes = [];
    this._initialized = false;
    this._ghostMaterials = new Map(); // floorId -> ghost material
    this._fpCamera = null; // first-person camera
    this._isFirstPerson = false;

    // Listen for events regardless of init success
    this._wireEvents();
  }

  _wireEvents() {
    this.eventBus.on('view:changed', (view) => {
      if (view === '3d') {
        this.show();
      } else {
        this.hide();
      }
    });

    this.eventBus.on('viewport:redraw', () => { this._dirty = true; });
    this.eventBus.on('walltool:finish', () => { this._dirty = true; });
    this.eventBus.on('opening:placed', () => { this._dirty = true; });
    this.eventBus.on('room:created', () => { this._dirty = true; });
    this.eventBus.on('element:deleted', () => { this._dirty = true; });
    this.eventBus.on('property:changed', () => { this._dirty = true; });
    this.eventBus.on('history:undo', () => { this._dirty = true; });
    this.eventBus.on('history:redo', () => { this._dirty = true; });
    this.eventBus.on('floor:changed', () => { this._dirty = true; });
    this.eventBus.on('floor:added', () => { this._dirty = true; });
    this.eventBus.on('floor:removed', () => { this._dirty = true; });

    // Camera preset events
    this.eventBus.on('camera:preset', (preset) => {
      if (preset === 'walkthrough') {
        this._toggleFirstPerson();
      } else if (this.camera) {
        if (this._isFirstPerson) this._exitFirstPerson();
        this.camera.goToPreset(preset);
      }
    });
  }

  /**
   * Lazy-initialize the Babylon engine on first show.
   */
  _init() {
    if (this._initialized) return true;

    if (typeof BABYLON === 'undefined') {
      this.eventBus.emit('toast', '3D engine failed to load — check your connection');
      return false;
    }

    try {
      this._engine = new BABYLON.Engine(this.canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
      });

      this._scene = new BABYLON.Scene(this._engine);
      this._scene.clearColor = new BABYLON.Color4(0.06, 0.06, 0.12, 1);
      this._scene.ambientColor = new BABYLON.Color3(0.15, 0.15, 0.2);
      this._scene.collisionsEnabled = true;

      this._setupLighting();
      this.materials = new MaterialLibrary(this._scene);
      this.camera = new CameraController(this._scene, this.canvas, this.platform);

      this.wallBuilder = new WallMeshBuilder(this._scene, this.materials);
      this.slabBuilder = new SlabMeshBuilder(this._scene, this.materials);
      this.openingCSG = new OpeningCSG(this._scene, this.materials);

      this._engine.runRenderLoop(() => {
        if (this._visible && this._scene) {
          this._scene.render();
        }
      });

      this._resizeHandler = () => {
        if (this._engine && this._visible) this._engine.resize();
      };
      window.addEventListener('resize', this._resizeHandler);

      this._initialized = true;
      return true;
    } catch (e) {
      this.eventBus.emit('toast', '3D engine failed to start');
      return false;
    }
  }

  _setupLighting() {
    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), this._scene);
    hemi.intensity = 0.6;
    hemi.diffuse = new BABYLON.Color3(0.9, 0.9, 1.0);
    hemi.groundColor = new BABYLON.Color3(0.15, 0.15, 0.2);

    const dir = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-0.5, -1, -0.5), this._scene);
    dir.intensity = 0.5;
    dir.diffuse = new BABYLON.Color3(1.0, 0.95, 0.85);

    try {
      this._shadowGenerator = new BABYLON.ShadowGenerator(1024, dir);
      this._shadowGenerator.useBlurExponentialShadowMap = true;
      this._shadowGenerator.blurKernel = 16;
    } catch (e) {
      this._shadowGenerator = null;
    }
  }

  /**
   * Create a ghost material for non-active floors (semi-transparent).
   */
  _getGhostMaterial(floorId) {
    if (this._ghostMaterials.has(floorId)) return this._ghostMaterials.get(floorId);

    const mat = new BABYLON.StandardMaterial(`ghost_${floorId}`, this._scene);
    mat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.5);
    mat.alpha = 0.2;
    mat.backFaceCulling = false;
    this._ghostMaterials.set(floorId, mat);
    return mat;
  }

  /**
   * Build meshes for a single floor.
   * @param {Floor} floor
   * @param {boolean} isActive - If false, use ghost material
   * @returns {BABYLON.Mesh[]}
   */
  _buildFloor(floor, isActive) {
    const meshes = [];
    const wallHeight = floor.ceilingHeight || 2.7;
    const slabThickness = floor.slabThickness || 0.3;
    const elevation = floor.elevation || 0;
    const ghostMat = isActive ? null : this._getGhostMaterial(floor.id);

    // Build wall meshes
    for (const wall of floor.walls) {
      try {
        const wallMesh = this.wallBuilder.build(wall, wallHeight, elevation);
        if (wallMesh) {
          if (isActive) {
            const wallOpenings = typeof floor.getOpeningsForWall === 'function'
              ? floor.getOpeningsForWall(wall.id)
              : [];
            if (wallOpenings.length > 0) {
              this.openingCSG.subtractOpenings(wallMesh, wall, wallOpenings, wallHeight, elevation);
            }
            if (this._shadowGenerator) {
              this._shadowGenerator.addShadowCaster(wallMesh);
            }
            wallMesh.receiveShadows = true;
          } else {
            wallMesh.material = ghostMat;
          }
          wallMesh.checkCollisions = true;
          meshes.push(wallMesh);
        }
      } catch (e) {
        // Skip wall on error
      }
    }

    // Build floor slab
    try {
      const slabMesh = this.slabBuilder.build(floor, elevation - slabThickness, slabThickness);
      if (slabMesh) {
        if (!isActive) slabMesh.material = ghostMat;
        slabMesh.receiveShadows = true;
        slabMesh.checkCollisions = true;
        meshes.push(slabMesh);
      }
    } catch (e) {
      // Slab not critical
    }

    // Build room floor fills (only for active floor)
    if (isActive) {
      const rooms = floor.rooms || [];
      for (const room of rooms) {
        try {
          const roomMesh = this.slabBuilder.buildRoomFloor(room, elevation + 0.001, this.materials);
          if (roomMesh) {
            roomMesh.receiveShadows = true;
            meshes.push(roomMesh);
          }
        } catch (e) {
          // Room floor not critical
        }
      }
    }

    return meshes;
  }

  /**
   * Rebuild all 3D meshes from all floors.
   */
  rebuild() {
    if (!this._initialized) return;

    try {
      // Dispose existing meshes
      for (const mesh of this._meshes) {
        if (mesh && !mesh.isDisposed()) mesh.dispose();
      }
      this._meshes = [];

      const activeFloor = this.blueprint.activeFloor;
      if (!activeFloor) return;

      // Build all floors
      for (const floor of this.blueprint.floors) {
        const isActive = floor.id === activeFloor.id;
        const floorMeshes = this._buildFloor(floor, isActive);
        this._meshes.push(...floorMeshes);
      }

      // Frame the camera on the scene
      if (this._meshes.length > 0 && !this._isFirstPerson) {
        this.camera.frameAll(this._meshes);
      }

      this._dirty = false;
    } catch (e) {
      this.eventBus.emit('toast', '3D rebuild failed');
    }
  }

  /**
   * Toggle first-person walkthrough camera.
   */
  _toggleFirstPerson() {
    if (this._isFirstPerson) {
      this._exitFirstPerson();
    } else {
      this._enterFirstPerson();
    }
  }

  _enterFirstPerson() {
    if (!this._initialized) return;

    const activeFloor = this.blueprint.activeFloor;
    if (!activeFloor) return;

    const elevation = activeFloor.elevation || 0;
    const eyeHeight = 1.6; // meters

    // Compute center of active floor walls for start position
    let cx = 0, cy = 0, count = 0;
    for (const wall of activeFloor.walls) {
      for (const p of wall.points) {
        cx += p.x;
        cy += p.y;
        count++;
      }
    }
    if (count > 0) {
      cx /= count;
      cy /= count;
    }

    // Detach orbit camera
    this.camera.camera.detachControl(this.canvas);

    // Create or reposition first-person camera
    if (!this._fpCamera) {
      this._fpCamera = new BABYLON.UniversalCamera(
        'fpCamera',
        new BABYLON.Vector3(cx, elevation + eyeHeight, cy),
        this._scene
      );
      this._fpCamera.minZ = 0.1;
      this._fpCamera.speed = 0.3;
      this._fpCamera.angularSensibility = 3000;
      this._fpCamera.ellipsoid = new BABYLON.Vector3(0.3, 0.8, 0.3);
      this._fpCamera.checkCollisions = true;
      this._fpCamera.applyGravity = false;

      // WASD + arrow keys
      this._fpCamera.keysUp = [87, 38];    // W, Up
      this._fpCamera.keysDown = [83, 40];   // S, Down
      this._fpCamera.keysLeft = [65, 37];   // A, Left
      this._fpCamera.keysRight = [68, 39];  // D, Right

      // Touch controls for mobile
      if (this.platform.isMobile) {
        this._fpCamera.inputs.addVirtualJoystick();
      }
    } else {
      this._fpCamera.position = new BABYLON.Vector3(cx, elevation + eyeHeight, cy);
    }

    this._scene.activeCamera = this._fpCamera;
    this._fpCamera.attachControl(this.canvas, true);
    this._isFirstPerson = true;
    this.eventBus.emit('toast', 'Walkthrough mode — WASD to move');
  }

  _exitFirstPerson() {
    if (!this._fpCamera) return;

    this._fpCamera.detachControl(this.canvas);
    this._scene.activeCamera = this.camera.camera;
    this.camera.camera.attachControl(this.canvas, true);
    this._isFirstPerson = false;
    this.eventBus.emit('toast', 'Orbit camera');
  }

  show() {
    this._visible = true;

    requestAnimationFrame(() => {
      if (!this._initialized) {
        if (!this._init()) return;
      }
      if (this._engine) {
        this._engine.resize();
      }
      if (this._dirty) {
        this.rebuild();
      }
    });
  }

  hide() {
    this._visible = false;
  }

  get scene() { return this._scene; }
  get isFirstPerson() { return this._isFirstPerson; }

  destroy() {
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }
    if (this._engine) {
      this._engine.stopRenderLoop();
    }
    if (this._scene) {
      this._scene.dispose();
    }
    if (this._engine) {
      this._engine.dispose();
    }
  }
}
