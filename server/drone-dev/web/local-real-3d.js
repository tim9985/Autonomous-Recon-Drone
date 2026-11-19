// mission_control_pwa/config/map_coverage.json
var map_coverage_default = {
  center: [128.3916, 36.14524],
  fallbackBounds: [128.3828, 36.1405, 128.397, 36.149],
  operationBounds: [128.371676, 36.131517, 128.408124, 36.157983],
  expansionMeters: 1e3
};

// mission_control_pwa/src/map/mapCoverage.ts
var CAMPUS_CENTER = map_coverage_default.center;
var FALLBACK_MAP_BOUNDS = map_coverage_default.fallbackBounds;
var OPERATION_MAP_BOUNDS = map_coverage_default.operationBounds;
var MAP_EXPANSION_METERS = map_coverage_default.expansionMeters;
var FALLBACK_IMAGE_COORDINATES = [
  [FALLBACK_MAP_BOUNDS[0], FALLBACK_MAP_BOUNDS[3]],
  [FALLBACK_MAP_BOUNDS[2], FALLBACK_MAP_BOUNDS[3]],
  [FALLBACK_MAP_BOUNDS[2], FALLBACK_MAP_BOUNDS[1]],
  [FALLBACK_MAP_BOUNDS[0], FALLBACK_MAP_BOUNDS[1]]
];

// mission_control_pwa/src/map/cameraScale.ts
function horizontalMeters(a, b) {
  const latitude = (a[1] + b[1]) * Math.PI / 360;
  return Math.hypot((b[0] - a[0]) * 111320 * Math.cos(latitude), (b[1] - a[1]) * 111320);
}
function resolutionAtZoom(latitude, zoom) {
  return 40075016686e-3 * Math.cos(latitude * Math.PI / 180) / (512 * 2 ** zoom);
}
function rangeAtResolution(metersPerPixel, height, fovy) {
  return Math.max(50, Math.min(2e5, metersPerPixel * height / (2 * Math.tan(fovy / 2))));
}

