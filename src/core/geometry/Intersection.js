/**
 * Intersection — Line-line and line-polygon intersection utilities.
 */
import { Vec2 } from './Vec2.js';

export const Intersection = {
  /**
   * Infinite line-line intersection.
   * Lines defined by point + direction.
   * @returns {Vec2 | null}
   */
  lineLine(p1, d1, p2, d2) {
    const denom = d1.cross(d2);
    if (Math.abs(denom) < 1e-10) return null;
    const d = p2.sub(p1);
    const t = d.cross(d2) / denom;
    return p1.add(d1.mul(t));
  },

  /**
   * Segment-segment intersection.
   * @returns {{ point: Vec2, t: number, u: number } | null}
   */
  segmentSegment(a1, a2, b1, b2) {
    const d1 = a2.sub(a1);
    const d2 = b2.sub(b1);
    const denom = d1.cross(d2);
    if (Math.abs(denom) < 1e-10) return null;

    const d = b1.sub(a1);
    const t = d.cross(d2) / denom;
    const u = d.cross(d1) / denom;

    if (t < -1e-10 || t > 1 + 1e-10) return null;
    if (u < -1e-10 || u > 1 + 1e-10) return null;

    return {
      point: a1.add(d1.mul(t)),
      t: Math.max(0, Math.min(1, t)),
      u: Math.max(0, Math.min(1, u))
    };
  },

  /**
   * Point-in-polygon test using ray casting.
   * @param {Vec2} point
   * @param {Vec2[]} polygon
   * @returns {boolean}
   */
  pointInPolygon(point, polygon) {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const pi = polygon[i];
      const pj = polygon[j];
      if ((pi.y > point.y) !== (pj.y > point.y) &&
          point.x < (pj.x - pi.x) * (point.y - pi.y) / (pj.y - pi.y) + pi.x) {
        inside = !inside;
      }
    }
    return inside;
  },

  /**
   * Closest point on a polygon boundary to a given point.
   * @param {Vec2} point
   * @param {Vec2[]} polygon
   * @returns {{ point: Vec2, edgeIndex: number, t: number, distance: number }}
   */
  closestPointOnPolygon(point, polygon) {
    let best = null;
    const n = polygon.length;
    for (let i = 0; i < n; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % n];
      const result = point.closestPointOnSegment(a, b);
      const dist = point.distanceTo(result.point);
      if (!best || dist < best.distance) {
        best = { point: result.point, edgeIndex: i, t: result.t, distance: dist };
      }
    }
    return best;
  },

  /**
   * Compute the area of a polygon (signed — positive for CCW).
   * @param {Vec2[]} polygon
   * @returns {number}
   */
  polygonArea(polygon) {
    let area = 0;
    const n = polygon.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += polygon[i].x * polygon[j].y;
      area -= polygon[j].x * polygon[i].y;
    }
    return area / 2;
  },

  /**
   * Centroid of a polygon.
   * @param {Vec2[]} polygon
   * @returns {Vec2}
   */
  polygonCentroid(polygon) {
    let cx = 0, cy = 0;
    const n = polygon.length;
    const area = Intersection.polygonArea(polygon);
    if (Math.abs(area) < 1e-10) {
      // Degenerate, return average
      for (const p of polygon) { cx += p.x; cy += p.y; }
      return new Vec2(cx / n, cy / n);
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const f = polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
      cx += (polygon[i].x + polygon[j].x) * f;
      cy += (polygon[i].y + polygon[j].y) * f;
    }
    const a6 = area * 6;
    return new Vec2(cx / a6, cy / a6);
  }
};
