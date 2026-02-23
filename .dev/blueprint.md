# BlueprintForge — Blueprint to 3D Floor Plan Tool

## Project Overview

A browser-based tool for tracing scanned architectural blueprints as vector drawings and extruding them into 3D floor plans. Built with vanilla JavaScript and Babylon.js. Designed mobile-first for use on phones and tablets (on-site with printed blueprints) as well as desktop.

Primary use case: Load a scanned Icelandic blueprint PDF/image, calibrate the scale, trace walls and openings as vector geometry, define floor heights, and generate a walkable 3D model.

---

## Target Platforms

| Platform | Primary Use |
|----------|------------|
| Phone (portrait) | Quick measurements, on-site reference, 3D walkthrough |
| Tablet (landscape) | Primary drawing/tracing device with stylus support |
| Desktop | Full editing, precise work, export |

---

## UI Architecture

### Layout Strategy

The app uses a **single viewport with overlay panels** rather than a traditional sidebar layout. This maximizes drawing space on all screen sizes.

```
┌─────────────────────────────────┐
│ [≡] BlueprintForge    [2D][3D] │  ← Top bar (compact)
├─────────────────────────────────┤
│                                 │
│                                 │
│         Main Viewport           │
│      (2D Editor or 3D View)     │
│                                 │
│                                 │
│                                 │
├─────────────────────────────────┤
│ [select][wall][door][win][meas] │  ← Bottom toolbar
└─────────────────────────────────┘
```

On desktop, an optional **right panel** slides out for property editing. On mobile, properties appear as a **bottom sheet** that slides up when an element is selected.

### Responsive Breakpoints

- **Phone** (<640px): Bottom toolbar icons only, bottom sheet for properties, single finger pan + pinch zoom, floating action button for tool switching
- **Tablet** (640–1024px): Bottom toolbar with labels, side sheet for properties, stylus support with pressure sensitivity for line weight, two-finger pan/zoom
- **Desktop** (>1024px): Bottom or side toolbar (user preference), slide-out property panel, mouse + keyboard shortcuts, right-click context menus

### Touch & Input Handling

The input system must abstract across mouse, touch, and stylus:

```
InputEvent {
  type: "start" | "move" | "end" | "cancel"
  position: {x, y}           // viewport coordinates
  worldPosition: {x, y}      // meters in blueprint space
  pressure: number            // 0-1 (stylus), 1 for mouse/touch
  isPrimary: boolean          // primary pointer
  pointerType: "mouse" | "touch" | "pen"
  modifiers: { shift, ctrl, alt }
}
```

Gesture recognition:
- **Single pointer drag** → current tool action (draw wall, move element, etc.)
- **Two pointer pinch** → zoom
- **Two pointer drag** → pan
- **Long press** → context menu / select
- **Double tap** → finish polyline / enter edit mode
- **Stylus hover** → preview snap points (tablets with hover support)

Palm rejection when stylus is detected — ignore touch input while pen is active.

### Navigation Controls

2D viewport navigation:
- Pinch to zoom (touch), scroll wheel (mouse)
- Two-finger drag to pan (touch), middle-click drag or space+drag (mouse)
- Double-tap to fit view
- Minimap in corner for orientation on large blueprints (collapsible on phone)

3D viewport navigation:
- Single finger orbit (touch), left-click drag (mouse)
- Two-finger pinch zoom
- Two-finger drag to pan
- Preset view buttons: top, front, side, perspective
- Optional first-person walkthrough mode

---

## Data Model

### Core Entities

