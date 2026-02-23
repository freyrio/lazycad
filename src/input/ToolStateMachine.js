/**
 * ToolStateMachine — Manages the active tool state.
 * Tools are registered and switched between. Only one tool is active at a time.
 */
export class ToolStateMachine {
  /**
   * @param {EventBus} eventBus
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this._tools = new Map();
    this._activeTool = null;
    this._activeToolName = null;
    this._previousToolName = null;

    // Space-pan mode: temporarily switches to pan behavior
    this._spacePanActive = false;

    this._bindEvents();
  }

  _bindEvents() {
    this.eventBus.on('input:space', (down) => {
      this._spacePanActive = down;
      this.eventBus.emit('tool:spacepan', down);
    });

    // Tool switching via keyboard shortcuts
    this.eventBus.on('tool:select', () => this.activate('select'));
    this.eventBus.on('tool:wall', () => this.activate('wall'));
    this.eventBus.on('tool:door', () => this.activate('door'));
    this.eventBus.on('tool:window', () => this.activate('window'));
    this.eventBus.on('tool:measure', () => this.activate('measure'));
    this.eventBus.on('tool:erase', () => this.activate('erase'));
    this.eventBus.on('tool:calibrate', () => this.activate('calibrate'));
  }

  /**
   * Register a tool.
   * @param {string} name
   * @param {object} tool - Must implement: activate(), deactivate(), and event handlers
   */
  register(name, tool) {
    this._tools.set(name, tool);
  }

  /**
   * Activate a tool by name.
   */
  activate(name) {
    if (name === this._activeToolName) return;

    const tool = this._tools.get(name);
    if (!tool) return;

    // Deactivate current tool
    if (this._activeTool) {
      this._activeTool.deactivate();
    }

    this._previousToolName = this._activeToolName;
    this._activeToolName = name;
    this._activeTool = tool;
    tool.activate();

    this.eventBus.emit('tool:changed', { name, tool });
  }

  /**
   * Revert to the previous tool.
   */
  revert() {
    if (this._previousToolName) {
      this.activate(this._previousToolName);
    }
  }

  /**
   * Get the active tool.
   */
  get activeTool() { return this._activeTool; }
  get activeToolName() { return this._activeToolName; }
  get isSpacePan() { return this._spacePanActive; }

  /**
   * Get all registered tool names.
   */
  getToolNames() {
    return Array.from(this._tools.keys());
  }
}
