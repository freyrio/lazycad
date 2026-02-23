/**
 * BlueprintForge — Main application bootstrap.
 * Wires together all modules and starts the app.
 */
import { EventBus } from './utils/EventBus.js';
import { Platform } from './utils/Platform.js';
import { Storage } from './utils/Storage.js';
import { Blueprint } from './core/Blueprint.js';
import { History } from './core/history/History.js';
import { Editor2D } from './editor2d/Editor2D.js';
import { Editor3D } from './editor3d/Editor3D.js';
import { KeyboardManager } from './input/KeyboardManager.js';
import { TopBar } from './ui/components/TopBar.js';
import { Toolbar } from './ui/components/Toolbar.js';
import { Toast } from './ui/components/Toast.js';
import { PropertySheet } from './ui/components/PropertySheet.js';
import { FloorManager } from './ui/components/FloorManager.js';
import { CalibrateDialog } from './ui/dialogs/CalibrateDialog.js';
import { Layout } from './ui/Layout.js';

class App {
  constructor() {
    // Core systems
    this.eventBus = new EventBus();
    this.platform = new Platform();
    this.blueprint = new Blueprint();
    this.history = new History(this.eventBus);
    this.storage = new Storage();

    // Keyboard (desktop)
    this.keyboard = new KeyboardManager(this.eventBus);

    // Layout manager
    this.layout = new Layout(this.eventBus, this.platform);

    // 2D Editor
    this.editor2d = new Editor2D({
      container: document.getElementById('viewport-2d'),
      eventBus: this.eventBus,
      blueprint: this.blueprint,
      history: this.history,
      platform: this.platform,
    });

    // UI Components
    this.topBar = new TopBar(
      document.getElementById('top-bar'),
      this.eventBus
    );

    this.toolbar = new Toolbar(
      document.getElementById('bottom-toolbar'),
      this.eventBus,
      this.platform
    );

    this.toast = new Toast(
      document.getElementById('toast-container'),
      this.eventBus
    );

    this.propertySheet = new PropertySheet(
      document.getElementById('property-panel'),
      document.getElementById('bottom-sheet'),
      this.eventBus,
      { blueprint: this.blueprint, platform: this.platform }
    );

    // Floor manager
    this.floorManager = new FloorManager(
      document.getElementById('floor-manager'),
      this.eventBus,
      this.blueprint,
      this.platform
    );

    // Calibration dialog
    this.calibrateDialog = new CalibrateDialog(
      document.getElementById('modal-overlay'),
      this.eventBus,
      { blueprint: this.blueprint, platform: this.platform }
    );
    // Wire dialog to calibrate tool
    if (this.editor2d.calibrateTool) {
      this.calibrateDialog.setCalibrateTool(this.editor2d.calibrateTool);
    }

    // 3D Editor (may fail if Babylon.js CDN doesn't load)
    try {
      this.editor3d = new Editor3D({
        canvas: document.getElementById('canvas-3d'),
        container: document.getElementById('viewport-3d'),
        eventBus: this.eventBus,
        blueprint: this.blueprint,
        platform: this.platform,
      });
    } catch (e) {
      this.editor3d = null;
      this.eventBus.emit('toast', '3D engine unavailable');
    }

    // Floor height configuration dialog
    this.eventBus.on('action:floor-height', () => this._showFloorHeightDialog());

    // 3D camera presets (numpad 1-4, 5 for walkthrough)
    this.eventBus.on('action:camera-perspective', () => this.eventBus.emit('camera:preset', 'perspective'));
    this.eventBus.on('action:camera-top', () => this.eventBus.emit('camera:preset', 'top'));
    this.eventBus.on('action:camera-front', () => this.eventBus.emit('camera:preset', 'front'));
    this.eventBus.on('action:camera-side', () => this.eventBus.emit('camera:preset', 'side'));
    this.eventBus.on('action:camera-walkthrough', () => this.eventBus.emit('camera:preset', 'walkthrough'));

    // Floor navigation (PageUp / PageDown)
    this.eventBus.on('action:floor-up', () => {
      const floors = this.blueprint.floors;
      const idx = floors.findIndex(f => f.id === this.blueprint.activeFloor?.id);
      if (idx < floors.length - 1) {
        this.blueprint.setActiveFloor(floors[idx + 1].id);
        this.eventBus.emit('floor:changed', floors[idx + 1].id);
        this.eventBus.emit('toast', floors[idx + 1].name);
      }
    });
    this.eventBus.on('action:floor-down', () => {
      const floors = this.blueprint.floors;
      const idx = floors.findIndex(f => f.id === this.blueprint.activeFloor?.id);
      if (idx > 0) {
        this.blueprint.setActiveFloor(floors[idx - 1].id);
        this.eventBus.emit('floor:changed', floors[idx - 1].id);
        this.eventBus.emit('toast', floors[idx - 1].name);
      }
    });

    // View switching (2D/3D)
    this.eventBus.on('view:changed', (view) => {
      if (view === '2d') {
        this.editor2d.show();
        document.getElementById('viewport-3d').classList.add('hidden');
      } else {
        this.editor2d.hide();
        document.getElementById('viewport-3d').classList.remove('hidden');
      }
    });

    // Save shortcut (file download)
    this.eventBus.on('action:save', () => {
      this._saveProjectFile();
    });

    // Open shortcut
    this.eventBus.on('action:open', () => {
      this.eventBus.emit('action:import');
    });

    // Set device attribute on body
    document.body.setAttribute('data-device', this.platform.device);

    // Initialize storage and auto-save
    this._initStorage();

    // Welcome toast
    this.eventBus.emit('toast', 'BlueprintForge ready');
  }

