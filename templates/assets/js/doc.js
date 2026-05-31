import { r as onReady, t as completePageInit } from "./chunks/page-runtime-1.0.21.js";
import "./chunks/article-content-1.0.21.js";
import { i as scrollToHeading, n as buildTocTree, r as renderToc } from "./chunks/toc-utils-1.0.21.js";

let pageController = null;
let tocObserver = null;
let lazyObserver = null;
let revealDocSection = null;
let progressiveSections = [];
let revealedSectionCount = 0;
let observeDocHeading = null;

function signal() {
  return pageController?.signal;
}

function listen(target, event, handler, options = {}) {
  if (!target) return;
  const opts = { ...options };
  if (!Object.prototype.hasOwnProperty.call(opts, "signal") && signal()) {
    opts.signal = signal();
  }
  target.addEventListener(event, handler, opts);
}

function isDocPage() {
  return Boolean(
    document.querySelector(".doc-layout") &&
      document.getElementById("article-content") &&
      document.getElementById("toc-nav"),
  );
}

function cleanup() {
  tocObserver?.disconnect();
  tocObserver = null;
  lazyObserver?.disconnect();
  lazyObserver = null;
  revealDocSection = null;
  progressiveSections = [];
  revealedSectionCount = 0;
  observeDocHeading = null;
  pageController?.abort();
  pageController = null;
  document.body.style.overflow = "";
  window.openDocTocDrawer = undefined;
  window.closeDocTocDrawer = undefined;
  window.openDocSidebarDrawer = undefined;
  window.closeDocSidebarDrawer = undefined;
}

function setupMediaLoading(content) {
  content.querySelectorAll("img").forEach((img, index) => {
    if (!img.hasAttribute("loading") && index > 1) img.setAttribute("loading", "lazy");
    if (!img.hasAttribute("decoding")) img.setAttribute("decoding", "async");
    img.addEventListener("load", () => img.classList.add("loaded"), { once: true, signal: signal() });
  });

  content.querySelectorAll("iframe").forEach((iframe) => {
    if (!iframe.hasAttribute("loading")) iframe.setAttribute("loading", "lazy");
  });

  content.querySelectorAll("video").forEach((video, index) => {
    if (index > 0 && !video.hasAttribute("preload")) video.setAttribute("preload", "metadata");
  });
}

function setupProgressiveContent() {
  const content = document.getElementById("article-content");
  if (!content || content.dataset.progressiveReady === "true") return;
  content.dataset.progressiveReady = "true";
  setupMediaLoading(content);

  const children = Array.from(content.children);
  const shouldSlice = children.length >= 90 || content.textContent.length >= 32000;
  if (!shouldSlice) return;

  progressiveSections = [];
  let section = document.createElement("section");
  section.className = "doc-lazy-section";
  let weight = 0;

  children.forEach((child, index) => {
    const isHeading = /^H[1-3]$/.test(child.tagName);
    if (index > 0 && (isHeading || weight >= 12)) {
      progressiveSections.push(section);
      section = document.createElement("section");
      section.className = "doc-lazy-section";
      weight = 0;
    }
    weight += child.matches("pre, table, figure, iframe, video") ? 3 : 1;
    section.appendChild(child);
  });
  progressiveSections.push(section);

  revealedSectionCount = Math.min(4, progressiveSections.length);
  content.replaceChildren(...progressiveSections.slice(0, revealedSectionCount));

  if (progressiveSections.length <= revealedSectionCount) return;

  const loader = document.createElement("button");
  loader.type = "button";
  loader.className = "doc-lazy-loader";
  loader.textContent = "继续加载文档内容";
  content.appendChild(loader);

  const revealNext = (count = 2) => {
    const end = Math.min(revealedSectionCount + count, progressiveSections.length);
    let added = false;
    for (; revealedSectionCount < end; revealedSectionCount += 1) {
      const sectionEl = progressiveSections[revealedSectionCount];
      content.insertBefore(sectionEl, loader);
      sectionEl.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => observeDocHeading?.(heading));
      added = true;
    }
    if (revealedSectionCount >= progressiveSections.length) {
      lazyObserver?.disconnect();
      loader.remove();
    }
    if (added) {
      highlightNewCodeBlocks();
    }
  };

  revealDocSection = (target) => {
    const section = target?.closest?.(".doc-lazy-section");
    if (!section) return;
    const index = progressiveSections.indexOf(section);
    if (index < 0) return;
    while (revealedSectionCount <= index) revealNext(4);
  };

  lazyObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) revealNext();
    },
    { rootMargin: "900px 0px 900px 0px" },
  );
  lazyObserver.observe(loader);
  listen(loader, "click", () => revealNext(4));
}