// mission_control_pwa/src/map/vworld3d/sdk.ts
var BUILDING_LAYERS = [
  "facility_build",
  "facility_build_all",
  "facility_build_lod1",
  "facility_build_lod2",
  "facility_build_lod3",
  "facility_build_gw"
];
function requireBridge(scope, map, nativeBuildings2 = false) {
  const C = scope.Cesium, viewer = scope.ws3d?.viewer, scene = viewer?.scene, camera = viewer?.camera;
  const functions = [
    C?.Cartesian3?.fromDegrees,
    C?.Cartesian3?.fromDegreesArray,
    C?.Cartesian3?.distance,
    C?.Cartographic?.fromCartesian,
    C?.Cartographic?.fromDegrees,
    C?.PolygonHierarchy,
    C?.PolygonGraphics,
    C?.Color?.fromCssColorString,
    C?.Rectangle?.fromDegrees,
    C?.HeadingPitchRange,
    C?.Math?.toDegrees,
    C?.Math?.toRadians,
    C?.CallbackProperty,
    scene?.globe?.pick,
    scene?.globe?.getHeight,
    scene?.pick,
    scene?.postRender?.addEventListener,
    scene?.postRender?.removeEventListener,
    camera?.getPickRay,
    camera?.flyTo,
    camera?.setView,
    camera?.lookAt,
    camera?.lookAtTransform,
    viewer?.entities?.add,
    viewer?.entities?.remove,
    scene?.globe?.tileLoadProgressEvent?.addEventListener,
    scene?.globe?.tileLoadProgressEvent?.removeEventListener,
    camera?.moveEnd?.addEventListener,
    camera?.moveEnd?.removeEventListener,
    camera?.moveStart?.addEventListener,
    camera?.moveStart?.removeEventListener
  ];
  if (functions.some((fn) => typeof fn !== "function") || C?.HeightReference?.NONE === void 0 || !C?.Matrix4?.IDENTITY || !scene?.canvas || !(camera?.frustum?.fovy > 0 && camera.frustum.fovy < Math.PI) || typeof scene.screenSpaceCameraController?.enableInputs !== "boolean" || typeof (C?.SceneTransforms?.worldToWindowCoordinates ?? C?.SceneTransforms?.wgs84ToWindowCoordinates) !== "function") {
    throw new Error("UNSUPPORTED_3D_BRIDGE");
  }
  if (C.HeightReference.CLAMP_TO_GROUND === void 0) throw new Error("GROUND_REFERENCE_UNSUPPORTED");
  scene.globe.depthTestAgainstTerrain = true;
  if (C.EllipsoidTerrainProvider && scene.globe.terrainProvider instanceof C.EllipsoidTerrainProvider) {
    throw new Error("TERRAIN_NOT_CONFIGURED");
  }
  if (typeof map.getLayerElement !== "function") throw new Error("BUILDING_LAYER_CONTROL_UNAVAILABLE");
  let defaultHidden = false;
  for (const id of BUILDING_LAYERS) {
    if (nativeBuildings2 && id !== "facility_build") continue;
    const layer = map.getLayerElement(id);
    if (!layer) continue;
    if (typeof layer.hide !== "function") throw new Error("BUILDING_LAYER_CONTROL_UNAVAILABLE");
    if (nativeBuildings2) layer.show?.();
    else layer.hide();
    if (!nativeBuildings2 && layer.visible === true) throw new Error("BUILDING_LAYER_STILL_VISIBLE");
    if (id === "facility_build") {
      defaultHidden = true;
      document.body.dataset.defaultBuildingVisibility = String(layer.visible);
    }
  }
  if (!defaultHidden) throw new Error("BUILDING_LAYERS_UNVERIFIED");
  if ("requestRenderMode" in scene) {
    scene.requestRenderMode = true;
    scene.maximumRenderTimeChange = Infinity;
  }
  updateMapResolution(viewer);
  if ("targetFrameRate" in viewer) {
    viewer.targetFrameRate = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches ? 30 : 60;
    document.body.dataset.targetFrameRate = String(viewer.targetFrameRate);
  }
  return { C, viewer, scene, camera, map };
}
// Cesium's recommended resolution uses CSS pixels. Specify the desired backing ratio once.
function updateMapResolution(viewer) {
  const canvas=viewer.scene.canvas;
  const mobile=window.matchMedia('(max-width:1023px), (pointer:coarse)').matches;
  const area=Math.max(1,canvas.clientWidth*canvas.clientHeight);
  const ratio=mobile?Math.max(1,Math.min(window.devicePixelRatio||1,3,Math.sqrt(3200000/area))):1;
  const recommended='useBrowserRecommendedResolution' in viewer;
  if(recommended)viewer.useBrowserRecommendedResolution=true;
  const scale=recommended?ratio:ratio/(window.devicePixelRatio||1);
  if('resolutionScale' in viewer && Math.abs(viewer.resolutionScale-scale)>.005){
    viewer.resolutionScale=scale;
    viewer.resize?.();viewer.scene.requestRender?.();
  }
  document.body.dataset.mapPixelRatio=ratio.toFixed(2);
}
function initializeSdk(view, nativeBuildings2 = false) {
  return new Promise((resolve, reject) => {
    const scope = window, vw = scope.vw;
    if (!vw || typeof vw.Map !== "function") {
      reject(new Error("SDK_UNAVAILABLE"));
      return;
    }
    try {
      const map = new vw.Map();
      vw.ws3dInitCallBack = () => {
        try {
          resolve(requireBridge(scope, map, nativeBuildings2));
        } catch (error) {
          reject(error);
        }
      };
      const center = view?.center ?? CAMPUS_CENTER;
      map.setOption({
        mapId: "vworld-map",
        logo: true,
        navigation: false,
        initPosition: new vw.CameraPosition(new vw.CoordZ(center[0], center[1], 1800), new vw.Direction(0, -60, 0))
      });
      map.start();
    } catch (error) {
      reject(error);
    }
  });
}
function terrainReady(bridge2) {
  return bridge2.scene.globe.tilesLoaded === true;
}
function groundHeight(bridge2, position2) {
  const value = bridge2.scene.globe.getHeight(bridge2.C.Cartographic.fromDegrees(position2[0], position2[1]));
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function pickGround(bridge2, x, y, requireSettledTerrain = true) {
  if (requireSettledTerrain && !terrainReady(bridge2)) return null;
  const ray = bridge2.camera.getPickRay({ x, y });
  if (!ray) return null;
  const hit = bridge2.scene.globe.pick(ray, bridge2.scene);
  if (!hit) return null;
  const cartographic = bridge2.C.Cartographic.fromCartesian(hit);
  const result = [bridge2.C.Math.toDegrees(cartographic.longitude), bridge2.C.Math.toDegrees(cartographic.latitude)];
  if (!result.every(Number.isFinite) || groundHeight(bridge2, result) === void 0) return null;
  return result;
}
function projectAtHeight(bridge2, point, elevation) {
  const C = bridge2.C;
  const project = C.SceneTransforms.worldToWindowCoordinates ?? C.SceneTransforms.wgs84ToWindowCoordinates;
  const screen = project(bridge2.scene, C.Cartesian3.fromDegrees(point[0], point[1], elevation + 0.2));
  return screen && Number.isFinite(screen.x) && Number.isFinite(screen.y) ? screen : null;
}
function centerCamera(bridge2, point, range, heading = 0, pitch = -Math.PI / 3) {
  const { C, camera } = bridge2;
  camera.cancelFlight?.();
  const height = groundHeight(bridge2, point);
  const target = C.Cartesian3.fromDegrees(point[0], point[1], height ?? 0);
  const safeRange = height === void 0 ? Math.max(2500, range) : range;
  camera.lookAt(target, new C.HeadingPitchRange(heading, pitch, Math.max(50, Math.min(2e5, safeRange))));
  camera.lookAtTransform(C.Matrix4.IDENTITY);
}
function adjustCamera(bridge2, action, animate = false) {
  const { C, camera, scene } = bridge2;
  const point = pickGround(bridge2, scene.canvas.clientWidth / 2, scene.canvas.clientHeight / 2, false);
  if (!point) return;
  const target = C.Cartesian3.fromDegrees(point[0], point[1], groundHeight(bridge2, point));
  const range = C.Cartesian3.distance(camera.positionWC, target);
  const next = Math.max(50, Math.min(2e5, range * (action === "zoom-in" ? 1 / 1.4 : action === "zoom-out" ? 1.4 : 1)));
  const heading = action === "north" ? 0 : camera.heading;
  if (animate && typeof camera.flyToBoundingSphere === "function" && C.BoundingSphere) {
    camera.cancelFlight?.();
    camera.flyToBoundingSphere(new C.BoundingSphere(target, 0), { offset: new C.HeadingPitchRange(heading, camera.pitch, next), duration: 0.28, easingFunction: C.EasingFunction?.CUBIC_OUT });
  } else centerCamera(bridge2, point, next, heading, camera.pitch);
}
function captureView(bridge2, previous, requireSettledTerrain = true) {
  const { C, camera, scene } = bridge2;
  const center = pickGround(bridge2, scene.canvas.clientWidth / 2, scene.canvas.clientHeight / 2, requireSettledTerrain) ?? previous?.center;
  const position2 = camera.positionCartographic;
  if (!center || !position2 || !Number.isFinite(position2.height)) return null;
  const rectangle = camera.computeViewRectangle?.(scene.globe.ellipsoid);
  const left = pickGround(bridge2, scene.canvas.clientWidth / 2 - 16, scene.canvas.clientHeight / 2, requireSettledTerrain);
  const right = pickGround(bridge2, scene.canvas.clientWidth / 2 + 16, scene.canvas.clientHeight / 2, requireSettledTerrain);
  const groundResolution = left && right ? horizontalMeters(left, right) / 32 : previous?.groundResolution;
  return {
    center,
    lastEngine: "vworld",
    bearing: C.Math.toDegrees(camera.heading),
    ...groundResolution && Number.isFinite(groundResolution) ? { groundResolution } : {},
    ...rectangle ? { bounds: [rectangle.west, rectangle.south, rectangle.east, rectangle.north].map((r) => Number(C.Math.toDegrees(r))) } : previous?.bounds ? { bounds: previous.bounds } : {},
    vworld: {
      longitude: C.Math.toDegrees(position2.longitude),
      latitude: C.Math.toDegrees(position2.latitude),
      height: position2.height,
      heading: camera.heading,
      pitch: camera.pitch,
      roll: camera.roll
    }
  };
}

// mission_control_pwa/src/map/buildingHeightPolicy.ts
function hasProvidedBuildingHeight(properties) {
  return (properties.height_source === "MEASURED" || properties.height_source === "BUILDING_HUB" || properties.height_source === "BUILDING_HUB_CANDIDATE") && Number.isFinite(properties.render_height_m) && properties.render_height_m > 0;
}
function isEstimatedBuilding(properties) {
  return properties.height_source === "FLOOR_ESTIMATE" || properties.height_source === "ESTIMATED";
}
function hasRenderableBuildingHeight(properties) {
  if (properties.building_representation?.mode === "GROUND_OUTLINE") return false;
  return (hasProvidedBuildingHeight(properties) || isEstimatedBuilding(properties)) && Number.isFinite(properties.render_height_m) && properties.render_height_m > 0;
}
var ESTIMATED_BUILDING_COLOR = "#8FA9AD";
var ESTIMATED_FOUNDATION_COLOR = "#405B60";
var CANDIDATE_BUILDING_COLOR = "#F28C28";
var CANDIDATE_FOUNDATION_COLOR = "#A65315";
function isCandidateBuilding(properties) {
  return properties.height_source === "BUILDING_HUB_CANDIDATE" || properties.height_link_issue?.status === "IDENTITY_CONFLICT";
}

// mission_control_pwa/src/map/vworld3d/buildingPlacement.ts
var SAMPLE_SPACING_METERS = 10;
var GROUND_CLEARANCE_METERS = 1;
var MAX_SAMPLES = 4096;
function heightSourceLabel(properties) {
  if (properties.building_representation?.above_ground_height_m === 0) return "\uC0AC\uC6A9\uC790 \uD655\uC778 \uC9C0\uC0C1 \uB192\uC774 0m \xB7 \uC808\uB300 \uC9C0\uBD95\uACE0\uB3C4/\uC9C0\uD558 \uAE4A\uC774 \uBBF8\uCE21\uC815";
  if (properties.height_source === "BUILDING_HUB_CANDIDATE") return "\uAC74\uCD95HUB \uB192\uC774 \uD6C4\uBCF4 \u2014 \uAC74\uBB3C \uC5F0\uACB0 \uBBF8\uAC80\uC99D (\uC8FC\uD669\uC0C9)";
  if (properties.height_source === "BUILDING_HUB") return "\uAC74\uCD95HUB \uB300\uC7A5 \uB192\uC774 \u2014 \uCE21\uB7C9 \uC815\uD655\uB3C4 \uBBF8\uAC80\uC99D";
  if (properties.height_source === "MEASURED") return "\uC6D0\uBCF8 \uC81C\uACF5 \uB192\uC774 \u2014 \uC815\uD655\uB3C4 \uBBF8\uAC80\uC99D";
  return properties.height_source === "FLOOR_ESTIMATE" ? "\uCE35\uC218 \xD7 4m \uCD94\uC815 \u2014 \uC2E4\uC81C \uB192\uC774 \uBBF8\uD655\uC778" : "\uD45C\uC2DC\uC6A9 12m \uAE30\uBCF8\uAC12 \u2014 \uC2E4\uC81C \uB192\uC774 \uBBF8\uD655\uC778";
}
function inside(point, ring) {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if (a[1] > point[1] !== b[1] > point[1] && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
var sampleCache = /* @__PURE__ */ new WeakMap();
function buildingSamples(polygon, maxSamples = MAX_SAMPLES) {
  const cached = maxSamples === MAX_SAMPLES ? sampleCache.get(polygon) : void 0;
  if (cached) return cached;
  const samples = computeBuildingSamples(polygon, maxSamples);
  if (maxSamples === MAX_SAMPLES) sampleCache.set(polygon, samples);
  return samples;
}
function computeBuildingSamples(polygon, maxSamples) {
  const outer = polygon.coordinates[0];
  if (!outer || outer.length < 4) return [];
  const all = polygon.coordinates.flat();
  if (all.some((p) => p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 85)) return [];
  const west = Math.min(...outer.map((p) => p[0])), east = Math.max(...outer.map((p) => p[0]));
  const south = Math.min(...outer.map((p) => p[1])), north = Math.max(...outer.map((p) => p[1]));
  const mx = 111320 * Math.cos((north + south) / 2 * Math.PI / 180), my = 111320;
  const samples = /* @__PURE__ */ new Map();
  const add = (p) => samples.set(p[0].toFixed(9) + "," + p[1].toFixed(9), p);
  for (const ring of polygon.coordinates) {
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i], b = ring[i + 1];
      const length = Math.hypot((b[0] - a[0]) * mx, (b[1] - a[1]) * my);
      const count = Math.max(1, Math.ceil(length / SAMPLE_SPACING_METERS));
      if (samples.size + count > maxSamples) return [];
      for (let j = 0; j <= count; j++) add([a[0] + (b[0] - a[0]) * j / count, a[1] + (b[1] - a[1]) * j / count]);
    }
  }
  const nx = Math.max(1, Math.ceil((east - west) * mx / SAMPLE_SPACING_METERS));
  const ny = Math.max(1, Math.ceil((north - south) * my / SAMPLE_SPACING_METERS));
  if (nx * ny > maxSamples) return [];
  for (let x = 0; x <= nx; x++) {
    for (let y = 0; y <= ny; y++) {
      const p = [west + (east - west) * x / nx, south + (north - south) * y / ny];
      if (inside(p, outer) && !polygon.coordinates.slice(1).some((hole) => inside(p, hole))) add(p);
      if (samples.size > maxSamples) return [];
    }
  }
  return [...samples.values()];
}
function* sampleBuilding(polygon, properties, elevationAt, terrainReady2) {
  const height = hasRenderableBuildingHeight(properties) ? properties.render_height_m : null;
  const result = {
    status: "unresolved",
    groundMin: null,
    groundMax: null,
    base: null,
    roof: null,
    height,
    sampleCount: 0,
    validSampleCount: 0,
    sourceLabel: heightSourceLabel(properties)
  };
  if (height === null) return { ...result, status: "height-unknown" };
  const samples = buildingSamples(polygon);
  result.sampleCount = samples.length;
  if (!terrainReady2 || samples.length < 3) return result;
  let groundMin = Infinity, groundMax = -Infinity;
  for (const point of samples) {
    const elevation = elevationAt(point);
    if (typeof elevation === "number" && Number.isFinite(elevation)) {
      result.validSampleCount++;
      groundMin = Math.min(groundMin, elevation);
      groundMax = Math.max(groundMax, elevation);
    }
    yield;
  }
  if (result.validSampleCount !== samples.length) return result;
  const base = groundMax + GROUND_CLEARANCE_METERS;
  return { ...result, status: "sampled", groundMin, groundMax, base, roof: base + height };
}

// mission_control_pwa/src/map/vworld3d/footprintIndex.ts
var FootprintIndex = class {
  constructor(parts, cellSize = 5e-3) {
    this.parts = parts;
    this.cellSize = cellSize;
    for (const part of parts) {
      const ring = part.geometry.coordinates[0];
      const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
      const b = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      this.bounds.set(part, b);
      const keys = this.keys(b);
      if (!keys) {
        this.overflow.push(part);
        continue;
      }
      for (const key of keys) {
        let cell = this.cells.get(key);
        if (!cell) this.cells.set(key, cell = /* @__PURE__ */ new Set());
        cell.add(part);
      }
    }
  }
  cells = /* @__PURE__ */ new Map();
  bounds = /* @__PURE__ */ new Map();
  overflow = [];
  keys(b) {
    if (!b.every(Number.isFinite) || b[0] > b[2] || b[1] > b[3]) return null;
    const [w, s, e, n] = b.map((x) => Math.floor(x / this.cellSize));
    if ((e - w + 1) * (n - s + 1) > 4096) return null;
    const keys = [];
    for (let x = w; x <= e; x++) for (let y = s; y <= n; y++) keys.push(`${x}:${y}`);
    return keys;
  }
  query(bounds) {
    if (!bounds || bounds.length !== 4) return [...this.parts];
    const b = bounds, keys = this.keys(b);
    if (!keys) return [...this.parts];
    const found = new Set(this.overflow);
    for (const key of keys) for (const part of this.cells.get(key) ?? []) found.add(part);
    return [...found].filter((part) => {
      const p = this.bounds.get(part);
      return !p.every(Number.isFinite) || p[2] >= b[0] && p[0] <= b[2] && p[3] >= b[1] && p[1] <= b[3];
    }).sort((a, c) => {
      const distance = (p) => {
        const r = this.bounds.get(p);
        return Math.hypot((r[0] + r[2] - b[0] - b[2]) * Math.cos((b[1] + b[3]) * Math.PI / 360), r[1] + r[3] - b[1] - b[3]);
      };
      return distance(a) - distance(c);
    });
  }
};

// mission_control_pwa/src/map/vworld3d/buildingReveal.ts
var BuildingReveal = class {
  constructor(maximum = 16, durationMs = 170, now = () => performance.now()) {
    this.maximum = maximum;
    this.durationMs = durationMs;
    this.now = now;
    this.maximum = Math.max(1, Math.min(32, Math.floor(maximum)));
    this.limit = Math.min(8, this.maximum);
    this.stats.limit = this.limit;
  }
  jobs = /* @__PURE__ */ new Map();
  frameTime = 0;
  used = 0;
  stable = 0;
  frameNumber = 0;
  waveFrame = -1;
  limit;
  reduced = false;
  stats = { pending: 0, peakPerFrame: 0, waves: 0, completed: 0, limit: 0, reducedMotion: false };
  take(paused = false) {
    if (paused || this.used >= this.limit) return false;
    const waiting = [...this.jobs.values()].filter((job) => job.started === void 0);
    if (waiting.length >= this.maximum * 8) return false;
    this.used++;
    this.stats.peakPerFrame = Math.max(this.stats.peakPerFrame, this.used);
    if (this.waveFrame !== this.frameNumber) {
      this.waveFrame = this.frameNumber;
      this.stats.waves++;
    }
    return true;
  }
  add(id, apply2, alive) {
    if (this.reduced || this.durationMs <= 0) {
      apply2(1);
      this.stats.completed++;
      return;
    }
    apply2(0.12);
    this.jobs.set(id, { apply: apply2, alive, queued: this.now() });
    this.stats.pending = this.jobs.size;
  }
  frame(now, ready2) {
    const gap = this.frameTime ? now - this.frameTime : 0, working = this.used > 0 || this.jobs.size > 0;
    if (working && gap > 100) {
      this.limit = Math.max(Math.min(8, this.maximum), Math.floor(this.limit / 2));
      this.stable = 0;
    } else if (working && gap > 0 && gap < 60 && ++this.stable >= 3) {
      this.limit = Math.min(this.maximum, this.limit + 4);
      this.stable = 0;
    }
    this.frameTime = now;
    this.frameNumber++;
    this.used = 0;
    for (const [id, job] of this.jobs) {
      if (!job.alive()) {
        this.jobs.delete(id);
        continue;
      }
      if (job.started === void 0) {
        if (!ready2 && now - job.queued < 240) continue;
        job.started = now;
      }
      const t = Math.max(0, Math.min(1, (now - job.started) / this.durationMs));
      job.apply(0.12 + 0.88 * (1 - (1 - t) ** 3));
      if (t >= 1) {
        this.jobs.delete(id);
        this.stats.completed++;
      }
    }
    this.stats.pending = this.jobs.size;
    this.stats.limit = this.limit;
  }
  setReducedMotion(value) {
    this.reduced = value;
    this.stats.reducedMotion = value;
    if (value) this.finish();
  }
  finish() {
    for (const job of this.jobs.values()) if (job.alive()) {
      job.apply(1);
      this.stats.completed++;
    }
    this.jobs.clear();
    this.stats.pending = 0;
  }
  destroy() {
    this.jobs.clear();
    this.stats.pending = 0;
  }
};

// mission_control_pwa/src/map/vworld3d/buildingEntities.ts
var BuildingEntities = class {
  constructor(bridge2, capacity = 48) {
    this.bridge = bridge2;
    this.capacity = capacity;
    this.supported = typeof bridge2.C.CustomDataSource === "function" && typeof bridge2.viewer.dataSources?.add === "function";
  }
  groups = /* @__PURE__ */ new Set();
  owners = /* @__PURE__ */ new WeakMap();
  current;
  serial = 0;
  supported;
  get size() {
    return this.groups.size;
  }
  begin() {
    if (!this.supported) return;
    if (!this.current || this.current.count >= this.capacity) {
      const source = new this.bridge.C.CustomDataSource("mc-building-batch-" + ++this.serial);
      const group = { source, count: 0, live: 0, active: true, settled: /* @__PURE__ */ new Map() };
      this.groups.add(group);
      this.current = group;
      void Promise.resolve(this.bridge.viewer.dataSources.add(source)).then(() => {
        if (!group.active) this.detach(group);
        else this.bridge.scene.requestRender?.();
      });
    }
    this.current.count++;
  }
  add(options) {
    const group = this.current;
    if (!group) return this.bridge.viewer.entities.add(options);
    const entity = group.source.entities.add(options);
    group.live++;
    this.owners.set(entity, group);
    return entity;
  }
  settle(entity, finish) {
    const group = this.owners.get(entity);
    if (!group) {
      finish();
      return;
    }
    group.settled.set(entity, finish);
    clearTimeout(group.settleTimer);
    group.settleTimer = setTimeout(() => {
      group.settleTimer = void 0;
      if (!group.active) return;
      group.source.entities.suspendEvents?.();
      try {
        for (const commit of group.settled.values()) commit();
      } finally {
        group.settled.clear();
        group.source.entities.resumeEvents?.();
      }
      this.bridge.scene.requestRender?.();
    }, 250);
  }
  remove(entity) {
    const group = this.owners.get(entity);
    if (!group) return this.bridge.viewer.entities.remove(entity);
    group.source.entities.remove(entity);
    this.owners.delete(entity);
    group.settled.delete(entity);
    if (--group.live === 0) this.release(group);
  }
  release(group) {
    clearTimeout(group.settleTimer);
    group.settled.clear();
    group.active = false;
    this.groups.delete(group);
    if (this.current === group) this.current = void 0;
    this.detach(group);
  }
  detach(group) {
    const sources = this.bridge.viewer.dataSources;
    if (sources && !sources.isDestroyed?.()) sources.remove(group.source, true);
  }
  destroy() {
    for (const group of this.groups) this.release(group);
  }
};

// mission_control_pwa/src/map/vworld3d/scene.ts
var SceneRenderer = class {
  constructor(bridge2, reportUnresolved, invalidateSelection, workBudget = { maxSliceMs: 12, maxSteps: 32 }) {
    this.bridge = bridge2;
    this.reportUnresolved = reportUnresolved;
    this.invalidateSelection = invalidateSelection;
    this.workBudget = workBudget;
    if (workBudget.fastYield && typeof MessageChannel !== "undefined") {
      this.workChannel = new MessageChannel();
      this.workChannel.port1.onmessage = () => {
        const work = this.queuedWork;
        this.queuedWork = void 0;
        this.runWork(work);
      };
    }
    document.body.dataset.buildingDataReady = "false";
    if (workBudget.reveal) {
      this.buildingEntities = new BuildingEntities(bridge2);
      this.reveal = new BuildingReveal(workBudget.reveal.maxPerFrame, workBudget.reveal.durationMs);
      const media = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : void 0;
      const motion = () => this.reveal?.setReducedMotion(!!media?.matches);
      motion();
      media?.addEventListener?.("change", motion);
      this.stopMotion = () => media?.removeEventListener?.("change", motion);
      const frame = () => {
        if (this.disposed) return;
        this.reveal.frame(performance.now(), this.bridge.viewer.dataSourceDisplay?.ready !== false);
        this.reportReveal();
        if (this.reveal.stats.pending && this.buildingsVisible) this.bridge.scene.requestRender?.();
      };
      bridge2.scene.postRender.addEventListener(frame);
      this.stopReveal = () => bridge2.scene.postRender.removeEventListener(frame);
      this.reportReveal();
    }
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.viewportChanged());
      this.resizeObserver.observe(bridge2.scene.canvas);
    }
    const event = bridge2.scene.globe.tileLoadProgressEvent;
    if (event?.addEventListener) {
      const listener = (remaining) => {
        if (remaining === 0) {
          if (this.workBudget.progressiveTerrain && this.terrainLoading && terrainReady(this.bridge)) this.invalidateTerrain();
          this.scheduleBuildings();
          if (this.sceneData) this.setScene(this.sceneData);
        } else {
          this.invalidateTerrain(true);
          if (this.workBudget.progressiveTerrain && !this.cameraMoving) this.scheduleBuildings();
        }
      };
      event.addEventListener(listener);
      this.stopTileListener = () => event.removeEventListener(listener);
    }
  }
  groundLineShow;
  operations = [];
  buildings = /* @__PURE__ */ new Map();
  parts = [];
  index = new FootprintIndex([]);
  partIds = /* @__PURE__ */ new WeakMap();
  retainedParts = /* @__PURE__ */ new Map();
  featureSignatures = /* @__PURE__ */ new WeakMap();
  nextPartId = 0;
  placementKeys = /* @__PURE__ */ new WeakMap();
  precomputed = /* @__PURE__ */ new WeakMap();
  restoreTimer = 0;
  restoreRevision = 0;
  operationCache = /* @__PURE__ */ new Map();
  operationSeen = /* @__PURE__ */ new Set();
  terrainLoading = false;
  cameraMoving = false;
  validationDirty = true;
  validationActive = false;
  draftSignature = "";
  draftEntities = [];
  buildingByEntity = /* @__PURE__ */ new Map();
  data;
  sceneData;
  buildingsVisible = false;
  workRevision = 0;
  timer = 0;
  workChannel;
  queuedWork;
  cancelWork() {
    window.clearTimeout(this.timer);
    this.timer = 0;
    this.queuedWork = void 0;
  }
  runWork(work) {
    if (work && !this.disposed && this.bridge.scene.globe && !this.bridge.scene.isDestroyed?.()) work();
  }
  queueWork(work, delay) {
    if (!delay && this.workChannel) {
      this.queuedWork = work;
      this.workChannel.port2.postMessage(null);
      return;
    }
    this.timer = window.setTimeout(() => {
      this.timer = 0;
      this.runWork(work);
    }, delay);
  }
  disposed = false;
  stopTileListener;
  resizeObserver;
  reveal;
  buildingEntities;
  stopReveal;
  stopMotion;
  centers = /* @__PURE__ */ new WeakMap();
  color(value, alpha = 1) {
    return this.bridge.C.Color.fromCssColorString(value).withAlpha(alpha);
  }
  reportReveal() {
    if (!this.reveal) return;
    for (const [name, value] of Object.entries(this.reveal.stats)) document.body.dataset["buildingReveal" + name[0].toUpperCase() + name.slice(1)] = String(value);
  }
  admitBuilding() {
    if (!this.reveal || this.reveal.take(this.cameraMoving || !this.buildingsVisible)) return true;
    this.bridge.scene.requestRender?.();
    return false;
  }
  ordered(parts) {
    const center = this.workBudget.reveal?.center?.();
    if (!center?.every(Number.isFinite)) return parts;
    const scale = Math.cos(center[1] * Math.PI / 180);
    const distance = (feature) => {
      let point = this.centers.get(feature);
      if (!point) {
        const ring = feature.geometry.coordinates[0];
        point = [
          (Math.min(...ring.map((p) => p[0])) + Math.max(...ring.map((p) => p[0]))) / 2,
          (Math.min(...ring.map((p) => p[1])) + Math.max(...ring.map((p) => p[1]))) / 2
        ];
        this.centers.set(feature, point);
      }
      return ((point[0] - center[0]) * scale) ** 2 + (point[1] - center[1]) ** 2;
    };
    return parts.map((feature) => ({ feature, distance: distance(feature) })).sort((a, b) => a.distance - b.distance).map((value) => value.feature);
  }
  add(list, options) {
    if (list === this.operations) {
      this.operationSeen.add(options.id);
      const signature = JSON.stringify(options, (_key, value) => value === this.groundLineShow ? "ground-line-dynamic-visibility" : value), old = this.operationCache.get(options.id);
      if (old) {
        if (old.signature !== signature) {
          const { id: _id, ...values } = options;
          Object.assign(old.entity, values);
          old.signature = signature;
        }
        return;
      }
      const entity = this.bridge.viewer.entities.add(options);
      this.operationCache.set(options.id, { entity, signature });
      list.push(entity);
      return;
    }
    list.push(this.buildingEntities && options.id?.startsWith("mc:building:") ? this.buildingEntities.add(options) : this.bridge.viewer.entities.add(options));
  }
  clear(list) {
    list.splice(0).forEach((entity) => this.buildingEntities ? this.buildingEntities.remove(entity) : this.bridge.viewer.entities.remove(entity));
  }
  reportBuildings(busy) {
    if (this.buildingEntities) document.body.dataset.buildingGeometryGroups = String(this.buildingEntities.size);
    const retained = [...this.buildings.values()], records = retained.filter((r) => r.visible !== false);
    document.body.dataset.buildingRetention = this.workBudget.retainLoadedBuildings ? "session" : "bounded";
    document.body.dataset.retainedBuildingBodies = String(retained.filter((r) => r.displayPlacement).length);
    const count = records.filter((r) => r.placement.status === "unresolved" && !r.precomputed).length;
    const unknownHeightCount = records.filter((r) => r.placement.status === "height-unknown" && !r.knownZero).length;
    const cachedCount = records.filter((r) => r.displayPlacement && r.placement.status !== "sampled" && !r.precomputed).length;
    document.body.dataset.precomputedBuildingBodies = String(records.filter((r) => r.precomputed).length);
    Object.assign(document.body.dataset, { unresolvedBuildings: String(count), cachedBuildings: String(cachedCount), buildingsBusy: String(busy) });
    document.body.dataset.visibleBuildingBodies = String(records.filter((r) => r.displayPlacement).length);
    document.body.dataset.missingBuildingBodies = String(records.filter((r) => !r.displayPlacement && r.placement.status === "unresolved").length);
    document.body.dataset.unknownHeightBuildings = String(unknownHeightCount);
    const candidateHeightCount = records.filter((r) => r.candidate).length;
    const estimatedHeightCount = records.filter((r) => r.estimated).length;
    document.body.dataset.estimatedHeightBuildings = String(estimatedHeightCount);
    document.body.dataset.candidateHeightBuildings = String(candidateHeightCount);
    this.reportUnresolved(count, { cachedCount, busy, unknownHeightCount, candidateHeightCount, estimatedHeightCount });
  }
  clearBuildings() {
    this.reveal?.destroy();
    this.reportReveal();
    this.workRevision++;
    this.cancelWork();
    for (const record of this.buildings.values()) this.clear(record.entities);
    this.buildings.clear();
    this.buildingByEntity.clear();
    this.invalidateSelection();
    this.validationActive = false;
    Object.assign(document.body.dataset, { visibleBuildings: "0", processedBuildings: "0" });
    this.reportBuildings(false);
    this.bridge.scene.requestRender?.();
  }
  showBuildings(show) {
    const collection = this.bridge.viewer.entities;
    const suspend = collection.suspendEvents && collection.resumeEvents;
    if (suspend) collection.suspendEvents();
    try {
      for (const record of this.buildings.values()) for (const entity of record.entities) entity.show = show;
    } finally {
      if (suspend) collection.resumeEvents();
    }
    if (!show) this.invalidateSelection();
    this.reportBuildings(false);
    this.bridge.scene.requestRender?.();
  }
  hierarchy(polygon) {
    const C = this.bridge.C;
    return new C.PolygonHierarchy(
      C.Cartesian3.fromDegreesArray(polygon.coordinates[0].flatMap((p) => p.slice(0, 2))),
      polygon.coordinates.slice(1).map((ring) => new C.PolygonHierarchy(C.Cartesian3.fromDegreesArray(ring.flatMap((p) => p.slice(0, 2)))))
    );
  }
  line(list, id, points, color2, width = 3) {
    if (points.length < 2) return;
    this.groundLineShow ??= new this.bridge.C.CallbackProperty(() => true, false);
    this.add(list, { id, polyline: {
      positions: this.bridge.C.Cartesian3.fromDegreesArray(points.flatMap((p) => p.slice(0, 2))),
      clampToGround: true,
      width,
      material: this.color(color2),
      show: this.groundLineShow
    } });
  }
  setScene(scene) {
    this.sceneData = scene;
    this.operationSeen.clear();
    const C = this.bridge.C, layers = scene.layers;
    if (layers.missionArea) {
      this.add(this.operations, { id: "mc:area", polygon: { hierarchy: this.hierarchy(scene.area.geometry), material: this.color("#19D2CF", 0.12) } });
      this.line(this.operations, "mc:area-line", scene.area.geometry.coordinates[0], "#19D2CF");
    }
    if (layers.plannedRoute) scene.route.features.forEach((feature, index) => {
      const completed = index < Math.round(scene.progress / 100 * scene.route.features.length);
      this.line(this.operations, "mc:route:" + index, feature.geometry.coordinates, completed ? "#19D2CF" : "#E7F2F0", 2);
    });
    if (layers.coverage && scene.progress > 0) {
      scene.route.features.slice(0, Math.floor(scene.progress / 100 * scene.route.features.length)).forEach((feature, index) => {
        this.line(this.operations, "mc:coverage:" + index, feature.geometry.coordinates, "#08A7A5", 16);
      });
    }
    const marker = (id, point, label, color2, size, relativeAltitude) => {
      const ground = relativeAltitude !== void 0 ? groundHeight(this.bridge, [point[0], point[1]]) : 0;
      if (ground === void 0) return;
      const reference = relativeAltitude !== void 0 ? C.HeightReference.NONE : C.HeightReference.CLAMP_TO_GROUND;
      this.add(this.operations, {
        id,
        position: C.Cartesian3.fromDegrees(point[0], point[1], ground + (relativeAltitude ?? 0)),
        point: {
          pixelSize: size,
          color: this.color(color2),
          outlineColor: this.color("#F4F7F8"),
          outlineWidth: 2,
          heightReference: reference
        },
        label: {
          text: label,
          font: "14px sans-serif",
          fillColor: this.color("#F4F7F8"),
          showBackground: true,
          backgroundColor: this.color("#071725", 0.9),
          pixelOffset: C.Cartesian2 ? new C.Cartesian2(0, -26) : void 0,
          heightReference: reference
        }
      });
    };
    for (const person of scene.people.filter((p) => p.trackStatus !== "FALSE_POSITIVE")) {
      const point = person.latestPosition.geometry.coordinates;
      const selected2 = person.personId === scene.selectedPersonId;
      if (layers.detections) {
        marker("mc:person:" + person.personId, point, person.personId, selected2 ? "#08A7A5" : "#596A72", selected2 ? 18 : 14);
        if (selected2) this.line(this.operations, "mc:trail", person.observations.map((o) => o.position.geometry.coordinates), "#19D2CF", 4);
      }
      if (layers.uncertainty) this.add(this.operations, {
        id: "mc:uncertainty:" + person.personId,
        position: C.Cartesian3.fromDegrees(point[0], point[1]),
        ellipse: { semiMajorAxis: person.uncertaintyMeters, semiMinorAxis: person.uncertaintyMeters, material: this.color("#19D2CF", 0.15) }
      });
    }
    const drone = scene.drone.position.geometry.coordinates;
    marker("mc:drone", drone, "D-01 \xB7 \uC9C0\uBA74 +" + scene.drone.altitudeMeters + "m \xB7 \uC2DC\uC5F0", "#071725", 16, scene.drone.altitudeMeters);
    if (layers.communication) this.add(this.operations, {
      id: "mc:communication",
      position: C.Cartesian3.fromDegrees(drone[0], drone[1]),
      ellipse: { semiMajorAxis: 100, semiMinorAxis: 100, material: this.color("#08A7A5", 0.12) }
    });
    this.setBuildingsVisible(layers.buildings);
    this.operations = this.operations.filter((entity) => {
      if (this.operationSeen.has(entity.id)) return true;
      this.bridge.viewer.entities.remove(entity);
      this.operationCache.delete(entity.id);
      return false;
    });
    this.bridge.scene.requestRender?.();
  }
  /** Building-only maps need no fabricated mission, drone or demo state. */
  setBuildingsVisible(visible) {
    if (this.buildingsVisible !== visible) {
      this.buildingsVisible = visible;
      if (!visible) {
        this.reveal?.finish();
        this.reportReveal();
      }
      this.workRevision++;
      this.cancelWork();
      this.validationDirty ||= this.validationActive;
      this.validationActive = false;
      this.showBuildings(visible);
      if (visible) {
        this.restoreVerifiedBuildings();
        this.scheduleBuildings();
      }
    }
  }
  setBuildings(data, options = {}) {
    const inputStarted = performance.now();
    document.body.dataset.buildingDataReady = "true";
    delete document.body.dataset.buildingCoverageCompleteMs;
    this.workRevision++;
    this.validationDirty = true;
    this.validationActive = false;
    this.cancelWork();
    if (!options.incremental) {
      this.clearBuildings();
      this.retainedParts.clear();
      this.partIds = /* @__PURE__ */ new WeakMap();
      this.nextPartId = 0;
      document.body.dataset.buildingDataResets = String((Number(document.body.dataset.buildingDataResets) || 0) + 1);
    }
    this.data = data;
    const wanted = /* @__PURE__ */ new Set(), incomingSources = /* @__PURE__ */ new Set();
    let reused = 0, added = 0;
    this.parts = data.features.flatMap((feature, featureIndex) => {
      const sourceId = feature.properties.id ?? feature.id ?? featureIndex, sourceKey = JSON.stringify(sourceId);
      incomingSources.add(sourceKey);
      let signature = this.featureSignatures.get(feature);
      if (!signature) {
        signature = JSON.stringify([feature.geometry, feature.properties]);
        this.featureSignatures.set(feature, signature);
      }
      const polygons = feature.geometry.type === "Polygon" ? [feature.geometry] : feature.geometry.coordinates.map((coordinates) => ({ type: "Polygon", coordinates }));
      return polygons.map((geometry, part) => {
        const key = JSON.stringify([sourceId, part]);
        wanted.add(key);
        const old = this.retainedParts.get(key);
        if (old?.signature === signature) {
          reused++;
          return old.feature;
        }
        const index = old?.index ?? this.nextPartId++, id = "mc:building:" + index;
        const record = this.buildings.get(id);
        if (record) {
          for (const entity of record.entities) this.buildingByEntity.delete(entity.id);
          this.clear(record.entities);
          this.buildings.delete(id);
        }
        const polygon = { ...feature, geometry };
        const prepared = this.workBudget.precomputed?.(feature, part);
        if (prepared) this.precomputed.set(polygon, prepared);
        this.placementKeys.set(polygon, signature + ":part:" + part);
        this.partIds.set(polygon, index);
        this.retainedParts.set(key, { feature: polygon, signature, index, sourceKey });
        added++;
        return polygon;
      });
    });
    for (const [key, part] of this.retainedParts) if (incomingSources.has(part.sourceKey) && !wanted.has(key)) {
      const id = "mc:building:" + part.index, record = this.buildings.get(id);
      if (record) {
        for (const entity of record.entities) this.buildingByEntity.delete(entity.id);
        this.clear(record.entities);
        this.buildings.delete(id);
      }
      this.retainedParts.delete(key);
    }
    if (this.workBudget.retainLoadedBuildings) {
      for (const [key, part] of this.retainedParts) {
        if (!wanted.has(key) && this.buildings.has("mc:building:" + part.index)) this.parts.push(part.feature);
      }
    }
    for (const [key, part] of this.retainedParts) {
      if (this.retainedParts.size <= Math.max(1024, wanted.size)) break;
      if (!wanted.has(key) && !this.buildings.has("mc:building:" + part.index)) this.retainedParts.delete(key);
    }
    Object.assign(document.body.dataset, { buildingReusedParts: String(reused), buildingAddedParts: String(added) });
    this.index = new FootprintIndex(this.parts);
    document.body.dataset.buildingInputMs = (performance.now() - inputStarted).toFixed(1);
    this.restoreVerifiedBuildings();
    this.scheduleBuildings();
  }
  invalidateTerrain(progress = false) {
    if (progress && this.terrainLoading && this.workBudget.progressiveTerrain) return;
    this.validationDirty = true;
    this.validationActive = false;
    this.workRevision++;
    this.cancelWork();
    if (this.terrainLoading) return;
    this.terrainLoading = true;
    this.invalidateSelection();
    const pending = (placement) => placement.status === "height-unknown" || placement.status === "unresolved" && placement.validSampleCount === 0 && placement.groundMin === null && placement.groundMax === null && placement.base === null && placement.roof === null ? placement : {
      ...placement,
      status: "unresolved",
      groundMin: null,
      groundMax: null,
      base: null,
      roof: null,
      validSampleCount: 0
    };
    for (const record of this.buildings.values()) record.placement = pending(record.placement);
    for (const [id, value] of this.buildingByEntity) {
      const placement = pending(value.placement);
      if (placement !== value.placement) this.buildingByEntity.set(id, { ...value, placement });
    }
    this.reportBuildings(this.buildingsVisible);
    this.bridge.scene.requestRender?.();
  }
  markProvisional(record) {
    if (!record.displayPlacement) return;
    record.placement = { ...record.placement, status: "unresolved", groundMin: null, groundMax: null, base: null, roof: null, validSampleCount: 0 };
    for (const entity of record.entities) {
      const value = this.buildingByEntity.get(entity.id);
      if (value) this.buildingByEntity.set(entity.id, { ...value, placement: record.placement, displayPlacement: record.displayPlacement });
    }
  }
  preparedIntersects(feature, placement) {
    const canvas = this.bridge.scene.canvas, margin = 160;
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (const point of feature.geometry.coordinates[0]) for (const height of [placement.groundMin, placement.roof]) {
      const p = projectAtHeight(this.bridge, [point[0], point[1]], height);
      if (!p) return true;
      if (p.x >= -margin && p.x <= canvas.clientWidth + margin && p.y >= -margin && p.y <= canvas.clientHeight + margin) return true;
      left = Math.min(left, p.x);
      right = Math.max(right, p.x);
      top = Math.min(top, p.y);
      bottom = Math.max(bottom, p.y);
    }
    return right >= -margin && left <= canvas.clientWidth + margin && bottom >= -margin && top <= canvas.clientHeight + margin;
  }
  buildingViewBounds() {
    const rectangle = this.bridge.camera.computeViewRectangle?.(this.bridge.scene.globe?.ellipsoid);
    const base = rectangle ? [rectangle.west, rectangle.south, rectangle.east, rectangle.north].map((r) => Number(this.bridge.C.Math.toDegrees(r))) : null;
    const terrain = this.workBudget.viewBounds?.();
    if (!terrain || terrain.length !== 4 || !terrain.every(Number.isFinite) || terrain[0] > terrain[2] || terrain[1] > terrain[3]) return base;
    return base && base.every(Number.isFinite) ? [Math.min(base[0], terrain[0]), Math.min(base[1], terrain[1]), Math.max(base[2], terrain[2]), Math.max(base[3], terrain[3])] : terrain;
  }
  awaitSettledTerrain() {
    if (this.disposed || !this.buildingsVisible || this.cameraMoving) return;
    if (terrainReady(this.bridge)) {
      this.invalidateTerrain();
      this.scheduleBuildings();
    } else this.queueWork(() => this.awaitSettledTerrain(), 250);
  }
  scheduleBuildings() {
    if (!this.validationDirty || this.validationActive || this.timer || this.queuedWork || !this.buildingsVisible || this.disposed) return;
    document.body.dataset.buildingsBusy = "true";
    this.queueWork(() => this.renderBuildings(), 120);
  }
  renderBuildings() {
    if (this.disposed || this.cameraMoving) return;
    this.invalidateSelection();
    const revision = ++this.workRevision;
    if (!this.buildingsVisible || !this.data) {
      this.clearBuildings();
      Object.assign(document.body.dataset, { buildingsBusy: "false", visibleBuildings: "0", processedBuildings: "0", unresolvedBuildings: "0" });
      this.validationDirty = false;
      this.validationActive = false;
      return;
    }
    if (!terrainReady(this.bridge) && !this.workBudget.progressiveTerrain) {
      this.invalidateTerrain();
      this.queueWork(() => this.scheduleBuildings(), 250);
      return;
    }
    const provisional = !terrainReady(this.bridge);
    this.terrainLoading = provisional;
    this.validationDirty = false;
    this.validationActive = true;
    const passStarted = performance.now();
    document.body.dataset.buildingPassStartedMs = passStarted.toFixed(1);
    document.body.dataset.buildingsBusy = "true";
    document.body.dataset.buildingCullingComplete = "false";
    delete document.body.dataset.buildingCoverageCompleteMs;
    const bounds = this.buildingViewBounds();
    const canvas = this.bridge.scene.canvas;
    const visible = [];
    const bridge2 = this.bridge;
    const records = this.buildings, partIds = this.partIds;
    const elevations = /* @__PURE__ */ new Map(), precomputed = this.precomputed;
    const preparedIntersects = (feature, placement) => this.preparedIntersects(feature, placement);
    let groundQueries = 0, groundQueryMs = 0, cpuMs = 0, entityMs = 0, idleGapMs = 0, previousBatchEnd = 0;
    const elevationAt = (point) => {
      const key = point.join(",");
      if (elevations.has(key)) return elevations.get(key);
      groundQueries++;
      const began = performance.now();
      const height = groundHeight(bridge2, point);
      groundQueryMs += performance.now() - began;
      if (height !== void 0) elevations.set(key, height);
      return height;
    };
    function* cull(parts) {
      for (const feature of parts) {
        const ring = feature.geometry.coordinates[0];
        const prepared = precomputed.get(feature);
        if (prepared) {
          if (preparedIntersects(feature, prepared)) visible.push(feature);
          yield;
          continue;
        }
        if (!hasRenderableBuildingHeight(feature.properties)) {
          visible.push(feature);
          yield;
          continue;
        }
        const saved = records.get("mc:building:" + partIds.get(feature))?.displayPlacement;
        if (saved && Number.isFinite(saved.groundMax)) {
          let accepted = false;
          for (const point of ring) {
            const screen = projectAtHeight(bridge2, [point[0], point[1]], saved.groundMax);
            yield;
            if (screen && screen.x >= -160 && screen.x <= canvas.clientWidth + 160 && screen.y >= -160 && screen.y <= canvas.clientHeight + 160) {
              accepted = true;
              break;
            }
          }
          if (accepted) {
            visible.push(feature);
            continue;
          }
        }
        const points = [];
        let unknown = false;
        for (const point of ring) {
          const coordinate = [point[0], point[1]];
          const height = elevationAt(coordinate);
          const projected = height === void 0 ? null : projectAtHeight(bridge2, coordinate, height);
          if (projected) points.push(projected);
          else unknown = true;
          yield;
          if (unknown) break;
          if (projected && projected.x >= -160 && projected.x <= canvas.clientWidth + 160 && projected.y >= -160 && projected.y <= canvas.clientHeight + 160) break;
        }
        if (unknown) {
          visible.push(feature);
          continue;
        }
        const left = Math.min(...points.map((p) => p.x)), right = Math.max(...points.map((p) => p.x));
        const top = Math.min(...points.map((p) => p.y)), bottom = Math.max(...points.map((p) => p.y));
        const margin = 160;
        if (right >= -margin && left <= canvas.clientWidth + margin && bottom >= -margin && top <= canvas.clientHeight + margin) visible.push(feature);
        yield;
      }
    }
    const candidates = this.ordered(this.index.query(bounds)).sort((a, b) => Number(!!this.buildings.get("mc:building:" + this.partIds.get(a))?.displayPlacement) - Number(!!this.buildings.get("mc:building:" + this.partIds.get(b))?.displayPlacement));
    const culling = cull(candidates);
    let cullingDone = false;
    const missingDisplay = /* @__PURE__ */ new Set();
    const reportDisplay = () => {
      document.body.dataset.buildingDisplayMissing = String(missingDisplay.size);
      document.body.dataset.buildingDisplayWanted = String(visible.length);
      if (cullingDone && !missingDisplay.size) document.body.dataset.buildingCoverageCompleteMs = performance.now().toFixed(1);
    };
    const finishCulling = () => {
      const wanted = new Set(visible.map((feature) => "mc:building:" + this.partIds.get(feature)));
      for (const feature of visible) {
        const id = "mc:building:" + this.partIds.get(feature), record = this.buildings.get(id);
        if (hasRenderableBuildingHeight(feature.properties) ? !record?.displayPlacement : !record) missingDisplay.add(id);
      }
      for (const [id, record] of this.buildings) {
        record.visible = wanted.has(id);
        for (const entity of record.entities) entity.show = this.buildingsVisible;
      }
      for (const [id, record] of this.buildings) if (!this.workBudget.retainLoadedBuildings && this.buildings.size > Math.max(600, wanted.size) && !record.visible) {
        for (const entity of record.entities) this.buildingByEntity.delete(entity.id);
        this.clear(record.entities);
        this.buildings.delete(id);
      }
      document.body.dataset.visibleBuildings = String(visible.length);
      document.body.dataset.retainedBuildingBodies = String([...this.buildings.values()].filter((r) => r.displayPlacement).length);
      document.body.dataset.buildingCullingComplete = "true";
      document.body.dataset.buildingCullingMs = (performance.now() - passStarted).toFixed(1);
      reportDisplay();
    };
    let cursor = 0;
    let sampler;
    const batch = () => {
      if (this.disposed || this.cameraMoving || revision !== this.workRevision) return;
      if (!terrainReady(this.bridge) && !this.workBudget.progressiveTerrain) {
        this.invalidateTerrain();
        this.queueWork(() => this.scheduleBuildings(), 250);
        return;
      }
      const collection = this.bridge.viewer.entities;
      const suspend = typeof collection.suspendEvents === "function" && typeof collection.resumeEvents === "function";
      const began = performance.now(), deadline = began + this.workBudget.maxSliceMs;
      if (previousBatchEnd) idleGapMs += began - previousBatchEnd;
      let steps = 0, changed = false, waitingForFrame = false;
      if (suspend) collection.suspendEvents();
      try {
        while (steps++ < this.workBudget.maxSteps && performance.now() < deadline) {
          if (!cullingDone) {
            const next = visible[cursor];
            if (!next || this.buildings.get("mc:building:" + this.partIds.get(next))?.displayPlacement) {
              if (culling.next().done) {
                cullingDone = true;
                finishCulling();
                changed = true;
              }
              continue;
            }
          }
          if (cursor >= visible.length) break;
          const feature = visible[cursor], polygon = feature.geometry;
          const id = "mc:building:" + this.partIds.get(feature);
          const previous = this.buildings.get(id);
          const prepared = this.precomputed.get(feature);
          if (prepared) {
            if (previous?.precomputed) {
              previous.visible = true;
              cursor++;
              if (missingDisplay.delete(id)) reportDisplay();
              continue;
            }
            if (!this.admitBuilding()) {
              waitingForFrame = true;
              break;
            }
            cursor++;
            if (previous) {
              for (const entity of previous.entities) this.buildingByEntity.delete(entity.id);
              this.clear(previous.entities);
            }
            const entityBegan2 = performance.now(), installed2 = this.installBuilding(feature, id, prepared);
            entityMs += performance.now() - entityBegan2;
            installed2.precomputed = true;
            this.markProvisional(installed2);
            changed = true;
            if (missingDisplay.delete(id)) reportDisplay();
            continue;
          }
          if (!sampler && previous?.placement.status === "sampled") {
            previous.visible = true;
            for (const entity of previous.entities) entity.show = true;
            if (missingDisplay.delete(id)) reportDisplay();
            cursor++;
            changed = true;
            continue;
          }
          sampler ??= sampleBuilding(polygon, feature.properties, elevationAt, true);
          const step = sampler.next();
          if (!step.done) continue;
          const placement = step.value;
          if (placement.status === "sampled" && !provisional) this.workBudget.placements?.set(this.placementKeys.get(feature), placement);
          sampler = void 0;
          cursor++;
          changed = true;
          if (previous?.placement.status === "height-unknown" && placement.status === "height-unknown") continue;
          if (previous?.displayPlacement) {
            previous.visible = true;
            if (placement.status === "sampled") {
              if (JSON.stringify(previous.displayPlacement) !== JSON.stringify(placement)) {
                const body = previous.entities.find((entity) => entity.id === id);
                const foundation = previous.entities.find((entity) => entity.id === id + ":foundation");
                Object.assign(body.polygon, { height: placement.base, extrudedHeight: placement.roof });
                Object.assign(foundation.polygon, { height: placement.groundMin, extrudedHeight: placement.base });
              }
              previous.displayPlacement = placement;
            }
            previous.placement = placement;
            for (const entity of previous.entities) {
              entity.show = true;
              this.buildingByEntity.set(entity.id, { polygon, properties: feature.properties, placement, displayPlacement: previous.displayPlacement });
            }
            if (provisional) this.markProvisional(previous);
            if (missingDisplay.delete(id)) reportDisplay();
            continue;
          }
          if (previous) {
            for (const entity of previous.entities) this.buildingByEntity.delete(entity.id);
            this.clear(previous.entities);
          }
          const entityBegan = performance.now();
          const installed = this.installBuilding(feature, id, placement);
          entityMs += performance.now() - entityBegan;
          if (provisional) this.markProvisional(installed);
          if (installed.displayPlacement || placement.status === "height-unknown") {
            missingDisplay.delete(id);
            reportDisplay();
          }
        }
      } finally {
        if (suspend) collection.resumeEvents();
      }
      document.body.dataset.processedBuildings = String(cursor);
      document.body.dataset.buildingGroundQueries = String(groundQueries);
      previousBatchEnd = performance.now();
      cpuMs += previousBatchEnd - began;
      Object.assign(document.body.dataset, { buildingWorkCpuMs: cpuMs.toFixed(1), buildingGroundQueryMs: groundQueryMs.toFixed(1), buildingEntityMs: entityMs.toFixed(1), buildingYieldGapMs: idleGapMs.toFixed(1) });
      document.body.dataset.buildingSliceMaxMs = Math.max(Number(document.body.dataset.buildingSliceMaxMs) || 0, performance.now() - began).toFixed(2);
      document.body.dataset.buildingSlices = String((Number(document.body.dataset.buildingSlices) || 0) + 1);
      if (changed) this.bridge.scene.requestRender?.();
      if (!cullingDone || cursor < visible.length) this.queueWork(batch, waitingForFrame ? 16 : 0);
      else {
        this.validationActive = false;
        document.body.dataset.buildingPassMs = (performance.now() - passStarted).toFixed(1);
        document.body.dataset.buildingReadyMs = performance.now().toFixed(1);
        document.body.dataset.visibleBuildings = String(visible.length);
        this.reportBuildings(provisional);
        this.bridge.scene.requestRender?.();
        if (provisional) this.queueWork(() => this.awaitSettledTerrain(), 250);
      }
    };
    batch();
  }
  installBuilding(feature, id, placement) {
    this.buildingEntities?.begin();
    const C = this.bridge.C, polygon = feature.geometry;
    const record = {
      entities: [],
      visible: true,
      placement,
      displayPlacement: placement.status === "sampled" ? placement : void 0,
      knownZero: feature.properties.building_representation?.above_ground_height_m === 0,
      candidate: !isEstimatedBuilding(feature.properties) && isCandidateBuilding(feature.properties),
      estimated: isEstimatedBuilding(feature.properties)
    };
    this.buildings.set(id, record);
    const candidate = isCandidateBuilding(feature.properties);
    const estimated = isEstimatedBuilding(feature.properties);
    polygon.coordinates.forEach((ring, index) => {
      const outlineId = id + ":outline" + (index ? ":hole:" + index : "");
      const color2 = candidate && !estimated ? CANDIDATE_BUILDING_COLOR : "#ABC3C4";
      if (this.precomputed.has(feature) && placement.status === "sampled") {
        this.add(record.entities, { id: outlineId, polyline: {
          positions: ring.map((p) => C.Cartesian3.fromDegrees(p[0], p[1], placement.base)),
          width: 2,
          material: this.color(color2),
          clampToGround: false
        } });
      } else this.line(record.entities, outlineId, ring, color2, 2);
      this.buildingByEntity.set(outlineId, { polygon, properties: feature.properties, placement, displayPlacement: record.displayPlacement });
    });
    if (placement.status !== "sampled") return record;
    document.body.dataset.buildingFirstBodyMs ||= performance.now().toFixed(1);
    const hierarchy = this.hierarchy(polygon);
    this.add(record.entities, {
      id,
      polygon: {
        hierarchy,
        height: placement.base,
        extrudedHeight: placement.roof,
        heightReference: C.HeightReference.NONE,
        extrudedHeightReference: C.HeightReference.NONE,
        perPositionHeight: false,
        closeBottom: true,
        material: this.color(estimated ? ESTIMATED_BUILDING_COLOR : candidate ? CANDIDATE_BUILDING_COLOR : "#8FA9AD", 0.95)
      }
    });
    this.add(record.entities, {
      id: id + ":foundation",
      polygon: {
        hierarchy,
        height: placement.groundMin,
        extrudedHeight: placement.base,
        heightReference: C.HeightReference.NONE,
        extrudedHeightReference: C.HeightReference.NONE,
        perPositionHeight: false,
        material: this.color(estimated ? ESTIMATED_FOUNDATION_COLOR : candidate ? CANDIDATE_FOUNDATION_COLOR : "#405B60", 0.95)
      }
    });
    this.buildingByEntity.set(id, { polygon, properties: feature.properties, placement, displayPlacement: placement });
    this.buildingByEntity.set(id + ":foundation", { polygon, properties: feature.properties, placement, displayPlacement: placement });
    if (this.reveal) {
      const targets = record.entities.map((entity) => {
        const graphic = entity.polygon ?? entity.polyline, foundation = entity.id.endsWith(":foundation");
        const hex = foundation ? estimated ? ESTIMATED_FOUNDATION_COLOR : candidate ? CANDIDATE_FOUNDATION_COLOR : "#405B60" : entity.polygon ? estimated ? ESTIMATED_BUILDING_COLOR : candidate ? CANDIDATE_BUILDING_COLOR : "#8FA9AD" : candidate && !estimated ? CANDIDATE_BUILDING_COLOR : "#ABC3C4";
        const base = C.Color.fromCssColorString(hex), alpha = entity.polygon ? 0.95 : 1;
        if (typeof C.ColorMaterialProperty === "function" && typeof C.CallbackProperty === "function") {
          let value = base.withAlpha(alpha * 0.12);
          const getValue = (_time, result) => typeof C.Color.clone === "function" ? C.Color.clone(value, result) : value;
          const property = new C.CallbackProperty(getValue, false);
          let settled = false;
          graphic.material = new C.ColorMaterialProperty(property);
          return (opacity) => {
            value = base.withAlpha(alpha * opacity, value);
            if (opacity >= 1 && !settled && typeof property.setCallback === "function") {
              settled = true;
              const finish = () => {
                if (this.buildings.get(id) === record) property.setCallback(getValue, true);
              };
              if (this.buildingEntities) this.buildingEntities.settle(entity, finish);
              else finish();
            }
          };
        }
        return (opacity) => {
          graphic.material = base.withAlpha(alpha * opacity);
        };
      });
      this.reveal.add(id, (opacity) => targets.forEach((apply2) => apply2(opacity)), () => this.buildings.get(id) === record);
      this.reportReveal();
    }
    return record;
  }
  restoreVerifiedBuildings() {
    window.clearTimeout(this.restoreTimer);
    this.restoreTimer = 0;
    const revision = ++this.restoreRevision, cache = this.workBudget.placements;
    if (!cache && !this.workBudget.precomputed || !this.buildingsVisible || this.disposed) return;
    const bounds = this.buildingViewBounds();
    const candidates = this.ordered(this.index.query(bounds));
    let cursor = 0;
    const restore = () => {
      this.restoreTimer = 0;
      if (this.disposed || !this.buildingsVisible || revision !== this.restoreRevision || !this.bridge.scene.globe || this.bridge.scene.isDestroyed?.()) return;
      const collection = this.bridge.viewer.entities, batched = collection.suspendEvents && collection.resumeEvents;
      const deadline = performance.now() + this.workBudget.maxSliceMs;
      let changed = false, steps = 0, waitingForFrame = false;
      if (batched) collection.suspendEvents();
      try {
        while (cursor < candidates.length && steps++ < 64 && performance.now() < deadline) {
          const feature = candidates[cursor++], id = "mc:building:" + this.partIds.get(feature);
          if (this.buildings.has(id)) continue;
          const prepared = this.precomputed.get(feature);
          if (prepared && !this.preparedIntersects(feature, prepared)) continue;
          const previous = prepared ?? cache?.get(this.placementKeys.get(feature));
          if (!previous) continue;
          if (!this.admitBuilding()) {
            cursor--;
            waitingForFrame = true;
            break;
          }
          const record = this.installBuilding(feature, id, previous);
          record.precomputed = !!prepared;
          record.placement = { ...previous, status: "unresolved", groundMin: null, groundMax: null, base: null, roof: null, validSampleCount: 0 };
          for (const entity of record.entities) this.buildingByEntity.set(entity.id, { polygon: feature.geometry, properties: feature.properties, placement: record.placement, displayPlacement: previous });
          document.body.dataset.buildingWarmBodies = String((Number(document.body.dataset.buildingWarmBodies) || 0) + 1);
          changed = true;
        }
      } finally {
        if (batched) collection.resumeEvents();
      }
      if (changed) {
        this.reportBuildings(true);
        this.bridge.scene.requestRender?.();
      }
      if (cursor < candidates.length) this.restoreTimer = window.setTimeout(restore, waitingForFrame ? 16 : 0);
    };
    this.restoreTimer = window.setTimeout(restore, 0);
  }
  cameraStarted() {
    delete document.body.dataset.buildingCoverageCompleteMs;
    this.cameraMoving = true;
    this.invalidateTerrain();
  }
  cameraStopped() {
    this.cameraMoving = false;
    this.invalidateTerrain();
    this.scheduleBuildings();
  }
  viewportChanged() {
    delete document.body.dataset.buildingCoverageCompleteMs;
    this.invalidateTerrain();
    this.scheduleBuildings();
  }
  building(id) {
    return this.buildingsVisible ? this.buildingByEntity.get(id) : void 0;
  }
  setDraft(vertices, closed) {
    const signature = JSON.stringify([vertices, closed]);
    if (signature === this.draftSignature) return;
    this.draftSignature = signature;
    this.clear(this.draftEntities);
    if (!vertices.length) return;
    this.line(this.draftEntities, "mc:draft", closed ? [...vertices, vertices[0]] : vertices, "#F4F7F8", 4);
  }
  destroy() {
    this.disposed = true;
    this.restoreRevision++;
    window.clearTimeout(this.restoreTimer);
    this.stopReveal?.();
    this.stopMotion?.();
    this.reveal?.destroy();
    this.workRevision++;
    this.cancelWork();
    this.workChannel?.port1.close();
    this.workChannel?.port2.close();
    this.stopTileListener?.();
    this.resizeObserver?.disconnect();
    this.clear(this.operations);
    this.operationCache.clear();
    this.clear(this.draftEntities);
    for (const record of this.buildings.values()) this.clear(record.entities);
    this.buildingEntities?.destroy();
    this.buildings.clear();
    this.buildingByEntity.clear();
    this.retainedParts.clear();
  }
};

