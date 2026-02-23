/**
 * Wall — Wall entity defined by a centerline polyline.
 */
import { Vec2 } from './geometry/Vec2.js';
import { Line2 } from './geometry/Line2.js';

export class Wall {
  /**
   * @param {string} floorId
   * @param {Array<{x,y}>} points - Centerline points in meters
   * @param {object} [props]
   */
  constructor(floorId, points, props = {}) {
    this.id = Wall.generateId();
    this.floorId = floorId;
    this.points = points.map(p => ({ x: p.x, y: p.y }));
    this.thickness = props.thickness ?? 0.20;
    this.height = props.height ?? null;  // null = use floor height
    this.material = props.material ?? 'concrete';
    this.isExterior = props.isExterior ?? true;
  }

  static generateId() {
    return 'w_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /**
   * Get centerline points as Vec2 instances.
   */
  getPoints() {
    return this.points.map(p => new Vec2(p.x, p.y));
  }

  /**
   * Get centerline segments as Line2 instances.
   */
  getSegments() {
    const pts = this.getPoints();
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      segs.push(new Line2(pts[i], pts[i + 1]));
    }
    return segs;
  }

  /**
   * Total centerline length.
   */
  get length() {
    let total = 0;
    for (let i = 0; i < this.points.length - 1; i++) {
      const dx = this.points[i + 1].x - this.points[i].x;
      const dy = this.points[i + 1].y - this.points[i].y;
      total += Math.sqrt(dx * dx + dy * dy);
    }
    return total;
  }

  /**
   * Get a point at a given distance along the centerline.
   * @param {number} distance - Distance in meters from the start
   * @returns {{ point: Vec2, direction: Vec2, segmentIndex: number } | null}
   */
  pointAtDistance(distance) {
    const pts = this.getPoints();
    let remaining = distance;

    for (let i = 0; i < pts.length - 1; i++) {
      const seg = pts[i + 1].sub(pts[i]);
      const segLen = seg.length();
      if (remaining <= segLen || i === pts.length - 2) {
        const t = Math.min(1, remaining / segLen);
        return {
          point: pts[i].lerp(pts[i + 1], t),
          direction: seg.normalize(),
          segmentIndex: i,
        };
      }
      remaining -= segLen;
    }
    return null;
  }

  /**
   * Get the 2D outline polygon of this wall (offset from centerline by thickness/2).
   * Returns an array of Vec2 forming a closed polygon.
   */
  getOutlinePolygon() {
    const pts = this.getPoints();
    if (pts.length < 2) return [];

    const halfThick = this.thickness / 2;
    const leftPoints = [];
    const rightPoints = [];

    for (let i = 0; i < pts.length - 1; i++) {
      const seg = new Line2(pts[i], pts[i + 1]);
      const left = seg.offset(halfThick);
      const right = seg.offset(-halfThick);

      if (i === 0) {
        leftPoints.push(left.a);
        rightPoints.push(right.a);
      }

      // If there's a previous segment, compute miter at the junction
      if (i > 0 && leftPoints.length > 0) {
        const prevSegLeft = new Line2(leftPoints[leftPoints.length - 2] || leftPoints[leftPoints.length - 1], leftPoints[leftPoints.length - 1]);
        // For simplicity, just use the offset points directly (proper mitering comes in Phase 3)
      }

      leftPoints.push(left.b);
      rightPoints.push(right.b);
    }

    // Build closed polygon: left side forward, right side backward
    return [...leftPoints, ...rightPoints.reverse()];
  }

  /**
   * Distance from a world point to this wall's centerline.
   * @returns {{ distance: number, closestPoint: Vec2, segmentIndex: number, t: number }}
   */
  distanceToPoint(wx, wy) {
    const p = new Vec2(wx, wy);
    const pts = this.getPoints();
    let bestDist = Infinity;
    let bestPoint = pts[0];
    let bestSeg = 0;
    let bestT = 0;

    for (let i = 0; i < pts.length - 1; i++) {
      const result = p.closestPointOnSegment(pts[i], pts[i + 1]);
      const dist = p.distanceTo(result.point);
      if (dist < bestDist) {
        bestDist = dist;
        bestPoint = result.point;
        bestSeg = i;
        bestT = result.t;
      }
    }

    return { distance: bestDist, closestPoint: bestPoint, segmentIndex: bestSeg, t: bestT };
  }

  /**
   * Check if a screen/world point is within hit distance of this wall.
   * @param {number} wx - World x
   * @param {number} wy - World y
   * @param {number} [hitMargin=0] - Extra margin in world units
   */
  hitTest(wx, wy, hitMargin = 0) {
    const result = this.distanceToPoint(wx, wy);
    return result.distance <= (this.thickness / 2 + hitMargin);
  }

  /**
   * Get the bounding box in world coordinates.
   */
  getBounds() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const margin = this.thickness / 2;
    for (const p of this.points) {
      minX = Math.min(minX, p.x - margin);
      minY = Math.min(minY, p.y - margin);
      maxX = Math.max(maxX, p.x + margin);
      maxY = Math.max(maxY, p.y + margin);
    }
    return { minX, minY, maxX, maxY };
  }

  toJSON() {
    return {
      id: this.id,
      floorId: this.floorId,
      points: this.points,
      thickness: this.thickness,
      height: this.height,
      material: this.material,
      isExterior: this.isExterior,
    };
  }

  static fromJSON(data) {
    const wall = new Wall(data.floorId, data.points, {
      thickness: data.thickness,
      height: data.height,
      material: data.material,
      isExterior: data.isExterior,
    });
    wall.id = data.id;
    return wall;
  }
}
