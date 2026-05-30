import * as THREE from "three";
import { Cloud, Clouds } from "@pmndrs/vanilla/core/Cloud.js";

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function easeInOut(value) {
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

export function initWeatherGlassClouds(root, mode, settings) {
  const canvas = root.querySelector(".weather-glass-cloud-canvas");
  if (!canvas || mode === "night") return null;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  const gl = renderer.getContext();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  camera.position.set(0, 0.7, 14);
  camera.lookAt(0, 0.45, 0);

  const texture = new THREE.TextureLoader().load("/themes/theme-sky-weather/assets/images/cloud-sprite.png");
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.premultiplyAlpha = false;

  const cloudSystem = new Clouds({
    texture,
    limit: Math.max(360, settings.cloudCount * 32),
    frustumCulled: false,
  });
  scene.add(cloudSystem);
  scene.add(new THREE.AmbientLight(0xffffff, 1.8));

  const sun = new THREE.DirectionalLight(0xfff1cf, 2.4);
  sun.position.set(4.5, 3.8, 8);
  scene.add(sun);

  const dayPalette = [new THREE.Color("#ffffff"), new THREE.Color("#f4fbff"), new THREE.Color("#eef7ff")];
  const duskPalette = [
    new THREE.Color("#ffb06b"),
    new THREE.Color("#ff7f66"),
    new THREE.Color("#d95a73"),
    new THREE.Color("#f5a15a"),
  ];
  const count = THREE.MathUtils.clamp(Math.round(settings.cloudCount), 8, 32);
  const groups = Array.from({ length: count }, (_, index) => ({
    delay: index * randomBetween(2.6, 5.4),
    seed: 2.1 + index * 7.35,
    segments: 22 + (index % 4) * 5,
  })).map((config) => {
    const cloud = new Cloud({
      seed: config.seed,
      segments: config.segments,
      bounds: new THREE.Vector3(3.2, 0.46, 0.72),
      volume: 2.9,
      smallestVolume: 0.1,
      opacity: 0,
      speed: 0.08,
      growth: 1.2,
      fade: 38,
      color: new THREE.Color("#ffffff"),
      concentrate: "inside",
    });
    cloud.position.set(-12, 1.4, -3);
    cloudSystem.add(cloud);
    const item = { cloud, ...config };
    randomizeCloud(item, true);
    return item;
  });

  function randomizeCloud(item, initial = false) {
    const scale = randomBetween(0.72, 1.18);
    const width = randomBetween(2.7, 4.1) * scale;
    item.z = randomBetween(-7.5, -1.3);
    item.screenY = randomBetween(0.05, 0.56);
    item.scale = scale;
    item.duration = randomBetween(34, 58);
    item.pause = randomBetween(6, 18);
    item.cycle = item.duration + item.pause;
    item.elapsed = initial
      ? randomBetween(-item.pause * 0.35, item.duration * 0.92)
      : -randomBetween(0, item.pause);
    item.cloud.bounds.set(width, randomBetween(0.36, 0.56) * scale, randomBetween(0.55, 0.88) * scale);
    item.cloud.volume = randomBetween(3.7, 5.2) * scale;
    item.cloud.smallestVolume = randomBetween(0.14, 0.24);
    item.dayColor = dayPalette[Math.floor(Math.random() * dayPalette.length)].clone();
    item.duskColor = duskPalette[Math.floor(Math.random() * duskPalette.length)].clone();
    item.cloud.scale.setScalar(scale);
    item.cloud.updateCloud();
  }

  function getPassState(item) {
    const local = item.elapsed;
    if (local > item.cycle) {
      randomizeCloud(item);
      return { progress: 0, opacity: 0 };
    }
    if (local < 0 || local > item.duration) return { progress: 0, opacity: 0 };
    const progress = local / item.duration;
    const fadeIn = Math.min(progress / 0.16, 1);
    const fadeOut = Math.min((1 - progress) / 0.18, 1);
    return { progress, opacity: easeInOut(Math.min(fadeIn, fadeOut)) };
  }

  function getTravelLimit(item) {
    const distance = camera.position.z - item.cloud.position.z;
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;
    const halfWidth = halfHeight * camera.aspect;
    const cloudWidth = item.cloud.bounds.x * item.scale * 2.8;
    return halfWidth + cloudWidth + 1.8;
  }

  function getWorldYForScreenY(screenY, z) {
    const ndcY = 1 - screenY * 2;
    const point = new THREE.Vector3(0, ndcY, 0.5).unproject(camera);
    const direction = point.sub(camera.position).normalize();
    const distance = (z - camera.position.z) / direction.z;
    return camera.position.y + direction.y * distance;
  }

  function updateLighting() {
    if (mode === "dusk") {
      sun.color.set("#ff8b54");
      sun.intensity = 2.9;
      sun.position.set(-4.5, 2.5, 7);
      return;
    }
    sun.color.set("#fff1cf");
    sun.intensity = 2.4;
    sun.position.set(4.5, 3.8, 8);
  }

  function resize() {
    const width = root.clientWidth || window.innerWidth;
    const height = root.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  let frame = 0;
  let last = performance.now() / 1000;
  let elapsed = 0;
  function render() {
    const now = performance.now() / 1000;
    const delta = Math.min(now - last, 0.04);
    last = now;
    elapsed += delta;
    const speedMultiplier = THREE.MathUtils.clamp(0.25 + (settings.cloudSpeed || 42) / 55, 0.25, 2.05);
    updateLighting();

    for (const item of groups) {
      item.elapsed = (item.elapsed ?? -item.delay) + delta * speedMultiplier;
      const state = getPassState(item);
      const travelLimit = getTravelLimit(item);
      item.cloud.position.x = THREE.MathUtils.lerp(-travelLimit, travelLimit, state.progress);
      item.cloud.position.y = getWorldYForScreenY(item.screenY, item.z) + Math.sin(elapsed * 0.22 + item.seed) * 0.04;
      item.cloud.color.copy(mode === "dusk" ? item.duskColor : item.dayColor);
      item.cloud.opacity = state.opacity * (mode === "dusk" ? 1.18 : 1.08);
      item.cloud.updateCloud();
    }

    cloudSystem.update(camera, elapsed, delta);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  }

  resize();
  window.addEventListener("resize", resize);
  frame = requestAnimationFrame(render);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    groups.forEach((item) => item.cloud.removeFromParent());
    texture.dispose();
    renderer.dispose();
  };
}
