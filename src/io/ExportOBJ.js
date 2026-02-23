/**
 * ExportOBJ — Export 3D model as OBJ + MTL format.
 * Generates OBJ geometry from Blueprint data without depending on Babylon serializers.
 */

export class ExportOBJ {
  /**
   * Export the entire blueprint as OBJ + MTL files.
   * @param {Blueprint} blueprint
   * @returns {{ obj: string, mtl: string }}
   */
  static generate(blueprint) {
    const objLines = ['# BlueprintForge OBJ Export', `# ${blueprint.name}`, ''];
    const mtlLines = ['# BlueprintForge MTL Export', ''];
    const mtlFileName = 'model.mtl';
    objLines.push(`mtllib ${mtlFileName}`, '');

    // Define materials
    const materials = {
      Wall_Concrete: { Kd: [0.75, 0.73, 0.70], Ns: 10 },
      Wall_Partition: { Kd: [0.85, 0.83, 0.80], Ns: 10 },
      Wall_Timber: { Kd: [0.65, 0.45, 0.28], Ns: 30 },
      Floor_Slab: { Kd: [0.55, 0.55, 0.55], Ns: 5 },
      Glass: { Kd: [0.7, 0.85, 1.0], d: 0.3, Ns: 80 },
    };

    for (const [name, props] of Object.entries(materials)) {
      mtlLines.push(`newmtl ${name}`);
      mtlLines.push(`Kd ${props.Kd.join(' ')}`);
      mtlLines.push(`Ns ${props.Ns}`);
      if (props.d !== undefined) mtlLines.push(`d ${props.d}`);
      mtlLines.push('');
    }

    let vertexOffset = 0;

    for (const floor of blueprint.floors) {
      const wallHeight = floor.ceilingHeight || 2.7;
      const slabThickness = floor.slabThickness || 0.3;
      const elevation = floor.elevation || 0;

      objLines.push(`# Floor: ${floor.name}`);

      // Export walls
      for (const wall of floor.walls) {
        if (wall.points.length < 2) continue;

        const matName = wall.material === 'timber' ? 'Wall_Timber'
          : wall.material === 'partition' ? 'Wall_Partition'
          : 'Wall_Concrete';

        objLines.push(`usemtl ${matName}`);
        objLines.push(`o wall_${wall.id}`);

        for (let i = 0; i < wall.points.length - 1; i++) {
          const p0 = wall.points[i];
          const p1 = wall.points[i + 1];
          const dx = p1.x - p0.x;
          const dy = p1.y - p0.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 0.001) continue;

          const nx = -dy / len * wall.thickness / 2;
          const ny = dx / len * wall.thickness / 2;

          const yBot = elevation;
          const yTop = elevation + wallHeight;

          // 8 vertices of the wall box segment
          const verts = [
            [p0.x - nx, yBot, p0.y - ny], // 0 - bottom-left-near
            [p0.x + nx, yBot, p0.y + ny], // 1 - bottom-right-near
            [p1.x + nx, yBot, p1.y + ny], // 2 - bottom-right-far
            [p1.x - nx, yBot, p1.y - ny], // 3 - bottom-left-far
            [p0.x - nx, yTop, p0.y - ny], // 4 - top-left-near
            [p0.x + nx, yTop, p0.y + ny], // 5 - top-right-near
            [p1.x + nx, yTop, p1.y + ny], // 6 - top-right-far
            [p1.x - nx, yTop, p1.y - ny], // 7 - top-left-far
          ];

          for (const v of verts) {
            objLines.push(`v ${v[0].toFixed(4)} ${v[1].toFixed(4)} ${v[2].toFixed(4)}`);
          }

          const o = vertexOffset + 1; // OBJ is 1-indexed
          // 6 faces (quads) for the box
          objLines.push(`f ${o+0} ${o+1} ${o+5} ${o+4}`); // front
          objLines.push(`f ${o+1} ${o+2} ${o+6} ${o+5}`); // right
          objLines.push(`f ${o+2} ${o+3} ${o+7} ${o+6}`); // back
          objLines.push(`f ${o+3} ${o+0} ${o+4} ${o+7}`); // left
          objLines.push(`f ${o+4} ${o+5} ${o+6} ${o+7}`); // top
          objLines.push(`f ${o+0} ${o+3} ${o+2} ${o+1}`); // bottom

          vertexOffset += 8;
        }
      }

      // Export floor slab
      if (floor.walls.length > 0) {
        let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
        for (const wall of floor.walls) {
          for (const p of wall.points) {
            minX = Math.min(minX, p.x);
            minZ = Math.min(minZ, p.y);
            maxX = Math.max(maxX, p.x);
            maxZ = Math.max(maxZ, p.y);
          }
        }

        const margin = 0.5;
        minX -= margin; minZ -= margin; maxX += margin; maxZ += margin;
        const slabTop = elevation;
        const slabBot = elevation - slabThickness;

        objLines.push(`usemtl Floor_Slab`);
        objLines.push(`o slab_${floor.id}`);

        const slabVerts = [
          [minX, slabBot, minZ], [maxX, slabBot, minZ],
          [maxX, slabBot, maxZ], [minX, slabBot, maxZ],
          [minX, slabTop, minZ], [maxX, slabTop, minZ],
          [maxX, slabTop, maxZ], [minX, slabTop, maxZ],
        ];

        for (const v of slabVerts) {
          objLines.push(`v ${v[0].toFixed(4)} ${v[1].toFixed(4)} ${v[2].toFixed(4)}`);
        }

        const o = vertexOffset + 1;
        objLines.push(`f ${o+4} ${o+5} ${o+6} ${o+7}`); // top
        objLines.push(`f ${o+0} ${o+3} ${o+2} ${o+1}`); // bottom
        objLines.push(`f ${o+0} ${o+1} ${o+5} ${o+4}`); // front
        objLines.push(`f ${o+1} ${o+2} ${o+6} ${o+5}`); // right
        objLines.push(`f ${o+2} ${o+3} ${o+7} ${o+6}`); // back
        objLines.push(`f ${o+3} ${o+0} ${o+4} ${o+7}`); // left
        vertexOffset += 8;
      }
    }

    return {
      obj: objLines.join('\n'),
      mtl: mtlLines.join('\n'),
    };
  }

  /**
   * Download OBJ + MTL files.
   */
  static download(blueprint, baseName = 'model') {
    const { obj, mtl } = ExportOBJ.generate(blueprint);

    ExportOBJ._downloadText(obj, `${baseName}.obj`, 'model/obj');
    ExportOBJ._downloadText(mtl, `${baseName}.mtl`, 'text/plain');
  }

  static _downloadText(content, fileName, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}
