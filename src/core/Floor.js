/**
 * Floor — A single floor level in the blueprint.
 */
import { Wall } from './Wall.js';
import { Opening } from './Opening.js';
import { Room } from './Room.js';
import { Annotation } from './Annotation.js';

export class Floor {
  constructor(name = 'Floor') {
    this.id = Floor.generateId();
    this.name = name;
    this.elevation = 0;           // meters, FFL relative to ±0.00
    this.floorToFloor = 3.0;      // meters
    this.ceilingHeight = 2.7;     // meters, clear height
    this.slabThickness = 0.3;     // meters
    this.bitmap = null;           // { image, url, width, height } or null
    this.walls = [];
    this.openings = [];
    this.rooms = [];
    this.annotations = [];
  }

  static generateId() {
    return 'fl_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /**
   * Add a wall to this floor.
   * @param {Array<{x,y}>} points - Centerline points in world meters
   * @param {object} [props] - Optional properties
   * @returns {Wall}
   */
  addWall(points, props = {}) {
    const wall = new Wall(this.id, points, props);
    this.walls.push(wall);
    return wall;
  }

  /**
   * Remove a wall by id.
   */
  removeWall(wallId) {
    // Also remove openings on this wall
    this.openings = this.openings.filter(o => o.wallId !== wallId);
    this.walls = this.walls.filter(w => w.id !== wallId);
  }

  /**
   * Get a wall by id.
   */
  getWall(wallId) {
    return this.walls.find(w => w.id === wallId) || null;
  }

  /**
   * Add an opening on a wall.
   */
  addOpening(wallId, type, position, props = {}) {
    const opening = new Opening(wallId, type, position, props);
    this.openings.push(opening);
    return opening;
  }

  /**
   * Remove an opening by id.
   */
  removeOpening(openingId) {
    this.openings = this.openings.filter(o => o.id !== openingId);
  }

  /**
   * Get openings for a specific wall.
   */
  getOpeningsForWall(wallId) {
    return this.openings.filter(o => o.wallId === wallId);
  }

  /**
   * Add a room.
   */
  addRoom(label, polygon, props = {}) {
    const room = new Room(this.id, label, polygon, props);
    this.rooms.push(room);
    return room;
  }

  /**
   * Add an annotation.
   */
  addAnnotation(type, points, text, value = null) {
    const annotation = new Annotation(type, points, text, value);
    this.annotations.push(annotation);
    return annotation;
  }

  /**
   * Get all elements (walls, openings, rooms, annotations) as a flat list.
   */
  getAllElements() {
    return [
      ...this.walls.map(w => ({ type: 'wall', element: w })),
      ...this.openings.map(o => ({ type: 'opening', element: o })),
      ...this.rooms.map(r => ({ type: 'room', element: r })),
      ...this.annotations.map(a => ({ type: 'annotation', element: a })),
    ];
  }

  /**
   * Find an element by id across all types.
   */
  findElement(id) {
    for (const w of this.walls) if (w.id === id) return { type: 'wall', element: w };
    for (const o of this.openings) if (o.id === id) return { type: 'opening', element: o };
    for (const r of this.rooms) if (r.id === id) return { type: 'room', element: r };
    for (const a of this.annotations) if (a.id === id) return { type: 'annotation', element: a };
    return null;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      elevation: this.elevation,
      floorToFloor: this.floorToFloor,
      ceilingHeight: this.ceilingHeight,
      slabThickness: this.slabThickness,
      bitmap: this.bitmap ? { url: this.bitmap.url, width: this.bitmap.width, height: this.bitmap.height } : null,
      walls: this.walls.map(w => w.toJSON()),
      openings: this.openings.map(o => o.toJSON()),
      rooms: this.rooms.map(r => r.toJSON()),
      annotations: this.annotations.map(a => a.toJSON()),
    };
  }

  static fromJSON(data) {
    const floor = new Floor(data.name);
    floor.id = data.id;
    floor.elevation = data.elevation;
    floor.floorToFloor = data.floorToFloor;
    floor.ceilingHeight = data.ceilingHeight;
    floor.slabThickness = data.slabThickness;
    floor.bitmap = data.bitmap;
    floor.walls = data.walls.map(w => Wall.fromJSON(w));
    floor.openings = data.openings.map(o => Opening.fromJSON(o));
    floor.rooms = (data.rooms || []).map(r => Room.fromJSON(r));
    floor.annotations = (data.annotations || []).map(a => Annotation.fromJSON(a));
    return floor;
  }
}
