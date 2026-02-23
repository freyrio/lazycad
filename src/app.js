/**
 * BlueprintForge — Main application bootstrap.
 * Wires together all modules and starts the app.
 */
import { EventBus } from './utils/EventBus.js';
import { Platform } from './utils/Platform.js';
import { Blueprint } from './core/Blueprint.js';
import { History } from './core/history/History.js';
import { Editor2D } from './editor2d/Editor2D.js';
import { KeyboardManager } from './input/KeyboardManager.js';
import { TopBar } from './ui/components/TopBar.js';
import { Toolbar } from './ui/components/Toolbar.js';
import { Toast } from './ui/components/Toast.js';
import { PropertySheet } from './ui/components/PropertySheet.js';
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

    // View switching (2D/3D)
    this.eventBus.on('view:changed', (view) => {
      if (view === '2d') {
        this.editor2d.show();
        document.getElementById('viewport-3d').classList.add('hidden');
      } else {
        this.editor2d.hide();
        document.getElementById('viewport-3d').classList.remove('hidden');
        this.eventBus.emit('toast', '3D viewer coming in Phase 4');
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
