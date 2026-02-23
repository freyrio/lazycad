/**
 * Line2 — Line segment operations.
 */
import { Vec2 } from './Vec2.js';

export class Line2 {
  /**
   * @param {Vec2} a - Start point
   * @param {Vec2} b - End point
   */
  constructor(a, b) {
    this.a = a;
    this.b = b;
  }

  /** Direction vector (not normalized). */
  direction() { return this.b.sub(this.a); }

  /** Normalized direction. */
  unitDirection() { return this.direction().normalize(); }

  /** Length of the segment. */
  length() { return this.a.distanceTo(this.b); }

  /** Midpoint. */
  midpoint() { return this.a.lerp(this.b, 0.5); }

  /** Normal (perpendicular to direction, left side). */
  normal() { return this.unitDirection().perp(); }

  /**
   * Point at parameter t along the segment (0 = a, 1 = b).
   */
  pointAt(t) { return this.a.lerp(this.b, t); }

  /**
   * Closest point on this segment to a given point.
   * @returns {{ point: Vec2, t: number }}
   */
  closestPoint(p) {
    return p.closestPointOnSegment(this.a, this.b);
  }

  /**
   * Distance from a point to this segment.
   */
  distanceToPoint(p) {
    return p.distanceToSegment(this.a, this.b);
  }

  /**
   * Offset this line segment by a distance (positive = left side).
   * @param {number} dist
   * @returns {Line2}
   */
  offset(dist) {
    const n = this.normal().mul(dist);
    return new Line2(this.a.add(n), this.b.add(n));
  }

  /**
   * Line-line intersection (treating both as infinite lines).
   * @param {Line2} other
   * @returns {{ point: Vec2, t: number, u: number } | null}
   */
  intersectLine(other) {
    const d1 = this.direction();
    const d2 = other.direction();
    const denom = d1.cross(d2);

    if (Math.abs(denom) < 1e-10) return null; // parallel

    const d = other.a.sub(this.a);
    const t = d.cross(d2) / denom;
    const u = d.cross(d1) / denom;

    return {
      point: this.a.add(d1.mul(t)),
      t,
      u
    };
  }

  /**
   * Segment-segment intersection (bounded to 0..1 on both).
   * @param {Line2} other
   * @returns {Vec2 | null}
   */
  intersectSegment(other) {
    const result = this.intersectLine(other);
    if (!result) return null;
    if (result.t < -1e-10 || result.t > 1 + 1e-10) return null;
    if (result.u < -1e-10 || result.u > 1 + 1e-10) return null;
    return result.point;
  }

  /** Angle of this segment, in radians. */
  angle() { return this.direction().angle(); }

  /** Clone. */
  clone() { return new Line2(this.a.clone(), this.b.clone()); }

  /** Reverse direction. */
  reverse() { return new Line2(this.b, this.a); }

  /** Serialize. */
  toJSON() { return { a: this.a.toJSON(), b: this.b.toJSON() }; }
}
