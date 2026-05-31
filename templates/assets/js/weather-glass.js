import { initWeatherGlassClouds } from "./weather-glass-clouds.js";

(function () {
  const ROOT_SELECTOR = ".weather-glass-root";

  function readConfig() {
    const config = window.SkyWeatherGlassConfig || {};
    return {
      enabled: config.enabled === true || config.enabled === "true",
      mode: config.mode || "auto",
      cloudSpeed: Number(config.cloudSpeed ?? 42),
      cloudCount: Number(config.cloudCount ?? 18),
      rainDensity: Number(config.rainDensity ?? 52),
      rainSpeed: Number(config.rainSpeed ?? 55),
      rainWind: Number(config.rainWind ?? 0),
      nightMedia: String(config.nightMedia || "").trim(),
      nightMediaPlaylist: String(config.nightMediaPlaylist || "").trim(),
      nightMediaOrder: config.nightMediaOrder || "sequence",
      nightMediaOpacity: Number(config.nightMediaOpacity ?? 34),
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function readNumber(root, name, fallback) {
    const raw = Number(root.dataset[name]);
    return Number.isFinite(raw) ? raw : fallback;
  }

  function isVideoMedia(src) {
    return /\.(mp4|webm|ogg)(?:[?#].*)?$/i.test(src);
  }

  function parseNightMediaList(settings) {
    const raw = settings.nightMediaPlaylist || settings.nightMedia || "";
    const list = raw
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!list.length && settings.nightMedia) list.push(settings.nightMedia);
    return Array.from(new Set(list));
  }

  function pickNextIndex(current, total, order) {
    if (total <= 1) return 0;
    if (order === "random") {
      let next = current;
      while (next === current) next = Math.floor(Math.random() * total);
      return next;
    }
    return (current + 1) % total;
  }

  function resolveMode(configMode) {
    if (configMode && configMode !== "auto") return configMode;
    return document.documentElement.dataset.colorScheme === "dark" ? "night" : "day";
  }

  function createCloudElement() {
    const cloud = document.createElement("div");
    cloud.className = "weather-glass-cloud";
    cloud.innerHTML = [
      '<span class="cloud-lobe lobe-1"></span>',
      '<span class="cloud-lobe lobe-2"></span>',
      '<span class="cloud-lobe lobe-3"></span>',
      '<span class="cloud-lobe lobe-4"></span>',
      '<span class="cloud-base"></span>',
    ].join("");
    return cloud;
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function initClouds(root, mode, settings) {
    const layer = root.querySelector(".weather-glass-clouds");
    if (!layer || mode === "night") return () => {};

    const count = clamp(Math.round(settings.cloudCount), 8, 32);
    const speedFactor = clamp(settings.cloudSpeed / 42, 0.25, 2.4);
    const clouds = [];
    let frame = 0;
    let last = performance.now();
    let raf = 0;

    function resetCloud(item, initial) {
      const width = random(210, 430) * (window.innerWidth < 720 ? 0.72 : 1);
      const height = width * random(0.34, 0.5);
      const scale = random(0.86, 1.2);
      item.width = width;
      item.height = height;
      item.x = initial ? random(-width, window.innerWidth + width) : -width - random(80, 420);
      item.y = random(window.innerHeight * 0.04, window.innerHeight * 0.52);
      item.speed = random(7, 18) * speedFactor * (window.innerWidth < 720 ? 0.78 : 1);
      item.opacity = mode === "dusk" ? random(0.62, 0.9) : random(0.68, 0.95);
      item.drift = random(0.05, 0.18);
      item.phase = random(0, Math.PI * 2);
      item.el.style.setProperty("--cloud-width", `${width}px`);
      item.el.style.setProperty("--cloud-height", `${height}px`);
      item.el.style.zIndex = String(Math.round(scale * 10));
      item.el.classList.toggle("is-dusk", mode === "dusk");
    }

    for (let i = 0; i < count; i += 1) {
      const el = createCloudElement();
      layer.appendChild(el);
      const item = { el };
      resetCloud(item, true);
      clouds.push(item);
    }

    function tick(now) {
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      frame += delta;
      for (const item of clouds) {
        item.x += item.speed * delta;
        item.y += Math.sin(frame * item.drift + item.phase) * 0.012;
        if (item.x > window.innerWidth + item.width + 80) resetCloud(item, false);
        const edge = Math.min(
          (item.x + item.width) / item.width,
          (window.innerWidth + item.width - item.x) / item.width,
          1,
        );
        const opacity = clamp(edge, 0, 1) * item.opacity;
        item.el.style.opacity = opacity.toFixed(3);
        item.el.style.transform = `translate3d(${item.x}px, ${item.y}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      layer.textContent = "";
    };
  }

  function initAtmosphere(root, mode) {
    const canvas = root.querySelector(".weather-glass-atmosphere");
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return () => {};

    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    const particles = Array.from({ length: 34 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: random(0.8, 2.6),
      phase: random(0, Math.PI * 2),
      speed: random(0.2, 0.65),
    }));

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = root.clientWidth || window.innerWidth;
      height = root.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(now) {
      ctx.clearRect(0, 0, width, height);
      if (mode === "night") {
        const moon = ctx.createRadialGradient(width * 0.18, height * 0.12, 0, width * 0.18, height * 0.12, 260);
        moon.addColorStop(0, "rgba(200, 214, 255, 0.13)");
        moon.addColorStop(1, "rgba(200, 214, 255, 0)");
        ctx.fillStyle = moon;
        ctx.fillRect(0, 0, width, height);
      } else {
        const sunX = mode === "dusk" ? width * 0.28 : width * 0.76;
        const sunY = mode === "dusk" ? height * 0.22 : height * 0.14;
        const scatter = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, Math.max(width, height) * 0.9);
        scatter.addColorStop(0, mode === "dusk" ? "rgba(255, 202, 145, 0.38)" : "rgba(255, 248, 218, 0.46)");
        scatter.addColorStop(0.2, mode === "dusk" ? "rgba(255, 150, 104, 0.16)" : "rgba(255, 236, 184, 0.16)");
        scatter.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = scatter;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.globalAlpha = mode === "dusk" ? 0.035 : 0.055;
        ctx.translate(sunX, sunY);
        for (let i = 0; i < 14; i += 1) {
          const angle = (i / 14) * Math.PI * 2 + Math.sin(now * 0.00008) * 0.08;
          ctx.save();
          ctx.rotate(angle);
          const ray = ctx.createLinearGradient(0, 0, width, 0);
          ray.addColorStop(0, "rgba(255, 255, 240, 0.86)");
          ray.addColorStop(0.32, "rgba(255, 242, 204, 0.2)");
          ray.addColorStop(1, "rgba(255, 245, 200, 0)");
          ctx.fillStyle = ray;
          ctx.fillRect(0, -2, width * 0.82, 4);
          ctx.restore();
        }
        ctx.restore();

        ctx.save();
        for (const particle of particles) {
          const x = particle.x * width;
          const y =
            ((((particle.y * height - now * 0.006 * particle.speed) % (height + 20)) + height + 20) % (height + 20)) -
            10;
          const alpha = (mode === "dusk" ? 0.08 : 0.14) * (0.65 + Math.sin(now * 0.001 + particle.phase) * 0.35);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "rgba(255, 252, 240, 1)";
          ctx.beginPath();
          ctx.arc(x, y, particle.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }

  function initRain(root, mode, settings) {
    const canvas = root.querySelector(".weather-glass-rain");
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || mode !== "night") return () => {};

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let drops = [];
    const density = clamp(settings.rainDensity, 0, 100);
    const speedFactor = clamp(settings.rainSpeed, 20, 120) / 55;
    const wind = clamp(settings.rainWind, -40, 40) * 0.08;

    function makeDrop(initial) {
      const z = random(0.45, 1);
      return {
        x: random(-180, width + 180),
        y: initial ? random(-80, height) : random(-140, -20),
        z,
        len: random(22, 48) * z,
        speed: random(620, 880) * speedFactor * z,
        alpha: random(0.16, 0.38) * z,
      };
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = root.clientWidth || window.innerWidth;
      height = root.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((width / 14) * (density / 55));
      drops = Array.from({ length: clamp(count, 0, 220) }, () => makeDrop(true));
    }

    let last = performance.now();
    function tick(now) {
      const delta = Math.min((now - last) / 1000, 0.04);
      last = now;
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      for (const drop of drops) {
        drop.x += wind * 100 * drop.z * delta;
        drop.y += drop.speed * delta;
        if (drop.y > height + 70 || drop.x > width + 220 || drop.x < -220) Object.assign(drop, makeDrop(false));
        ctx.globalAlpha = drop.alpha;
        ctx.strokeStyle = "rgba(204, 220, 248, 1)";
        ctx.lineWidth = Math.max(0.8, drop.z * 2.1);
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + wind * drop.z * 18, drop.y + drop.len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }

  function ensureGlobalRoot() {
    const config = readConfig();
    let root = document.querySelector('[data-weather-glass-global="true"]');
    if (!config.enabled) {
      root?.__weatherGlassCleanup?.();
      root?.remove();
      return null;
    }

    if (!root) {
      root = document.createElement("div");
      root.className = "weather-glass-root weather-glass-global";
      root.dataset.weatherGlassGlobal = "true";
      root.setAttribute("aria-hidden", "true");
      root.innerHTML = [
        '<canvas class="weather-glass-atmosphere"></canvas>',
        '<div class="weather-glass-night-media"></div>',
        '<canvas class="weather-glass-cloud-canvas"></canvas>',
        '<div class="weather-glass-clouds"></div>',
        '<canvas class="weather-glass-rain"></canvas>',
        '<div class="weather-glass-vignette"></div>',
        '<div class="scroll-mask"></div>',
      ].join("");
      document.body.prepend(root);
    }

    root.dataset.mode = config.mode;
    root.dataset.cloudSpeed = String(config.cloudSpeed);
    root.dataset.cloudCount = String(config.cloudCount);
    root.dataset.rainDensity = String(config.rainDensity);
    root.dataset.rainSpeed = String(config.rainSpeed);
    root.dataset.rainWind = String(config.rainWind);
    root.dataset.nightMedia = config.nightMedia;
    root.dataset.nightMediaPlaylist = config.nightMediaPlaylist;
    root.dataset.nightMediaOrder = config.nightMediaOrder;
    root.dataset.nightMediaOpacity = String(config.nightMediaOpacity);
    return root;
  }

  function setupNightMedia(root, mode, settings) {
    const layer = root.querySelector(".weather-glass-night-media");
    if (!layer) return () => {};
    layer.replaceChildren();
    layer.style.opacity = "0";
    const playlist = parseNightMediaList(settings);
    if (mode !== "night" || !playlist.length) return () => {};

    const opacity = clamp(settings.nightMediaOpacity, 0, 70) / 100;
    let currentIndex = 0;
    let current = null;
    let next = null;
    let preloadTimer = 0;
    let switchTimer = 0;
    let stopped = false;

    function createAsset(src, isActive) {
      const media = isVideoMedia(src) ? document.createElement("video") : document.createElement("img");
      media.className = `weather-glass-night-media__asset${isActive ? " is-active" : ""}`;
      media.dataset.src = src;
      media.setAttribute("aria-hidden", "true");

      if (media instanceof HTMLVideoElement) {
        media.src = src;
        media.autoplay = isActive;
        media.loop = playlist.length <= 1;
        media.muted = true;
        media.playsInline = true;
        media.preload = isActive ? "auto" : "metadata";
      } else {
        media.src = src;
        media.alt = "";
        media.decoding = "async";
        media.loading = "eager";
      }

      return media;
    }

    function fadeInLayer() {
      layer.style.opacity = String(opacity);
    }

    function armPreload() {
      if (stopped || playlist.length <= 1 || !(current instanceof HTMLVideoElement)) return;
      clearInterval(preloadTimer);
      preloadTimer = window.setInterval(() => {
        if (!current || stopped) return;
        const duration = Number.isFinite(current.duration) ? current.duration : 0;
        if (duration && duration - current.currentTime <= 4) {
          if (next instanceof HTMLVideoElement && next.preload !== "auto") {
            next.preload = "auto";
            next.load?.();
          } else {
            prepareNext("auto");
          }
        }
      }, 700);
    }

    function prepareNext(preload = "metadata") {
      if (stopped || playlist.length <= 1 || next) return;
      const index = pickNextIndex(currentIndex, playlist.length, settings.nightMediaOrder);
      next = createAsset(playlist[index], false);
      next.dataset.index = String(index);
      if (next instanceof HTMLVideoElement) next.preload = preload;
      layer.appendChild(next);
      next.load?.();
    }

    function activateNext() {
      if (stopped || playlist.length <= 1) return;
      if (!next) prepareNext("auto");
      if (!next) return;

      const previous = current;
      current = next;
      currentIndex = Number(current.dataset.index || 0);
      next = null;
      current.classList.add("is-active");
      if (current instanceof HTMLVideoElement) {
        current.currentTime = 0;
        current.addEventListener("ended", activateNext);
        current.play?.().catch(() => {});
      }

      window.setTimeout(() => {
        previous?.pause?.();
        previous?.remove();
        prepareNext("metadata");
        armPreload();
      }, 1200);
    }

    function bindVideo(video) {
      video.addEventListener("canplay", fadeInLayer, { once: true });
      video.addEventListener("loadedmetadata", () => prepareNext("metadata"), { once: true });
      video.addEventListener("ended", activateNext);
      video.play?.().catch(() => {
        layer.style.opacity = "0";
      });
      armPreload();
    }

    current = createAsset(playlist[currentIndex], true);
    current.dataset.index = String(currentIndex);

    if (current instanceof HTMLVideoElement) {
      bindVideo(current);
    } else {
      current.addEventListener("load", fadeInLayer, { once: true });
    }

    layer.appendChild(current);
    if (playlist.length > 1 && !(current instanceof HTMLVideoElement)) {
      switchTimer = window.setInterval(activateNext, 18000);
    }
    return () => {
      stopped = true;
      clearInterval(preloadTimer);
      clearInterval(switchTimer);
      layer.querySelectorAll("video").forEach((video) => video.pause());
      layer.replaceChildren();
      layer.style.opacity = "0";
    };
  }

  function setupScrollMask(root) {
    const mask = root.querySelector(".scroll-mask");
    if (!mask) return () => {};
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        mask.style.opacity = window.scrollY > 50 ? "0.24" : "0";
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }

  function initRoot(root) {
    const mode = resolveMode(root.dataset.mode || "auto");
    const settings = {
      cloudSpeed: readNumber(root, "cloudSpeed", 42),
      cloudCount: readNumber(root, "cloudCount", 18),
      rainDensity: readNumber(root, "rainDensity", 52),
      rainSpeed: readNumber(root, "rainSpeed", 55),
      rainWind: readNumber(root, "rainWind", 0),
      nightMedia: root.dataset.nightMedia || "",
      nightMediaPlaylist: root.dataset.nightMediaPlaylist || "",
      nightMediaOrder: root.dataset.nightMediaOrder || "sequence",
      nightMediaOpacity: readNumber(root, "nightMediaOpacity", 34),
    };
    const signature = JSON.stringify({ mode, ...settings });
    root.dataset.weatherMode = mode;
    root.dataset.weatherGlassSignature = signature;
    document.documentElement.classList.add("weather-glass-active");
    document.documentElement.dataset.weatherGlassMode = mode;

    const cleanups = [
      initAtmosphere(root, mode),
      setupNightMedia(root, mode, settings),
      initWeatherGlassClouds(root, mode, settings) || initClouds(root, mode, settings),
      initRain(root, mode, settings),
      setupScrollMask(root),
    ];
    root.__weatherGlassCleanup = () => {
      cleanups.forEach((fn) => fn && fn());
      document.documentElement.classList.remove("weather-glass-active");
      delete document.documentElement.dataset.weatherGlassMode;
    };
  }

  function init() {
    const globalRoot = ensureGlobalRoot();
    document.querySelectorAll(ROOT_SELECTOR).forEach((root) => {
      if (globalRoot && root !== globalRoot && root.closest("body")) {
        root.__weatherGlassCleanup?.();
        root.remove();
        return;
      }
      const mode = resolveMode(root.dataset.mode || "auto");
      const signature = JSON.stringify({
        mode,
        cloudSpeed: readNumber(root, "cloudSpeed", 42),
        cloudCount: readNumber(root, "cloudCount", 18),
        rainDensity: readNumber(root, "rainDensity", 52),
        rainSpeed: readNumber(root, "rainSpeed", 55),
        rainWind: readNumber(root, "rainWind", 0),
        nightMedia: root.dataset.nightMedia || "",
        nightMediaPlaylist: root.dataset.nightMediaPlaylist || "",
        nightMediaOrder: root.dataset.nightMediaOrder || "sequence",
        nightMediaOpacity: readNumber(root, "nightMediaOpacity", 34),
      });
      if (root.__weatherGlassCleanup && root.dataset.weatherGlassSignature === signature) return;
      if (root.__weatherGlassCleanup) root.__weatherGlassCleanup();
      initRoot(root);
    });
  }

  window.SkyWeatherGlass = { init };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
  document.addEventListener("sky:page-cleanup", () => {
    document.querySelectorAll(ROOT_SELECTOR).forEach((root) => {
      if (root.dataset.weatherGlassGlobal === "true") return;
      root.__weatherGlassCleanup?.();
    });
  });
  document.addEventListener("sky:page-load", init);

  const themeObserver = new MutationObserver((mutations) => {
    if (!mutations.some((mutation) => mutation.attributeName === "data-color-scheme")) return;
    const root = document.querySelector('[data-weather-glass-global="true"]');
    if (!root || root.dataset.mode !== "auto") return;
    init();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-color-scheme"],
  });
})();

export { initWeatherGlassClouds };
export function init() {
  window.SkyWeatherGlass?.init?.();
}
