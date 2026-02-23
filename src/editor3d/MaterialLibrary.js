/**
 * MaterialLibrary — Basic PBR materials for 3D rendering.
 */
/* global BABYLON */

export class MaterialLibrary {
  constructor(scene) {
    this._scene = scene;
    this._materials = new Map();
    this._createDefaults();
  }

  _createDefaults() {
    // Concrete (walls)
    const concrete = new BABYLON.StandardMaterial('mat_concrete', this._scene);
    concrete.diffuseColor = new BABYLON.Color3(0.75, 0.73, 0.70);
    concrete.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    concrete.roughness = 0.9;
    this._materials.set('concrete', concrete);

    // Partition (interior walls)
    const partition = new BABYLON.StandardMaterial('mat_partition', this._scene);
    partition.diffuseColor = new BABYLON.Color3(0.85, 0.83, 0.80);
    partition.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    partition.roughness = 0.85;
    this._materials.set('partition', partition);

    // Timber
    const timber = new BABYLON.StandardMaterial('mat_timber', this._scene);
    timber.diffuseColor = new BABYLON.Color3(0.65, 0.45, 0.28);
    timber.specularColor = new BABYLON.Color3(0.15, 0.12, 0.08);
    timber.roughness = 0.7;
    this._materials.set('timber', timber);

    // Glass
    const glass = new BABYLON.StandardMaterial('mat_glass', this._scene);
    glass.diffuseColor = new BABYLON.Color3(0.7, 0.85, 1.0);
    glass.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    glass.alpha = 0.3;
    glass.backFaceCulling = false;
    this._materials.set('glass', glass);

    // Floor slab
    const slab = new BABYLON.StandardMaterial('mat_slab', this._scene);
    slab.diffuseColor = new BABYLON.Color3(0.55, 0.55, 0.55);
    slab.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    this._materials.set('slab', slab);

    // Wood floor
    const wood = new BABYLON.StandardMaterial('mat_wood', this._scene);
    wood.diffuseColor = new BABYLON.Color3(0.6, 0.42, 0.25);
    wood.specularColor = new BABYLON.Color3(0.2, 0.15, 0.1);
    this._materials.set('wood', wood);

    // Tile floor
    const tile = new BABYLON.StandardMaterial('mat_tile', this._scene);
    tile.diffuseColor = new BABYLON.Color3(0.8, 0.78, 0.75);
    tile.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    this._materials.set('tile', tile);

    // Carpet
    const carpet = new BABYLON.StandardMaterial('mat_carpet', this._scene);
    carpet.diffuseColor = new BABYLON.Color3(0.4, 0.35, 0.45);
    carpet.specularColor = new BABYLON.Color3(0.02, 0.02, 0.02);
    this._materials.set('carpet', carpet);

    // Marble
    const marble = new BABYLON.StandardMaterial('mat_marble', this._scene);
    marble.diffuseColor = new BABYLON.Color3(0.9, 0.88, 0.85);
    marble.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4);
    this._materials.set('marble', marble);

    // Default floor
    const defaultFloor = new BABYLON.StandardMaterial('mat_default', this._scene);
    defaultFloor.diffuseColor = new BABYLON.Color3(0.65, 0.63, 0.60);
    defaultFloor.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    this._materials.set('default', defaultFloor);

    // Door frame
    const doorFrame = new BABYLON.StandardMaterial('mat_doorframe', this._scene);
    doorFrame.diffuseColor = new BABYLON.Color3(0.55, 0.38, 0.22);
    doorFrame.specularColor = new BABYLON.Color3(0.15, 0.12, 0.08);
    this._materials.set('doorframe', doorFrame);
  }

  /**
   * Get a material by name.
   */
  get(name) {
    return this._materials.get(name) || this._materials.get('concrete');
  }

  /**
   * Get the floor material for a room.
   */
  getFloorMaterial(floorMaterial) {
    return this._materials.get(floorMaterial) || this._materials.get('default');
  }
}
