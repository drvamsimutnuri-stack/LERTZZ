/**
 * EULAR CTD–ILD educational dashboard — client-side search over curated JSON.
 */

const state = {
  data: null,
  query: "",
  selectedId: null,
};

function norm(s) {
  return (s || "").toLowerCase();
}

function topicSearchBlob(t) {
  const lensText = (t.lenses || []).map((l) => `${l.label} ${l.body}`).join(" ");
  return norm([t.title, t.summary, (t.tags || []).join(" "), lensText, t.pdfHint].join(" "));
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function highlightSnippet(text, q) {
  if (!q.trim()) return escapeHtml(text);
  const t = escapeHtml(text);
  const words = norm(q)
    .split(/\s+/)
    .filter((w) => w.length > 1);
  if (!words.length) return t;
  let out = t;
  for (const w of words) {
    const re = new RegExp(`(${escapeRegex(w)})`, "gi");
    out = out.replace(re, "<mark>$1</mark>");
  }
  return out;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesQuery(t, q) {
  if (!norm(q).trim()) return true;
  const words = norm(q)
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const blob = topicSearchBlob(t);
  return words.every((w) => blob.includes(w));
}

function renderCards() {
  const root = document.getElementById("topic-grid");
  const topics = state.data?.topics || [];
  const q = state.query;
  const filtered = topics.filter((t) => matchesQuery(t, q));

  document.getElementById("search-stats").textContent =
    filtered.length === topics.length
      ? `${topics.length} topics`
      : `${filtered.length} match${filtered.length === 1 ? "" : "es"} · ${topics.length} total`;

  root.innerHTML = "";
  for (const t of filtered) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card" + (state.selectedId === t.id ? " is-selected" : "");
    btn.dataset.id = t.id;
    const titleHtml = highlightSnippet(t.title, q);
    const summaryHtml = highlightSnippet(t.summary, q);
    btn.innerHTML = `
      <h2>${titleHtml}</h2>
      <p class="summary">${summaryHtml}</p>
      <div class="tags">${(t.tags || [])
        .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
        .join("")}</div>
    `;
    btn.addEventListener("click", () => selectTopic(t.id));
    root.appendChild(btn);
  }

  if (!filtered.length) {
    root.innerHTML =
      '<p class="search-stats" style="grid-column:1/-1">No topics match. Try fewer words or clear the search.</p>';
  }
}

function selectTopic(id) {
  state.selectedId = id;
  const t = (state.data?.topics || []).find((x) => x.id === id);
  const panel = document.getElementById("detail-panel");
  if (!t) {
    panel.className = "detail-panel empty";
    panel.innerHTML = "<p>Select a card to see three explanatory lenses and a PDF map hint.</p>";
    renderCards();
    return;
  }

  panel.className = "detail-panel";
  const q = state.query;
  const lensesHtml = (t.lenses || [])
    .map(
      (l) => `
    <details class="lens" open>
      <summary>${highlightSnippet(l.label, q)}</summary>
      <div class="body">${highlightSnippet(l.body, q)}</div>
    </details>`
    )
    .join("");

  panel.innerHTML = `
    <div class="detail">
      <h2>${highlightSnippet(t.title, q)}</h2>
      <p class="summary">${highlightSnippet(t.summary, q)}</p>
      <div class="insight-strip">
        <span><strong>Three lenses</strong> — same topic, different ways to reason about it (clinical · concept · practical).</span>
      </div>
      <div class="lenses">${lensesHtml}</div>
      <p class="pdf-hint"><strong>PDF map:</strong> ${escapeHtml(t.pdfHint || "")}</p>
    </div>
  `;
  renderCards();
}

async function init() {
  const res = await fetch("./data/topics.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load topics.json");
  state.data = await res.json();

  const meta = state.data.guidelineMeta;
  if (meta) {
    document.getElementById("dash-title").textContent = meta.shortTitle || "Guideline dashboard";
    document.getElementById("dash-tagline").textContent = meta.tagline || "";
    document.getElementById("disclaimer-text").textContent = meta.disclaimer || "";
  }

  const input = document.getElementById("search-input");
  input.addEventListener("input", () => {
    state.query = input.value;
    renderCards();
    if (state.selectedId) {
      const t = (state.data.topics || []).find((x) => x.id === state.selectedId);
      if (t && matchesQuery(t, state.query)) selectTopic(state.selectedId);
      else {
        state.selectedId = null;
        document.getElementById("detail-panel").className = "detail-panel empty";
        document.getElementById("detail-panel").innerHTML =
          "<p>Selected topic hidden by filters. Pick another card or adjust search.</p>";
      }
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      input.value = "";
      state.query = "";
      renderCards();
    }
  });

  renderCards();
  selectTopic(null);
}

init().catch((err) => {
  console.error(err);
  document.getElementById("topic-grid").innerHTML = `<p class="search-stats" style="padding:1rem">Failed to load data: ${escapeHtml(
    err.message
  )}</p>`;
});