  /**
   * Initialize IndexedDB storage and auto-save.
   */
  async _initStorage() {
    try {
      await this.storage.init();

      // Try to load last project
      const projects = await this.storage.listProjects();
      if (projects.length > 0) {
        const lastProject = projects[0]; // most recently modified
        const data = await this.storage.loadProject(lastProject.id);
        if (data) {
          this._loadBlueprint(data);
          this.eventBus.emit('toast', `Loaded: ${this.blueprint.name}`);
        }
      }
    } catch (e) {
      // IndexedDB may not be available (private browsing, etc.)
    }

    // Auto-save every 30 seconds
    this._autoSaveInterval = setInterval(() => this._autoSave(), 30000);

    // Also save on significant events
    this.eventBus.on('walltool:finish', () => this._debouncedAutoSave());
    this.eventBus.on('opening:placed', () => this._debouncedAutoSave());
    this.eventBus.on('room:created', () => this._debouncedAutoSave());
    this.eventBus.on('element:deleted', () => this._debouncedAutoSave());
  }

  _debouncedAutoSave() {
    if (this._autoSaveTimeout) clearTimeout(this._autoSaveTimeout);
    this._autoSaveTimeout = setTimeout(() => this._autoSave(), 2000);
  }

  async _autoSave() {
    try {
      if (!this.storage._db) return;
      this.blueprint.metadata.modified = Date.now();
      await this.storage.saveProject(this.blueprint.toJSON());
    } catch (e) {
      // Silent fail for auto-save
    }
  }

  /**
   * Load a Blueprint from JSON data, replacing the current document.
   */
  _loadBlueprint(data) {
    const loaded = Blueprint.fromJSON(data);
    // Transfer properties to existing blueprint reference
    this.blueprint.id = loaded.id;
    this.blueprint.name = loaded.name;
    this.blueprint.scale = loaded.scale;
    this.blueprint.floors = loaded.floors;
    this.blueprint._activeFloorId = loaded._activeFloorId;
    this.blueprint.metadata = loaded.metadata;

    // Re-sync all editors
    this.eventBus.emit('floor:changed', this.blueprint.activeFloor?.id);
    this.eventBus.emit('viewport:redraw');
  }

  _showFloorHeightDialog() {
    const floor = this.blueprint.activeFloor;
    if (!floor) return;

    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('hidden');
    overlay.innerHTML = `
      <div class="modal">
        <h2>Floor Height Settings</h2>
        <div class="property-group">
          <div class="property-row">
            <label>Floor Name</label>
            <input type="text" id="fh-name" value="${floor.name}" class="cal-input">
          </div>
          <div class="property-row">
            <label>Elevation (FFL)</label>
            <input type="number" id="fh-elevation" step="0.1" value="${floor.elevation}" class="cal-input"> m
          </div>
          <div class="property-row">
            <label>Floor-to-Floor</label>
            <input type="number" id="fh-f2f" step="0.1" min="2.0" max="10.0" value="${floor.floorToFloor}" class="cal-input"> m
          </div>
          <div class="property-row">
            <label>Ceiling Height</label>
            <input type="number" id="fh-ceiling" step="0.1" min="2.0" max="8.0" value="${floor.ceilingHeight}" class="cal-input"> m
          </div>
          <div class="property-row">
            <label>Slab Thickness</label>
            <input type="number" id="fh-slab" step="0.05" min="0.1" max="1.0" value="${floor.slabThickness}" class="cal-input"> m
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="fh-cancel">Cancel</button>
          <button class="btn btn-primary" id="fh-apply">Apply</button>
        </div>
      </div>
    `;

    overlay.querySelector('#fh-apply').addEventListener('click', () => {
      floor.name = overlay.querySelector('#fh-name').value || floor.name;
      floor.elevation = parseFloat(overlay.querySelector('#fh-elevation').value) || floor.elevation;
      floor.floorToFloor = parseFloat(overlay.querySelector('#fh-f2f').value) || floor.floorToFloor;
      floor.ceilingHeight = parseFloat(overlay.querySelector('#fh-ceiling').value) || floor.ceilingHeight;
      floor.slabThickness = parseFloat(overlay.querySelector('#fh-slab').value) || floor.slabThickness;
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
      this.eventBus.emit('floor:renamed', floor.id);
      this.eventBus.emit('toast', `${floor.name}: ceiling ${floor.ceilingHeight}m, slab ${floor.slabThickness}m`);
      this.eventBus.emit('viewport:redraw');
    });

    overlay.querySelector('#fh-cancel').addEventListener('click', () => {
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
    });
  }

  /**
   * Save project as downloadable file.
   */
  _saveProjectFile() {
    const data = JSON.stringify(this.blueprint.toJSON(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.blueprint.name || 'project'}.bpf.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.eventBus.emit('toast', 'Project saved');
  }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App());
} else {
  new App();
}