// local_mission_control/frontend/real-map-cell-cache.ts
var CellCache = class {
  constructor(fetcher = (input, init) => fetch(input, init), budget = 24 * 1024 * 1024, report = () => {
  }, retainSession = false) {
    this.fetcher = fetcher;
    this.budget = budget;
    this.report = report;
    this.retainSession = retainSession;
  }
  values = /* @__PURE__ */ new Map();
  pending = /* @__PURE__ */ new Map();
  archive = /* @__PURE__ */ new Map();
  addresses = /* @__PURE__ */ new Map();
  archiveBytes = 0;
  bytes = 0;
  stats = { requests: 0, hits: 0, shared: 0, restored: 0 };
  updated() {
    this.report({ ...this.stats, bytes: this.bytes, cells: this.values.size, pending: this.pending.size, savedCells: this.archive.size, savedBytes: this.archiveBytes });
  }
  address(key, url) {
    return url ? key + "\n" + url : this.addresses.get(key) || key;
  }
  peek(key, url) {
    return this.values.get(this.address(key, url))?.value;
  }
  has(key, url) {
    const id = this.address(key, url);
    return this.values.has(id) || this.archive.has(id);
  }
  retain(id, entry) {
    const old = this.values.get(id);
    if (old) this.bytes -= old.bytes;
    this.values.delete(id);
    this.values.set(id, entry);
    this.bytes += entry.bytes;
    while (this.bytes > this.budget || this.values.size > 36) {
      const oldest = this.values.keys().next().value;
      this.bytes -= this.values.get(oldest).bytes;
      this.values.delete(oldest);
    }
  }
  async download(url, signal) {
    const request = new AbortController(), abort = () => request.abort();
    signal.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, 12e3);
    try {
      const r = await this.fetcher(url, { signal: request.signal });
      if (!r.ok) throw Error("Building cell unavailable");
      return await r.text();
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
    }
  }
  async load(key, url, signal) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    const id = this.address(key, url);
    this.addresses.set(key, id);
    const cached = this.values.get(id);
    if (cached) {
      this.stats.hits++;
      this.updated();
      return cached;
    }
    const pending = this.pending.get(id);
    if (pending) {
      this.stats.shared++;
      this.updated();
      return pending;
    }
    const task = (async () => {
      const saved = this.archive.get(id);
      let text;
      if (saved) {
        text = await saved.text();
        this.stats.restored++;
      } else {
        this.stats.requests++;
        this.updated();
        text = await this.download(url, signal);
      }
      const bytes = text.length * 2;
      if (bytes > 8 * 1024 * 1024) throw Error("Building cell exceeds display budget");
      const value = JSON.parse(text);
      if (!Array.isArray(value.features) || value.features.length > 5e3) throw Error("Invalid building cell");
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      if (this.retainSession && !saved) {
        const blob = typeof Blob !== "undefined" && typeof Blob.prototype.text === "function" ? new Blob([text], { type: "application/json" }) : { size: bytes, text: async () => text };
        this.archive.set(id, blob);
        this.archiveBytes += blob.size;
      }
      return { value, bytes };
    })();
    this.pending.set(id, task);
    try {
      return await task;
    } finally {
      if (this.pending.get(id) === task) this.pending.delete(id);
      this.updated();
    }
  }
  async get(key, url, signal) {
    const entry = await this.load(key, url, signal);
    this.retain(this.address(key, url), entry);
    this.updated();
    return entry.value;
  }
  async warm(key, url, signal) {
    if (this.has(key, url)) return;
    const entry = await this.load(key, url, signal);
    if (!this.retainSession) this.retain(this.address(key, url), entry);
    this.updated();
  }
  async getAll(keys, url, signal, onPage, current = () => true) {
    const result = [];
    let next = 0, failed = false, failure;
    await Promise.all(Array.from({ length: Math.min(3, keys.length) }, async () => {
      try {
        while (!failed && current() && next < keys.length) {
          if (signal.aborted) throw new DOMException("Aborted", "AbortError");
          const index = next++;
          result[index] = await this.get(keys[index], url(keys[index]), signal);
          if (current()) onPage?.(result[index], keys[index]);
        }
      } catch (error) {
        if (!failed) {
          failed = true;
          failure = error;
        }
      }
    }));
    if (failed) throw failure;
    return result;
  }
};

