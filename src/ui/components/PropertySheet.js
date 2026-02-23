/**
 * PropertySheet — Edit properties of selected elements.
 * Renders into the property panel (desktop) or bottom sheet (mobile).
 */
export class PropertySheet {
  /**
   * @param {HTMLElement} panelContainer - #property-panel
   * @param {HTMLElement} sheetContainer - #bottom-sheet
   * @param {EventBus} eventBus
   * @param {object} context - { blueprint, platform }
   */
  constructor(panelContainer, sheetContainer, eventBus, context) {
    this.panel = panelContainer;
    this.sheet = sheetContainer;
    this.eventBus = eventBus;
    this.ctx = context;

    this._selectedElement = null;
    this._selectedType = null;

    this.eventBus.on('selection:changed', ({ id, type }) => {
      if (id) {
        const floor = this.ctx.blueprint.activeFloor;
        if (floor) {
          const found = floor.findElement(id);
          if (found) {
            this._show(found.element, found.type);
            return;
          }
        }
      }
      this._hide();
    });
  }

  _show(element, type) {
    this._selectedElement = element;
    this._selectedType = type;

    const container = this.ctx.platform.isDesktop ? this.panel : this.sheet;
    container.classList.remove('hidden');

    let html = '';
    if (type === 'wall') {
      html = this._renderWallProps(element);
    } else if (type === 'opening') {
      html = this._renderOpeningProps(element);
    } else if (type === 'room') {
      html = this._renderRoomProps(element);
    } else {
      html = `<div class="property-group"><h3>${type}</h3><p>ID: ${element.id}</p></div>`;
    }
    container.innerHTML = html;

    this._bindPropertyEvents(container, element, type);
  }

  _hide() {
    this._selectedElement = null;
    this._selectedType = null;
    this.panel.classList.add('hidden');
    this.sheet.classList.add('hidden');
  }

  _renderWallProps(wall) {
    return `
      <div class="sheet-handle"></div>
      <div class="sheet-title">Wall Properties</div>
      <div class="property-group">
        <div class="property-row">
          <label>Thickness</label>
          <input type="number" step="0.01" min="0.05" max="1.0"
                 value="${wall.thickness}" data-prop="thickness" data-type="number"> m
        </div>
        <div class="property-row">
          <label>Material</label>
          <select data-prop="material">
            <option value="concrete" ${wall.material === 'concrete' ? 'selected' : ''}>Concrete</option>
            <option value="timber" ${wall.material === 'timber' ? 'selected' : ''}>Timber</option>
            <option value="partition" ${wall.material === 'partition' ? 'selected' : ''}>Partition</option>
          </select>
        </div>
        <div class="property-row">
          <label>Exterior</label>
          <input type="checkbox" data-prop="isExterior" ${wall.isExterior ? 'checked' : ''}>
        </div>
        <div class="property-row">
          <label>Length</label>
          <span>${wall.length.toFixed(2)} m</span>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="btn-delete-element">Delete</button>
        <button class="btn btn-primary" id="btn-done-props">Done</button>
      </div>
    `;
  }

  _renderOpeningProps(opening) {
    const swingOptions = ['left', 'right', 'double', 'sliding', null].map(s => {
      const label = s || 'None';
      const selected = opening.swing === s ? 'selected' : '';
      return `<option value="${s || ''}" ${selected}>${label}</option>`;
    }).join('');

    return `
      <div class="sheet-handle"></div>
      <div class="sheet-title">${opening.type.charAt(0).toUpperCase() + opening.type.slice(1)} Properties</div>
      <div class="property-group">
        <div class="property-row">
          <label>Width</label>
          <input type="number" step="0.1" min="0.3" max="5.0"
                 value="${opening.width}" data-prop="width" data-type="number"> m
        </div>
        <div class="property-row">
          <label>Height</label>
          <input type="number" step="0.1" min="0.3" max="4.0"
                 value="${opening.height}" data-prop="height" data-type="number"> m
        </div>
        <div class="property-row">
          <label>Sill Height</label>
          <input type="number" step="0.1" min="0" max="3.0"
                 value="${opening.sillHeight}" data-prop="sillHeight" data-type="number"> m
        </div>
        <div class="property-row">
          <label>Swing</label>
          <select data-prop="swing">${swingOptions}</select>
        </div>
        <div class="property-row">
          <label>Position</label>
          <span>${opening.position.toFixed(2)} m along wall</span>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="btn-delete-element">Delete</button>
        <button class="btn btn-primary" id="btn-done-props">Done</button>
      </div>
    `;
  }

  _renderRoomProps(room) {
    return `
      <div class="sheet-handle"></div>
      <div class="sheet-title">Room Properties</div>
      <div class="property-group">
        <div class="property-row">
          <label>Label</label>
          <input type="text" value="${room.label}" data-prop="label">
        </div>
        <div class="property-row">
          <label>Area</label>
          <span>${room.area.toFixed(1)} m²</span>
        </div>
        <div class="property-row">
          <label>Floor Material</label>
          <select data-prop="floorMaterial">
            <option value="default" ${room.floorMaterial === 'default' ? 'selected' : ''}>Default</option>
            <option value="tile" ${room.floorMaterial === 'tile' ? 'selected' : ''}>Tile</option>
            <option value="wood" ${room.floorMaterial === 'wood' ? 'selected' : ''}>Wood</option>
            <option value="carpet" ${room.floorMaterial === 'carpet' ? 'selected' : ''}>Carpet</option>
            <option value="marble" ${room.floorMaterial === 'marble' ? 'selected' : ''}>Marble</option>
          </select>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="btn-delete-element">Delete</button>
        <button class="btn btn-primary" id="btn-done-props">Done</button>
      </div>
    `;
  }

  _bindPropertyEvents(container, element, type) {
    // Property inputs
    container.querySelectorAll('[data-prop]').forEach(input => {
      const prop = input.dataset.prop;

      const handler = () => {
        if (input.type === 'checkbox') {
          element[prop] = input.checked;
        } else if (input.dataset.type === 'number') {
          element[prop] = parseFloat(input.value) || element[prop];
        } else {
          element[prop] = input.value;
        }
        this.eventBus.emit('property:changed', { element, prop });
        this.eventBus.emit('viewport:redraw');
      };

      input.addEventListener('change', handler);
      if (input.type === 'number') {
        input.addEventListener('input', handler);
      }
    });

    // Delete button
    const deleteBtn = container.querySelector('#btn-delete-element');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.eventBus.emit('action:delete');
      });
    }

    // Done button
    const doneBtn = container.querySelector('#btn-done-props');
    if (doneBtn) {
      doneBtn.addEventListener('click', () => {
        this._hide();
      });
    }
  }
}