```javascript
// Top-level document
Blueprint {
  id: string
  name: string
  scale: Scale
  floors: Floor[]
  metadata: {
    address: string
    source: string          // "scan", "import"
    created: timestamp
    modified: timestamp
  }
}

// Scale calibration
Scale {
  pixelsPerMeter: number
  origin: {x: number, y: number}     // pixel coords of world origin
  rotation: number                     // radians, to correct scan skew
  calibrationPoints: [{px, py, wx, wy}, ...]  // for reference
}

// A single floor level
Floor {
  id: string
  name: string                  // "Jarðhæð", "1. hæð", etc.
  elevation: number             // meters, FFL relative to ±0.00
  floorToFloor: number          // meters, to next floor above
  ceilingHeight: number         // meters, clear height
  slabThickness: number         // meters
  bitmap: BitmapLayer | null    // each floor can have its own scan
  walls: Wall[]
  openings: Opening[]
  rooms: Room[]
  annotations: Annotation[]
}

// Wall defined by centerline
Wall {
  id: string
  floorId: string
  points: [{x, y}, ...]        // centerline polyline in meters
  thickness: number             // meters (default 0.20 for concrete, 0.10 for partition)
  height: number | null         // null = use floor's ceilingHeight + slabThickness
  material: string              // "concrete", "timber", "partition"
  isExterior: boolean
}

// Opening placed on a wall
Opening {
  id: string
  wallId: string
  type: "door" | "window" | "opening"
  position: number              // distance along wall centerline in meters
  width: number                 // meters
  height: number                // meters
  sillHeight: number            // meters from FFL (0 for doors)
  swing: "left" | "right" | "double" | "sliding" | null
}

// Closed region
Room {
  id: string
  floorId: string
  label: string                 // "Stofa", "Eldhús", etc.
  polygon: [{x, y}, ...]       // boundary in meters (can be auto-detected)
  floorMaterial: string
}

// Measurement or note
Annotation {
  id: string
  type: "dimension" | "note" | "elevation"
  points: [{x, y}, ...]
  text: string
  value: number | null          // computed or manual dimension in meters
}
```

### Serialization

The entire Blueprint serializes to JSON for save/load. File extension: `.bpf.json`

For large bitmaps, the image is stored separately and referenced by path or as a base64 data URL in a companion file.

---

## Module Architecture

```
/src
  /core                         — Pure logic, no DOM or rendering
    Blueprint.js                — Document model, create/load/save
    Floor.js                    — Floor management
    Wall.js                     — Wall entity with centerline math
    Opening.js                  — Opening entity
    Room.js                     — Room entity, polygon operations
    Annotation.js               — Dimensions and notes

    /geometry
      Vec2.js                   — 2D vector math
      Line2.js                  — Line segment operations
      Polygon2.js               — Polygon operations (offset, boolean, area)
      Intersection.js           — Line-line, line-polygon intersections
      WallJoin.js               — Compute miters, T-joints, corners
      OffsetCurve.js            — Parallel offset for wall edges

    /snap
      SnapEngine.js             — Orchestrates all snap providers
      GridSnap.js               — Regular grid snapping
      EndpointSnap.js           — Snap to wall endpoints
      WallSnap.js               — Snap to nearest point on wall
      AngleSnap.js              — Lock to 0°/45°/90° from last point
      IntersectionSnap.js       — Snap to wall intersections

    /history
      History.js                — Undo/redo stack
      Command.js                — Base command interface
      AddWallCommand.js
      MovePointCommand.js
      DeleteElementCommand.js
      ModifyPropertyCommand.js

  /input
    InputManager.js             — Unified pointer/touch/mouse abstraction
    GestureRecognizer.js        — Pinch, pan, long-press, double-tap
    KeyboardManager.js          — Keyboard shortcuts (desktop)
    ToolStateMachine.js         — Manages active tool state

  /editor2d
    Editor2D.js                 — Main 2D editor controller
    Viewport2D.js               — Canvas pan/zoom/transform management

    /layers
      BitmapLayer.js            — Renders the scanned blueprint image
      GridLayer.js              — Background grid
      WallLayer.js              — Renders walls with thickness
      OpeningLayer.js           — Renders doors/windows symbols
      RoomLayer.js              — Room fills and labels
      SnapLayer.js              — Visual snap indicators
      AnnotationLayer.js        — Dimensions and notes
      CursorLayer.js            — Crosshair, tool preview

    /tools
      SelectTool.js             — Select, move, resize elements
      WallTool.js               — Draw wall centerlines
      OpeningTool.js            — Place openings on walls
      RoomTool.js               — Define room boundaries
      MeasureTool.js            — Measure distances and angles
      CalibrateTool.js          — Set scale from known dimension
      EraseTool.js              — Delete elements

  /viewer3d
    Viewer3D.js                 — Babylon.js scene setup and management
    CameraController.js         — Orbit + first-person camera modes

    /builders
      WallMeshBuilder.js        — Extrude 2D walls to 3D meshes
      OpeningCutter.js          — CSG subtraction for doors/windows
      FloorSlabBuilder.js       — Floor and ceiling plane generation
      RoofBuilder.js            — Basic roof geometry (future)

    /materials
      MaterialLibrary.js        — Predefined materials (concrete, wood, glass)

  /ui
    /components
      TopBar.js                 — App title, view toggle, menu
      Toolbar.js                — Tool buttons (responsive)
      PropertySheet.js          — Edit properties of selected element
      FloorManager.js           — Add/remove/switch floors
      LayerPanel.js             — Toggle layer visibility
      BottomSheet.js            — Mobile property editor
      ContextMenu.js            — Right-click / long-press menu
      Toast.js                  — Notifications
      Modal.js                  — Dialogs (calibration, export, etc.)

    /dialogs
      ImportDialog.js           — Load bitmap, PDF page selection
      CalibrateDialog.js        — Scale calibration wizard
      FloorHeightDialog.js      — Set floor elevations
      ExportDialog.js           — Export options (glTF, OBJ, JSON)

    Layout.js                   — Responsive layout manager
    Theme.js                    — Colors, spacing, typography

  /io
    ImageLoader.js              — Load PNG/JPG/PDF as bitmap
    PDFRenderer.js              — Render PDF pages to canvas (pdf.js)
    ProjectFile.js              — Save/load .bpf.json
    ExportGLTF.js               — Export 3D model as glTF
    ExportSVG.js                — Export 2D vectors as SVG
    ExportOBJ.js                — Export 3D model as OBJ

  /utils
    EventBus.js                 — Pub/sub for decoupled communication
    Storage.js                  — IndexedDB wrapper for local persistence
    Platform.js                 — Device detection, capabilities
    Units.js                    — Unit conversion helpers

  app.js                        — Bootstrap, wire everything together
  index.html
  styles.css
```

