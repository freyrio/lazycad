/**
 * CameraController — Orbit camera with preset views and touch support.
 */
/* global BABYLON */

export class CameraController {
  constructor(scene, canvas, platform) {
    this._scene = scene;
    this._canvas = canvas;
    this._platform = platform;

    // Create arc rotate camera (orbit)
    this._camera = new BABYLON.ArcRotateCamera(
      'camera',
      -Math.PI / 4,   // alpha (horizontal rotation)
      Math.PI / 3,     // beta (vertical tilt)
      20,              // radius
      new BABYLON.Vector3(0, 1.5, 0), // target
      scene
    );

    // Limits
    this._camera.lowerBetaLimit = 0.1;
    this._camera.upperBetaLimit = Math.PI / 2 - 0.05;
    this._camera.lowerRadiusLimit = 2;
    this._camera.upperRadiusLimit = 200;

    // Smooth behavior
    this._camera.inertia = 0.85;
    this._camera.panningInertia = 0.85;
    this._camera.wheelDeltaPercentage = 0.02;

    // Touch controls
    if (platform.isMobile) {
      this._camera.pinchDeltaPercentage = 0.002;
      this._camera.panningSensibility = 100;
    }

    // Attach to canvas
    this._camera.attachControl(canvas, true);

    // Allow panning (right-click or two-finger)
    this._camera.panningSensibility = 50;

    // Presets
    this._presets = {
      perspective: { alpha: -Math.PI / 4, beta: Math.PI / 3, radius: null },
      top: { alpha: 0, beta: 0.01, radius: null },
      front: { alpha: 0, beta: Math.PI / 2 - 0.01, radius: null },
      side: { alpha: -Math.PI / 2, beta: Math.PI / 2 - 0.01, radius: null },
    };
  }

  /**
   * Frame all meshes in view.
   */
  frameAll(meshes) {
    if (meshes.length === 0) return;

    // Compute bounding box of all meshes
    let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
    let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);

    for (const mesh of meshes) {
      mesh.computeWorldMatrix(true);
      const bounds = mesh.getBoundingInfo();
      const bMin = bounds.boundingBox.minimumWorld;
      const bMax = bounds.boundingBox.maximumWorld;
      min = BABYLON.Vector3.Minimize(min, bMin);
      max = BABYLON.Vector3.Maximize(max, bMax);
    }

    const center = BABYLON.Vector3.Center(min, max);
    const diagonal = max.subtract(min).length();
    const radius = diagonal * 0.8;

    this._camera.target = center;
    this._camera.radius = Math.max(radius, 5);
  }

  /**
   * Animate to a preset view.
   */
  goToPreset(name) {
    const preset = this._presets[name];
    if (!preset) return;

    const duration = 500;
    const fps = 60;
    const frames = Math.round(duration / 1000 * fps);

    // Alpha animation
    const alphaAnim = new BABYLON.Animation('alpha', 'alpha', fps,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    alphaAnim.setKeys([
      { frame: 0, value: this._camera.alpha },
      { frame: frames, value: preset.alpha },
    ]);

    // Beta animation
    const betaAnim = new BABYLON.Animation('beta', 'beta', fps,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
    betaAnim.setKeys([
      { frame: 0, value: this._camera.beta },
      { frame: frames, value: preset.beta },
    ]);

    // Radius animation (only if preset specifies)
    const anims = [alphaAnim, betaAnim];
    if (preset.radius) {
      const radiusAnim = new BABYLON.Animation('radius', 'radius', fps,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
      radiusAnim.setKeys([
        { frame: 0, value: this._camera.radius },
        { frame: frames, value: preset.radius },
      ]);
      anims.push(radiusAnim);
    }

    // Easing
    const ease = new BABYLON.CubicEase();
    ease.setEasingMode(BABYLON.EasingFunction.EASINGMODE_EASEINOUT);
    for (const anim of anims) {
      anim.setEasingFunction(ease);
    }

    this._camera.animations = anims;
    this._scene.beginAnimation(this._camera, 0, frames, false);
  }

  get camera() { return this._camera; }
}
