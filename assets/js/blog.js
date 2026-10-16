// loads posts.json; renders list on /blog/ or a single post on /blog/post.html

(async () => {
  const listEl = document.querySelector("[data-post-list]");
  const postEl = document.querySelector("[data-post-view]");

  if (!listEl && !postEl) return;

  // posts.json is served from /posts/ relative to the site root
  const indexUrl = new URL("../posts/posts.json", location.href).toString();
  let posts = [];
  try {
    const res = await fetch(indexUrl, { cache: "no-cache" });
    posts = await res.json();
  } catch (err) {
    const msg = `Couldn't load posts index: ${err.message}`;
    if (listEl) listEl.innerHTML = `<p style="color:var(--fg-dim)">${msg}</p>`;
    if (postEl) postEl.innerHTML = `<p style="color:var(--fg-dim)">${msg}</p>`;
    return;
  }
  posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const fmtDate = (iso) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch { return iso; }
  };

  if (listEl) {
    listEl.innerHTML = posts.map((p) => `
      <a class="post-card reveal" href="post.html?slug=${encodeURIComponent(p.slug)}">
        <div class="date">${fmtDate(p.date)}</div>
        <h2>${escapeHtml(p.title)}</h2>
        <p>${escapeHtml(p.excerpt || "")}</p>
        <div class="tags">${(p.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join("")}</div>
      </a>
    `).join("");
    // trigger scroll-reveal on freshly-inserted cards
    requestAnimationFrame(() => {
      document.querySelectorAll(".post-card.reveal").forEach((el, i) => {
        setTimeout(() => el.classList.add("in"), 60 * i);
      });
    });
    return;
  }

  // single-post view
  const params = new URLSearchParams(location.search);
  const slug = params.get("slug");
  const meta = posts.find((p) => p.slug === slug);
  if (!meta) {
    postEl.innerHTML = `<a class="back" href="./">&larr; back to blog</a><h1 class="title">Post not found</h1><p style="color:var(--fg-dim)">The post <code>${escapeHtml(slug || "")}</code> doesn't exist.</p>`;
    return;
  }

  document.title = `${meta.title} — Pratik Gawade`;
  const descTag = document.querySelector('meta[name="description"]');
  if (descTag && meta.excerpt) descTag.setAttribute("content", meta.excerpt);

  const mdUrl = new URL(`../posts/${meta.slug}.md`, location.href).toString();
  let md = "";
  try {
    const res = await fetch(mdUrl, { cache: "no-cache" });
    md = await res.text();
  } catch (err) {
    postEl.innerHTML = `<a class="back" href="./">&larr; back</a><p style="color:var(--fg-dim)">Couldn't load post: ${err.message}</p>`;
    return;
  }

  // configure marked + highlight.js if present
  if (window.marked) {
    marked.setOptions({
      gfm: true,
      breaks: false,
      highlight: (code, lang) => {
        if (window.hljs) {
          try {
            return lang && hljs.getLanguage(lang)
              ? hljs.highlight(code, { language: lang }).value
              : hljs.highlightAuto(code).value;
          } catch { return code; }
        }
        return code;
      },
    });
  }

  const html = window.marked ? marked.parse(md) : `<pre>${escapeHtml(md)}</pre>`;

  postEl.innerHTML = `
    <a class="back" href="./">&larr; back to blog</a>
    <div class="meta">${fmtDate(meta.date)}</div>
    <h1 class="title">${escapeHtml(meta.title)}</h1>
    <div class="tags">${(meta.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join("")}</div>
    <article class="md">${html}</article>
  `;

  // post-render: syntax-highlight any <pre><code> blocks marked.js didn't touch
  if (window.hljs) {
    postEl.querySelectorAll("pre code").forEach((b) => {
      try { hljs.highlightElement(b); } catch { /* ignore */ }
    });
  }
})();

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}
