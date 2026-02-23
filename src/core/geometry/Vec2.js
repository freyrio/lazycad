/**
 * Vec2 — Immutable 2D vector math.
 * All methods return new Vec2 instances (immutable pattern).
 */
export class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  /** Create from an {x, y} object. */
  static from(obj) {
    return new Vec2(obj.x, obj.y);
  }

  /** Zero vector. */
  static zero() { return new Vec2(0, 0); }

  /** Add another vector. */
  add(v) { return new Vec2(this.x + v.x, this.y + v.y); }

  /** Subtract another vector. */
  sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }

  /** Multiply by scalar. */
  mul(s) { return new Vec2(this.x * s, this.y * s); }

  /** Divide by scalar. */
  div(s) { return new Vec2(this.x / s, this.y / s); }

  /** Dot product. */
  dot(v) { return this.x * v.x + this.y * v.y; }

  /** 2D cross product (z-component of 3D cross). */
  cross(v) { return this.x * v.y - this.y * v.x; }

  /** Length (magnitude). */
  length() { return Math.sqrt(this.x * this.x + this.y * this.y); }

  /** Squared length (avoids sqrt). */
  lengthSq() { return this.x * this.x + this.y * this.y; }

  /** Distance to another point. */
  distanceTo(v) { return this.sub(v).length(); }

  /** Squared distance to another point. */
  distanceToSq(v) { return this.sub(v).lengthSq(); }

  /** Normalized (unit) vector. Returns zero vector if length is 0. */
  normalize() {
    const len = this.length();
    if (len === 0) return Vec2.zero();
    return this.div(len);
  }

  /** Perpendicular vector (rotated 90 degrees counter-clockwise). */
  perp() { return new Vec2(-this.y, this.x); }

  /** Perpendicular vector (rotated 90 degrees clockwise). */
  perpCW() { return new Vec2(this.y, -this.x); }

  /** Negate. */
  neg() { return new Vec2(-this.x, -this.y); }

  /** Rotate by angle in radians. */
  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vec2(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos
    );
  }

  /** Angle of this vector from positive x-axis, in radians (-PI to PI). */
  angle() { return Math.atan2(this.y, this.x); }

  /** Angle to another vector, in radians. */
  angleTo(v) { return Math.atan2(v.y - this.y, v.x - this.x); }

  /** Linear interpolation to another vector. */
  lerp(v, t) {
    return new Vec2(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t
    );
  }

  /** Check approximate equality. */
  equals(v, epsilon = 1e-10) {
    return Math.abs(this.x - v.x) < epsilon && Math.abs(this.y - v.y) < epsilon;
  }

  /** Clamp to a range. */
  clamp(min, max) {
    return new Vec2(
      Math.max(min.x, Math.min(max.x, this.x)),
      Math.max(min.y, Math.min(max.y, this.y))
    );
  }

  /** Floor both components. */
  floor() { return new Vec2(Math.floor(this.x), Math.floor(this.y)); }

  /** Round both components. */
  round() { return new Vec2(Math.round(this.x), Math.round(this.y)); }

  /** Return a plain {x, y} object for serialization. */
  toJSON() { return { x: this.x, y: this.y }; }

  /** String representation. */
  toString() { return `(${this.x.toFixed(3)}, ${this.y.toFixed(3)})`; }

  /** Clone this vector. */
  clone() { return new Vec2(this.x, this.y); }

  /**
   * Project this vector onto another vector.
   */
  projectOnto(v) {
    const d = v.dot(v);
    if (d === 0) return Vec2.zero();
    return v.mul(this.dot(v) / d);
  }

  /**
   * Reflect this vector across a normal.
   */
  reflect(normal) {
    return this.sub(normal.mul(2 * this.dot(normal)));
  }

  /**
   * Closest point on a line segment (a, b) to this point.
   * Returns {point: Vec2, t: number} where t is 0..1 parameter along segment.
   */
  closestPointOnSegment(a, b) {
    const ab = b.sub(a);
    const lengthSq = ab.lengthSq();
    if (lengthSq === 0) return { point: a.clone(), t: 0 };
    let t = this.sub(a).dot(ab) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    return { point: a.add(ab.mul(t)), t };
  }

  /**
   * Distance from this point to a line segment (a, b).
   */
  distanceToSegment(a, b) {
    return this.distanceTo(this.closestPointOnSegment(a, b).point);
  }
}