---

## Rendering Strategy

### 2D Editor — HTML5 Canvas (layered)

Use a **stack of canvas elements** for performance:

```
<div class="viewport-2d">
  <canvas class="layer-bitmap"></canvas>      <!-- static, redraws on zoom only -->
  <canvas class="layer-grid"></canvas>         <!-- static, redraws on zoom only -->
  <canvas class="layer-vectors"></canvas>      <!-- redraws on edit -->
  <canvas class="layer-interaction"></canvas>  <!-- redraws every frame (cursor, guides) -->
</div>
```

This avoids redrawing the bitmap every frame when only the cursor moves. Each layer handles its own rendering and only redraws when its data changes.

The viewport transform (pan/zoom) is shared across all layers as a transformation matrix:

```javascript
ViewportTransform {
  scale: number          // zoom level
  offsetX: number        // pan offset in pixels
  offsetY: number        // pan offset in pixels

  worldToScreen(wx, wy)  → {sx, sy}
  screenToWorld(sx, sy)  → {wx, wy}
}
```

### 3D Viewer — Babylon.js

The 3D scene is built by traversing the data model and generating meshes:

1. For each floor, create a transform node at the correct Y elevation
2. For each wall, compute the 2D outline polygon, extrude with Babylon's polygon tools
3. For each opening, create a cutting box and perform CSG subtraction
4. For each room, create a floor plane polygon
5. Apply materials from the library

The 3D view rebuilds when the user switches to it or can optionally live-update in a split view on desktop.

---

## Wall Geometry Pipeline

This is the most complex part of the system. The pipeline from user input to 3D mesh:

### Step 1: Centerline Input
User draws a polyline. Each segment is a wall centerline.

### Step 2: Offset to Edges
Each wall segment is offset by ±thickness/2 to produce inner and outer edge lines.

### Step 3: Join Resolution
Where walls meet, compute the intersection type:

- **L-joint (corner)**: Two walls meet at endpoints. Extend/trim the offset lines to meet at a miter point.
- **T-joint**: One wall endpoint touches another wall's body. The touching wall butts against the other; the continuous wall's offset lines are unaffected.
- **X-joint (cross)**: Two walls cross. Both walls' offset lines intersect; create four corner fillets.

