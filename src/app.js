/**
 * BlueprintForge — Main application bootstrap.
 * Wires together all modules and starts the app.
 */
import { EventBus } from './utils/EventBus.js';
import { Platform } from './utils/Platform.js';
import { Blueprint } from './core/Blueprint.js';
import { History } from './core/history/History.js';
import { Editor2D } from './editor2d/Editor2D.js';
import { Editor3D } from './editor3d/Editor3D.js';
import { KeyboardManager } from './input/KeyboardManager.js';
import { TopBar } from './ui/components/TopBar.js';
import { Toolbar } from './ui/components/Toolbar.js';
import { Toast } from './ui/components/Toast.js';
import { PropertySheet } from './ui/components/PropertySheet.js';
import { CalibrateDialog } from './ui/dialogs/CalibrateDialog.js';
import { Layout } from './ui/Layout.js';

class App {
  constructor() {
    // Core systems
    this.eventBus = new EventBus();
    this.platform = new Platform();
    this.blueprint = new Blueprint();
    this.history = new History(this.eventBus);

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

    // 3D Editor
    this.editor3d = new Editor3D({
      canvas: document.getElementById('canvas-3d'),
      container: document.getElementById('viewport-3d'),
      eventBus: this.eventBus,
      blueprint: this.blueprint,
      platform: this.platform,
    });

    // Floor height configuration dialog
    this.eventBus.on('action:floor-height', () => this._showFloorHeightDialog());

    // 3D camera presets (numpad 1-4)
    this.eventBus.on('action:camera-perspective', () => this.eventBus.emit('camera:preset', 'perspective'));
    this.eventBus.on('action:camera-top', () => this.eventBus.emit('camera:preset', 'top'));
    this.eventBus.on('action:camera-front', () => this.eventBus.emit('camera:preset', 'front'));
    this.eventBus.on('action:camera-side', () => this.eventBus.emit('camera:preset', 'side'));

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

    // Save shortcut
    this.eventBus.on('action:save', () => {
      this._saveProject();
    });

    // Open shortcut
    this.eventBus.on('action:open', () => {
      this.eventBus.emit('action:import');
    });

    // Set device attribute on body
    document.body.setAttribute('data-device', this.platform.device);

    // Welcome toast
    this.eventBus.emit('toast', 'BlueprintForge ready');
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
      this.eventBus.emit('toast', `${floor.name}: ceiling ${floor.ceilingHeight}m, slab ${floor.slabThickness}m`);
      this.eventBus.emit('viewport:redraw');
    });

    overlay.querySelector('#fh-cancel').addEventListener('click', () => {
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
    });
  }

  _saveProject() {
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