// local_mission_control/frontend/verified-building-cache.ts
var DAY = 24 * 60 * 60 * 1e3;
var MAX_ENTRIES = 3e3;
function validPlacement(p) {
  return p?.status === "sampled" && ["groundMin", "groundMax", "base", "roof", "height"].every((k) => Number.isFinite(p[k])) && p.groundMin <= p.groundMax && p.height > 0 && Math.abs(p.base - p.groundMax - 1) < 1e-6 && Math.abs(p.roof - p.base - p.height) < 1e-6 && Number.isInteger(p.sampleCount) && p.sampleCount >= 3 && p.sampleCount <= 4096 && p.validSampleCount === p.sampleCount && typeof p.sourceLabel === "string" && p.sourceLabel.length <= 300;
}
function browserSnapshotStore() {
  if (typeof indexedDB === "undefined") return;
  const access = (write) => new Promise((resolve, reject) => {
    const open = indexedDB.open("recon-verified-building-display-v1", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("snapshot");
    open.onerror = () => reject(open.error);
    open.onblocked = () => reject(Error("Display cache blocked"));
    open.onsuccess = () => {
      const db = open.result;
      let result;
      try {
        const tx = db.transaction("snapshot", write ? "readwrite" : "readonly"), store = tx.objectStore("snapshot");
        const request = write ? store.put(write, "current") : store.get("current");
        request.onsuccess = () => {
          result = request.result;
        };
        tx.oncomplete = () => {
          db.close();
          resolve(result);
        };
        tx.onabort = tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      } catch (e) {
        db.close();
        reject(e);
      }
    };
  });
  return { read: () => access(), write: async (value) => {
    await access(value);
  } };
}
var VerifiedBuildingCache = class {
  constructor(scope, store = browserSnapshotStore(), now = () => Date.now(), budget = 8 * 1024 * 1024, notify = () => {
  }) {
    this.scope = scope;
    this.store = store;
    this.now = now;
    this.budget = budget;
    this.notify = notify;
  }
  entries = /* @__PURE__ */ new Map();
  bytes = 0;
  timer;
  dirty = false;
  closed = false;
  stats = { restored: 0, hits: 0, stored: 0, bytes: 0 };
  size(e) {
    return (e.signature.length + JSON.stringify(e.placement).length) * 2 + 32;
  }
  report() {
    this.stats.stored = this.entries.size;
    this.stats.bytes = this.bytes;
    this.notify({ ...this.stats });
  }
  retain(entry) {
    const old = this.entries.get(entry.signature);
    if (old) this.bytes -= this.size(old);
    this.entries.delete(entry.signature);
    this.entries.set(entry.signature, entry);
    this.bytes += this.size(entry);
    while (this.bytes > this.budget || this.entries.size > MAX_ENTRIES) {
      const key = this.entries.keys().next().value;
      this.bytes -= this.size(this.entries.get(key));
      this.entries.delete(key);
    }
  }
  async load() {
    if (!this.store) return;
    let timeout;
    try {
      const snapshot = await Promise.race([this.store.read(), new Promise((resolve) => {
        timeout = setTimeout(() => resolve(null), 400);
      })]);
      if (this.closed || snapshot?.scope !== this.scope || !Array.isArray(snapshot.entries) || snapshot.entries.length > MAX_ENTRIES) return;
      for (const e of snapshot.entries) if (typeof e?.signature === "string" && e.signature.length < 1e5 && validPlacement(e.placement) && Number.isFinite(e.at) && this.now() - e.at >= 0 && this.now() - e.at < DAY) this.retain(e);
      this.stats.restored = this.entries.size;
      this.report();
    } catch {
    } finally {
      clearTimeout(timeout);
    }
  }
  get(signature) {
    const e = this.entries.get(signature);
    if (!e || this.now() - e.at < 0 || this.now() - e.at >= DAY) return;
    this.entries.delete(signature);
    this.entries.set(signature, e);
    this.stats.hits++;
    this.report();
    return { ...e.placement };
  }
  set(signature, placement) {
    if (this.closed || !signature || signature.length >= 1e5 || !validPlacement(placement)) return;
    this.retain({ signature, placement: { ...placement }, at: this.now() });
    this.dirty = true;
    this.report();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = void 0;
      void this.flush();
    }, 800);
  }
  async flush() {
    clearTimeout(this.timer);
    this.timer = void 0;
    if (!this.dirty || !this.store) return;
    this.dirty = false;
    try {
      await this.store.write({ scope: this.scope, entries: [...this.entries.values()] });
    } catch {
    }
  }
  close() {
    void this.flush();
    this.closed = true;
  }
};