The join resolver builds a connectivity graph:
```javascript
WallGraph {
  nodes: WallNode[]     // endpoints and intersection points
  edges: WallEdge[]     // wall segments between nodes

  findConnections(wallId) → adjacent walls and join types
  computeJoinGeometry(nodeId) → miter points for all walls at this node
}
```

### Step 4: 2D Wall Polygon
From the resolved offset lines and join geometry, build a closed polygon for each wall (or group of connected walls).

### Step 5: Opening Cuts (2D)
For each opening on a wall, compute its position along the centerline and cut the wall polygon accordingly. In 2D this creates a gap in the wall rendering.

### Step 6: Extrude to 3D
Take the 2D wall polygon, extrude vertically:
- Bottom: floor elevation
- Top: floor elevation + wall height

### Step 7: Opening Cuts (3D)
For each opening, create a 3D box:
- Position: along the wall at the opening's centerline position
- Size: opening width × opening height × wall thickness + margin
- Bottom: floor elevation + sill height

Use Babylon CSG to subtract the opening box from the wall mesh.

---

## Mobile-Specific UI Details

### Bottom Toolbar (Phone)

```
┌──────────────────────────────┐
│  ✋   ╱   🚪   ▢   📏   ⋯  │
│ Sel  Wall Door Win Meas More │
└──────────────────────────────┘
```

- 5 primary tools visible, overflow menu for rest
- Active tool is highlighted
- Tap to select, tap again to access tool options (e.g., wall thickness preset)

### Bottom Toolbar (Tablet)

```
┌─────────────────────────────────────────────────────┐
│  ✋ Select │ ╱ Wall │ 🚪 Door │ ▢ Window │ 📏 Measure │ ⌫ Erase │ ⚙ │
└─────────────────────────────────────────────────────┘
```

### Property Bottom Sheet (Phone/Tablet)

When an element is selected, slides up from bottom:

```
┌─────────────────────────────────┐
│ ━━━  (drag handle)              │  ← Half-height by default
│ Wall Properties                 │
│                                 │
│ Thickness:  [0.20m]  ▼ presets  │
│ Height:     [2.80m]             │
│ Material:   [Concrete] ▼       │
│ Exterior:   [✓]                 │
│                                 │
│ [Delete]              [Done]    │
└─────────────────────────────────┘
```

Swipe down to dismiss. Swipe up to full height for more options.

### Calibration Flow (Mobile-Optimized)

A guided wizard since calibration is critical and fiddly:

1. **"Pinch to zoom into a known dimension on the blueprint"**
2. **"Tap the start point"** → place marker with magnifier loupe
3. **"Tap the end point"** → place second marker
4. **"Enter the real distance"** → numeric keypad pops up, unit selector (m/cm/mm)
5. **"Confirm"** → scale is set, grid overlay appears

The **magnifier loupe** is essential on mobile: when the user holds down on the canvas, a magnified circle appears above their finger showing the precise area under their fingertip, allowing accurate point placement.

### Drawing Assist Features (Mobile)

- **Auto-straighten**: If a drawn line is within 5° of horizontal/vertical, snap it
- **Length input**: After placing a wall start point, a small input field appears where the user can type an exact length and angle instead of dragging to the endpoint
- **Haptic feedback**: Vibrate on snap events (endpoint snap, grid snap, angle lock)
- **Undo/redo**: Prominent buttons in top bar, also supports shake-to-undo

---

## Calibration System

Calibration supports two methods:

### Method 1: Two-Point Calibration
User identifies two points on the bitmap and enters the real-world distance between them. This sets `pixelsPerMeter`.

### Method 2: Scale Factor
User selects the blueprint's printed scale (1:50, 1:100, 1:200) and enters the scan DPI (or the app estimates it from the image resolution and standard paper sizes like A1, A2, A3).

```javascript
// Method 1
pixelsPerMeter = pixelDistance / realWorldMeters

// Method 2
// At 1:100 scale, 1cm on paper = 1m real
// At 300 DPI, 1cm = 118.11 pixels
pixelsPerMeter = (dpi / 2.54) * scaleDenominator / 100
// e.g., 300 DPI at 1:100 = 118.11 * 100 / 100 = 118.11 px/m ...
// Actually: 300/2.54 = 118.11 px/cm on paper, 1cm paper = 1m real at 1:100
// So pixelsPerMeter = 118.11
```

