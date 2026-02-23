/**
 * Tutorial — Onboarding overlay that walks new users through the app.
 * Shows step-by-step tooltips pointing at UI elements.
 */
export class Tutorial {
  /**
   * @param {EventBus} eventBus
   * @param {Platform} platform
   */
  constructor(eventBus, platform) {
    this.eventBus = eventBus;
    this.platform = platform;
    this._currentStep = 0;
    this._overlay = null;

    this._steps = [
      {
        target: '#btn-import',
        title: 'Load a Blueprint',
        text: 'Start by importing a scanned blueprint image (PNG, JPG, or PDF).',
        position: 'below',
      },
      {
        target: '#bottom-toolbar [data-tool="calibrate"]',
        title: 'Calibrate Scale',
        text: 'Set the scale by marking a known distance on the blueprint.',
        position: 'above',
      },
      {
        target: '#bottom-toolbar [data-tool="wall"]',
        title: 'Draw Walls',
        text: 'Trace walls on the blueprint. Click to place points, double-click to finish.',
        position: 'above',
      },
      {
        target: '#bottom-toolbar [data-tool="door"]',
        title: 'Add Openings',
        text: 'Place doors and windows by tapping on walls.',
        position: 'above',
      },
      {
        target: '#bottom-toolbar [data-tool="room"]',
        title: 'Define Rooms',
        text: 'Click to outline room boundaries and add labels.',
        position: 'above',
      },
      {
        target: '#btn-view-3d',
        title: 'View in 3D',
        text: 'Switch to 3D view to see your floor plan extruded into a model.',
        position: 'below',
      },
      {
        target: '#floor-manager',
        title: 'Multiple Floors',
        text: 'Add more floors with the + button. Long-press a floor tab for options.',
        position: 'above',
      },
    ];

    this.eventBus.on('action:tutorial', () => this.start());
  }

  /**
   * Check if tutorial has been seen.
   */
  shouldShow() {
    try {
      return !localStorage.getItem('bpf_tutorial_done');
    } catch {
      return false;
    }
  }

  /**
   * Mark tutorial as completed.
   */
  markDone() {
    try {
      localStorage.setItem('bpf_tutorial_done', '1');
    } catch {
      // localStorage may not be available
    }
  }

  start() {
    this._currentStep = 0;
    this._showStep();
  }

  _showStep() {
    this._removeOverlay();

    if (this._currentStep >= this._steps.length) {
      this.markDone();
      this.eventBus.emit('toast', 'Tutorial complete — start building!');
      return;
    }

    const step = this._steps[this._currentStep];
    const target = document.querySelector(step.target);

    // Create overlay
    this._overlay = document.createElement('div');
    this._overlay.className = 'tutorial-overlay';

    // Spotlight cutout (highlight target element)
    const spotlight = document.createElement('div');
    spotlight.className = 'tutorial-spotlight';
    if (target) {
      const rect = target.getBoundingClientRect();
      spotlight.style.left = `${rect.left - 6}px`;
      spotlight.style.top = `${rect.top - 6}px`;
      spotlight.style.width = `${rect.width + 12}px`;
      spotlight.style.height = `${rect.height + 12}px`;
    }

    // Tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'tutorial-tooltip';
    tooltip.innerHTML = `
      <div class="tutorial-step-count">${this._currentStep + 1} / ${this._steps.length}</div>
      <h3>${step.title}</h3>
      <p>${step.text}</p>
      <div class="tutorial-actions">
        <button class="btn btn-secondary tutorial-skip">Skip</button>
        <button class="btn btn-primary tutorial-next">${this._currentStep < this._steps.length - 1 ? 'Next' : 'Done'}</button>
      </div>
    `;

    // Position tooltip
    if (target) {
      const rect = target.getBoundingClientRect();
      if (step.position === 'above') {
        tooltip.style.bottom = `${window.innerHeight - rect.top + 16}px`;
        tooltip.style.left = `${Math.max(16, Math.min(rect.left, window.innerWidth - 300))}px`;
      } else {
        tooltip.style.top = `${rect.bottom + 16}px`;
        tooltip.style.left = `${Math.max(16, Math.min(rect.left, window.innerWidth - 300))}px`;
      }
    } else {
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
    }

    this._overlay.appendChild(spotlight);
    this._overlay.appendChild(tooltip);
    document.body.appendChild(this._overlay);

    // Bind actions
    tooltip.querySelector('.tutorial-next').addEventListener('click', () => {
      this._currentStep++;
      this._showStep();
    });
    tooltip.querySelector('.tutorial-skip').addEventListener('click', () => {
      this.markDone();
      this._removeOverlay();
    });

    // Click on overlay background also advances
    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) {
        this._currentStep++;
        this._showStep();
      }
    });
  }

  _removeOverlay() {
    if (this._overlay && this._overlay.parentNode) {
      this._overlay.parentNode.removeChild(this._overlay);
      this._overlay = null;
    }
  }
}
