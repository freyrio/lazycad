/**
 * Command — Base command interface and concrete commands for undo/redo.
 */
import { Wall } from '../Wall.js';
import { Opening } from '../Opening.js';
import { Room } from '../Room.js';
import { Annotation } from '../Annotation.js';

/**
 * AddWallCommand — Add a wall to a floor.
 */
export class AddWallCommand {
  /**
   * @param {Floor} floor
   * @param {Array<{x,y}>} points
   * @param {object} props
   */
  constructor(floor, points, props = {}) {
    this.floor = floor;
    this.points = points;
    this.props = props;
    this.wall = null;
  }

  execute() {
    this.wall = this.floor.addWall(this.points, this.props);
  }

  undo() {
    if (this.wall) {
      this.floor.removeWall(this.wall.id);
    }
  }

  get description() { return 'Add wall'; }
}

/**
 * DeleteElementCommand — Delete an element from a floor.
 */
export class DeleteElementCommand {
  /**
   * @param {Floor} floor
   * @param {string} elementId
   */
  constructor(floor, elementId) {
    this.floor = floor;
    this.elementId = elementId;
    this._backup = null;
    this._type = null;
  }

  execute() {
    // Find and backup the element
    const found = this.floor.findElement(this.elementId);
    if (found) {
      this._type = found.type;
      this._backup = JSON.parse(JSON.stringify(found.element.toJSON()));

      switch (this._type) {
        case 'wall': this.floor.removeWall(this.elementId); break;
        case 'opening': this.floor.removeOpening(this.elementId); break;
        case 'room': this.floor.rooms = this.floor.rooms.filter(r => r.id !== this.elementId); break;
        case 'annotation': this.floor.annotations = this.floor.annotations.filter(a => a.id !== this.elementId); break;
      }
    }
  }

  undo() {
    if (!this._backup || !this._type) return;

    switch (this._type) {
      case 'wall': {
        const wall = Wall.fromJSON(this._backup);
        this.floor.walls.push(wall);
        break;
      }
      case 'opening': {
        const opening = Opening.fromJSON(this._backup);
        this.floor.openings.push(opening);
        break;
      }
      case 'room': {
        const room = Room.fromJSON(this._backup);
        this.floor.rooms.push(room);
        break;
      }
      case 'annotation': {
        const ann = Annotation.fromJSON(this._backup);
        this.floor.annotations.push(ann);
        break;
      }
    }
  }

  get description() { return `Delete ${this._type}`; }
}

/**
 * ModifyPropertyCommand — Change a property on an element.
 */
export class ModifyPropertyCommand {
  /**
   * @param {object} element
   * @param {string} property
   * @param {*} newValue
   */
  constructor(element, property, newValue) {
    this.element = element;
    this.property = property;
    this.newValue = newValue;
    this.oldValue = element[property];
  }

  execute() {
    this.element[this.property] = this.newValue;
  }

  undo() {
    this.element[this.property] = this.oldValue;
  }

  get description() { return `Change ${this.property}`; }
}

/**
 * MovePointCommand — Move a point on a wall.
 */
export class MovePointCommand {
  /**
   * @param {Wall} wall
   * @param {number} pointIndex
   * @param {{x,y}} newPosition
   */
  constructor(wall, pointIndex, newPosition) {
    this.wall = wall;
    this.pointIndex = pointIndex;
    this.newPosition = { ...newPosition };
    this.oldPosition = { ...wall.points[pointIndex] };
  }

  execute() {
    this.wall.points[this.pointIndex] = { ...this.newPosition };
  }

  undo() {
    this.wall.points[this.pointIndex] = { ...this.oldPosition };
  }

  get description() { return 'Move point'; }
}