Optional: rotation correction by letting user draw a line along a known horizontal or vertical on the blueprint.

---

## Persistence & Storage

### Local Storage (IndexedDB)

All projects are stored locally in IndexedDB via a simple wrapper:

```javascript
Storage {
  saveProject(blueprint)         // serialize to JSON, store with bitmap
  loadProject(id) → Blueprint
  listProjects() → [{id, name, modified, thumbnail}]
  deleteProject(id)
  exportProject(id) → File       // downloadable .bpf.json + images
  importProject(file) → id
}
```

Auto-save every 30 seconds and on every significant action.

### File Format

```
project.bpf.json          — Blueprint data (JSON)
floors/
  ground.png              — Bitmap for ground floor
  first.png               — Bitmap for first floor
```

Or as a single ZIP file with `.bpf` extension for portability.

---

## 3D Export

### Supported Formats

- **glTF/GLB** — Primary export format. Includes materials, widely supported.
- **OBJ + MTL** — Simpler format for import into other CAD tools.
- **SVG** — 2D vector export of the floor plan.
- **PNG** — Rendered 2D or 3D screenshot.

### Export Options

- Include/exclude bitmap texture on floor
- Separate meshes per wall vs. merged
- Include furniture placeholders (future)
- Per-floor or whole building

---

## Implementation Milestones

### Phase 1 — Foundation (Week 1-2)

**Goal: Load a blueprint and draw on it**

- [x] Project scaffold: HTML, CSS, app.js entry point
- [x] 2D viewport with pan/zoom (touch + mouse)
- [x] Bitmap loader (PNG/JPG) with display in viewport
- [x] Basic input abstraction (InputManager, GestureRecognizer)
- [x] Grid overlay rendering
- [x] Simple wall drawing tool (click-click polyline, no joins)
- [x] Viewport transform (world ↔ screen coordinate conversion)
- [x] Responsive layout with top bar and bottom toolbar
- [x] Platform detection (phone/tablet/desktop)

**Deliverable**: Can load an image, pan/zoom, and draw lines on top of it.

### Phase 2 — Calibration & Proper Walls (Week 3-4)

**Goal: Accurately traced walls at real-world scale**

- [x] Two-point calibration tool with magnifier loupe
- [x] Scale-factor calibration (select ratio + paper size)
- [x] Rotation correction
- [x] Wall entity with thickness rendering
- [x] Snap engine: grid, endpoint, angle lock
- [x] Visual snap indicators
- [x] Wall thickness presets (exterior 0.20m, interior 0.10m)
- [x] Select tool: tap to select wall, show properties
- [x] Property bottom sheet (mobile) / side panel (desktop)
- [x] Undo/redo system
- [x] Haptic feedback on snap (mobile)

**Deliverable**: Can calibrate a blueprint and draw walls at correct real-world dimensions.

### Phase 3 — Wall Joins & Openings (Week 5-6)

**Goal: Proper wall geometry with doors and windows**

- [ ] Wall join detection (L, T, X joints)
- [ ] Miter computation for corner joins
- [ ] Wall connectivity graph
- [ ] Opening tool: tap on wall to place door/window
- [ ] Opening properties: width, height, sill height, swing direction
- [ ] Standard opening presets (IS standard door sizes)
- [ ] 2D door/window symbols rendering
- [ ] Dimension annotations (auto-measure between walls)
- [ ] Room detection (flood fill between walls) or manual room drawing
- [ ] Room labels

**Deliverable**: Complete 2D floor plan with walls, openings, and room labels.

### Phase 4 — 3D Extrusion (Week 7-8)

**Goal: See the floor plan in 3D**

- [ ] Babylon.js scene setup
- [ ] Camera controller (orbit + presets)
- [ ] Wall mesh extrusion from 2D polygons
- [ ] CSG opening subtraction
- [ ] Floor slab generation
- [ ] Basic material library (concrete, glass, wood)
- [ ] 2D/3D view toggle
- [ ] Floor height configuration dialog
- [ ] Touch controls for 3D navigation

**Deliverable**: Can switch between 2D and 3D views of the same floor plan.

