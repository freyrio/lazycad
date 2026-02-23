/**
 * FloorManager — UI panel for managing multiple floors.
 * Shows as a compact strip above the bottom toolbar on mobile,
 * or as a side panel section on desktop.
 */
export class FloorManager {
  /**
   * @param {HTMLElement} container - DOM element to render into
   * @param {EventBus} eventBus
   * @param {Blueprint} blueprint
   * @param {Platform} platform
   */
  constructor(container, eventBus, blueprint, platform) {
    this.container = container;
    this.eventBus = eventBus;
    this.blueprint = blueprint;
    this.platform = platform;

    this._render();
    this._bindEvents();
  }

  _render() {
    this.container.innerHTML = '';
    this.container.className = 'floor-manager';

    const floors = this.blueprint.floors;
    const activeId = this.blueprint.activeFloor?.id;

    // Floor tabs
    const tabStrip = document.createElement('div');
    tabStrip.className = 'floor-tabs';

    for (let i = 0; i < floors.length; i++) {
      const floor = floors[i];
      const tab = document.createElement('button');
      tab.className = 'floor-tab' + (floor.id === activeId ? ' active' : '');
      tab.textContent = floor.name;
      tab.dataset.floorId = floor.id;
      tab.addEventListener('click', () => this._switchFloor(floor.id));

      // Long press for floor options on mobile
      let pressTimer = null;
      tab.addEventListener('pointerdown', () => {
        pressTimer = setTimeout(() => this._showFloorMenu(floor.id, tab), 500);
      });
      tab.addEventListener('pointerup', () => clearTimeout(pressTimer));
      tab.addEventListener('pointerleave', () => clearTimeout(pressTimer));

      tabStrip.appendChild(tab);
    }

    // Add floor button
    const addBtn = document.createElement('button');
    addBtn.className = 'floor-tab floor-tab-add';
    addBtn.innerHTML = '+';
    addBtn.title = 'Add floor';
    addBtn.addEventListener('click', () => this._addFloor());
    tabStrip.appendChild(addBtn);

    this.container.appendChild(tabStrip);

    // Floor actions (visible when a floor tab is long-pressed or right-clicked)
    this._menu = document.createElement('div');
    this._menu.className = 'floor-menu hidden';
    this.container.appendChild(this._menu);
  }

  _bindEvents() {
    this.eventBus.on('floor:changed', () => this._render());
    this.eventBus.on('floor:added', () => this._render());
    this.eventBus.on('floor:removed', () => this._render());
    this.eventBus.on('floor:renamed', () => this._render());
  }

  _switchFloor(floorId) {
    if (this.blueprint.activeFloor?.id === floorId) return;
    this.blueprint.setActiveFloor(floorId);
    this.eventBus.emit('floor:changed', floorId);
    this._render();
  }

  _addFloor() {
    const count = this.blueprint.floors.length;
    const names = ['Ground Floor', '1st Floor', '2nd Floor', '3rd Floor'];
    const name = count < names.length ? names[count] : `${count}th Floor`;
    const floor = this.blueprint.addFloor(name);
    this.blueprint.setActiveFloor(floor.id);
    this.eventBus.emit('floor:added', floor.id);
    this.eventBus.emit('floor:changed', floor.id);
    this.eventBus.emit('toast', `Added: ${floor.name}`);
    this._render();
  }

  _showFloorMenu(floorId, anchorEl) {
    const floor = this.blueprint.getFloor(floorId);
    if (!floor) return;

    const isActive = this.blueprint.activeFloor?.id === floorId;
    const canDelete = this.blueprint.floors.length > 1;

    this._menu.classList.remove('hidden');
    this._menu.innerHTML = `
      <div class="floor-menu-content">
        <button class="floor-menu-item" data-action="rename">Rename</button>
        <button class="floor-menu-item" data-action="settings">Settings</button>
        <button class="floor-menu-item" data-action="copy">Duplicate Floor</button>
        <button class="floor-menu-item" data-action="bitmap">Load Blueprint Image</button>
        ${canDelete ? '<button class="floor-menu-item floor-menu-danger" data-action="delete">Delete Floor</button>' : ''}
      </div>
    `;

    // Position near the anchor
    const rect = anchorEl.getBoundingClientRect();
    this._menu.style.left = `${rect.left}px`;
    this._menu.style.bottom = `${window.innerHeight - rect.top + 4}px`;

    const handler = (e) => {
      const action = e.target.dataset?.action;
      if (action) {
        this._handleFloorAction(action, floorId);
      }
      this._menu.classList.add('hidden');
      document.removeEventListener('click', handler);
    };

    // Dismiss on next click
    setTimeout(() => document.addEventListener('click', handler), 0);
  }

  _handleFloorAction(action, floorId) {
    const floor = this.blueprint.getFloor(floorId);
    if (!floor) return;

    switch (action) {
      case 'rename': {
        const newName = prompt('Floor name:', floor.name);
        if (newName && newName.trim()) {
          floor.name = newName.trim();
          this.eventBus.emit('floor:renamed', floorId);
          this._render();
        }
        break;
      }
      case 'settings':
        this.blueprint.setActiveFloor(floorId);
        this.eventBus.emit('floor:changed', floorId);
        this.eventBus.emit('action:floor-height');
        break;
      case 'copy': {
        const copy = this.blueprint.copyFloor(floorId);
        if (copy) {
          this.blueprint.setActiveFloor(copy.id);
          this.eventBus.emit('floor:added', copy.id);
          this.eventBus.emit('floor:changed', copy.id);
          this.eventBus.emit('toast', `Duplicated: ${copy.name}`);
        }
        break;
      }
      case 'bitmap':
        this.blueprint.setActiveFloor(floorId);
        this.eventBus.emit('floor:changed', floorId);
        this.eventBus.emit('action:import');
        break;
      case 'delete':
        if (this.blueprint.floors.length > 1) {
          this.blueprint.removeFloor(floorId);
          this.eventBus.emit('floor:removed', floorId);
          this.eventBus.emit('floor:changed', this.blueprint.activeFloor?.id);
          this.eventBus.emit('toast', `Deleted: ${floor.name}`);
        }
        break;
    }
  }
}
