/**
 * Editor3D — Babylon.js 3D viewer for the floor plan.
 * Extrudes 2D wall polygons into 3D meshes, adds opening visuals,
 * generates floor slabs, and applies materials.
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

    // Camera preset events
    this.eventBus.on('camera:preset', (preset) => {
      if (this.camera) this.camera.goToPreset(preset);
    });
  }

  /**
   * Lazy-initialize the Babylon engine on first show.
   * This avoids initializing on a hidden canvas (0x0 size).
   */
  _init() {
    if (this._initialized) return true;

    // Check that Babylon.js is loaded
    if (typeof BABYLON === 'undefined') {
      this.eventBus.emit('toast', '3D engine failed to load — check your connection');
      return false;
    }

    try {
      // Create Babylon engine
      this._engine = new BABYLON.Engine(this.canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
      });

      // Create scene
      this._scene = new BABYLON.Scene(this._engine);
      this._scene.clearColor = new BABYLON.Color4(0.06, 0.06, 0.12, 1);
      this._scene.ambientColor = new BABYLON.Color3(0.15, 0.15, 0.2);

      // Lights
      this._setupLighting();

      // Materials
      this.materials = new MaterialLibrary(this._scene);

      // Camera
      this.camera = new CameraController(this._scene, this.canvas, this.platform);

      // Mesh builders
      this.wallBuilder = new WallMeshBuilder(this._scene, this.materials);
      this.slabBuilder = new SlabMeshBuilder(this._scene, this.materials);
      this.openingCSG = new OpeningCSG(this._scene, this.materials);

      // Render loop
      this._engine.runRenderLoop(() => {
        if (this._visible && this._scene) {
          this._scene.render();
        }
      });

      // Resize handler
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
    // Hemispheric light (ambient fill)
    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), this._scene);
    hemi.intensity = 0.6;
    hemi.diffuse = new BABYLON.Color3(0.9, 0.9, 1.0);
    hemi.groundColor = new BABYLON.Color3(0.15, 0.15, 0.2);

    // Directional light (sun-like)
    const dir = new BABYLON.DirectionalLight('dir', new BABYLON.Vector3(-0.5, -1, -0.5), this._scene);
    dir.intensity = 0.5;
    dir.diffuse = new BABYLON.Color3(1.0, 0.95, 0.85);

    // Shadow generator
    try {
      this._shadowGenerator = new BABYLON.ShadowGenerator(1024, dir);
      this._shadowGenerator.useBlurExponentialShadowMap = true;
      this._shadowGenerator.blurKernel = 16;
    } catch (e) {
      // Shadows not critical — continue without them
      this._shadowGenerator = null;
    }
  }

  /**
   * Rebuild all 3D meshes from the current floor plan data.
   */
  rebuild() {
    if (!this._initialized) return;

    try {
      // Dispose existing meshes
      for (const mesh of this._meshes) {
        if (mesh && !mesh.isDisposed()) mesh.dispose();
      }
      this._meshes = [];

      const floor = this.blueprint.activeFloor;
      if (!floor) return;

      const wallHeight = floor.ceilingHeight || 2.7;
      const slabThickness = floor.slabThickness || 0.3;
      const elevation = floor.elevation || 0;

      // Build wall meshes
      for (const wall of floor.walls) {
        try {
          const wallMesh = this.wallBuilder.build(wall, wallHeight, elevation);
          if (wallMesh) {
            // Add opening visuals as children of this wall
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
            this._meshes.push(wallMesh);
          }
        } catch (e) {
          // Skip this wall on error, continue with others
        }
      }

      // Build floor slab
      try {
        const slabMesh = this.slabBuilder.build(floor, elevation - slabThickness, slabThickness);
        if (slabMesh) {
          slabMesh.receiveShadows = true;
          this._meshes.push(slabMesh);
        }
      } catch (e) {
        // Slab not critical
      }

      // Build room floor fills
      const rooms = floor.rooms || [];
      for (const room of rooms) {
        try {
          const roomMesh = this.slabBuilder.buildRoomFloor(room, elevation + 0.001, this.materials);
          if (roomMesh) {
            roomMesh.receiveShadows = true;
            this._meshes.push(roomMesh);
          }
        } catch (e) {
          // Room floor not critical
        }
      }

      // Frame the camera on the scene
      if (this._meshes.length > 0) {
        this.camera.frameAll(this._meshes);
      }

      this._dirty = false;
    } catch (e) {
      this.eventBus.emit('toast', '3D rebuild failed');
    }
  }

  show() {
    this._visible = true;

    // Defer init + resize to next frame so the container is visible and sized.
    // The app.js view:changed handler removes 'hidden' after this handler runs,
    // so requestAnimationFrame ensures the canvas has layout dimensions.
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
