/**
 * SnapEngine — Orchestrates all snap providers.
 * Given a world position and context, returns the best snap result.
 */
import { Vec2 } from '../geometry/Vec2.js';

export class SnapEngine {
  /**
   * @param {EventBus} eventBus
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.providers = [];
    this.enabled = true;
    this.snapRadius = 15; // screen pixels
    this._lastSnapType = null; // for haptic dedup
  }

  /**
   * Add a snap provider.
   * @param {{ name: string, priority: number, snap: Function }} provider
   */
  addProvider(provider) {
    this.providers.push(provider);
    this.providers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove a provider by name.
   */
  removeProvider(name) {
    this.providers = this.providers.filter(p => p.name !== name);
  }

  /**
   * Find the best snap for a world position.
   * @param {number} wx - World x
   * @param {number} wy - World y
   * @param {object} context - { viewport, floor, lastPoint, excludeIds }
   * @returns {{ x: number, y: number, type: string, guides: Array } | null}
   */
  snap(wx, wy, context) {
    if (!this.enabled) return null;

    const worldRadius = this.snapRadius / context.viewport.scale;
    let bestResult = null;
    let bestDist = worldRadius;
    let guides = [];

    for (const provider of this.providers) {
      if (!provider.enabled) continue;

      const result = provider.snap(wx, wy, worldRadius, context);
      if (!result) continue;

      const dist = new Vec2(wx, wy).distanceTo(new Vec2(result.x, result.y));
      if (dist < bestDist) {
        bestDist = dist;
        bestResult = result;
      }

      if (result.guides) {
        guides.push(...result.guides);
      }
    }

    if (bestResult) {
      bestResult.guides = guides;

      // Emit snap event for haptic feedback (only when snap type changes)
      if (bestResult.type !== this._lastSnapType) {
        this._lastSnapType = bestResult.type;
        this.eventBus.emit('snap:hit', { type: bestResult.type });
      }
    } else if (this._lastSnapType) {
      this._lastSnapType = null;
    }

    return bestResult;
  }

  /**
   * Toggle all snapping.
   */
  toggle() {
    this.enabled = !this.enabled;
    this.eventBus.emit('snap:toggled', this.enabled);
  }
}

/**
 * GridSnap — Snap to regular grid intersections.
 */
export class GridSnap {
  constructor(gridLayer) {
    this.name = 'grid';
    this.priority = 1;
    this.enabled = true;
    this.gridLayer = gridLayer;
  }

  snap(wx, wy, radius, context) {
    const spacing = this.gridLayer.getGridSpacing(context.viewport.scale);
    const snappedX = Math.round(wx / spacing) * spacing;
    const snappedY = Math.round(wy / spacing) * spacing;

    const dist = Math.sqrt((wx - snappedX) ** 2 + (wy - snappedY) ** 2);
    if (dist > radius) return null;

    return { x: snappedX, y: snappedY, type: 'grid' };
  }
}

/**
 * EndpointSnap — Snap to wall endpoints.
 */
export class EndpointSnap {
  constructor() {
    this.name = 'endpoint';
    this.priority = 10;
    this.enabled = true;
  }

  snap(wx, wy, radius, context) {
    if (!context.floor) return null;

    let best = null;
    let bestDist = radius;

    for (const wall of context.floor.walls) {
      if (context.excludeIds && context.excludeIds.includes(wall.id)) continue;

      for (const p of wall.points) {
        const dist = Math.sqrt((wx - p.x) ** 2 + (wy - p.y) ** 2);
        if (dist < bestDist) {
          bestDist = dist;
          best = { x: p.x, y: p.y, type: 'endpoint' };
        }
      }
    }

    return best;
  }
}

/**
 * AngleSnap — Lock to 0/45/90 degrees from the last point.
 */
export class AngleSnap {
  constructor() {
    this.name = 'angle';
    this.priority = 5;
    this.enabled = true;
    this.angles = [0, 45, 90, 135, 180, 225, 270, 315]; // degrees
    this.tolerance = 5; // degrees
  }

  snap(wx, wy, radius, context) {
    if (!context.lastPoint) return null;

    const lp = context.lastPoint;
    const dx = wx - lp.x;
    const dy = wy - lp.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001) return null;

    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const normalizedAngle = ((angle % 360) + 360) % 360;

    for (const snapAngle of this.angles) {
      let diff = Math.abs(normalizedAngle - snapAngle);
      if (diff > 180) diff = 360 - diff;

      if (diff <= this.tolerance) {
        const rad = snapAngle * Math.PI / 180;
        const snappedX = lp.x + dist * Math.cos(rad);
        const snappedY = lp.y + dist * Math.sin(rad);

        return {
          x: snappedX,
          y: snappedY,
          type: `${snapAngle}°`,
          guides: [{
            type: 'angle',
            from: lp,
            to: { x: snappedX, y: snappedY },
          }]
        };
      }
    }

    return null;
  }
}

/**
 * WallSnap — Snap to nearest point on a wall centerline.
 */
export class WallSnap {
  constructor() {
    this.name = 'wall';
    this.priority = 7;
    this.enabled = true;
  }

  snap(wx, wy, radius, context) {
    if (!context.floor) return null;

    let best = null;
    let bestDist = radius;

    for (const wall of context.floor.walls) {
      if (context.excludeIds && context.excludeIds.includes(wall.id)) continue;

      const result = wall.distanceToPoint(wx, wy);
      if (result.distance < bestDist) {
        bestDist = result.distance;
        best = {
          x: result.closestPoint.x,
          y: result.closestPoint.y,
          type: 'wall',
          wallId: wall.id,
        };
      }
    }

    return best;
  }
}
