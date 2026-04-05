import * as pdfjsLib from "https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.mjs";

const PDFJS_VERSION = "4.10.38";
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.mjs`;

const DEFAULT_PDF = "./EULAR.pdf";

const els = {
  viewer: document.getElementById("viewer"),
  toc: document.getElementById("toc-root"),
  classifications: document.getElementById("classifications-root"),
  searchInput: document.getElementById("search-input"),
  searchBtn: document.getElementById("search-btn"),
  searchStats: document.getElementById("search-stats"),
  searchResults: document.getElementById("search-results"),
  pageInput: document.getElementById("page-input"),
  pageTotal: document.getElementById("page-total"),
  zoomLabel: document.getElementById("zoom-label"),
  fileInput: document.getElementById("file-input"),
  btnPrev: document.getElementById("btn-prev"),
  btnNext: document.getElementById("btn-next"),
  zoomIn: document.getElementById("zoom-in"),
  zoomOut: document.getElementById("zoom-out"),
  fitWidth: document.getElementById("fit-width"),
};

/** @type {import('pdfjs-dist').PDFDocumentProxy | null} */
let pdfDoc = null;
let numPages = 0;
/** scale relative to "fit width" baseline */
let scaleMultiplier = 1;
let fitWidthScale = 1;
/** @type {Map<number, { text: string }>} */
const textIndex = new Map();
let indexingDone = false;
/** @type {{ query: string, matches: { page: number, start: number, length: number }[], active: number } | null} */
let searchState = null;

const pagesEl = document.createElement("div");
pagesEl.className = "viewer__pages";
els.viewer.appendChild(pagesEl);

/** @type {Map<number, HTMLDivElement>} */
const pageWraps = new Map();
/** @type {IntersectionObserver} */
let pageObserver = null;

function showLoading(text) {
  let el = document.querySelector(".loading-overlay");
  if (!el) {
    el = document.createElement("div");
    el.className = "loading-overlay";
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.display = "flex";
}

function hideLoading() {
  const el = document.querySelector(".loading-overlay");
  if (el) el.style.display = "none";
}

/**
 * @param {import('pdfjs-dist').PDFDocumentProxy} pdf
 * @param {string | unknown} dest
 */
async function pageNumberFromDest(pdf, dest) {
  if (dest == null) return null;
  try {
    let explicitDest = dest;
    if (typeof dest === "string") {
      explicitDest = await pdf.getDestination(dest);
    }
    if (!explicitDest || explicitDest[0] == null) return null;
    const idx = await pdf.getPageIndex(explicitDest[0]);
    return idx + 1;
  } catch {
    return null;
  }
}

/**
 * @param {import('pdfjs-dist').PDFDocumentProxy} pdf
 * @param {object} item
 * @param {(n: number) => void} goPage
 */
async function renderOutlineItems(pdf, items, goPage, depth = 0) {
  const ul = document.createElement("ul");
  for (const raw of items) {
    const item = raw;
    const li = document.createElement("li");
    if (item.items?.length) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = item.title || "(untitled)";
      btn.style.paddingLeft = `${depth * 4}px`;
      const p = await pageNumberFromDest(pdf, item.dest);
      if (p != null) {
        btn.addEventListener("click", () => goPage(p));
      } else {
        btn.disabled = true;
        btn.style.opacity = "0.45";
      }
      li.appendChild(btn);
      const nested = await renderOutlineItems(pdf, item.items, goPage, depth + 1);
      li.appendChild(nested);
    } else {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = item.title || "(untitled)";
      btn.style.paddingLeft = `${depth * 4}px`;
      const p = await pageNumberFromDest(pdf, item.dest);
      if (p != null) {
        btn.addEventListener("click", () => goPage(p));
      } else if (item.url) {
        btn.addEventListener("click", () => window.open(item.url, "_blank"));
      } else {
        btn.disabled = true;
        btn.style.opacity = "0.45";
      }
      li.appendChild(btn);
    }
    ul.appendChild(li);
  }
  return ul;
}

async function buildToc(pdf, goPage) {
  els.toc.innerHTML = "";
  let outline;
  try {
    outline = await pdf.getOutline();
  } catch {
    outline = null;
  }
  if (!outline?.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "No PDF outline (bookmarks).";
    els.toc.appendChild(p);
    return;
  }
  const root = await renderOutlineItems(pdf, outline, goPage, 0);
  els.toc.appendChild(root);
}

async function loadClassifications(goPage) {
  els.classifications.innerHTML = "";
  try {
    const res = await fetch("./classifications.json", { cache: "no-store" });
    if (!res.ok) throw new Error("no file");
    const data = await res.json();
    const links = Array.isArray(data.links) ? data.links : [];
    if (!links.length) {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = "Add links in classifications.json";
      els.classifications.appendChild(p);
      return;
    }
    for (const link of links) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = link.label || `Page ${link.page}`;
      const page = Number(link.page);
      if (Number.isFinite(page) && page >= 1) {
        btn.addEventListener("click", () => goPage(page));
      } else {
        btn.disabled = true;
      }
      els.classifications.appendChild(btn);
    }
  } catch {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "Could not load classifications.json";
    els.classifications.appendChild(p);
  }
}

/**
 * @param {import('pdfjs-dist').TextItem | import('pdfjs-dist').TextMarkedContent} item
 * @returns {item is import('pdfjs-dist').TextItem}
 */
function isTextItem(item) {
  return "str" in item && item.str !== undefined;
}

/**
 * @param {import('pdfjs-dist').TextContent} textContent
 * @param {import('pdfjs-dist').PageViewport} viewport
 */
function highlightRectsForRange(textContent, viewport, start, length) {
  const end = start + length;
  let pos = 0;
  /** @type {import('pdfjs-dist').TextItem[]} */
  const items = [];
  for (const raw of textContent.items) {
    if (!isTextItem(raw)) continue;
    const item = raw;
    const s = item.str;
    const i0 = pos;
    const i1 = pos + s.length;
    if (i1 > start && i0 < end) items.push(item);
    pos = i1;
  }

  const rects = [];
  const Util = pdfjsLib.Util;
  for (const item of items) {
    const tx = Util.transform(viewport.transform, item.transform);
    const fontHeight = Math.hypot(tx[2], tx[3]);
    const width = item.width * viewport.scale;
    const left = tx[4];
    const top = tx[5];
    rects.push({ left, top, width, height: fontHeight });
  }
  return rects;
}

/**
 * @param {import('pdfjs-dist').TextContent} textContent
 * @param {string} query
 */
function findAllMatchesInPageText(textContent, query) {
  const q = query.trim();
  if (!q) return [];
  const parts = [];
  let off = 0;
  for (const raw of textContent.items) {
    if (!isTextItem(raw)) continue;
    parts.push(raw.str);
    off += raw.str.length;
  }
  const text = parts.join("");
  const lower = text.toLowerCase();
  const qLower = q.toLowerCase();
  const matches = [];
  let idx = 0;
  while (idx < lower.length) {
    const found = lower.indexOf(qLower, idx);
    if (found === -1) break;
    matches.push({ start: found, length: q.length });
    idx = found + 1;
  }
  return matches;
}

async function renderPageHighlights(pageNum, wrap, viewport, textContent) {
  const layer = wrap.querySelector(".highlight-layer");
  if (!layer) return;
  layer.innerHTML = "";
  layer.style.width = `${viewport.width}px`;
  layer.style.height = `${viewport.height}px`;
  if (!searchState?.query) return;

  const q = searchState.query;
  const all = findAllMatchesInPageText(textContent, q);
  const activeM =
    searchState.active >= 0 ? searchState.matches[searchState.active] : null;

  for (const m of all) {
    const isActive =
      activeM &&
      activeM.page === pageNum &&
      activeM.start === m.start &&
      activeM.length === m.length;
    const rects = highlightRectsForRange(textContent, viewport, m.start, m.length);
    for (const rect of rects) {
      const div = document.createElement("div");
      div.className = "hl" + (isActive ? " is-active" : "");
      div.style.left = `${rect.left}px`;
      div.style.top = `${rect.top}px`;
      div.style.width = `${rect.width}px`;
      div.style.height = `${rect.height}px`;
      layer.appendChild(div);
    }
  }
}

async function renderPage(pageNum) {
  const wrap = pageWraps.get(pageNum);
  if (!wrap || !pdfDoc) return;

  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: fitWidthScale * scaleMultiplier });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const renderCtx = { canvasContext: ctx, viewport, canvas };
  await page.render(renderCtx).promise;

  const textContent = await page.getTextContent();
  wrap.innerHTML = "";
  wrap.style.width = `${viewport.width}px`;
  wrap.style.height = `${viewport.height}px`;
  wrap.appendChild(canvas);

  const hl = document.createElement("div");
  hl.className = "highlight-layer";
  wrap.appendChild(hl);

  await renderPageHighlights(pageNum, wrap, viewport, textContent);
}

function scrollToPage(pageNum, align = "start") {
  const wrap = pageWraps.get(pageNum);
  if (!wrap) return;
  wrap.scrollIntoView({ behavior: "smooth", block: align });
  els.pageInput.value = String(pageNum);
}

function updateToolbarPage(current) {
  els.pageInput.value = String(current);
}

function getVisiblePageApprox() {
  const rect = els.viewer.getBoundingClientRect();
  let best = 1;
  let bestArea = 0;
  for (const [n, wrap] of pageWraps) {
    const r = wrap.getBoundingClientRect();
    const inter = Math.max(
      0,
      Math.min(r.bottom, rect.bottom) - Math.max(r.top, rect.top)
    );
    if (inter > bestArea) {
      bestArea = inter;
      best = n;
    }
  }
  return best;
}

function setupPageObserver() {
  if (pageObserver) pageObserver.disconnect();
  pageObserver = new IntersectionObserver(
    (entries) => {
      for (const ent of entries) {
        if (!ent.isIntersecting) continue;
        const pageNum = Number(ent.target.getAttribute("data-page"));
        if (!Number.isFinite(pageNum)) continue;
        renderPage(pageNum);
      }
    },
    { root: els.viewer, rootMargin: "120px 0px", threshold: 0.01 }
  );
  for (const wrap of pageWraps.values()) {
    pageObserver.observe(wrap);
  }
}

async function buildPageSlots() {
  pagesEl.innerHTML = "";
  pageWraps.clear();
  if (!pdfDoc) return;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: fitWidthScale * scaleMultiplier });
    const wrap = document.createElement("div");
    wrap.className = "page-wrap";
    wrap.dataset.page = String(i);
    wrap.style.width = `${viewport.width}px`;
    wrap.style.height = `${viewport.height}px`;
    wrap.style.background = "#f0f0f0";
    const placeholder = document.createElement("div");
    placeholder.style.padding = "8px";
    placeholder.style.color = "#999";
    placeholder.style.fontSize = "12px";
    placeholder.textContent = `Page ${i}`;
    wrap.appendChild(placeholder);
    pagesEl.appendChild(wrap);
    pageWraps.set(i, wrap);
  }
  setupPageObserver();
  els.pageTotal.textContent = `/ ${numPages}`;
  els.pageInput.max = String(numPages);
  await renderPage(1);
}

async function applyScale() {
  els.zoomLabel.textContent = `${Math.round(scaleMultiplier * 100)}%`;
  await buildPageSlots();
  const active = searchState?.matches[searchState.active];
  if (active) scrollToPage(active.page);
}

async function indexAllText() {
  textIndex.clear();
  indexingDone = false;
  els.searchStats.textContent = "Indexing…";
  if (!pdfDoc) return;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const tc = await page.getTextContent();
    const parts = [];
    for (const raw of tc.items) {
      if (isTextItem(raw)) parts.push(raw.str);
    }
    const text = parts.join("");
    textIndex.set(i, { text });
    if (i % 5 === 0) {
      els.searchStats.textContent = `Indexing… ${i}/${numPages}`;
      await new Promise((r) => requestAnimationFrame(r));
    }
  }
  indexingDone = true;
  els.searchStats.textContent = `Ready — ${numPages} pages indexed`;
}

async function runSearch() {
  const query = els.searchInput.value.trim();
  els.searchResults.innerHTML = "";
  searchState = null;

  if (!query || !indexingDone) {
    if (!indexingDone) els.searchStats.textContent = "Still indexing…";
    await buildPageSlots();
    return;
  }

  /** @type { { page: number, start: number, length: number }[] } */
  const matches = [];
  const qLower = query.toLowerCase();

  for (let p = 1; p <= numPages; p++) {
    const row = textIndex.get(p);
    if (!row) continue;
    const text = row.text;
    const lower = text.toLowerCase();
    let idx = 0;
    while (idx < lower.length) {
      const found = lower.indexOf(qLower, idx);
      if (found === -1) break;
      matches.push({ page: p, start: found, length: query.length });
      idx = found + 1;
    }
  }

  searchState = { query, matches, active: matches.length ? 0 : -1 };
  els.searchStats.textContent = matches.length
    ? `${matches.length} match${matches.length === 1 ? "" : "es"}`
    : "No matches";

  matches.forEach((m, i) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    const row = textIndex.get(m.page);
    const snippet = row
      ? row.text.slice(Math.max(0, m.start - 40), m.start + m.length + 40)
      : "";
    btn.innerHTML = `<span class="meta">Page ${m.page}</span>${escapeHtml(snippet)}`;
    btn.addEventListener("click", async () => {
      searchState.active = i;
      els.searchResults.querySelectorAll("button").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      await buildPageSlots();
      scrollToPage(m.page);
    });
    if (i === 0) btn.classList.add("is-active");
    li.appendChild(btn);
    els.searchResults.appendChild(li);
  });

  await buildPageSlots();
  if (matches.length) scrollToPage(matches[0].page);
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function computeFitWidthScale(firstPage) {
  const base = firstPage.getViewport({ scale: 1 });
  const avail = Math.max(320, els.viewer.clientWidth - 32);
  return avail / base.width;
}

async function loadPdf(source) {
  showLoading("Loading PDF…");
  searchState = null;
  els.searchResults.innerHTML = "";
  els.searchStats.textContent = "";
  indexingDone = false;
  try {
    const task = pdfjsLib.getDocument(source);
    pdfDoc = await task.promise;
  } catch (e) {
    hideLoading();
    console.error(e);
    alert("Could not load PDF. Use a local server (see project comment in index.html).");
    return;
  }
  numPages = pdfDoc.numPages;
  const p1 = await pdfDoc.getPage(1);
  fitWidthScale = computeFitWidthScale(p1);
  scaleMultiplier = 1;

  const goPage = (n) => {
    const page = Math.min(numPages, Math.max(1, n));
    scrollToPage(page);
    updateToolbarPage(page);
  };

  await buildToc(pdfDoc, goPage);
  await loadClassifications(goPage);
  hideLoading();
  await buildPageSlots();
  indexAllText();
}

els.btnPrev.addEventListener("click", () => {
  const v = getVisiblePageApprox();
  scrollToPage(Math.max(1, v - 1));
  updateToolbarPage(Math.max(1, v - 1));
});
els.btnNext.addEventListener("click", () => {
  const v = getVisiblePageApprox();
  scrollToPage(Math.min(numPages, v + 1));
  updateToolbarPage(Math.min(numPages, v + 1));
});

els.pageInput.addEventListener("change", () => {
  const n = Number(els.pageInput.value);
  if (Number.isFinite(n)) scrollToPage(Math.min(numPages, Math.max(1, n)));
});

els.viewer.addEventListener("scroll", () => {
  updateToolbarPage(getVisiblePageApprox());
});

els.zoomIn.addEventListener("click", () => {
  scaleMultiplier = Math.min(3, scaleMultiplier + 0.15);
  void applyScale();
});
els.zoomOut.addEventListener("click", () => {
  scaleMultiplier = Math.max(0.5, scaleMultiplier - 0.15);
  void applyScale();
});
els.fitWidth.addEventListener("click", () => {
  scaleMultiplier = 1;
  void applyScale();
});

els.searchBtn.addEventListener("click", () => void runSearch());
els.searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") void runSearch();
});

els.fileInput.addEventListener("change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const url = URL.createObjectURL(f);
  await loadPdf({ url });
  URL.revokeObjectURL(url);
});

window.addEventListener("resize", () => {
  if (!pdfDoc) return;
  pdfDoc.getPage(1).then((p1) => {
    fitWidthScale = computeFitWidthScale(p1);
    void applyScale();
  });
});

loadPdf(DEFAULT_PDF);