// local_mission_control/frontend/precomputed-building-ground.ts
function precomputedBuildingGround(feature, part, manifest, now = Date.now()) {
  const ground = manifest?.ground, p = feature?.properties, record = p?.terrain_display;
  if (!ground || ground.schema !== "vworld-building-ground-v1" || ground.scope !== "DISPLAY_ONLY" || ground.provider !== "VWORLD_WEBGL_3" || ground.source_build !== manifest.build_id || ground.profile !== "vworld-webgl3-lod14-footprint10m-v1" || ground.level !== 14 || !Number.isFinite(Date.parse(ground.expires_at)) || Date.parse(ground.expires_at) <= now || record?.edition !== ground.edition || record?.building_id !== p.buildingId || typeof record.sampled_at !== "string" || !Number.isFinite(Date.parse(record.sampled_at))) return;
  const value = record.parts?.[part];
  if (!value || value.status !== "sampled") return;
  if (!["groundMin", "groundMax", "base", "roof", "height"].every((k) => typeof value[k] === "number" && Number.isFinite(value[k]))) return;
  if (value.height !== p.height || value.height !== p.render_height_m || value.height <= 0 || value.height > 1e3 || value.groundMin > value.groundMax || value.groundMin < -1e3 || value.groundMax > 1e4 || !Number.isInteger(value.sampleCount) || value.sampleCount < 3 || value.sampleCount > 65536 || value.validSampleCount !== value.sampleCount || Math.abs(value.base - value.groundMax - 1) > 1e-6 || Math.abs(value.roof - value.base - value.height) > 1e-6) return;
  return { ...value, sourceLabel: "VWorld \uC9C0\uD615 \uC0AC\uC804 \uACC4\uC0B0 \xB7 \uD45C\uC2DC\uC6A9 \xB7 " + record.sampled_at.slice(0, 10) };
}
function buildingCellUrl(manifest, key) {
  const base = `/api/map/real-buildings/${manifest.build_id}`;
  return manifest.ground ? `${base}/ground/${manifest.ground.edition}/cells/${key}` : `${base}/cells/${key}`;
}

