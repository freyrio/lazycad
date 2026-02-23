/**
 * Opening — A door, window, or opening placed on a wall.
 */
export class Opening {
  /**
   * @param {string} wallId
   * @param {string} type - "door", "window", "opening"
   * @param {number} position - Distance along wall centerline in meters
   * @param {object} [props]
   */
  constructor(wallId, type, position, props = {}) {
    this.id = Opening.generateId();
    this.wallId = wallId;
    this.type = type;
    this.position = position;
    this.width = props.width ?? (type === 'door' ? 0.9 : 1.2);
    this.height = props.height ?? (type === 'door' ? 2.1 : 1.2);
    this.sillHeight = props.sillHeight ?? (type === 'door' ? 0 : 0.9);
    this.swing = props.swing ?? (type === 'door' ? 'left' : null);
  }

  static generateId() {
    return 'op_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  toJSON() {
    return {
      id: this.id,
      wallId: this.wallId,
      type: this.type,
      position: this.position,
      width: this.width,
      height: this.height,
      sillHeight: this.sillHeight,
      swing: this.swing,
    };
  }

  static fromJSON(data) {
    const opening = new Opening(data.wallId, data.type, data.position, {
      width: data.width,
      height: data.height,
      sillHeight: data.sillHeight,
      swing: data.swing,
    });
    opening.id = data.id;
    return opening;
  }
}
