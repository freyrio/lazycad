/**
 * ExportSVG — Export 2D floor plan as SVG vector drawing.
 * Generates architectural-quality SVG with walls, openings, rooms, and dimensions.
 */

export class ExportSVG {
  /**
   * Generate SVG string for a single floor.
   * @param {Floor} floor
   * @param {object} [options]
   * @param {number} [options.scale] - Pixels per meter for SVG output (default 100)
   * @param {boolean} [options.showRooms] - Include room fills (default true)
   * @param {boolean} [options.showAnnotations] - Include dimension annotations (default true)
   * @param {boolean} [options.showLabels] - Include room labels (default true)
   * @returns {string} SVG markup
   */
  static generate(floor, options = {}) {
    const scale = options.scale || 100; // px per meter
    const showRooms = options.showRooms !== false;
    const showAnnotations = options.showAnnotations !== false;
    const showLabels = options.showLabels !== false;

    // Compute bounding box
    const bounds = ExportSVG._computeBounds(floor);
    if (!bounds) return '';

    const margin = 1.0; // meters
    const minX = bounds.minX - margin;
    const minY = bounds.minY - margin;
    const width = (bounds.maxX - bounds.minX + margin * 2) * scale;
    const height = (bounds.maxY - bounds.minY + margin * 2) * scale;

    const parts = [];
    parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width.toFixed(0)}" height="${height.toFixed(0)}" viewBox="${(minX * scale).toFixed(1)} ${(minY * scale).toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}">`);

    // Styles
    parts.push(`<defs>`);
    parts.push(`  <style>`);
    parts.push(`    .wall-exterior { fill: #444; stroke: #222; stroke-width: 0.5; }`);
    parts.push(`    .wall-interior { fill: #666; stroke: #333; stroke-width: 0.5; }`);
    parts.push(`    .wall-timber { fill: #8B6914; stroke: #5a4410; stroke-width: 0.5; }`);
    parts.push(`    .room-fill { fill-opacity: 0.1; stroke: none; }`);
    parts.push(`    .room-label { font-family: sans-serif; font-size: ${(14).toFixed(0)}px; text-anchor: middle; fill: #333; }`);
    parts.push(`    .room-area { font-family: sans-serif; font-size: ${(11).toFixed(0)}px; text-anchor: middle; fill: #666; }`);
    parts.push(`    .opening-door { fill: none; stroke: #555; stroke-width: 1; }`);
    parts.push(`    .opening-window { fill: rgba(120,180,255,0.3); stroke: #4488cc; stroke-width: 1; }`);
    parts.push(`    .dimension-line { fill: none; stroke: #888; stroke-width: 0.5; }`);
    parts.push(`    .dimension-text { font-family: sans-serif; font-size: ${(10).toFixed(0)}px; text-anchor: middle; fill: #888; }`);
    parts.push(`  </style>`);
    parts.push(`</defs>`);

    // Background
    parts.push(`<rect x="${(minX * scale).toFixed(1)}" y="${(minY * scale).toFixed(1)}" width="${width.toFixed(1)}" height="${height.toFixed(1)}" fill="white"/>`);

    // Room fills
    if (showRooms && floor.rooms) {
      parts.push(`<g id="rooms">`);
      for (const room of floor.rooms) {
        if (!room.polygon || room.polygon.length < 3) continue;
        const points = room.polygon.map(p => `${(p.x * scale).toFixed(2)},${(p.y * scale).toFixed(2)}`).join(' ');
        const color = ExportSVG._roomColor(room.floorMaterial);
        parts.push(`  <polygon points="${points}" class="room-fill" fill="${color}"/>`);
      }
      parts.push(`</g>`);
    }