### Phase 5 — Multi-Floor & Polish (Week 9-10)

**Goal: Complete buildings with multiple floors**

- [ ] Floor manager UI (add, remove, reorder floors)
- [ ] Per-floor bitmap loading
- [ ] Floor elevation and height settings
- [ ] Multi-floor 3D rendering (stacked)
- [ ] Floor transparency/ghosting in 3D (see floor below)
- [ ] Copy floor layout to new floor (common in residential)
- [ ] First-person walkthrough camera mode
- [ ] Project save/load (IndexedDB)
- [ ] Auto-save

**Deliverable**: Multi-story building with walkthrough capability.

### Phase 6 — Export & Refinement (Week 11-12)

**Goal: Production-ready tool**

- [ ] glTF/GLB export
- [ ] OBJ export
- [ ] SVG export of 2D plan
- [ ] Screenshot/render export
- [ ] PDF loader (pdf.js integration for direct PDF import)
- [ ] Project file export/import (.bpf zip)
- [ ] Performance optimization for large blueprints
- [ ] Offline capability (service worker)
- [ ] Onboarding tutorial overlay

**Deliverable**: Complete, polished tool ready for real use.

---

## Future Enhancements (Post v1)

- **AI-assisted tracing**: Use edge detection to suggest wall positions from the bitmap
- **Furniture library**: Drag-and-drop standard furniture for staging
- **Roof builder**: Define roof pitch and style from plan outline
- **Staircase tool**: Draw stairs with proper 3D representation
- **IFC export**: For compatibility with BIM tools (ArchiCAD, Revit)
- **Collaboration**: Share projects via URL, real-time co-editing
- **AR preview**: Use WebXR to view the 3D model overlaid on the real site
- **Integration with Scaffer**: Import/export to the scaffolding CAD tool
- **Icelandic building code validation**: Check minimum room sizes, ceiling heights, window areas against Byggingarreglugerð

---

## Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Language | Vanilla JavaScript (ES2022+) | No build step, maximum control, aligns with preference |
| 3D Engine | Babylon.js | Excellent CSG support, good mobile perf, well-documented |
| PDF Rendering | pdf.js (Mozilla) | Industry standard, client-side PDF parsing |
| 2D Rendering | HTML5 Canvas 2D | Fast, simple, good for layered rendering |
| Polygon Ops | earcut (triangulation) | Lightweight, required by Babylon for polygon extrusion |
| Storage | IndexedDB | Large blob support for bitmaps, offline capable |
| Bundling | None (ES modules) | Native browser modules, no toolchain complexity |
| Hosting | Static files | Can run from file://, localhost, or any static host |

### External Dependencies (CDN)

- `babylonjs` — 3D rendering
- `babylonjs-loaders` — glTF export
- `earcut` — polygon triangulation
- `pdfjs-dist` — PDF rendering

Everything else is written from scratch.

---

## Naming & Terminology

The app uses consistent terminology:

| Internal Term | User-Facing (EN) | User-Facing (IS) |
|--------------|-------------------|-------------------|
| Wall | Wall | Veggur |
| Opening | Opening | Op |
| Door | Door | Hurð |
| Window | Window | Gluggi |
| Room | Room | Herbergi |
| Floor (level) | Floor | Hæð |
| Floor (surface) | Floor slab | Gólf |
| Ceiling | Ceiling | Loft |
| Elevation | Elevation | Hæðarmerki |
| Blueprint | Blueprint | Teikning |
| Scale | Scale | Mælikvarði |
| Thickness | Thickness | Þykkt |

The UI should support language switching between EN and IS.

---

## File & Folder Structure (Final)

```
/blueprintforge
  index.html
  styles.css
  app.js

  /src
    /core           — Data model and geometry (pure, testable)
    /input          — Unified input handling
    /editor2d       — 2D canvas editor
    /viewer3d       — Babylon.js 3D viewer
    /ui             — UI components and layout
    /io             — File loading, saving, export
    /utils          — Shared utilities
    /i18n           — Localization strings

  /assets
    /icons          — Tool icons (SVG)
    /textures       — Default materials for 3D

  /test
    /core           — Unit tests for geometry, model
    /integration    — End-to-end tests
```
