/**
 * History — Undo/redo stack.
 */
export class History {
  /**
   * @param {EventBus} eventBus
   * @param {number} [maxSize=100]
   */
  constructor(eventBus, maxSize = 100) {
    this.eventBus = eventBus;
    this.maxSize = maxSize;
    this._undoStack = [];
    this._redoStack = [];

    this.eventBus.on('action:undo', () => this.undo());
    this.eventBus.on('action:redo', () => this.redo());
  }

  /**
   * Execute a command and push it onto the undo stack.
   * @param {Command} command
   */
  execute(command) {
    command.execute();
    this._undoStack.push(command);
    this._redoStack = []; // clear redo stack

    // Trim if over max
    if (this._undoStack.length > this.maxSize) {
      this._undoStack.shift();
    }

    this.eventBus.emit('history:changed', this.state);
  }

  /**
   * Undo the last command.
   */
  undo() {
    if (this._undoStack.length === 0) return;
    const command = this._undoStack.pop();
    command.undo();
    this._redoStack.push(command);
    this.eventBus.emit('history:changed', this.state);
    this.eventBus.emit('history:undo', command);
  }

  /**
   * Redo the last undone command.
   */
  redo() {
    if (this._redoStack.length === 0) return;
    const command = this._redoStack.pop();
    command.execute();
    this._undoStack.push(command);
    this.eventBus.emit('history:changed', this.state);
    this.eventBus.emit('history:redo', command);
  }

  /**
   * Clear all history.
   */
  clear() {
    this._undoStack = [];
    this._redoStack = [];
    this.eventBus.emit('history:changed', this.state);
  }

  get canUndo() { return this._undoStack.length > 0; }
  get canRedo() { return this._redoStack.length > 0; }

  get state() {
    return {
      canUndo: this.canUndo,
      canRedo: this.canRedo,
      undoCount: this._undoStack.length,
      redoCount: this._redoStack.length,
    };
  }
}