    // Walls
    parts.push(`<g id="walls">`);
    for (const wall of floor.walls) {
      if (wall.points.length < 2) continue;
      const cls = wall.material === 'timber' ? 'wall-timber'
        : wall.isExterior ? 'wall-exterior' : 'wall-interior';

      // Draw wall as thick line segments
      for (let i = 0; i < wall.points.length - 1; i++) {
        const p0 = wall.points[i];
        const p1 = wall.points[i + 1];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.001) continue;

        const nx = -dy / len * wall.thickness / 2;
        const ny = dx / len * wall.thickness / 2;

        const pts = [
          `${((p0.x - nx) * scale).toFixed(2)},${((p0.y - ny) * scale).toFixed(2)}`,
          `${((p0.x + nx) * scale).toFixed(2)},${((p0.y + ny) * scale).toFixed(2)}`,
          `${((p1.x + nx) * scale).toFixed(2)},${((p1.y + ny) * scale).toFixed(2)}`,
          `${((p1.x - nx) * scale).toFixed(2)},${((p1.y - ny) * scale).toFixed(2)}`,
        ].join(' ');

        parts.push(`  <polygon points="${pts}" class="${cls}"/>`);
      }
    }
    parts.push(`</g>`);

    // Openings
    if (floor.openings && floor.openings.length > 0) {
      parts.push(`<g id="openings">`);
      for (const opening of floor.openings) {
        const wall = floor.walls.find(w => w.id === opening.wallId);
        if (!wall) continue;
        const posData = wall.pointAtDistance?.(opening.position);
        if (!posData) continue;

        const cx = posData.point.x * scale;
        const cy = posData.point.y * scale;
        const dir = posData.direction;
        const angle = Math.atan2(dir.y, dir.x) * 180 / Math.PI;
        const w = opening.width * scale;
        const t = wall.thickness * scale;

        if (opening.type === 'window') {
          // Window: two parallel lines
          parts.push(`  <rect x="${(cx - w / 2).toFixed(2)}" y="${(cy - t / 2).toFixed(2)}" width="${w.toFixed(2)}" height="${t.toFixed(2)}" class="opening-window" transform="rotate(${angle.toFixed(1)} ${cx.toFixed(2)} ${cy.toFixed(2)})"/>`);
        } else if (opening.type === 'door') {
          // Door: gap with swing arc
          const r = opening.width * scale;
          const swingDir = opening.swing === 'right' ? 1 : -1;
          const startAngle = angle - 90 * swingDir;
          const endAngle = startAngle + 90 * swingDir;
          const startRad = startAngle * Math.PI / 180;
          const endRad = endAngle * Math.PI / 180;
          const x1 = cx + r * Math.cos(startRad);
          const y1 = cy + r * Math.sin(startRad);
          const x2 = cx + r * Math.cos(endRad);
          const y2 = cy + r * Math.sin(endRad);
          parts.push(`  <path d="M ${cx.toFixed(2)} ${cy.toFixed(2)} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 ${swingDir > 0 ? 1 : 0} ${x2.toFixed(2)} ${y2.toFixed(2)} Z" class="opening-door"/>`);
        }
      }
      parts.push(`</g>`);
    }

    // Room labels
    if (showLabels && floor.rooms) {
      parts.push(`<g id="labels">`);
      for (const room of floor.rooms) {
        if (!room.polygon || room.polygon.length < 3) continue;
        const centroid = ExportSVG._centroid(room.polygon);
        const area = ExportSVG._area(room.polygon);
        const cx = centroid.x * scale;
        const cy = centroid.y * scale;
        parts.push(`  <text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" class="room-label">${ExportSVG._escapeXml(room.label)}</text>`);
        parts.push(`  <text x="${cx.toFixed(2)}" y="${(cy + 16).toFixed(2)}" class="room-area">${area.toFixed(1)} m²</text>`);
      }
      parts.push(`</g>`);
    }

    // Annotations
    if (showAnnotations && floor.annotations) {
      parts.push(`<g id="annotations">`);
      for (const ann of floor.annotations) {
        if (ann.type === 'dimension' && ann.points.length >= 2) {
          const p0 = ann.points[0];
          const p1 = ann.points[1];
          const x1 = p0.x * scale, y1 = p0.y * scale;
          const x2 = p1.x * scale, y2 = p1.y * scale;
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
          const label = ann.value != null ? `${ann.value.toFixed(2)}m` : (ann.text || '');

          parts.push(`  <line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" class="dimension-line"/>`);
          parts.push(`  <text x="${mx.toFixed(2)}" y="${(my - 4).toFixed(2)}" class="dimension-text">${ExportSVG._escapeXml(label)}</text>`);
        } else if (ann.type === 'note' && ann.points.length > 0) {
          const p = ann.points[0];
          parts.push(`  <text x="${(p.x * scale).toFixed(2)}" y="${(p.y * scale).toFixed(2)}" class="dimension-text">${ExportSVG._escapeXml(ann.text || '')}</text>`);
        }
      }
      parts.push(`</g>`);
    }

    // Title block
    parts.push(`<g id="title">`);
    parts.push(`  <text x="${(minX * scale + 10).toFixed(1)}" y="${((minY + margin * 0.3) * scale).toFixed(1)}" font-family="sans-serif" font-size="16" fill="#333">${ExportSVG._escapeXml(floor.name)}</text>`);
    parts.push(`</g>`);

    parts.push(`</svg>`);
    return parts.join('\n');
  }

  /**
   * Download SVG for a floor.
   */
  static download(floor, fileName) {
    const svg = ExportSVG.generate(floor);
    if (!svg) return;

    const name = fileName || `${floor.name.replace(/\s+/g, '_')}.svg`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  static _computeBounds(floor) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasPoints = false;

    for (const wall of floor.walls) {
      for (const p of wall.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
        hasPoints = true;
      }
    }

    if (floor.rooms) {
      for (const room of floor.rooms) {
        if (!room.polygon) continue;
        for (const p of room.polygon) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
          hasPoints = true;
        }
      }
    }

    return hasPoints ? { minX, minY, maxX, maxY } : null;
  }

  static _centroid(polygon) {
    let cx = 0, cy = 0;
    for (const p of polygon) { cx += p.x; cy += p.y; }
    return { x: cx / polygon.length, y: cy / polygon.length };
  }

  static _area(polygon) {
    let area = 0;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i++) {
      area += (polygon[j].x + polygon[i].x) * (polygon[j].y - polygon[i].y);
    }
    return Math.abs(area / 2);
  }

  static _roomColor(material) {
    const colors = {
      wood: '#D4A574',
      tile: '#B8B0A8',
      carpet: '#8B7D91',
      marble: '#E8E2DC',
      default: '#C8C4BE',
    };
    return colors[material] || colors.default;
  }

  static _escapeXml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