// local_mission_control/frontend/real-map-building-view.ts
function groundViewportBounds(points, fallback) {
  if (points.length < 8) return fallback;
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const w = Math.min(...xs), s = Math.min(...ys), e = Math.max(...xs), n = Math.max(...ys);
  const dx = Math.max((e - w) * 0.1, 1e-4), dy = Math.max((n - s) * 0.1, 1e-4);
  return [w - dx, s - dy, e + dx, n + dy];
}
function buildingCellPlan(bounds, center, coverage, limit = 96) {
  const none = { visible: [], warm: [], total: 0, limited: false, coverage: "outside" };
  if (!bounds || !coverage || ![...bounds, ...center, ...coverage].every(Number.isFinite)) return none;
  const w = Math.max(bounds[0], coverage[0]), s = Math.max(bounds[1], coverage[1]), e = Math.min(bounds[2], coverage[2]), n = Math.min(bounds[3], coverage[3]);
  if (w > e || s > n) return none;
  const x0 = Math.floor(w * 100), x1 = Math.floor(e * 100), y0 = Math.floor(s * 100), y1 = Math.floor(n * 100), total = (x1 - x0 + 1) * (y1 - y0 + 1);
  const distance = (key) => {
    const [x, y] = key.split("/").map(Number);
    return ((x + 0.5) / 100 - center[0]) ** 2 * Math.cos(center[1] * Math.PI / 180) ** 2 + ((y + 0.5) / 100 - center[1]) ** 2;
  };
  const keys = [];
  const cx = Math.floor(center[0] * 100), cy = Math.floor(center[1] * 100), radius = Math.ceil(Math.sqrt(limit));
  for (let x = total > 2e4 ? Math.max(x0, cx - radius) : x0; x <= Math.min(x1, total > 2e4 ? cx + radius : x1); x++)
    for (let y = total > 2e4 ? Math.max(y0, cy - radius) : y0; y <= Math.min(y1, total > 2e4 ? cy + radius : y1); y++) keys.push(x + "/" + y);
  const visible = keys.sort((a, b) => distance(a) - distance(b)).slice(0, limit), wanted = new Set(visible), neighbors = /* @__PURE__ */ new Set();
  for (const key of visible) {
    const [x, y] = key.split("/").map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = x + dx, b = y + dy, k = a + "/" + b;
      if (!wanted.has(k) && (a + 1) / 100 >= coverage[0] && a / 100 <= coverage[2] && (b + 1) / 100 >= coverage[1] && b / 100 <= coverage[3]) neighbors.add(k);
    }
  }
  return {
    visible,
    warm: total > limit ? [] : [...neighbors].sort((a, b) => distance(a) - distance(b)).slice(0, 4),
    total,
    limited: total > limit,
    coverage: bounds[0] >= coverage[0] && bounds[1] >= coverage[1] && bounds[2] <= coverage[2] && bounds[3] <= coverage[3] ? "inside" : "partial"
  };
}

// local_mission_control/frontend/real-map-building-prefetch.ts
function radialBuildingCells(bounds) {
  if (bounds.length !== 4 || !bounds.every(Number.isFinite) || bounds[0] > bounds[2] || bounds[1] > bounds[3] || bounds[0] < -180 || bounds[2] > 180 || bounds[1] < -85 || bounds[3] > 85) return [];
  const x0 = Math.floor(bounds[0] * 100), x1 = Math.floor(bounds[2] * 100), y0 = Math.floor(bounds[1] * 100), y1 = Math.floor(bounds[3] * 100);
  if ((x1 - x0 + 1) * (y1 - y0 + 1) > 2e4) return [];
  const cells = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) cells.push({ key: x + "/" + y, x, y });
  return cells;
}
var BuildingPrefetch = class {
  constructor(bounds, cache, allowed, report = () => {
  }, intervalMs = 220, now = () => Date.now()) {
    this.cache = cache;
    this.allowed = allowed;
    this.report = report;
    this.intervalMs = intervalMs;
    this.now = now;
    this.cells = radialBuildingCells(bounds);
  }
  cells;
  origins = [];
  failures = /* @__PURE__ */ new Map();
  timer;
  stopped = false;
  running = false;
  turn = 0;
  older = 0;
  requests = 0;
  lastCell = "";
  retryAt = 0;
  failureStreak = 0;
  add(point, kind = "search") {
    if (this.stopped || !Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite) || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 85) return;
    const id = Math.floor(point[0] * 100) + "/" + Math.floor(point[1] * 100), existing = this.origins.findIndex((o) => o.id === id);
    if (existing >= 0) {
      const [origin] = this.origins.splice(existing, 1);
      this.origins.push(origin);
    } else {
      const scale = Math.cos(point[1] * Math.PI / 180);
      const queue = this.cells.map((c) => ({ key: c.key, distance: 111320 * Math.hypot(((c.x + 0.5) / 100 - point[0]) * scale, (c.y + 0.5) / 100 - point[1]) })).sort((a, b) => a.distance - b.distance || a.key.localeCompare(b.key));
      this.origins.push({ id, point: [...point], kind, queue, cursor: 0, radius: 0 });
    }
    this.turn = 0;
    this.notify("queued");
    this.wake();
  }
  loaded() {
    return this.cells.reduce((n, c) => n + Number(this.cache.has(c.key)), 0);
  }
  notify(state) {
    this.report({
      state,
      loaded: this.loaded(),
      total: this.cells.length,
      origins: this.origins.length,
      requests: this.requests,
      failures: this.failures.size,
      lastCell: this.lastCell,
      centers: JSON.stringify(this.origins.map((o) => ({ point: o.point, kind: o.kind, radiusM: Math.round(o.radius) })))
    });
  }
  candidate(origin) {
    while (origin.cursor < origin.queue.length) {
      const cell = origin.queue[origin.cursor++];
      if (this.cache.has(cell.key)) {
        origin.radius = Math.max(origin.radius, cell.distance);
        this.failures.delete(cell.key);
        continue;
      }
      if (this.failures.has(cell.key)) continue;
      return { ...cell, origin };
    }
  }
  next() {
    for (const [key, retry] of this.failures) {
      if (this.cache.has(key)) {
        this.failures.delete(key);
        continue;
      }
      if (retry.at <= this.now()) return { key, distance: 0, origin: void 0 };
    }
    const count = this.origins.length;
    if (!count) return;
    const index = count > 1 && this.turn++ % 3 === 2 ? this.older++ % (count - 1) : count - 1;
    for (const n of [index, ...this.origins.map((_, i) => i).filter((i) => i !== index)]) {
      const cell = this.candidate(this.origins[n]);
      if (cell) return cell;
    }
  }
  wake() {
    if (this.stopped || this.running || this.timer || !this.origins.length) return;
    this.timer = setTimeout(() => {
      this.timer = void 0;
      void this.step();
    }, this.intervalMs);
  }
  async step() {
    if (this.stopped) return;
    if (!this.allowed()) {
      this.notify("paused");
      this.wake();
      return;
    }
    if (this.now() < this.retryAt) {
      this.notify("retrying");
      this.wake();
      return;
    }
    const cell = this.next();
    if (!cell) {
      const complete = this.loaded() === this.cells.length;
      this.notify(complete ? "complete" : "retrying");
      if (!complete) this.wake();
      return;
    }
    this.running = true;
    this.lastCell = cell.key;
    this.requests++;
    this.notify("loading");
    try {
      await this.cache.warm(cell.key);
      if (this.stopped) return;
      this.failureStreak = 0;
      this.retryAt = 0;
      this.failures.delete(cell.key);
      if (cell.origin) cell.origin.radius = Math.max(cell.origin.radius, cell.distance);
    } catch {
      if (this.stopped) return;
      const attempts = (this.failures.get(cell.key)?.attempts || 0) + 1;
      this.failures.set(cell.key, { attempts, at: this.now() + Math.min(3e4, 1e3 * 2 ** Math.min(5, attempts - 1)) });
      if (++this.failureStreak >= 3) this.retryAt = this.now() + Math.min(3e4, 1e3 * 2 ** Math.min(5, this.failureStreak - 3));
    } finally {
      this.running = false;
      if (!this.stopped) {
        this.notify("loading");
        this.wake();
      }
    }
  }
  close() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.timer = void 0;
  }
};

