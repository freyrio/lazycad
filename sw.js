/**
 * Service Worker — Offline capability for BlueprintForge.
 * Caches static assets and CDN scripts for offline use.
 */
const CACHE_NAME = 'blueprintforge-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/src/app.js',
  '/src/core/Blueprint.js',
  '/src/core/Floor.js',
  '/src/core/Wall.js',
  '/src/core/Opening.js',
  '/src/core/Room.js',
  '/src/core/Annotation.js',
  '/src/core/geometry/Vec2.js',
  '/src/core/geometry/Line2.js',
  '/src/core/geometry/Intersection.js',
  '/src/core/geometry/WallJoin.js',
  '/src/core/snap/SnapEngine.js',
  '/src/core/history/History.js',
  '/src/core/history/Command.js',
  '/src/input/InputManager.js',
  '/src/input/GestureRecognizer.js',
  '/src/input/KeyboardManager.js',
  '/src/input/ToolStateMachine.js',
  '/src/editor2d/Editor2D.js',
  '/src/editor2d/Viewport2D.js',
  '/src/editor2d/layers/BitmapLayer.js',
  '/src/editor2d/layers/GridLayer.js',
  '/src/editor2d/layers/WallLayer.js',
  '/src/editor2d/layers/OpeningLayer.js',
  '/src/editor2d/layers/RoomLayer.js',
  '/src/editor2d/layers/AnnotationLayer.js',
  '/src/editor2d/layers/CursorLayer.js',
  '/src/editor2d/layers/SnapLayer.js',
  '/src/editor2d/tools/SelectTool.js',
  '/src/editor2d/tools/WallTool.js',
  '/src/editor2d/tools/OpeningTool.js',
  '/src/editor2d/tools/RoomTool.js',
  '/src/editor2d/tools/MeasureTool.js',
  '/src/editor2d/tools/CalibrateTool.js',
  '/src/editor2d/tools/EraseTool.js',
  '/src/editor3d/Editor3D.js',
  '/src/editor3d/CameraController.js',
  '/src/editor3d/WallMeshBuilder.js',
  '/src/editor3d/SlabMeshBuilder.js',
  '/src/editor3d/OpeningCSG.js',
  '/src/editor3d/MaterialLibrary.js',
  '/src/ui/Layout.js',
  '/src/ui/Theme.js',
  '/src/ui/components/TopBar.js',
  '/src/ui/components/Toolbar.js',
  '/src/ui/components/Toast.js',
  '/src/ui/components/PropertySheet.js',
  '/src/ui/components/FloorManager.js',
  '/src/ui/components/Tutorial.js',
  '/src/ui/dialogs/CalibrateDialog.js',
  '/src/ui/dialogs/ExportDialog.js',
  '/src/io/ImageLoader.js',
  '/src/io/PDFRenderer.js',
  '/src/io/ExportGLTF.js',
  '/src/io/ExportOBJ.js',
  '/src/io/ExportSVG.js',
  '/src/io/Screenshot.js',
  '/src/io/ProjectFile.js',
  '/src/utils/EventBus.js',
  '/src/utils/Platform.js',
  '/src/utils/Storage.js',
];

const CDN_ASSETS = [
  'https://cdn.babylonjs.com/babylon.js',
  'https://cdn.babylonjs.com/serializers/babylonjs.serializers.min.js',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache local assets (ignore failures for missing files)
      for (const url of STATIC_ASSETS) {
        try {
          await cache.add(url);
        } catch (e) {
          // Some files may not exist yet
        }
      }
      // Cache CDN assets
      for (const url of CDN_ASSETS) {
        try {
          await cache.add(url);
        } catch (e) {
          // CDN may be unreachable
        }
      }
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first with cache fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed: try cache
        return caches.match(event.request).then(cached => {
          return cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
