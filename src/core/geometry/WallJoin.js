/**
 * WallJoin — Compute wall connectivity, join types, and miter geometry.
 *
 * Builds a connectivity graph of wall endpoints and intersections,
 * classifies joins (L-corner, T-junction, X-cross), and computes
 * the miter/trim points for wall outline polygons.
 */
import { Vec2 } from './Vec2.js';
import { Line2 } from './Line2.js';

/**
 * Node in the wall connectivity graph.
 * Represents a point where one or more wall endpoints meet.
 */
class WallNode {
  constructor(position) {
    this.position = position;   // Vec2
    this.connections = [];      // [{ wallId, pointIndex, direction: Vec2 }]
  }

  get connectionCount() { return this.connections.length; }
}

export class WallJoin {
  /**
   * Build the wall connectivity graph for a set of walls.
   * @param {Wall[]} walls
   * @param {number} [tolerance=0.05] - Distance in meters to consider endpoints coincident
   * @returns {{ nodes: WallNode[], getJoinType: Function, computeOutline: Function }}
   */
  static buildGraph(walls, tolerance = 0.05) {
    const nodes = [];
    const tolSq = tolerance * tolerance;

    // Find or create a node at a given position
    function findOrCreateNode(pos) {
      for (const node of nodes) {
        if (node.position.distanceToSq(pos) < tolSq) {
          return node;
        }
      }
      const node = new WallNode(pos);
      nodes.push(node);
      return node;
    }

    // Register all wall endpoints
    for (const wall of walls) {
      const pts = wall.getPoints();
      if (pts.length < 2) continue;

      // Start point
      const startNode = findOrCreateNode(pts[0]);
      const startDir = pts[1].sub(pts[0]).normalize();
      startNode.connections.push({
        wallId: wall.id,
        pointIndex: 0,
        direction: startDir,
        wall,
        isStart: true,
      });

      // End point
      const endNode = findOrCreateNode(pts[pts.length - 1]);
      const endDir = pts[pts.length - 2].sub(pts[pts.length - 1]).normalize();
      endNode.connections.push({
        wallId: wall.id,
        pointIndex: pts.length - 1,
        direction: endDir,
        wall,
        isStart: false,
      });
    }

    return {
      nodes,
      getJoinType: (node) => WallJoin.classifyJoin(node),
      computeOutline: (wall) => WallJoin.computeWallOutline(wall, nodes, tolerance),
    };
  }

  /**
   * Classify the join type at a node.
   * @param {WallNode} node
   * @returns {"free" | "L" | "T" | "X"}
   */
  static classifyJoin(node) {
    const n = node.connectionCount;
    if (n <= 1) return 'free';
    if (n === 2) return 'L';
    if (n === 3) return 'T';
    return 'X'; // 4+
  }

  /**
   * Compute the outline polygon for a wall, considering joins at endpoints.
   * @param {Wall} wall
   * @param {WallNode[]} nodes
   * @param {number} tolerance
   * @returns {Vec2[]} Closed polygon in world coordinates
   */
  static computeWallOutline(wall, nodes, tolerance = 0.05) {
    const pts = wall.getPoints();
    if (pts.length < 2) return [];

    const halfThick = wall.thickness / 2;
    const tolSq = tolerance * tolerance;

    // Find nodes at start and end
    const startNode = WallJoin._findNode(nodes, pts[0], tolSq);
    const endNode = WallJoin._findNode(nodes, pts[pts.length - 1], tolSq);

    // Compute left and right offset lines for each segment
    const leftLines = [];
    const rightLines = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const seg = new Line2(pts[i], pts[i + 1]);
      leftLines.push(seg.offset(halfThick));
      rightLines.push(seg.offset(-halfThick));
    }

