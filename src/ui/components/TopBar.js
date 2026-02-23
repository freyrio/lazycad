/**
 * TopBar — App title, view toggle, undo/redo, menu button.
 */
export class TopBar {
  /**
   * @param {HTMLElement} container - #top-bar element
   * @param {EventBus} eventBus
   */
  constructor(container, eventBus) {
    this.container = container;
    this.eventBus = eventBus;
    this._activeView = '2d';

    this._render();
    this._bindEvents();
  }

  _render() {
    this.container.innerHTML = `
      <div class="top-bar-left">
        <button class="btn-icon" id="btn-menu" title="Menu">
          <svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <span class="app-title">BlueprintForge</span>
      </div>
      <div class="top-bar-center">
        <div class="view-toggle">
          <button id="btn-view-2d" class="active" title="2D Editor">2D</button>
          <button id="btn-view-3d" title="3D Viewer">3D</button>
        </div>
      </div>
      <div class="top-bar-right">
        <button class="btn-icon" id="btn-undo" title="Undo (Ctrl+Z)">
          <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        </button>
        <button class="btn-icon" id="btn-redo" title="Redo (Ctrl+Shift+Z)">
          <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>
        </button>
        <button class="btn-icon" id="btn-import" title="Import Blueprint">
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </button>
      </div>
    `;
  }

  _bindEvents() {
    this.container.querySelector('#btn-view-2d').addEventListener('click', () => this._setView('2d'));
    this.container.querySelector('#btn-view-3d').addEventListener('click', () => this._setView('3d'));
    this.container.querySelector('#btn-undo').addEventListener('click', () => this.eventBus.emit('action:undo'));
    this.container.querySelector('#btn-redo').addEventListener('click', () => this.eventBus.emit('action:redo'));
    this.container.querySelector('#btn-import').addEventListener('click', () => this.eventBus.emit('action:import'));
    this.container.querySelector('#btn-menu').addEventListener('click', () => this.eventBus.emit('action:menu'));

    this.eventBus.on('action:toggle-view', () => {
      this._setView(this._activeView === '2d' ? '3d' : '2d');
    });

    this.eventBus.on('history:changed', (state) => {
      this.container.querySelector('#btn-undo').style.opacity = state.canUndo ? '1' : '0.3';
      this.container.querySelector('#btn-redo').style.opacity = state.canRedo ? '1' : '0.3';
    });
  }

  _setView(view) {
    this._activeView = view;
    this.container.querySelector('#btn-view-2d').classList.toggle('active', view === '2d');
    this.container.querySelector('#btn-view-3d').classList.toggle('active', view === '3d');
    this.eventBus.emit('view:changed', view);
  }

  get activeView() { return this._activeView; }
}
