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
    this.metadata.modified = Date.now();
    return floor;
  }

  /**
   * Remove a floor by id.
   */
  removeFloor(floorId) {
    this.floors = this.floors.filter(f => f.id !== floorId);
    this.metadata.modified = Date.now();
  }

  /**
   * Get a floor by id.
   */
  getFloor(floorId) {
    return this.floors.find(f => f.id === floorId) || null;
  }

  /**
   * Get the active (first) floor.
   */
  get activeFloor() {
    return this.floors[0] || null;
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
    return bp;
  }
}
