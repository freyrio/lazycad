/**
 * Room — A closed region representing a room.
 */
export class Room {
  /**
   * @param {string} floorId
   * @param {string} label
   * @param {Array<{x,y}>} polygon - Boundary in meters
   * @param {object} [props]
   */
  constructor(floorId, label, polygon, props = {}) {
    this.id = Room.generateId();
    this.floorId = floorId;
    this.label = label;
    this.polygon = polygon.map(p => ({ x: p.x, y: p.y }));
    this.floorMaterial = props.floorMaterial ?? 'default';
  }

  static generateId() {
    return 'rm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /**
   * Compute area in square meters.
   */
  get area() {
    let area = 0;
    const n = this.polygon.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += this.polygon[i].x * this.polygon[j].y;
      area -= this.polygon[j].x * this.polygon[i].y;
    }
    return Math.abs(area / 2);
  }

  toJSON() {
    return {
      id: this.id,
      floorId: this.floorId,
      label: this.label,
      polygon: this.polygon,
      floorMaterial: this.floorMaterial,
    };
  }

  static fromJSON(data) {
    const room = new Room(data.floorId, data.label, data.polygon, {
      floorMaterial: data.floorMaterial,
    });
    room.id = data.id;
    return room;
  }
}