function setupToc() {
  const toc = document.getElementById("toc-nav");
  const card = document.getElementById("toc-card");
  const content = document.getElementById("article-content");
  if (!toc || !content) return;

  const headings = progressiveSections.length
    ? progressiveSections.flatMap((section) => Array.from(section.querySelectorAll("h1, h2, h3, h4, h5, h6")))
    : Array.from(content.querySelectorAll("h1, h2, h3, h4, h5, h6"));
  if (!headings.length) {
    if (card) card.style.display = "none";
    return;
  }

  const levels = headings.map((heading) => Number(heading.tagName[1]));
  const minLevel = Math.min(...levels);
  const visibleHeadings = headings.filter((heading) => Number(heading.tagName[1]) <= minLevel + 2);
  if (!visibleHeadings.length) {
    if (card) card.style.display = "none";
    return;
  }

  const tree = buildTocTree(visibleHeadings, minLevel);
  const rendered = renderToc(tree, {
    onClick: (heading) => {
      revealDocSection?.(heading);
      scrollToHeading(heading, 80);
    },
  });
  toc.innerHTML = "";
  toc.appendChild(rendered);

  const links = toc.querySelectorAll(".toc-link");
  let activeLink = null;

  function keepLinkVisible(link) {
    const container = toc.closest(".toc-container");
    if (!container) return;
    const linkRect = link.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (linkRect.top < containerRect.top || linkRect.bottom > containerRect.bottom) {
      link.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  tocObserver?.disconnect();
  tocObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const link = toc.querySelector(`.toc-link[data-heading-id="${entry.target.id}"]`);
        if (!link || link === activeLink) return;
        links.forEach((item) => item.classList.remove("active"));
        link.classList.add("active");
        activeLink = link;
        keepLinkVisible(link);
      });
    },
    { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
  );
  observeDocHeading = (heading) => {
    if (heading.isConnected) tocObserver.observe(heading);
  };
  visibleHeadings.forEach((heading) => observeDocHeading(heading));
}

function setupVersionDropdowns() {
  listen(
    document,
    "click",
    (event) => {
      document.querySelectorAll(".doc-version-dropdown.show").forEach((dropdown) => {
        if (!dropdown.closest(".doc-version-selector")?.contains(event.target)) {
          dropdown.classList.remove("show");
        }
      });
    },
    { passive: true },
  );
}

function setupStickyBounds() {
  const sidebar = document.querySelector(".doc-sidebar");
  const footer = document.querySelector("footer");
  const layout = document.querySelector(".doc-layout");
  if (!footer || !sidebar) return;

  const navHeight = Number.parseInt(getComputedStyle(layout).getPropertyValue("--doc-nav-height"), 10) || 64;
  const top = navHeight + 16;

  function update() {
    const footerRect = footer.getBoundingClientRect();
    const desiredTop = footerRect.top - 16 - sidebar.offsetHeight;
    sidebar.style.top = desiredTop < top ? `${desiredTop}px` : `${top}px`;
  }

  let ticking = false;
  listen(
    window,
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    },
    { passive: true },
  );
  listen(window, "resize", update);
  update();
}

