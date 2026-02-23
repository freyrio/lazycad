/**
 * Editor2D — Main 2D editor controller.
 * Manages the viewport, layers, tools, and the render loop.
 */
import { Viewport2D } from './Viewport2D.js';
import { BitmapLayer } from './layers/BitmapLayer.js';
import { GridLayer } from './layers/GridLayer.js';
import { WallLayer } from './layers/WallLayer.js';
import { CursorLayer } from './layers/CursorLayer.js';
import { SnapLayer } from './layers/SnapLayer.js';
import { InputManager } from '../input/InputManager.js';
import { GestureRecognizer } from '../input/GestureRecognizer.js';
import { ToolStateMachine } from '../input/ToolStateMachine.js';
import { SnapEngine, GridSnap, EndpointSnap, AngleSnap, WallSnap } from '../core/snap/SnapEngine.js';
import { WallTool } from './tools/WallTool.js';
import { SelectTool } from './tools/SelectTool.js';
import { EraseTool } from './tools/EraseTool.js';
import { MeasureTool } from './tools/MeasureTool.js';
import { CalibrateTool } from './tools/CalibrateTool.js';
import { ImageLoader } from '../io/ImageLoader.js';

export class Editor2D {
  /**
   * @param {object} config
   * @param {HTMLElement} config.container - #viewport-2d
   * @param {EventBus} config.eventBus
   * @param {Blueprint} config.blueprint
   * @param {History} config.history
   * @param {Platform} config.platform
   */
  constructor({ container, eventBus, blueprint, history, platform }) {
    this.container = container;
    this.eventBus = eventBus;
    this.blueprint = blueprint;
    this.history = history;
    this.platform = platform;

    // Create viewport
    this.viewport = new Viewport2D(container, eventBus);

    // Create layers
    this.bitmapLayer = new BitmapLayer(eventBus);
    this.gridLayer = new GridLayer(eventBus);
    this.wallLayer = new WallLayer(eventBus);
    this.cursorLayer = new CursorLayer(eventBus);
    this.snapLayer = new SnapLayer(eventBus);

    // Register layers to their respective canvases
    this.viewport.addRenderer('bitmap', this.bitmapLayer);
    this.viewport.addRenderer('grid', this.gridLayer);
    this.viewport.addRenderer('vectors', this.wallLayer);
    this.viewport.addRenderer('interaction', this.cursorLayer);
    this.viewport.addRenderer('interaction', this.snapLayer);

    // Set floor for wall layer
    if (this.blueprint.activeFloor) {
      this.wallLayer.setFloor(this.blueprint.activeFloor);
    }

    // Create snap engine
    this.snapEngine = new SnapEngine(eventBus);
    this.snapEngine.addProvider(new GridSnap(this.gridLayer));
    this.snapEngine.addProvider(new EndpointSnap());
    this.snapEngine.addProvider(new AngleSnap());
    this.snapEngine.addProvider(new WallSnap());

    // Create input system
    this.inputManager = new InputManager(container, this.viewport, eventBus, platform);
    this.gestureRecognizer = new GestureRecognizer(eventBus, this.viewport);

    // Tool context shared by all tools
    this.toolContext = {
      blueprint: this.blueprint,
      viewport: this.viewport,
      snapEngine: this.snapEngine,
      cursorLayer: this.cursorLayer,
      snapLayer: this.snapLayer,
      wallLayer: this.wallLayer,
      history: this.history,
      platform: this.platform,
    };

    // Create tool state machine and register tools
    this.toolStateMachine = new ToolStateMachine(eventBus);
    this.toolStateMachine.register('select', new SelectTool(eventBus, this.toolContext));
    this.toolStateMachine.register('wall', new WallTool(eventBus, this.toolContext));
    this.toolStateMachine.register('erase', new EraseTool(eventBus, this.toolContext));
    this.toolStateMachine.register('measure', new MeasureTool(eventBus, this.toolContext));
    this.toolStateMachine.register('calibrate', new CalibrateTool(eventBus, this.toolContext));

    // Expose calibrate tool for dialog callback
    this.calibrateTool = this.toolStateMachine.getTool('calibrate');

    // Activate default tool
    this.toolStateMachine.activate('select');

    // Pan via gesture (middle-click or space+drag)
    this._isPanning = false;
    this._panStart = null;
    this._panStartOffset = null;

    this._bindEvents();
    this._startRenderLoop();

    // Initial view
    this.viewport.resetView();
  }

