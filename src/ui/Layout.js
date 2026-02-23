/**
 * Layout — Responsive layout manager.
 * Listens for resize events and updates the layout mode.
 */
export class Layout {
  /**
   * @param {EventBus} eventBus
   * @param {Platform} platform
   */
  constructor(eventBus, platform) {
    this.eventBus = eventBus;
    this.platform = platform;
    this.mode = 'desktop'; // 'phone', 'tablet', 'desktop'

    this._update();

    window.addEventListener('resize', () => {
      this.platform.update();
      this._update();
    });
  }

  _update() {
    const prevMode = this.mode;
    this.mode = this.platform.device;

    if (prevMode !== this.mode) {
      this.eventBus.emit('layout:changed', this.mode);
      document.body.setAttribute('data-device', this.mode);
    }
  }

  get isPhone() { return this.mode === 'phone'; }
  get isTablet() { return this.mode === 'tablet'; }
  get isDesktop() { return this.mode === 'desktop'; }
  get isMobile() { return this.mode !== 'desktop'; }
}