function wireDrawerToc(container) {
  const findHeading = (id) => {
    const connected = document.getElementById(id);
    if (connected) return connected;
    for (const section of progressiveSections) {
      const target = Array.from(section.querySelectorAll("[id]")).find((element) => element.id === id);
      if (target) return target;
    }
    return null;
  };

  container.querySelectorAll(".toc-link").forEach((link) => {
    listen(link, "click", (event) => {
      event.preventDefault();
      const id = link.getAttribute("data-heading-id") || link.getAttribute("href")?.slice(1);
      const target = id ? findHeading(id) : null;
      if (!target) return;
      window.closeDocTocDrawer?.();
      revealDocSection?.(target);
      setTimeout(() => scrollToHeading(target, 80), 100);
    });
  });
}

function setupDrawers() {
  const tocOverlay = document.getElementById("doc-toc-overlay");
  const tocDrawer = document.getElementById("doc-toc-drawer");
  const tocDrawerNav = document.getElementById("doc-toc-drawer-nav");

  if (tocOverlay && tocDrawer) {
    window.openDocTocDrawer = () => {
      tocOverlay.classList.add("open");
      tocDrawer.classList.add("open");
      document.body.style.overflow = "hidden";
      if (tocDrawerNav && !tocDrawerNav.querySelector(".toc-list")) {
        const toc = document.getElementById("toc-nav");
        if (toc?.innerHTML.trim()) {
          tocDrawerNav.innerHTML = toc.innerHTML;
          wireDrawerToc(tocDrawerNav);
        }
      }
    };
    window.closeDocTocDrawer = () => {
      tocOverlay.classList.remove("open");
      tocDrawer.classList.remove("open");
      document.body.style.overflow = "";
    };
  }

  const sidebarOverlay = document.getElementById("doc-sidebar-overlay");
  const sidebarDrawer = document.getElementById("doc-sidebar-drawer");
  if (sidebarOverlay && sidebarDrawer) {
    window.openDocSidebarDrawer = () => {
      sidebarOverlay.classList.add("open");
      sidebarDrawer.classList.add("open");
      document.body.style.overflow = "hidden";
    };
    window.closeDocSidebarDrawer = () => {
      sidebarOverlay.classList.remove("open");
      sidebarDrawer.classList.remove("open");
      document.body.style.overflow = "";
    };
  }

  listen(document, "keydown", (event) => {
    if (event.key !== "Escape") return;
    if (tocDrawer?.classList.contains("open")) window.closeDocTocDrawer?.();
    if (sidebarDrawer?.classList.contains("open")) window.closeDocSidebarDrawer?.();
  });
}

function highlightNewCodeBlocks() {
  const newCodeElements = Array.from(document.querySelectorAll('pre > code')).filter(code => {
    return !code.closest('shiki-code');
  });
  if (newCodeElements.length === 0) return;
  const highlightedWrappers = Array.from(document.querySelectorAll('shiki-code'));
  const backups = highlightedWrappers.map(wrapper => {
    const pre = wrapper.querySelector('pre');
    if (pre) {
      const parent = pre.parentElement;
      const nextSibling = pre.nextSibling;
      parent.removeChild(pre);
      return { pre, parent, nextSibling };
    }
    return null;
  }).filter(Boolean);
  window.dispatchEvent(new Event("pjax:complete"));
  backups.forEach(({ pre, parent, nextSibling }) => {
    parent.insertBefore(pre, nextSibling);
  });
}

function initDocPage() {
  cleanup();
  pageController = new AbortController();
  setupProgressiveContent();
  setupToc();
  setupVersionDropdowns();
  setupStickyBounds();
  setupDrawers();

  // Dispatch pjax:complete event to let Shiki code highlighter reload
  setTimeout(() => {
    highlightNewCodeBlocks();
  }, 100);
}

const boot = () => {
  if (isDocPage()) initDocPage();
};

if (window.SkyPjax?.onPage) {
  window.SkyPjax.onPage(boot, { immediate: false });
  window.SkyPjax.onCleanup(cleanup);
} else {
  onReady(boot);
}

completePageInit();