// local_mission_control/frontend/real-map-3d.ts
var TARGET_FRAME_RATE = 60;
var bridge;
var config;
var nonce = "";
var ready = false;
var imagery;
var routes = [];
var markers = [];
var selectionKey = "";
var routeKey = "";
var pointKey = "";
var selectionVersion = 0;
var sequence = [];
var sequenceKey = "";
var groundLineShow;
var selected = /* @__PURE__ */ new Map();
var regionGeometry = /* @__PURE__ */ new Map();
var selectionRelease = "";
var buildingManifest;
var buildingTimer;
var buildingVersion = 0;
var buildingRenderer;
var active = false;
var disposed = false;
var moving = false;
var nativeShown = false;
var buildingsLoading = false;
var lastView;
var buildingKey = "";
var dataKey;
var buildingCache = new CellCache(void 0, 24 * 1024 * 1024, (stats) => {
  for (const [key, value] of Object.entries(stats)) document.body.dataset["buildingCache" + key[0].toUpperCase() + key.slice(1)] = String(value);
}, true);
var buildingAbort = new AbortController();
var buildingPrefetch;
var buildingOrigins = /* @__PURE__ */ new Map();
var preparedBuildings = /* @__PURE__ */ new WeakMap();
var displayedBuildings = /* @__PURE__ */ new Map();
var placements;
var wantedBuildingKey = "";
var lastCoverageCapture = 0;
var buildingNotice = "";
var capacityLimited = false;
var frameVisible = false;
var presentedRevision = -1;
var buildingPreparation;
var buildingRetryAt = 0;
var seed = readSeed();
function readSeed() {
  try {
    const v = JSON.parse(new URLSearchParams(location.hash.slice(1)).get("view") || "null");
    if (Array.isArray(v?.center) && v.center.length === 2 && v.center.every(Number.isFinite) && Math.abs(v.center[0]) <= 180 && Math.abs(v.center[1]) <= 85 && Array.isArray(v.bounds) && v.bounds.length === 4 && v.bounds.every(Number.isFinite) && v.bounds[0] < v.bounds[2] && v.bounds[1] < v.bounds[3]) return v;
  } catch {
  }
  return void 0;
}
function sceneAvailable() {
  return !disposed && !!bridge?.scene?.globe && !bridge.scene.isDestroyed?.();
}
function addBuildingOrigin(point, kind) {
  if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite) || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 85) return;
  const id = Math.floor(point[0] * 100) + "/" + Math.floor(point[1] * 100);
  if (buildingOrigins.has(id)) return;
  buildingOrigins.set(id, { point: [...point], kind });
  buildingPrefetch?.add(point, kind);
}
function captureBuildingView() {
  if (!sceneAvailable()) return void 0;
  const view = captureView(bridge, lastView, false);
  if (!view) return lastView;
  const canvas = bridge.scene.canvas, points = [];
  for (const [x, y] of [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [1, 0.5], [0, 1], [0.5, 1], [1, 1]]) {
    const point = pickGround(bridge, Math.max(1, Math.min(canvas.clientWidth - 1, canvas.clientWidth * x)), Math.max(1, Math.min(canvas.clientHeight - 1, canvas.clientHeight * y)), false);
    if (point) points.push(point);
  }
  const bounds = groundViewportBounds(points, view.bounds);
  document.body.dataset.buildingBoundsSource = points.length === 8 ? "screen-ground" : "view-rectangle";
  document.body.dataset.buildingViewportBounds = JSON.stringify(bounds || []);
  return { ...view, bounds };
}
function displayBuildings(visible) {
  const signature = [...visible.keys()].sort().join(",");
  if (signature !== dataKey) {
    dataKey = signature;
    document.body.dataset.buildingDataChangedMs = performance.now().toFixed(1);
    const features = [...visible.values()].map((f) => {
      let value = preparedBuildings.get(f);
      if (!value) {
        value = { ...f, properties: { ...f.properties, id: f.properties.buildingId, height_source: f.properties.heightState, render_height_m: f.properties.height } };
        preparedBuildings.set(f, value);
      }
      return value;
    });
    buildingRenderer.setBuildings({ type: "FeatureCollection", features }, { incremental: true });
  }
  displayedBuildings = visible;
  document.body.dataset.buildingCount = String(visible.size);
  bridge.scene.requestRender?.();
}
var status = document.getElementById("frame-status");
var send = (type, data = {}) => parent.postMessage({ type, nonce, ...data }, location.origin);
var clear = (items) => {
  for (const item of items) bridge.viewer.entities.remove(item);
  items.length = 0;
};
var color = (text, alpha = 1) => bridge.C.Color.fromCssColorString(text).withAlpha(alpha);
var position = (p, ground = false) => bridge.C.Cartesian3.fromDegrees(p[0], p[1], ground ? 0 : p[2] || 0);
var selectionLine = (initial) => new bridge.C.PolylineOutlineMaterialProperty({ color: color(initial ? "#35ffd2" : "#68d9ff"), outlineColor: color("#123b48", 0.95), outlineWidth: 1.5 });
function border(ring, initial) {
  return bridge.viewer.entities.add({ polyline: { positions: bridge.C.Cartesian3.fromDegreesArray(ring.flatMap((p) => [p[0], p[1]])), clampToGround: true, width: initial ? 6 : 5, material: selectionLine(initial) } });
}
async function redrawSelection() {
  if (selectionRelease !== config.release) {
    for (const record of selected.values()) clear(record.items);
    selected.clear();
    regionGeometry.clear();
    selectionKey = "";
    selectionRelease = config.release;
  }
  const began = performance.now(), release = config.release, ids = config.regions.map((r) => r.id), key = JSON.stringify(ids);
  if (key === selectionKey) return;
  selectionKey = key;
  const version = ++selectionVersion;
  for (const [id, record] of selected) if (!ids.includes(id)) {
    clear(record.items);
    selected.delete(id);
  }
  if (!ids.length) {
    bridge.scene.requestRender?.();
    return;
  }
  try {
    const missing = ids.filter((id) => !regionGeometry.has(id));
    if (missing.length) {
      document.body.dataset.selectionRequests = String((Number(document.body.dataset.selectionRequests) || 0) + 1);
      const response = await fetch("/api/map/real-regions?ids=" + encodeURIComponent(missing.join(",")));
      if (!response.ok) throw Error("\uC120\uD0DD\uD55C \uAD6C\uC5ED \uACBD\uACC4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
      const data = await response.json();
      if (release !== selectionRelease) return;
      for (const f of data.features) regionGeometry.set(f.id, f);
    }
    if (version !== selectionVersion) return;
    const C = bridge.C;
    const hierarchy = (rings) => new C.PolygonHierarchy(C.Cartesian3.fromDegreesArray(rings[0].flatMap((p) => [p[0], p[1]])), rings.slice(1).map((r) => new C.PolygonHierarchy(C.Cartesian3.fromDegreesArray(r.flatMap((p) => [p[0], p[1]])))));
    const collection = bridge.viewer.entities, batched = collection.suspendEvents && collection.resumeEvents;
    if (batched) collection.suspendEvents();
    try {
      for (const id of ids) {
        const initial = id === ids[0], old = selected.get(id);
        if (old) {
          if (old.initial !== initial) for (const entity of old.items) {
            if (entity.polygon) entity.polygon.material = color(initial ? "#16c9bb" : "#79d5eb", initial ? 0.16 : 0.1);
            if (entity.polyline) {
              entity.polyline.material = selectionLine(initial);
              entity.polyline.width = initial ? 6 : 5;
            }
          }
          old.initial = initial;
          continue;
        }
        const f = regionGeometry.get(id);
        if (!f) continue;
        const items = [], polys = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [f.geometry.coordinates];
        for (const poly of polys) {
          items.push(collection.add({ polygon: { hierarchy: hierarchy(poly), material: color(initial ? "#16c9bb" : "#79d5eb", initial ? 0.16 : 0.1) } }));
          for (const ring of poly) items.push(border(ring, initial));
        }
        selected.set(id, { items, initial });
      }
    } finally {
      if (batched) collection.resumeEvents();
    }
    for (const id of regionGeometry.keys()) {
      if (regionGeometry.size <= 64) break;
      if (!ids.includes(id)) regionGeometry.delete(id);
    }
    document.body.dataset.selectionRenderMs = (performance.now() - began).toFixed(1);
    bridge.scene.requestRender?.();
  } catch (e) {
    if (version === selectionVersion) {
      selectionKey = "";
      send("real-3d-error", { message: String(e) });
    }
  }
}
function redrawRoutes() {
  const key = JSON.stringify(config.route?.features || []);
  if (key === routeKey) return;
  routeKey = key;
  clear(routes);
  const C = bridge.C;
  for (const f of config.route?.features || []) {
    if (f.geometry?.type !== "LineString" || f.geometry.coordinates.length < 2) continue;
    const tone = f.properties.kind === "return" ? "#f2a948" : f.properties.kind === "transit" ? "#b4a3ff" : "#2de6c5";
    routes.push(bridge.viewer.entities.add({ polyline: { positions: f.geometry.coordinates.map((p) => position(p)), width: f.properties.kind === "search" ? 4 : 3, material: f.properties.kind === "search" ? color(tone) : new C.PolylineDashMaterialProperty({ color: color(tone), dashLength: 16 }), depthFailMaterial: color(tone, 0.55) } }));
  }
  bridge.scene.requestRender?.();
}
function redrawSequence() {
  const points = config.regions.map((r) => r.point), hasRoute = !!config.route?.features?.length;
  const key = JSON.stringify([points, hasRoute]);
  if (key === sequenceKey) return;
  sequenceKey = key;
  clear(sequence);
  document.body.dataset.visitOrder = config.regions.map((r) => r.id).join(",");
  document.body.dataset.visitConnectionCount = String(hasRoute ? 0 : Math.max(0, points.length - 1));
  if (hasRoute || points.length < 2) return;
  const C = bridge.C;
  groundLineShow ??= new C.CallbackProperty(() => true, false);
  const positions = C.Cartesian3.fromDegreesArray(points.flatMap((p) => p.slice(0, 2)));
  const material = new C.PolylineDashMaterialProperty({ color: color("#086578"), gapColor: color("#f7ffff", 0.95), dashLength: 20 });
  sequence.push(bridge.viewer.entities.add({ id: "real:visit-order", polyline: { positions, clampToGround: true, width: 4, material, show: groundLineShow } }));
  bridge.scene.requestRender?.();
}
function redrawMarkers() {
  const key = JSON.stringify([config.regions, config.launch]);
  if (key === pointKey) return;
  pointKey = key;
  clear(markers);
  const C = bridge.C;
  const label = (p, text, tone) => markers.push(bridge.viewer.entities.add({ position: position(p, true), label: { text, font: "bold 14px sans-serif", fillColor: C.Color.WHITE, showBackground: true, backgroundColor: color(tone), backgroundPadding: new C.Cartesian2(8, 6), heightReference: C.HeightReference.CLAMP_TO_GROUND, pixelOffset: new C.Cartesian2(0, -16), disableDepthTestDistance: Infinity } }));
  config.regions.forEach((r, i) => label(r.point, String(i + 1), i ? "#346d7d" : "#006b78"));
  if (config.launch) label(config.launch, "\uCD9C\uBC1C", "#be6b20");
  bridge.scene.requestRender?.();
}
function apply() {
  if (!ready || !config) return;
  for (const origin of Array.isArray(config.buildingOrigins) ? config.buildingOrigins.slice(0, 2e3) : []) addBuildingOrigin(origin?.point, origin?.kind === "initial" ? "initial" : "search");
  const wasActive = active, wasVisible = frameVisible;
  active = config.active !== false && !document.hidden;
  frameVisible = config.frameVisible === true && (config.viewRevision ?? 0) === presentedRevision;
  if (frameVisible && (!wasVisible || !wasActive)) buildingNotice = "";
  if (active && frameVisible) document.body.dataset.mapVisibleAckMs ||= performance.now().toFixed(1);
  bridge.viewer.useDefaultRenderLoop = active;
  buildingRenderer.setBuildingsVisible(active && frameVisible && config.buildings !== false);
  if (!active) {
    nativeBuildings();
    clearTimeout(buildingTimer);
    buildingTimer = void 0;
    buildingVersion++;
    return;
  }
  if (config.center) {
    document.body.dataset.buildingViewRequestedMs = performance.now().toFixed(1);
    lastView = void 0;
    const view = config.cameraView;
    if (view && [view.zoom, view.pitch, view.bearing].every(Number.isFinite)) {
      const range = rangeAtResolution(resolutionAtZoom(config.center[1], view.zoom), bridge.scene.canvas.clientHeight, bridge.camera.frustum?.fovy || Math.PI / 3);
      centerCamera(bridge, config.center, range, view.bearing * Math.PI / 180, -(90 - Math.max(0, Math.min(65, view.pitch))) * Math.PI / 180);
    } else centerCamera(bridge, config.center, config.range || 1200);
    config.center = null;
  }
  if (imagery) {
    imagery.saturation = config.mode === "coverage" ? 0 : 1;
    imagery.alpha = config.mode === "coverage" ? 0.65 : 1;
  }
  nativeBuildings();
  bridge.scene.canvas.style.cursor = config.editing || config.pickLaunch ? "crosshair" : "";
  void redrawSelection();
  redrawRoutes();
  redrawSequence();
  redrawMarkers();
  bridge.scene.requestRender?.();
  if (!wasActive) buildingRenderer.cameraStopped();
  if (frameVisible) buildingStatus();
  scheduleBuildings();
  buildingPrefetch?.wake();
}
function nativeBuildings() {
  const center = lastView?.center, b = buildingManifest?.bounds;
  if (!center || !b) return;
  const qualified = center && b && center[0] >= b[0] && center[0] <= b[2] && center[1] >= b[1] && center[1] <= b[3];
  const shown = active && config?.buildings !== false && !qualified;
  if (shown === nativeShown) return;
  nativeShown = shown;
  const layer = bridge.map.getLayerElement("facility_build");
  if (shown) layer?.show?.();
  else layer?.hide?.();
}
function buildingStatus() {
  const d = document.body.dataset;
  const message = config?.buildings === false ? "VWorld 3D \xB7 \uAC74\uBB3C \uD45C\uC2DC \uAEBC\uC9D0" : d.buildingError ? "\uAC74\uBB3C \uC5F0\uACB0 \uC9C0\uC5F0 \xB7 \uC9C0\uB3C4\uB294 \uACC4\uC18D \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" : !frameVisible ? "VWorld 3D \uC9C0\uB3C4 \uC900\uBE44 \uC911" : !buildingManifest ? "3D \uC9C0\uB3C4 \uC900\uBE44 \uC644\uB8CC \xB7 \uAC74\uBB3C \uBD88\uB7EC\uC624\uB294 \uC911" : d.buildingCoverage === "outside" ? "\uC800\uC7A5 \uBC94\uC704 \uBC16 \xB7 VWorld \uAE30\uBCF8 \uC9C0\uB3C4" : d.buildingCellsPending !== "0" && Number(d.buildingCellsPending) > 0 ? `\uAC74\uBB3C ${d.buildingCellsReady || 0}/${d.buildingCellsWanted || 0} \uAD6C\uAC04 \uBD88\uB7EC\uC624\uB294 \uC911` : capacityLimited ? "\uB113\uC740 \uC2DC\uC57C \xB7 \uD655\uB300\uD558\uBA74 \uB098\uBA38\uC9C0 \uC0C1\uC138 \uAC74\uBB3C \uD45C\uC2DC" : d.buildingCount === "0" ? "\uD604\uC7AC \uC2DC\uC57C\uC5D0 \uC800\uC7A5\uB41C \uAC74\uBB3C \uD615\uC0C1 0\uAC74" : Number(d.cachedBuildings) > 0 || Number(d.unresolvedBuildings) > 0 ? "\uAC74\uBB3C \uD45C\uC2DC \uC720\uC9C0 \xB7 \uC9C0\uD615 \uAC31\uC2E0 \uC911" : "VWorld 3D \xB7 \uC9C0\uD615\xB7\uB192\uC774 \uAE30\uBC18 \uAC74\uBB3C";
  const label = d.buildingCoverage === "partial" && d.buildingCellsPending === "0" && !d.buildingError ? message + " \xB7 \uC2DC\uC57C \uC77C\uBD80\uB294 \uC800\uC7A5 \uBC94\uC704 \uBC16" : message;
  if (label !== buildingNotice) {
    buildingNotice = label;
    if (nonce) send("real-3d-notice", { message: label });
  }
}
function scheduleBuildings() {
  if (buildingTimer || !active || !frameVisible || config?.buildings === false || disposed) return;
  buildingTimer = setTimeout(() => {
    buildingTimer = void 0;
    void redrawBuildings();
  }, 25);
}
async function prepareBuildings() {
  if (buildingPreparation || performance.now() < buildingRetryAt) return;
  const d = document.body.dataset;
  d.buildingStage = "metadata";
  d.buildingRequestsStartedMs ||= performance.now().toFixed(1);
  buildingStatus();
  buildingPreparation = (async () => {
    try {
      const response = await fetch("/api/map/real-buildings", { signal: buildingAbort.signal });
      if (!response.ok) throw Error("\uAC74\uBB3C \uD45C\uC2DC \uC790\uB8CC \uC5F0\uACB0\uC744 \uD655\uC778\uD558\uC138\uC694.");
      const manifest = await response.json();
      if (!manifest?.build_id || !Array.isArray(manifest.bounds)) throw Error("\uAC74\uBB3C \uD45C\uC2DC \uC790\uB8CC \uD615\uC2DD\uC744 \uD655\uC778\uD558\uC138\uC694.");
      if (disposed) return;
      placements = new VerifiedBuildingCache("vworld-ground-v1:" + manifest.build_id + ":" + (manifest.ground?.edition || "live"), void 0, void 0, void 0, (stats) => {
        for (const [k, v] of Object.entries(stats)) d["buildingSaved" + k[0].toUpperCase() + k.slice(1)] = String(v);
      });
      d.buildingStage = "cache";
      if (manifest.ground) void placements.load();
      else await placements.load();
      if (disposed) return;
      d.buildingGroundEdition = manifest.ground?.edition || "live";
      buildingManifest = manifest;
      delete d.buildingError;
      d.buildingStage = "loading";
      buildingPrefetch = new BuildingPrefetch(
        manifest.bounds,
        {
          has: (key) => buildingCache.has(key, buildingCellUrl(manifest, key)),
          warm: (key) => buildingCache.warm(key, buildingCellUrl(manifest, key), buildingAbort.signal)
        },
        () => active && frameVisible && config?.buildings !== false && sceneAvailable() && !moving && !buildingsLoading && !buildingTimer && !Number(d.buildingRevealPending) && bridge.viewer.dataSourceDisplay?.ready !== false,
        (stats) => {
          for (const [key, value] of Object.entries(stats)) d["buildingPrefetch" + key[0].toUpperCase() + key.slice(1)] = String(value);
        }
      );
      if (!buildingOrigins.size) addBuildingOrigin(seed?.center || lastView?.center, "initial");
      for (const origin of buildingOrigins.values()) buildingPrefetch.add(origin.point, origin.kind);
      d.buildingPreparedMs = performance.now().toFixed(1);
      nativeBuildings();
      scheduleBuildings();
    } catch (e) {
      if (!disposed) {
        d.buildingStage = "error";
        d.buildingError = e instanceof Error ? e.message : "Building metadata unavailable";
        buildingRetryAt = performance.now() + 3e3;
        buildingStatus();
      }
    } finally {
      buildingPreparation = void 0;
    }
  })();
  await buildingPreparation;
}
async function redrawBuildings() {
  if (!ready || !active || !frameVisible || config?.buildings === false) return;
  if (!buildingManifest) {
    void prepareBuildings();
    return;
  }
  const view = lastView, b = view?.bounds;
  if (!b) return;
  const center = view.center || [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
  const plan = buildingCellPlan(b, center, buildingManifest.bounds, 2e4), keys = plan.visible, key = [plan.limited ? "limited" : "complete", ...[...keys].sort()].join("|");
  wantedBuildingKey = key;
  document.body.dataset.buildingCoverage = plan.coverage;
  document.body.dataset.buildingCellLimit = String(plan.limited);
  document.body.dataset.buildingCellsTotal = String(plan.total);
  if (buildingsLoading) return;
  if (key === buildingKey) {
    buildingStatus();
    return;
  }
  capacityLimited = plan.limited;
  document.body.dataset.buildingFeatureLimit = "false";
  document.body.dataset.buildingCellsSkipped = String(plan.total - keys.length);
  document.body.dataset.buildingStage = "loading";
  buildingRenderer.setBuildingsVisible(true);
  const version = ++buildingVersion;
  buildingsLoading = true;
  const began = performance.now(), arrived = /* @__PURE__ */ new Map();
  let publishTimer;
  document.body.dataset.buildingViewportRequestedMs = began.toFixed(1);
  document.body.dataset.buildingCellsWanted = String(keys.length);
  delete document.body.dataset.buildingViewportDataReadyMs;
  delete document.body.dataset.buildingViewportDisplayedMs;
  delete document.body.dataset.buildingDataDisplayedMs;
  delete document.body.dataset.buildingDataDisplayLatencyMs;
  document.body.dataset.buildingLoadLongTasks = "0";
  document.body.dataset.buildingLoadLongTaskMaxMs = "0";
  document.body.dataset.buildingLoadFrameMaxMs = "0";
  document.body.dataset.buildingLoadFrameCount = "0";
  document.body.dataset.buildingCellsReady = "0";
  document.body.dataset.buildingCellsPending = String(keys.length);
  const current = () => version === buildingVersion && wantedBuildingKey === key && active && frameVisible && config?.buildings !== false && sceneAvailable();
  let completed = 0;
  const publish = (complete = false) => {
    if (!current()) return;
    const visible = complete ? new Map(arrived) : new Map([...arrived, ...displayedBuildings]);
    displayBuildings(visible);
  };
  try {
    for (const k of keys) {
      const page = buildingCache.peek(k);
      if (page) for (const f of page.features) arrived.set(f.properties.buildingId, f);
    }
    if (arrived.size) publish();
    buildingStatus();
    await buildingCache.getAll(keys, (k) => buildingCellUrl(buildingManifest, k), buildingAbort.signal, (page) => {
      if (!current()) return;
      for (const f of page.features) arrived.set(f.properties.buildingId, f);
      completed++;
      document.body.dataset.buildingCellsReady = String(completed);
      document.body.dataset.buildingCellsPending = String(keys.length - completed);
      document.body.dataset.buildingFirstDataMs ||= performance.now().toFixed(1);
      if (!publishTimer) publishTimer = setTimeout(() => {
        publishTimer = void 0;
        publish();
        buildingStatus();
      }, 50);
    }, current);
    if (!current()) return;
    buildingKey = key;
    delete document.body.dataset.buildingError;
    if (completed < keys.length) {
      capacityLimited = true;
      document.body.dataset.buildingFeatureLimit = "true";
      document.body.dataset.buildingCellsPending = "0";
      document.body.dataset.buildingCellsSkipped = String(plan.total - completed);
      publish(true);
      document.body.dataset.buildingStage = "limited";
      buildingStatus();
      return;
    }
    publish(true);
    document.body.dataset.buildingFetchMs = (performance.now() - began).toFixed(1);
    document.body.dataset.buildingViewportDataReadyMs = performance.now().toFixed(1);
    document.body.dataset.buildingStage = capacityLimited ? "limited" : "ready";
    buildingStatus();
  } catch (e) {
    if (current()) {
      publish();
      document.body.dataset.buildingError = e instanceof Error ? e.message : "Building load failed";
      buildingStatus();
    }
  } finally {
    clearTimeout(publishTimer);
    buildingsLoading = false;
    if (version !== buildingVersion || wantedBuildingKey !== key) scheduleBuildings();
    buildingPrefetch?.wake();
  }
}
window.addEventListener("message", (e) => {
  if (e.origin !== location.origin || e.source !== parent || e.data?.type !== "real-map-config") return;
  const v = e.data;
  if (typeof v.nonce !== "string" || !Array.isArray(v.regions) || v.regions.length > 32) return;
  nonce = v.nonce;
  config = v;
  apply();
});
async function boot() {
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(Error("3D \uC9C0\uB3C4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. 2D \uC9C0\uB3C4\uB85C \uC804\uD658\uD558\uAC70\uB098 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC138\uC694.")), 45e3));
    document.body.dataset.buildingStage = "waiting-map";
    const metadata = fetch("/api/city/47190").then(async (r) => {
      if (!r.ok) throw Error("\uC758\uBBF8\uAD6C\uC5ED \uC5F0\uACB0\uC744 \uD655\uC778\uD558\uC138\uC694.");
      return r.json();
    });
    const initialView = seed ? { center: seed.center, bounds: seed.bounds, bearing: 0, lastEngine: "maplibre" } : void 0;
    const [sdk, city] = await Promise.all([Promise.race([initializeSdk(initialView, false), timeout]), metadata]);
    bridge = sdk;
    document.body.dataset.sdkReadyMs = performance.now().toFixed(1);
    bridge.viewer.targetFrameRate = TARGET_FRAME_RATE;
    updateMapResolution(bridge.viewer);
    bridge.scene.globe.tileCacheSize = Math.max(bridge.scene.globe.tileCacheSize || 100, window.matchMedia("(max-width:767px)").matches ? 128 : 256);
    document.body.dataset.terrainTileCache = String(bridge.scene.globe.tileCacheSize);
    document.body.dataset.targetFrameRate = String(TARGET_FRAME_RATE);
    bridge.scene.renderError?.addEventListener(() => {
      if (!disposed) send("real-3d-error", { message: "3D \uB80C\uB354\uB9C1 \uC624\uB958" });
    });
    bridge.scene.canvas.addEventListener("webglcontextlost", () => {
      if (!disposed) send("real-3d-error", { message: "3D \uADF8\uB798\uD53D \uC5F0\uACB0 \uC911\uB2E8" });
    }, { once: true });
    buildingRenderer = new SceneRenderer(bridge, () => buildingStatus(), () => {
    }, { maxSliceMs: 4, maxSteps: 256, fastYield: true, progressiveTerrain: true, retainLoadedBuildings: true, viewBounds: () => lastView?.bounds, reveal: { maxPerFrame: 32, durationMs: 170, center: () => lastView?.center }, precomputed: (feature, part) => precomputedBuildingGround(feature, part, buildingManifest), placements: { get: (key) => placements?.get(key), set: (key, p) => placements?.set(key, p) } });
    const C = bridge.C;
    imagery = bridge.viewer.imageryLayers.addImageryProvider(new C.UrlTemplateImageryProvider({ url: `/api/city/47190/${city.version}/tiles/{z}/{x}/{y}.png?style=contrast-v1`, tileWidth: 512, tileHeight: 512, rectangle: C.Rectangle.fromDegrees(...city.bounds), minimumLevel: 8, maximumLevel: 15, credit: "\uAD6C\uBBF8\uC2DC \uC758\uBBF8\uAD6C\uC5ED" }));
    document.body.dataset.semanticMaxLevel = "15";
    document.body.dataset.semanticStyle = "contrast-v1";
    ready = true;
    status.hidden = true;
    document.body.dataset.engine = "VWORLD_WEBGL_3";
    document.body.dataset.terrain = "configured";
    apply();
    send("real-3d-ready");
    const cameraPose = () => {
      const p = bridge.camera.positionCartographic;
      return [p.longitude, p.latitude, p.height, bridge.camera.heading, bridge.camera.pitch].map((v) => v.toFixed(7)).join(",");
    };
    let pose = "", terrainPending = false, poseChangedAt = 0, lastFrame = 0, paintFrames = 0, paintRevision = -1, completeFrames = 0;
    let frameGaps = [];
    const started = () => {
      if (moving) return;
      moving = true;
      lastFrame = 0;
      frameGaps = [];
      completeFrames = 0;
      document.body.dataset.cameraMoving = "true";
      document.body.dataset.cameraMoveStartedMs = performance.now().toFixed(1);
      delete document.body.dataset.buildingViewportDisplayedMs;
      delete document.body.dataset.viewportTerrainReadyMs;
      buildingRenderer.cameraStarted();
    };
    const settled = () => {
      if (!active || !sceneAvailable()) return;
      const nextPose = cameraPose(), nextView = captureBuildingView();
      if (!moving && lastView && pose === nextPose && JSON.stringify(lastView.bounds) === JSON.stringify(nextView?.bounds)) return;
      moving = false;
      completeFrames = 0;
      delete document.body.dataset.buildingViewportDisplayedMs;
      document.body.dataset.cameraMoving = "false";
      if (frameGaps.length >= 4) {
        const sorted = [...frameGaps].sort((a, b) => a - b);
        document.body.dataset.motionFrameP95Ms = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))].toFixed(1);
        document.body.dataset.motionFrameSamples = String(frameGaps.length);
      }
      pose = nextPose;
      document.body.dataset.cameraSettledMs = performance.now().toFixed(1);
      lastView = nextView;
      if (lastView) send("real-3d-view", { view: lastView });
      buildingRenderer.cameraStopped();
      nativeBuildings();
      scheduleBuildings();
    };
    bridge.camera.moveStart.addEventListener(started);
    bridge.camera.moveEnd.addEventListener(settled);
    bridge.scene.globe.tileLoadProgressEvent.addEventListener((n) => {
      document.body.dataset.terrainPending = String(n);
      if (n > 0) terrainPending = true;
      else if (terrainPending) {
        terrainPending = false;
        if (!moving) {
          lastView = captureBuildingView();
          nativeBuildings();
          scheduleBuildings();
        }
      }
    });
    const idle = setInterval(() => {
      if (!active || !sceneAvailable()) return;
      const sig = cameraPose(), now = performance.now();
      if (sig !== pose) {
        pose = sig;
        poseChangedAt = now;
        started();
        if (now - lastCoverageCapture >= 180) {
          lastCoverageCapture = now;
          lastView = captureBuildingView();
          nativeBuildings();
          scheduleBuildings();
        }
      } else if ((moving || !lastView) && now - poseChangedAt >= 240) settled();
    }, 120);
    let loadFrameAt = 0, loadFrameRequest = "";
    const rendered = () => {
      if (bridge.viewer.targetFrameRate !== TARGET_FRAME_RATE) bridge.viewer.targetFrameRate = TARGET_FRAME_RATE;
      const now = performance.now();
      if (moving) {
        if (lastFrame && frameGaps.length < 180) frameGaps.push(now - lastFrame);
        lastFrame = now;
      }
      const loadMetrics = document.body.dataset;
      if (loadMetrics.buildingViewportRequestedMs && !loadMetrics.buildingDataDisplayedMs) {
        if (loadFrameRequest !== loadMetrics.buildingViewportRequestedMs) {
          loadFrameRequest = loadMetrics.buildingViewportRequestedMs;
          loadFrameAt = 0;
          completeFrames = 0;
        }
        if (loadFrameAt) {
          loadMetrics.buildingLoadFrameMaxMs = Math.max(Number(loadMetrics.buildingLoadFrameMaxMs) || 0, now - loadFrameAt).toFixed(1);
          loadMetrics.buildingLoadFrameCount = String((Number(loadMetrics.buildingLoadFrameCount) || 0) + 1);
        }
        loadFrameAt = now;
      } else loadFrameAt = 0;
      if (!active || moving || !config || !lastView) return;
      const metrics = document.body.dataset;
      const visualizersReady = bridge.viewer.dataSourceDisplay?.ready === true;
      metrics.buildingVisualizersReady = String(visualizersReady);
      if (bridge.scene.globe.tilesLoaded === true) metrics.viewportTerrainReadyMs ||= now.toFixed(1);
      if (!metrics.buildingViewportDisplayedMs && visualizersReady && !Number(metrics.buildingRevealPending) && !buildingTimer && buildingKey === wantedBuildingKey && metrics.buildingStage === "ready" && metrics.buildingCellsPending === "0" && metrics.buildingDisplayMissing === "0" && Number(metrics.buildingCoverageCompleteMs) >= Number(metrics.cameraSettledMs)) {
        if (++completeFrames >= 2) {
          metrics.buildingViewportDisplayedMs = now.toFixed(1);
          metrics.buildingViewportDisplayMs = (now - Number(metrics.cameraSettledMs)).toFixed(1);
          if (!metrics.buildingDataDisplayedMs) {
            metrics.buildingDataDisplayedMs = now.toFixed(1);
            metrics.buildingDataDisplayLatencyMs = (now - Number(metrics.buildingViewportRequestedMs)).toFixed(1);
          }
        } else bridge.scene.requestRender?.();
      } else if (!metrics.buildingViewportDisplayedMs) completeFrames = 0;
      const revision = config.viewRevision ?? 0;
      if (revision === presentedRevision) return;
      if (revision !== paintRevision) {
        paintRevision = revision;
        paintFrames = 0;
      }
      const d = document.body.dataset;
      const hasDisplay = bridge.scene.globe.tilesLoaded === true && visualizersReady;
      d.mapPresentation = hasDisplay ? "ready" : "waiting";
      if (!hasDisplay) {
        paintFrames = 0;
        return;
      }
      if (++paintFrames < 2) {
        bridge.scene.requestRender?.();
        return;
      }
      presentedRevision = revision;
      d.mapFirstPaintedMs ||= now.toFixed(1);
      d.mapPaintedMs = now.toFixed(1);
      send("real-3d-painted", { viewRevision: revision });
    };
    bridge.scene.postRender.addEventListener(rendered);
    let resizeTimer;
    const viewportResize = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
      if (resizeTimer) return;
      resizeTimer = setTimeout(() => {
        resizeTimer = void 0;
        if (sceneAvailable()) updateMapResolution(bridge.viewer);
        if (active && sceneAvailable()) {
          if (!moving) {
            completeFrames = 0;
            document.body.dataset.cameraSettledMs = performance.now().toFixed(1);
            delete document.body.dataset.buildingViewportDisplayedMs;
          }
          lastView = captureBuildingView();
          scheduleBuildings();
        }
      }, 100);
    }) : null;
    viewportResize?.observe(bridge.scene.canvas);
    const visibility = () => {
      apply();
      if (active) settled();
    };
    document.addEventListener("visibilitychange", visibility);
    let beats = 0, maxLongTask = 0, longTasks = 0;
    const observer = typeof PerformanceObserver === "function" ? new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTasks++;
        maxLongTask = Math.max(maxLongTask, entry.duration);
        const d = document.body.dataset;
        if (entry.startTime >= Number(d.buildingViewportRequestedMs) && (!d.buildingDataDisplayedMs || entry.startTime < Number(d.buildingDataDisplayedMs))) {
          d.buildingLoadLongTasks = String((Number(d.buildingLoadLongTasks) || 0) + 1);
          d.buildingLoadLongTaskMaxMs = Math.max(Number(d.buildingLoadLongTaskMaxMs) || 0, entry.duration).toFixed(1);
        }
      }
      document.body.dataset.longTasks = String(longTasks);
      document.body.dataset.longTaskMaxMs = maxLongTask.toFixed(1);
    }) : null;
    try {
      observer?.observe({ type: "longtask", buffered: true });
    } catch {
    }
    const heartbeat = setInterval(() => {
      document.body.dataset.heartbeat = String(++beats);
      if (config) send("real-3d-heartbeat");
    }, 1e3);
    window.addEventListener("pagehide", () => {
      disposed = true;
      clearInterval(idle);
      clearInterval(heartbeat);
      clearTimeout(buildingTimer);
      clearTimeout(resizeTimer);
      viewportResize?.disconnect();
      buildingPrefetch?.close();
      buildingAbort.abort();
      placements?.close();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      bridge.scene.postRender.removeEventListener(rendered);
      buildingRenderer.destroy();
      bridge.viewer.useDefaultRenderLoop = false;
    }, { once: true });
    let down = null;
    bridge.scene.canvas.addEventListener("pointerdown", (e) => {
      if (e.button === 0) down = [e.clientX, e.clientY];
    });
    bridge.scene.canvas.addEventListener("pointerup", async (e) => {
      const start = down;
      down = null;
      if (!start || Math.hypot(start[0] - e.clientX, start[1] - e.clientY) > 6 || !config) return;
      const began = performance.now(), rect = bridge.scene.canvas.getBoundingClientRect(), point = pickGround(bridge, e.clientX - rect.left, e.clientY - rect.top, !!config.pickLaunch);
      if (!point) {
        document.body.dataset.regionPickState = "terrain-unavailable";
        return;
      }
      if (config.pickLaunch) {
        send("real-3d-launch", { point });
        return;
      }
      if (!config.editing) return;
      document.body.dataset.regionPickState = "loading";
      const snapshot = nonce, release = config.release;
      try {
        const r = await fetch(`/api/v1/spatial-releases/${encodeURIComponent(release)}/point?longitude=${point[0]}&latitude=${point[1]}`);
        if (!r.ok) throw Error("\uAD6C\uC5ED \uC870\uD68C \uC5F0\uACB0\uC744 \uD655\uC778\uD558\uC138\uC694.");
        const hit = await r.json();
        if (snapshot !== nonce || release !== config.release || !config.editing) return;
        document.body.dataset.regionPickMs = (performance.now() - began).toFixed(1);
        document.body.dataset.regionPickState = hit.region ? "ready" : "empty";
        if (hit.region) send("real-3d-region", { region: { id: hit.zone_id, name: hit.region.name || "\uC218\uC0C9 \uAD6C\uC5ED", point: hit.region.representativePoint || point, area_m2: hit.region.areaM2 || 0 } });
      } catch {
        if (snapshot === nonce && release === config.release) {
          document.body.dataset.regionPickState = "error";
          send("real-3d-notice", { message: "\uAD6C\uC5ED \uC870\uD68C \uC5F0\uACB0 \uC9C0\uC5F0 \xB7 \uB2E4\uC2DC \uC120\uD0DD\uD574 \uC8FC\uC138\uC694" });
        }
      }
    });
    for (const [id, action] of [["plus", "zoom-in"], ["minus", "zoom-out"], ["north", "north"]]) document.getElementById("camera-" + id).onclick = () => adjustCamera(bridge, action, !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (e) {
    status.textContent = e instanceof Error ? e.message : "VWorld 3D \uC5F0\uACB0 \uC2E4\uD328";
    status.dataset.error = "true";
    send("real-3d-error", { message: status.textContent });
  }
}
void boot();