    // Build left side points (forward direction)
    const leftPts = [];
    // Start cap
    leftPts.push(WallJoin._computeEndpoint(leftLines[0].a, startNode, wall, halfThick, true, true));
    // Interior joints (miter between consecutive segments)
    for (let i = 0; i < leftLines.length - 1; i++) {
      const miter = leftLines[i].intersectLine(leftLines[i + 1]);
      if (miter) {
        leftPts.push(miter.point);
      } else {
        leftPts.push(leftLines[i].b);
      }
    }
    // End cap
    leftPts.push(WallJoin._computeEndpoint(leftLines[leftLines.length - 1].b, endNode, wall, halfThick, false, true));

    // Build right side points (forward direction)
    const rightPts = [];
    rightPts.push(WallJoin._computeEndpoint(rightLines[0].a, startNode, wall, halfThick, true, false));
    for (let i = 0; i < rightLines.length - 1; i++) {
      const miter = rightLines[i].intersectLine(rightLines[i + 1]);
      if (miter) {
        rightPts.push(miter.point);
      } else {
        rightPts.push(rightLines[i].b);
      }
    }
    rightPts.push(WallJoin._computeEndpoint(rightLines[rightLines.length - 1].b, endNode, wall, halfThick, false, false));

    // Combine: left forward, then right reversed
    return [...leftPts, ...rightPts.reverse()];
  }

  /**
   * Compute an adjusted endpoint for a wall at a join node.
   * For L-joints, extends/trims to miter. For free ends, uses the offset point as-is.
   */
  static _computeEndpoint(defaultPoint, node, wall, halfThick, isStart, isLeft) {
    if (!node || node.connectionCount <= 1) {
      return defaultPoint;
    }

    // Find the other wall(s) at this node
    const others = node.connections.filter(c => c.wallId !== wall.id);
    if (others.length === 0) return defaultPoint;

    // For L-joint (2 connections at this node), compute miter
    const myConn = node.connections.find(c => c.wallId === wall.id);
    if (!myConn) return defaultPoint;

    // Get this wall's direction at the endpoint (pointing outward from the node)
    const pts = wall.getPoints();
    let myDir;
    if (isStart) {
      myDir = pts[1].sub(pts[0]).normalize();
    } else {
      myDir = pts[pts.length - 2].sub(pts[pts.length - 1]).normalize();
    }

    // Compute miter with the first other wall
    const other = others[0];
    const otherWall = other.wall;
    const otherHalf = otherWall.thickness / 2;

    // Other wall direction at this node
    const otherPts = otherWall.getPoints();
    let otherDir;
    if (other.isStart) {
      otherDir = otherPts[1].sub(otherPts[0]).normalize();
    } else {
      otherDir = otherPts[otherPts.length - 2].sub(otherPts[otherPts.length - 1]).normalize();
    }

    // The miter is the intersection of the offset lines
    const myNormal = myDir.perp();
    const otherNormal = otherDir.perp();

    const sign = isLeft ? 1 : -1;
    const myOffset = node.position.add(myNormal.mul(sign * halfThick));
    const otherOffset = node.position.add(otherNormal.mul(sign * otherHalf));

    // Direction along this wall (inward from the node)
    const myWallDir = isStart ? myDir : myDir.neg();
    const otherWallDir = other.isStart ? otherDir : otherDir.neg();

    const myLine = new Line2(myOffset, myOffset.add(myWallDir));
    const otherLine = new Line2(otherOffset, otherOffset.add(otherWallDir));

    const intersection = myLine.intersectLine(otherLine);
    if (intersection) {
      // Limit miter to a reasonable distance (3x thickness to avoid spikes)
      const dist = intersection.point.distanceTo(node.position);
      if (dist < halfThick * 4) {
        return intersection.point;
      }
    }

    return defaultPoint;
  }

  /**
   * Find a node at a position.
   */
  static _findNode(nodes, position, tolSq) {
    for (const node of nodes) {
      if (node.position.distanceToSq(position) < tolSq) {
        return node;
      }
    }
    return null;
  }
}