  _bindEvents() {
    // Pan via space+drag (handled in select tool, but also need for other tools)
    this.eventBus.on('tool:spacepan', (active) => {
      if (active) {
        this.container.style.cursor = 'grab';
      } else {
        this.container.style.cursor = '';
        this._isPanning = false;
      }
    });

    this.eventBus.on('gesture:dragstart', (e) => {
      if (this.toolStateMachine.isSpacePan || e.button === 1) {
        this._isPanning = true;
        this._panStart = { x: e.position.x, y: e.position.y };
        this._panStartOffset = { x: this.viewport.offsetX, y: this.viewport.offsetY };
        this.container.style.cursor = 'grabbing';
      }
    });

    this.eventBus.on('gesture:drag', (e) => {
      if (this._isPanning && this._panStart) {
        const dx = e.position.x - this._panStart.x;
        const dy = e.position.y - this._panStart.y;
        this.viewport.setTransform(
          this.viewport.scale,
          this._panStartOffset.x + dx,
          this._panStartOffset.y + dy
        );
      }
    });

    this.eventBus.on('gesture:dragend', () => {
      if (this._isPanning) {
        this._isPanning = false;
        this.container.style.cursor = this.toolStateMachine.isSpacePan ? 'grab' : '';
      }
    });

    // Fit view
    this.eventBus.on('action:fit-view', () => this.fitView());
    this.eventBus.on('gesture:doubletap', () => {
      // Double tap fits view if no tool is specifically handling it
    });

    // Import image
    this.eventBus.on('action:import', () => this._importImage());

    // Grid toggle
    this.eventBus.on('action:toggle-grid', () => {
      this.gridLayer.visible = !this.gridLayer.visible;
      this.viewport.markDirty('grid');
    });

    // Redraw on data changes
    this.eventBus.on('history:undo', () => this.viewport.markDirty('vectors'));
    this.eventBus.on('history:redo', () => this.viewport.markDirty('vectors'));
    this.eventBus.on('viewport:redraw', () => this.viewport.markAllDirty());
    this.eventBus.on('property:changed', () => this.viewport.markDirty('vectors'));

    // Layer bitmap changes
    this.eventBus.on('layer:bitmap:changed', () => this.viewport.markDirty('bitmap'));

    // Haptic feedback on snap
    this.eventBus.on('snap:hit', ({ type }) => {
      if (type === 'endpoint') {
        this.platform.haptic(15);
      } else if (type === 'wall') {
        this.platform.haptic(10);
      } else if (type !== 'grid') {
        this.platform.haptic(8);
      }
    });

    // Wall preset cycling (T key handled via keyboard)
    this.eventBus.on('action:cycle-wall-preset', () => {
      const wallTool = this.toolStateMachine.getTool('wall');
      if (wallTool) wallTool.cyclePreset();
    });
  }

  _startRenderLoop() {
    const loop = () => {
      this.viewport.render();
      this._animationFrame = requestAnimationFrame(loop);
    };
    this._animationFrame = requestAnimationFrame(loop);
  }

  async _importImage() {
    const input = document.getElementById('file-input');
    if (!input) return;

    input.click();
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const bitmapData = await ImageLoader.fromFile(file);
        this.bitmapLayer.setImage(bitmapData);

        // Store bitmap reference on active floor
        const floor = this.blueprint.activeFloor;
        if (floor) {
          floor.bitmap = {
            image: bitmapData.image,
            url: bitmapData.url,
            width: bitmapData.width,
            height: bitmapData.height,
          };
        }

        // Fit view to the imported image
        this.viewport.fitBounds({
          minX: 0,
          minY: 0,
          maxX: bitmapData.width,
          maxY: bitmapData.height,
        });

        this.eventBus.emit('toast', `Loaded: ${file.name} (${bitmapData.width}x${bitmapData.height})`);
      } catch (err) {
        this.eventBus.emit('toast', `Error: ${err.message}`);
      }

      // Reset input
      input.value = '';
    };
  }

  /**
   * Fit the view to show all content.
   */
  fitView() {
    const bitmapBounds = this.bitmapLayer.getBounds();
    if (bitmapBounds) {
      this.viewport.fitBounds(bitmapBounds);
    } else {
      // Fit to walls
      const floor = this.blueprint.activeFloor;
      if (floor && floor.walls.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const wall of floor.walls) {
          const b = wall.getBounds();
          minX = Math.min(minX, b.minX);
          minY = Math.min(minY, b.minY);
          maxX = Math.max(maxX, b.maxX);
          maxY = Math.max(maxY, b.maxY);
        }
        if (minX < Infinity) {
          this.viewport.fitBounds({ minX, minY, maxX, maxY });
        }
      } else {
        this.viewport.resetView();
      }
    }
  }

  /**
   * Show the 2D editor.
   */
  show() {
    this.container.classList.remove('hidden');
    this.viewport.markAllDirty();
  }

  /**
   * Hide the 2D editor.
   */
  hide() {
    this.container.classList.add('hidden');
  }

  destroy() {
    cancelAnimationFrame(this._animationFrame);
    this.inputManager.destroy();
    this.viewport.destroy();
  }
}
