/**
 * DemoProject — Generates a sample floor plan to verify the 2D→3D pipeline.
 * Creates a small house with exterior walls, interior partitions,
 * doors, windows, and labeled rooms.
 *
 * Layout (~10m x 8m house):
 *
 *   (0,0)────────────────────(10,0)
 *   │                    │        │
 *   │   Living Room      │ Kitchen│
 *   │   (wood floor)     │ (tile) │
 *   │         [win]      │  [win] │
 *   │                    │        │
 *   (0,4)────────[door]──(6,4)────(10,4)
 *   │                    │        │
 *   │   Bedroom          │ Bath-  │
 *   │   (carpet)         │ room   │
 *   │         [win]      │ (tile) │
 *   │                    │        │
 *   (0,8)──[front door]──────────(10,8)
 *
 */

export class DemoProject {
  /**
   * Generate a complete demo blueprint as JSON.
   * @returns {object} Blueprint JSON suitable for Blueprint.fromJSON()
   */
  static generate() {
    const floorId = 'fl_demo_ground';
    const floor2Id = 'fl_demo_upper';

    // Wall IDs (stable so openings can reference them)
    const wallNorth = 'w_demo_north';
    const wallSouth = 'w_demo_south';
    const wallWest = 'w_demo_west';
    const wallEast = 'w_demo_east';
    const wallMidH = 'w_demo_mid_h';    // horizontal interior at y=4
    const wallMidV = 'w_demo_mid_v';    // vertical interior at x=6

    return {
      id: 'bp_demo_house',
      name: 'Demo House',
      scale: {
        pixelsPerMeter: 100,
        origin: { x: 0, y: 0 },
        rotation: 0,
        calibrationPoints: [],
      },
      activeFloorId: floorId,
      floors: [
        // Ground Floor
        {
          id: floorId,
          name: 'Ground Floor',
          elevation: 0,
          floorToFloor: 3.0,
          ceilingHeight: 2.7,
          slabThickness: 0.3,
          bitmap: null,
          walls: [
            // Exterior walls (0.25m thick concrete)
            {
              id: wallNorth,
              floorId: floorId,
              points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
              thickness: 0.25,
              height: null,
              material: 'concrete',
              isExterior: true,
            },
            {
              id: wallSouth,
              floorId: floorId,
              points: [{ x: 0, y: 8 }, { x: 10, y: 8 }],
              thickness: 0.25,
              height: null,
              material: 'concrete',
              isExterior: true,
            },
            {
              id: wallWest,
              floorId: floorId,
              points: [{ x: 0, y: 0 }, { x: 0, y: 8 }],
              thickness: 0.25,
              height: null,
              material: 'concrete',
              isExterior: true,
            },
            {
              id: wallEast,
              floorId: floorId,
              points: [{ x: 10, y: 0 }, { x: 10, y: 8 }],
              thickness: 0.25,
              height: null,
              material: 'concrete',
              isExterior: true,
            },
            // Interior walls (0.12m thick partition)
            {
              id: wallMidH,
              floorId: floorId,
              points: [{ x: 0, y: 4 }, { x: 10, y: 4 }],
              thickness: 0.12,
              height: null,
              material: 'partition',
              isExterior: false,
            },
            {
              id: wallMidV,
              floorId: floorId,
              points: [{ x: 6, y: 0 }, { x: 6, y: 8 }],
              thickness: 0.12,
              height: null,
              material: 'partition',
              isExterior: false,
            },
          ],
          openings: [
            // Front door on south wall (centered at ~3m from west)
            {
              id: 'op_demo_front_door',
              wallId: wallSouth,
              type: 'door',
              position: 3.0,
              width: 1.0,
              height: 2.1,
              sillHeight: 0,
              swing: 'left',
            },
            // Interior door between living room and bedroom (on mid-H wall at x≈2.5)
            {
              id: 'op_demo_hall_door',
              wallId: wallMidH,
              type: 'door',
              position: 2.5,
              width: 0.9,
              height: 2.1,
              sillHeight: 0,
              swing: 'right',
            },
            // Kitchen door (mid-H wall at x≈8)
            {
              id: 'op_demo_kitchen_door',
              wallId: wallMidH,
              type: 'door',
              position: 8.0,
              width: 0.8,
              height: 2.1,
              sillHeight: 0,
              swing: 'left',
            },
            // Bathroom door (mid-V wall at y≈6)
            {
              id: 'op_demo_bath_door',
              wallId: wallMidV,
              type: 'door',
              position: 6.0,
              width: 0.7,
              height: 2.1,
              sillHeight: 0,
              swing: 'right',
            },
            // Living room window on north wall
            {
              id: 'op_demo_living_win',
              wallId: wallNorth,
              type: 'window',
              position: 3.0,
              width: 1.8,
              height: 1.4,
              sillHeight: 0.8,
              swing: null,
            },
            // Kitchen window on east wall
            {
              id: 'op_demo_kitchen_win',
              wallId: wallEast,
              type: 'window',
              position: 2.0,
              width: 1.2,
              height: 1.2,
              sillHeight: 0.9,
              swing: null,
            },
            // Bedroom window on west wall
            {
              id: 'op_demo_bed_win',
              wallId: wallWest,
              type: 'window',
              position: 6.0,
              width: 1.6,
              height: 1.4,
              sillHeight: 0.8,
              swing: null,
            },
            // Second living room window on west wall
            {
              id: 'op_demo_living_win2',
              wallId: wallWest,
              type: 'window',
              position: 2.0,
              width: 1.6,
              height: 1.4,
              sillHeight: 0.8,
              swing: null,
            },
          ],
          rooms: [
            {
              id: 'rm_demo_living',
              floorId: floorId,
              label: 'Living Room',
              polygon: [
                { x: 0.13, y: 0.13 },
                { x: 5.94, y: 0.13 },
                { x: 5.94, y: 3.94 },
                { x: 0.13, y: 3.94 },
              ],
              floorMaterial: 'wood',
            },
            {
              id: 'rm_demo_kitchen',
              floorId: floorId,
              label: 'Kitchen',
              polygon: [
                { x: 6.06, y: 0.13 },
                { x: 9.87, y: 0.13 },
                { x: 9.87, y: 3.94 },
                { x: 6.06, y: 3.94 },
              ],
              floorMaterial: 'tile',
            },
            {
              id: 'rm_demo_bedroom',
              floorId: floorId,
              label: 'Bedroom',
              polygon: [
                { x: 0.13, y: 4.06 },
                { x: 5.94, y: 4.06 },
                { x: 5.94, y: 7.87 },
                { x: 0.13, y: 7.87 },
              ],
              floorMaterial: 'carpet',
            },
            {
              id: 'rm_demo_bathroom',
              floorId: floorId,
              label: 'Bathroom',
              polygon: [
                { x: 6.06, y: 4.06 },
                { x: 9.87, y: 4.06 },
                { x: 9.87, y: 7.87 },
                { x: 6.06, y: 7.87 },
              ],
              floorMaterial: 'tile',
            },
          ],
          annotations: [
            // Overall dimensions
            {
              id: 'ann_demo_width',
              type: 'dimension',
              points: [{ x: 0, y: -0.5 }, { x: 10, y: -0.5 }],
              text: '10.00m',
              value: 10.0,
            },
            {
              id: 'ann_demo_depth',
              type: 'dimension',
              points: [{ x: -0.5, y: 0 }, { x: -0.5, y: 8 }],
              text: '8.00m',
              value: 8.0,
            },
          ],
        },

        // Upper Floor (simpler — just exterior shell + 2 rooms)
        {
          id: floor2Id,
          name: '1st Floor',
          elevation: 3.0,
          floorToFloor: 3.0,
          ceilingHeight: 2.5,
          slabThickness: 0.3,
          bitmap: null,
          walls: [
            {
              id: 'w_demo2_north',
              floorId: floor2Id,
              points: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
              thickness: 0.25,
              height: null,
              material: 'concrete',
              isExterior: true,
            },
            {
              id: 'w_demo2_south',
              floorId: floor2Id,
              points: [{ x: 0, y: 8 }, { x: 10, y: 8 }],
              thickness: 0.25,
              height: null,
              material: 'concrete',
              isExterior: true,
            },
            {
              id: 'w_demo2_west',
              floorId: floor2Id,
              points: [{ x: 0, y: 0 }, { x: 0, y: 8 }],
              thickness: 0.25,
              height: null,
              material: 'concrete',
              isExterior: true,
            },
            {
              id: 'w_demo2_east',
              floorId: floor2Id,
              points: [{ x: 10, y: 0 }, { x: 10, y: 8 }],
              thickness: 0.25,
              height: null,
              material: 'concrete',
              isExterior: true,
            },
            {
              id: 'w_demo2_mid',
              floorId: floor2Id,
              points: [{ x: 5, y: 0 }, { x: 5, y: 8 }],
              thickness: 0.12,
              height: null,
              material: 'partition',
              isExterior: false,
            },
          ],
          openings: [
            {
              id: 'op_demo2_win1',
              wallId: 'w_demo2_north',
              type: 'window',
              position: 2.5,
              width: 1.8,
              height: 1.4,
              sillHeight: 0.8,
              swing: null,
            },
            {
              id: 'op_demo2_win2',
              wallId: 'w_demo2_north',
              type: 'window',
              position: 7.5,
              width: 1.8,
              height: 1.4,
              sillHeight: 0.8,
              swing: null,
            },
            {
              id: 'op_demo2_door',
              wallId: 'w_demo2_mid',
              type: 'door',
              position: 4.0,
              width: 0.9,
              height: 2.1,
              sillHeight: 0,
              swing: 'left',
            },
          ],
          rooms: [
            {
              id: 'rm_demo2_master',
              floorId: floor2Id,
              label: 'Master Bedroom',
              polygon: [
                { x: 0.13, y: 0.13 },
                { x: 4.94, y: 0.13 },
                { x: 4.94, y: 7.87 },
                { x: 0.13, y: 7.87 },
              ],
              floorMaterial: 'carpet',
            },
            {
              id: 'rm_demo2_guest',
              floorId: floor2Id,
              label: 'Guest Room',
              polygon: [
                { x: 5.06, y: 0.13 },
                { x: 9.87, y: 0.13 },
                { x: 9.87, y: 7.87 },
                { x: 5.06, y: 7.87 },
              ],
              floorMaterial: 'wood',
            },
          ],
          annotations: [],
        },
      ],
      metadata: {
        address: 'Demo Street 1',
        source: 'demo',
        created: Date.now(),
        modified: Date.now(),
      },
    };
  }
}
