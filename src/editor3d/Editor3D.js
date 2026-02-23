/**
 * Editor3D — Babylon.js 3D viewer for the floor plan.
 * Extrudes 2D wall polygons into 3D meshes, subtracts openings,
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

    this._init();
  }

  _init() {
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
      if (this._visible) {
        this._scene.render();
      }
    });

    // Resize handler
    this._resizeHandler = () => this._engine.resize();
    window.addEventListener('resize', this._resizeHandler);

    // Events
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
    this.eventBus.on('camera:preset', (preset) => this.camera.goToPreset(preset));
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
    this._shadowGenerator = new BABYLON.ShadowGenerator(1024, dir);
    this._shadowGenerator.useBlurExponentialShadowMap = true;
    this._shadowGenerator.blurKernel = 16;
  }

  /**
   * Rebuild all 3D meshes from the current floor plan data.
   */
  rebuild() {
    // Dispose existing meshes
    for (const mesh of this._meshes) {
      mesh.dispose();
    }
    this._meshes = [];

    const floor = this.blueprint.activeFloor;
    if (!floor) return;

    const wallHeight = floor.ceilingHeight || 2.7;
    const slabThickness = floor.slabThickness || 0.3;
    const elevation = floor.elevation || 0;

    // Build wall meshes
    for (const wall of floor.walls) {
      const wallMesh = this.wallBuilder.build(wall, wallHeight, elevation);
      if (wallMesh) {
        // Subtract openings from this wall
        const wallOpenings = floor.getOpeningsForWall(wall.id);
        let finalMesh = wallMesh;
        if (wallOpenings.length > 0) {
          finalMesh = this.openingCSG.subtractOpenings(wallMesh, wall, wallOpenings, wallHeight, elevation);
        }

        this._shadowGenerator.addShadowCaster(finalMesh);
        finalMesh.receiveShadows = true;
        this._meshes.push(finalMesh);
      }
    }

    // Build floor slab
    const slabMesh = this.slabBuilder.build(floor, elevation - slabThickness, slabThickness);
    if (slabMesh) {
      slabMesh.receiveShadows = true;
      this._meshes.push(slabMesh);
    }

    // Build room floor fills (thin colored slabs)
    for (const room of floor.rooms) {
      const roomMesh = this.slabBuilder.buildRoomFloor(room, elevation + 0.001, this.materials);
      if (roomMesh) {
        roomMesh.receiveShadows = true;
        this._meshes.push(roomMesh);
      }
    }

    // Frame the camera on the scene
    this.camera.frameAll(this._meshes);

    this._dirty = false;
  }

  show() {
    this._visible = true;
    if (this._dirty) {
      this.rebuild();
    }
    this._engine.resize();
  }

  hide() {
    this._visible = false;
  }

  get scene() { return this._scene; }

  destroy() {
    window.removeEventListener('resize', this._resizeHandler);
    this._engine.stopRenderLoop();
    this._scene.dispose();
    this._engine.dispose();
  }
}
