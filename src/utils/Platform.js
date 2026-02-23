/**
 * Platform — Device detection and capability queries.
 */
export class Platform {
  constructor() {
    this._detect();
  }

  _detect() {
    const ua = navigator.userAgent || '';
    const w = window.innerWidth;

    this.hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.hasPointerEvents = 'PointerEvent' in window;
    this.hasMouse = window.matchMedia('(pointer: fine)').matches;
    this.hasStylus = false; // detected at runtime via pointer events

    // Device category by viewport width
    if (w < 640) {
      this.device = 'phone';
    } else if (w < 1024) {
      this.device = 'tablet';
    } else {
      this.device = 'desktop';
    }

    this.isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && this.hasTouch);
    this.isAndroid = /Android/.test(ua);
    this.isMobile = this.device === 'phone' || this.device === 'tablet';

    // Haptic feedback support
    this.hasHaptics = 'vibrate' in navigator;

    // High DPI
    this.dpr = window.devicePixelRatio || 1;
  }

  /**
   * Update device category on resize.
   */
  update() {
    const w = window.innerWidth;
    if (w < 640) {
      this.device = 'phone';
    } else if (w < 1024) {
      this.device = 'tablet';
    } else {
      this.device = 'desktop';
    }
    this.isMobile = this.device === 'phone' || this.device === 'tablet';
    this.dpr = window.devicePixelRatio || 1;
  }

  /**
   * Trigger a short haptic vibration (mobile).
   * @param {number} [duration=10]
   */
  haptic(duration = 10) {
    if (this.hasHaptics) {
      navigator.vibrate(duration);
    }
  }

  /**
   * Mark that a stylus has been detected.
   */
  detectStylus() {
    this.hasStylus = true;
  }

  get isPhone() { return this.device === 'phone'; }
  get isTablet() { return this.device === 'tablet'; }
  get isDesktop() { return this.device === 'desktop'; }
}
