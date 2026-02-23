/**
 * Toast — Non-intrusive notification messages.
 */
export class Toast {
  /**
   * @param {HTMLElement} container - #toast-container
   * @param {EventBus} eventBus
   */
  constructor(container, eventBus) {
    this.container = container;
    this.eventBus = eventBus;
    this._duration = 3000;

    // Listen for toast events
    this.eventBus.on('toast', (message) => this.show(message));
    this.eventBus.on('measure:result', (data) => this.show(data.formatted));
  }

  /**
   * Show a toast message.
   * @param {string} message
   * @param {number} [duration]
   */
  show(message, duration = this._duration) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    this.container.appendChild(el);

    setTimeout(() => {
      el.classList.add('toast-exit');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }
}
