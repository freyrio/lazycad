/**
 * Toolbar — Bottom tool buttons, responsive for phone/tablet/desktop.
 */
export class Toolbar {
  /**
   * @param {HTMLElement} container - #bottom-toolbar element
   * @param {EventBus} eventBus
   * @param {Platform} platform
   */
  constructor(container, eventBus, platform) {
    this.container = container;
    this.eventBus = eventBus;
    this.platform = platform;
    this._activeTool = 'select';

    this._tools = [
      {
        name: 'select',
        label: 'Select',
        icon: `<svg viewBox="0 0 24 24"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>`,
        shortcut: 'V',
      },
      {
        name: 'wall',
        label: 'Wall',
        icon: `<svg viewBox="0 0 24 24"><line x1="4" y1="20" x2="20" y2="4"/><circle cx="4" cy="20" r="1.5"/><circle cx="20" cy="4" r="1.5"/></svg>`,
        shortcut: 'W',
      },
      {
        name: 'door',
        label: 'Door',
        icon: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="14" height="18" rx="1"/><circle cx="14" cy="12" r="1.5"/></svg>`,
        shortcut: 'D',
      },
      {
        name: 'window',
        label: 'Window',
        icon: `<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="1"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="3" y1="12" x2="21" y2="12"/></svg>`,
        shortcut: 'N',
      },
      {
        name: 'room',
        label: 'Room',
        icon: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="1" fill="none"/><text x="12" y="15" text-anchor="middle" font-size="9" fill="currentColor" stroke="none">R</text></svg>`,
        shortcut: 'R',
      },
      { separator: true },
      {
        name: 'calibrate',
        label: 'Calibrate',
        icon: `<svg viewBox="0 0 24 24"><path d="M2 2l4 4m12 12l4 4M2 22l4-4m12-12l4-4"/><circle cx="12" cy="12" r="6" fill="none"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>`,
        shortcut: 'C',
      },
      {
        name: 'measure',
        label: 'Measure',
        icon: `<svg viewBox="0 0 24 24"><path d="M2 12h4l2-3 3 6 2-3h4"/><line x1="21" y1="12" x2="22" y2="12"/></svg>`,
        shortcut: 'M',
      },
      {
        name: 'erase',
        label: 'Erase',
        icon: `<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
        shortcut: 'E',
      },
    ];

    this._render();
    this._bindEvents();
  }

  _render() {
    const isPhone = this.platform.isPhone;

    this.container.innerHTML = this._tools.map(tool => {
      if (tool.separator) {
        return '<div class="toolbar-separator"></div>';
      }
      const active = tool.name === this._activeTool ? ' active' : '';
      const label = isPhone ? '' : `<span class="tool-label">${tool.label}</span>`;
      const title = `${tool.label} (${tool.shortcut})`;
      return `
        <button class="tool-button${active}" data-tool="${tool.name}" title="${title}">
          <span class="tool-icon">${tool.icon}</span>
          ${label}
        </button>
      `;
    }).join('');
  }

  _bindEvents() {
    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('.tool-button');
      if (!btn) return;
      const toolName = btn.dataset.tool;
      if (toolName) {
        this.eventBus.emit(`tool:${toolName}`);
      }
    });

    this.eventBus.on('tool:changed', ({ name }) => {
      this._activeTool = name;
      this.container.querySelectorAll('.tool-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === name);
      });
    });

    this.eventBus.on('layout:changed', () => {
      this._render();
    });
  }
}
