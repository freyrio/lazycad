/**
 * ExportDialog — Modal dialog for selecting export format and options.
 */
import { ExportGLTF } from '../../io/ExportGLTF.js';
import { ExportOBJ } from '../../io/ExportOBJ.js';
import { ExportSVG } from '../../io/ExportSVG.js';
import { Screenshot } from '../../io/Screenshot.js';
import { ProjectFile } from '../../io/ProjectFile.js';

export class ExportDialog {
  /**
   * @param {HTMLElement} overlay - #modal-overlay
   * @param {EventBus} eventBus
   * @param {object} config
   * @param {Blueprint} config.blueprint
   * @param {object} [config.editor3d] - Editor3D instance (optional)
   */
  constructor(overlay, eventBus, config) {
    this.overlay = overlay;
    this.eventBus = eventBus;
    this.blueprint = config.blueprint;
    this.editor3d = config.editor3d || null;

    this.eventBus.on('action:export', () => this.show());
  }

  show() {
    const floor = this.blueprint.activeFloor;
    const floorName = floor?.name || 'Floor';
    const hasGLTF = ExportGLTF.isAvailable();
    const has3D = this.editor3d?.scene != null;

    this.overlay.classList.remove('hidden');
    this.overlay.innerHTML = `
      <div class="modal export-modal">
        <h2>Export</h2>

        <div class="export-section">
          <h3>3D Model</h3>
          <div class="export-options">
            <button class="export-btn" data-format="gltf" ${has3D && hasGLTF ? '' : 'disabled'}>
              <span class="export-icon">📦</span>
              <span class="export-label">GLB</span>
              <span class="export-desc">glTF Binary${!hasGLTF ? ' (loader needed)' : ''}</span>
            </button>
            <button class="export-btn" data-format="obj">
              <span class="export-icon">🧊</span>
              <span class="export-label">OBJ</span>
              <span class="export-desc">Wavefront OBJ + MTL</span>
            </button>
          </div>
        </div>

        <div class="export-section">
          <h3>2D Drawing</h3>
          <div class="export-options">
            <button class="export-btn" data-format="svg">
              <span class="export-icon">📐</span>
              <span class="export-label">SVG</span>
              <span class="export-desc">${floorName} — vector</span>
            </button>
            <button class="export-btn" data-format="screenshot-2d">
              <span class="export-icon">📸</span>
              <span class="export-label">PNG</span>
              <span class="export-desc">2D screenshot</span>
            </button>
            <button class="export-btn" data-format="screenshot-3d" ${has3D ? '' : 'disabled'}>
              <span class="export-icon">🖼️</span>
              <span class="export-label">PNG 3D</span>
              <span class="export-desc">3D render</span>
            </button>
          </div>
        </div>

        <div class="export-section">
          <h3>Project</h3>
          <div class="export-options">
            <button class="export-btn" data-format="project-json">
              <span class="export-icon">💾</span>
              <span class="export-label">JSON</span>
              <span class="export-desc">Project file (.bpf.json)</span>
            </button>
            <button class="export-btn" data-format="project-bundle">
              <span class="export-icon">📁</span>
              <span class="export-label">Bundle</span>
              <span class="export-desc">Project + bitmaps</span>
            </button>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" id="export-cancel">Close</button>
        </div>
      </div>
    `;

    // Bind events
    this.overlay.querySelector('#export-cancel').addEventListener('click', () => this._close());

    for (const btn of this.overlay.querySelectorAll('.export-btn:not([disabled])')) {
      btn.addEventListener('click', (e) => {
        const format = e.currentTarget.dataset.format;
        this._export(format);
      });
    }
  }

  async _export(format) {
    const floor = this.blueprint.activeFloor;
    const name = this.blueprint.name || 'project';

    try {
      switch (format) {
        case 'gltf':
          if (this.editor3d?.scene) {
            await ExportGLTF.exportGLB(this.editor3d.scene, name);
            this.eventBus.emit('toast', 'Exported GLB model');
          }
          break;

        case 'obj':
          ExportOBJ.download(this.blueprint, name);
          this.eventBus.emit('toast', 'Exported OBJ + MTL');
          break;

        case 'svg':
          if (floor) {
            ExportSVG.download(floor, `${floor.name.replace(/\s+/g, '_')}.svg`);
            this.eventBus.emit('toast', 'Exported SVG');
          }
          break;

        case 'screenshot-2d':
          Screenshot.capture2D(
            document.getElementById('viewport-2d'),
            `${name}_2d.png`
          );
          this.eventBus.emit('toast', 'Screenshot saved');
          break;

        case 'screenshot-3d':
          Screenshot.capture3D(
            document.getElementById('canvas-3d'),
            `${name}_3d.png`
          );
          this.eventBus.emit('toast', 'Render saved');
          break;

        case 'project-json': {
          const data = JSON.stringify(this.blueprint.toJSON(), null, 2);
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${name}.bpf.json`;
          a.click();
          URL.revokeObjectURL(url);
          this.eventBus.emit('toast', 'Project JSON saved');
          break;
        }

        case 'project-bundle':
          await ProjectFile.exportProject(this.blueprint);
          this.eventBus.emit('toast', 'Project bundle saved');
          break;
      }
    } catch (e) {
      this.eventBus.emit('toast', `Export failed: ${e.message}`);
    }

    this._close();
  }

  _close() {
    this.overlay.classList.add('hidden');
    this.overlay.innerHTML = '';
  }
}
