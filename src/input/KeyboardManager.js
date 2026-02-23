/**
 * KeyboardManager — Keyboard shortcuts for desktop.
 */
export class KeyboardManager {
  /**
   * @param {EventBus} eventBus
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this._shortcuts = new Map();
    this._spaceDown = false;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);

    this._registerDefaults();
  }

  /**
   * Register a keyboard shortcut.
   * @param {string} combo - e.g., "ctrl+z", "shift+a", "escape", "delete"
   * @param {string} action - Event name to emit
   */
  register(combo, action) {
    this._shortcuts.set(combo.toLowerCase(), action);
  }

  _registerDefaults() {
    this.register('ctrl+z', 'action:undo');
    this.register('ctrl+shift+z', 'action:redo');
    this.register('ctrl+y', 'action:redo');
    this.register('delete', 'action:delete');
    this.register('backspace', 'action:delete');
    this.register('escape', 'action:cancel');
    this.register('v', 'tool:select');
    this.register('w', 'tool:wall');
    this.register('d', 'tool:door');
    this.register('n', 'tool:window');
    this.register('m', 'tool:measure');
    this.register('e', 'tool:erase');
    this.register('c', 'tool:calibrate');
    this.register('r', 'tool:room');
    this.register('h', 'action:floor-height');
    this.register('t', 'action:cycle-wall-preset');
    this.register('1', 'action:camera-perspective');
    this.register('2', 'action:camera-top');
    this.register('3', 'action:camera-front');
    this.register('4', 'action:camera-side');
    this.register('ctrl+s', 'action:save');
    this.register('ctrl+o', 'action:open');
    this.register('f', 'action:fit-view');
    this.register('g', 'action:toggle-grid');
    this.register('tab', 'action:toggle-view');
  }

  _onKeyDown(e) {
    // Don't capture if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }

    const combo = this._buildCombo(e);

    this.eventBus.emit('key:down', { key: e.key, combo, rawEvent: e });

    // Space key for pan mode
    if (e.key === ' ' && !this._spaceDown) {
      this._spaceDown = true;
      this.eventBus.emit('input:space', true);
      e.preventDefault();
      return;
    }

    // Check registered shortcuts
    const action = this._shortcuts.get(combo);
    if (action) {
      e.preventDefault();
      this.eventBus.emit(action);
    }
  }

  _onKeyUp(e) {
    if (e.key === ' ') {
      this._spaceDown = false;
      this.eventBus.emit('input:space', false);
    }
    this.eventBus.emit('key:up', { key: e.key });
  }

  _buildCombo(e) {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');

    let key = e.key.toLowerCase();
    if (key === 'control' || key === 'meta' || key === 'shift' || key === 'alt') {
      return parts.join('+');
    }

    parts.push(key);
    return parts.join('+');
  }

  get isSpaceDown() { return this._spaceDown; }

  destroy() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
  }
}
