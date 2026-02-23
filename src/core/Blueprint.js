/**
 * Blueprint — Top-level document model.
 */
import { Floor } from './Floor.js';

export class Blueprint {
  constructor() {
    this.id = Blueprint.generateId();
    this.name = 'Untitled Blueprint';
    this.scale = {
      pixelsPerMeter: 100,
      origin: { x: 0, y: 0 },
      rotation: 0,
      calibrationPoints: [],
    };
    this.floors = [];
    this._activeFloorId = null;
    this.metadata = {
      address: '',
      source: 'new',
      created: Date.now(),
      modified: Date.now(),
    };

    // Always start with one floor
    this.addFloor('Ground Floor');
  }

  static generateId() {
    return 'bp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /**
   * Add a new floor.
   * @param {string} name
   * @returns {Floor}
   */
  addFloor(name) {
    const floor = new Floor(name);
    floor.elevation = this.floors.length * 3.0; // default 3m per floor
    this.floors.push(floor);
    if (!this._activeFloorId) {
      this._activeFloorId = floor.id;
    }
    this.metadata.modified = Date.now();
    return floor;
  }

  /**
   * Remove a floor by id.
   */
  removeFloor(floorId) {
    if (this.floors.length <= 1) return; // always keep at least one floor
    this.floors = this.floors.filter(f => f.id !== floorId);
    if (this._activeFloorId === floorId) {
      this._activeFloorId = this.floors[0]?.id || null;
    }
    this.metadata.modified = Date.now();
  }

  /**
   * Get a floor by id.
   */
  getFloor(floorId) {
    return this.floors.find(f => f.id === floorId) || null;
  }

  /**
   * Get the active floor.
   */
  get activeFloor() {
    return this.floors.find(f => f.id === this._activeFloorId) || this.floors[0] || null;
  }

  /**
   * Set the active floor by id.
   */
  setActiveFloor(floorId) {
    if (this.getFloor(floorId)) {
      this._activeFloorId = floorId;
    }
  }

  /**
   * Move floor up in the stack (lower index = lower elevation).
   */
  moveFloorUp(floorId) {
    const idx = this.floors.findIndex(f => f.id === floorId);
    if (idx < this.floors.length - 1) {
      [this.floors[idx], this.floors[idx + 1]] = [this.floors[idx + 1], this.floors[idx]];
      this.metadata.modified = Date.now();
    }
  }

  /**
   * Move floor down in the stack.
   */
  moveFloorDown(floorId) {
    const idx = this.floors.findIndex(f => f.id === floorId);
    if (idx > 0) {
      [this.floors[idx], this.floors[idx - 1]] = [this.floors[idx - 1], this.floors[idx]];
      this.metadata.modified = Date.now();
    }
  }

  /**
   * Duplicate a floor's layout (walls, openings) to a new floor.
   */
  copyFloor(sourceFloorId, newName) {
    const src = this.getFloor(sourceFloorId);
    if (!src) return null;

    const json = src.toJSON();
    const copy = Floor.fromJSON(json);
    // Assign new IDs
    copy.id = Floor.generateId();
    copy.name = newName || `${src.name} (copy)`;
    copy.elevation = src.elevation + src.floorToFloor;
    copy.bitmap = null; // don't copy bitmap

    // Reassign IDs for all elements to avoid duplicates
    const idMap = {};
    for (const wall of copy.walls) {
      const oldId = wall.id;
      wall.id = 'w_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      wall.floorId = copy.id;
      idMap[oldId] = wall.id;
    }
    for (const opening of copy.openings) {
      opening.id = 'op_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      if (idMap[opening.wallId]) {
        opening.wallId = idMap[opening.wallId];
      }
    }
    for (const room of copy.rooms) {
      room.id = 'rm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      room.floorId = copy.id;
    }
    copy.annotations = []; // don't copy annotations

    this.floors.push(copy);
    this.metadata.modified = Date.now();
    return copy;
  }

  /**
   * Set scale from two-point calibration.
   * @param {number} pixelDistance - Distance in bitmap pixels
   * @param {number} realMeters - Real-world distance in meters
   */
  calibrate(pixelDistance, realMeters) {
    this.scale.pixelsPerMeter = pixelDistance / realMeters;
    this.metadata.modified = Date.now();
  }

  /**
   * Set scale from known ratio and DPI.
   * @param {number} scaleDenominator - e.g., 100 for 1:100
   * @param {number} dpi - Scanner DPI
   */
  calibrateFromScale(scaleDenominator, dpi) {
    // At 1:N, 1cm paper = N cm real = N/100 m real
    // At dpi, 1cm = dpi/2.54 pixels
    this.scale.pixelsPerMeter = (dpi / 2.54) / (scaleDenominator / 100);
    this.metadata.modified = Date.now();
  }

  /**
   * Convert pixel coordinates to world meters.
   */
  pixelToWorld(px, py) {
    const cos = Math.cos(-this.scale.rotation);
    const sin = Math.sin(-this.scale.rotation);
    const dx = px - this.scale.origin.x;
    const dy = py - this.scale.origin.y;
    return {
      x: (dx * cos - dy * sin) / this.scale.pixelsPerMeter,
      y: (dx * sin + dy * cos) / this.scale.pixelsPerMeter,
    };
  }

  /**
   * Convert world meters to pixel coordinates.
   */
  worldToPixel(wx, wy) {
    const cos = Math.cos(this.scale.rotation);
    const sin = Math.sin(this.scale.rotation);
    return {
      x: (wx * cos - wy * sin) * this.scale.pixelsPerMeter + this.scale.origin.x,
      y: (wx * sin + wy * cos) * this.scale.pixelsPerMeter + this.scale.origin.y,
    };
  }

  /**
   * Serialize to JSON.
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      scale: { ...this.scale },
      activeFloorId: this._activeFloorId,
      floors: this.floors.map(f => f.toJSON()),
      metadata: { ...this.metadata },
    };
  }

  /**
   * Load from JSON.
   */
  static fromJSON(data) {
    const bp = new Blueprint();
    bp.floors = []; // clear default floor
    bp.id = data.id;
    bp.name = data.name;
    bp.scale = { ...data.scale };
    bp.metadata = { ...data.metadata };
    bp.floors = data.floors.map(f => Floor.fromJSON(f));
    bp._activeFloorId = data.activeFloorId || bp.floors[0]?.id || null;
    return bp;
  }
}
