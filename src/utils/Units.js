/**
 * Units — Unit conversion helpers for the application.
 * Internal representation is always meters.
 */
export const Units = {
  /** Convert millimeters to meters */
  mmToM(mm) { return mm / 1000; },

  /** Convert centimeters to meters */
  cmToM(cm) { return cm / 100; },

  /** Convert meters to millimeters */
  mToMm(m) { return m * 1000; },

  /** Convert meters to centimeters */
  mToCm(m) { return m * 100; },

  /** Convert inches to meters */
  inToM(inches) { return inches * 0.0254; },

  /** Convert feet to meters */
  ftToM(feet) { return feet * 0.3048; },

  /** Convert meters to inches */
  mToIn(m) { return m / 0.0254; },

  /** Convert meters to feet */
  mToFt(m) { return m / 0.3048; },

  /**
   * Format a value in meters as a human-readable string.
   * @param {number} meters
   * @param {string} unit - "m", "cm", "mm", "ft", "in"
   * @param {number} [decimals=2]
   * @returns {string}
   */
  format(meters, unit = 'm', decimals = 2) {
    let value;
    switch (unit) {
      case 'mm': value = meters * 1000; break;
      case 'cm': value = meters * 100; break;
      case 'ft': value = meters / 0.3048; break;
      case 'in': value = meters / 0.0254; break;
      default:   value = meters; break;
    }
    return `${value.toFixed(decimals)} ${unit}`;
  },

  /**
   * Parse a user-entered value with optional unit to meters.
   * Accepts "2.5", "2.5m", "250cm", "2500mm", "8.2ft"
   * @param {string} str
   * @returns {number|null} meters, or null if unparseable
   */
  parse(str) {
    str = str.trim().toLowerCase();
    const match = str.match(/^([0-9]*\.?[0-9]+)\s*(mm|cm|m|ft|in)?$/);
    if (!match) return null;

    const value = parseFloat(match[1]);
    const unit = match[2] || 'm';

    switch (unit) {
      case 'mm': return value / 1000;
      case 'cm': return value / 100;
      case 'ft': return value * 0.3048;
      case 'in': return value * 0.0254;
      default:   return value;
    }
  },

  /**
   * Degrees to radians.
   */
  degToRad(deg) { return deg * Math.PI / 180; },

  /**
   * Radians to degrees.
   */
  radToDeg(rad) { return rad * 180 / Math.PI; },
};
