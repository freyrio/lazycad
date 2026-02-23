/**
 * GestureRecognizer — Recognizes pinch, pan, long-press, double-tap.
 * Works with InputManager pointer events to distinguish gestures.
 */
export class GestureRecognizer {
  /**
   * @param {EventBus} eventBus
   * @param {Viewport2D} viewport
   */
  constructor(eventBus, viewport) {
    this.eventBus = eventBus;
    this.viewport = viewport;

    // State
    this._pointers = new Map(); // pointerId → {startX, startY, x, y}
    this._gesture = 'none';     // 'none', 'tap', 'drag', 'pinch-zoom'
    this._lastTapTime = 0;
    this._longPressTimer = null;
    this._startDistance = 0;
    this._startScale = 1;
    this._startMidpoint = null;
    this._startOffset = null;
    this._dragStarted = false;

    // Thresholds
    this.tapDistanceThreshold = 8;    // pixels
    this.longPressDelay = 500;         // ms
    this.doubleTapDelay = 300;         // ms

    this._bindEvents();
  }

  _bindEvents() {
    this.eventBus.on('input:start', (e) => this._onStart(e));
    this.eventBus.on('input:drag', (e) => this._onDrag(e));
    this.eventBus.on('input:end', (e) => this._onEnd(e));
    this.eventBus.on('input:cancel', () => this._reset());
    this.eventBus.on('input:wheel', (e) => this._onWheel(e));
  }

  _onStart(e) {
    this._pointers.set(e.pointerId, {
      startX: e.position.x,
      startY: e.position.y,
      x: e.position.x,
      y: e.position.y,
    });

    this._clearLongPress();

    if (this._pointers.size === 1) {
      // Single pointer: could be tap, drag, or long press
      this._gesture = 'tap';
      this._dragStarted = false;

      // Start long press timer
      this._longPressTimer = setTimeout(() => {
        if (this._gesture === 'tap' && this._pointers.size === 1) {
          this._gesture = 'none';
          this.eventBus.emit('gesture:longpress', {
            position: e.position,
            worldPosition: e.worldPosition,
          });
        }
      }, this.longPressDelay);

    } else if (this._pointers.size === 2) {
      // Two pointers: begin pinch-zoom/pan
      this._gesture = 'pinch-zoom';
      this._clearLongPress();

      const ptrs = Array.from(this._pointers.values());
      this._startDistance = this._distance(ptrs[0], ptrs[1]);
      this._startScale = this.viewport.scale;
      this._startMidpoint = this._midpoint(ptrs[0], ptrs[1]);
      this._startOffset = {
        x: this.viewport.offsetX,
        y: this.viewport.offsetY,
      };
    }
  }

  _onDrag(e) {
    const ptr = this._pointers.get(e.pointerId);
    if (!ptr) return;

    ptr.x = e.position.x;
    ptr.y = e.position.y;

    if (this._pointers.size === 2 && this._gesture === 'pinch-zoom') {
      // Two-pointer pinch-zoom + pan
      const ptrs = Array.from(this._pointers.values());
      const currentDist = this._distance(ptrs[0], ptrs[1]);
      const currentMid = this._midpoint(ptrs[0], ptrs[1]);

      // Compute zoom
      const scaleFactor = currentDist / this._startDistance;
      const newScale = this._startScale * scaleFactor;

      // Compute pan
      const dx = currentMid.x - this._startMidpoint.x;
      const dy = currentMid.y - this._startMidpoint.y;

      // Apply zoom centered on start midpoint, then pan
      const sf = newScale / this._startScale;
      const ox = this._startMidpoint.x - (this._startMidpoint.x - this._startOffset.x) * sf + dx;
      const oy = this._startMidpoint.y - (this._startMidpoint.y - this._startOffset.y) * sf + dy;

      this.viewport.setTransform(newScale, ox, oy);

    } else if (this._pointers.size === 1) {
      const dx = ptr.x - ptr.startX;
      const dy = ptr.y - ptr.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > this.tapDistanceThreshold && this._gesture === 'tap') {
        this._gesture = 'drag';
        this._clearLongPress();
        this._dragStarted = true;
        this.eventBus.emit('gesture:dragstart', {
          position: e.position,
          worldPosition: e.worldPosition,
          pointerType: e.pointerType,
          modifiers: e.modifiers,
          button: e.button,
        });
      }

      if (this._gesture === 'drag') {
        this.eventBus.emit('gesture:drag', {
          position: e.position,
          worldPosition: e.worldPosition,
          pointerType: e.pointerType,
          modifiers: e.modifiers,
          button: e.button,
        });
      }
    }
  }

  _onEnd(e) {
    const ptr = this._pointers.get(e.pointerId);
    this._pointers.delete(e.pointerId);
    this._clearLongPress();

    if (this._gesture === 'tap' && ptr) {
      const dx = e.position.x - ptr.startX;
      const dy = e.position.y - ptr.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= this.tapDistanceThreshold) {
        const now = Date.now();
        if (now - this._lastTapTime < this.doubleTapDelay) {
          // Double tap
          this.eventBus.emit('gesture:doubletap', {
            position: e.position,
            worldPosition: e.worldPosition,
          });
          this._lastTapTime = 0;
        } else {
          // Single tap
          this.eventBus.emit('gesture:tap', {
            position: e.position,
            worldPosition: e.worldPosition,
            pointerType: e.pointerType,
            modifiers: e.modifiers,
            button: e.button,
          });
          this._lastTapTime = now;
        }
      }
    }

    if (this._gesture === 'drag' && this._dragStarted) {
      this.eventBus.emit('gesture:dragend', {
        position: e.position,
        worldPosition: e.worldPosition,
        pointerType: e.pointerType,
        modifiers: e.modifiers,
      });
    }

    if (this._pointers.size === 0) {
      this._gesture = 'none';
      this._dragStarted = false;
    }
  }

  _onWheel({ factor, screenX, screenY }) {
    this.viewport.zoomAt(factor, screenX, screenY);
  }

  _clearLongPress() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }

  _reset() {
    this._pointers.clear();
    this._gesture = 'none';
    this._clearLongPress();
    this._dragStarted = false;
  }

  _distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  _midpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  get currentGesture() { return this._gesture; }
}
