/**
 * Annotation — Measurement, note, or elevation marker.
 */
export class Annotation {
  /**
   * @param {string} type - "dimension", "note", "elevation"
   * @param {Array<{x,y}>} points
   * @param {string} text
   * @param {number|null} value - Computed or manual dimension in meters
   */
  constructor(type, points, text, value = null) {
    this.id = Annotation.generateId();
    this.type = type;
    this.points = points.map(p => ({ x: p.x, y: p.y }));
    this.text = text;
    this.value = value;
  }

  static generateId() {
    return 'an_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      points: this.points,
      text: this.text,
      value: this.value,
    };
  }

  static fromJSON(data) {
    const ann = new Annotation(data.type, data.points, data.text, data.value);
    ann.id = data.id;
    return ann;
  }
}
