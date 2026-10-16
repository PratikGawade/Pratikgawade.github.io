# pratikgawade.github.io

My personal portfolio and blog. Plain HTML, CSS and vanilla JS — no framework, no build step. Deploys straight from `main` to GitHub Pages.

## Local preview

Any static server will do. From the repo root:

```bash
# Python 3
python -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000>.

## Project layout

```
.
├── index.html              # Landing: hero, about, skills, projects, contact
├── 404.html                # Playful 404
├── .nojekyll               # Tells GitHub Pages to serve files as-is (no Jekyll)
├── assets/
│   ├── css/styles.css      # All the styling
│   ├── js/main.js          # Nav, theme toggle, hero rotator, scroll reveal
│   ├── js/blog.js          # Loads posts.json; renders list and single-post view
│   └── img/                # Images
├── blog/
│   ├── index.html          # Post listing
│   └── post.html           # Single post viewer (reads ?slug=…)
└── posts/
    ├── posts.json          # Post index — one entry per post
    └── *.md                # Markdown source for each post
```

## Writing a new blog post

1. Create `posts/<my-slug>.md` with the post content (plain Markdown — no front-matter).
2. Add an entry to `posts/posts.json`:

   ```json
   {
     "slug": "my-slug",
     "title": "My brilliant post",
     "date": "2026-10-16",
     "excerpt": "One-sentence summary that shows up on the blog listing.",
     "tags": ["Docker", "Something else"]
   }
   ```

3. Commit, push, done. The post appears at `/blog/post.html?slug=my-slug` and in the listing at `/blog/`.

Posts render through [marked.js](https://marked.js.org) with syntax highlighting from [highlight.js](https://highlightjs.org/), both loaded from a CDN. Both are pinned to specific versions in `blog/post.html` — bump them there if needed.

## Editing content

- **Projects:** edit the `.project-card` elements in `index.html` (there's a `TODO` comment marking the section).
- **Skills:** edit the `.chip` elements in the `#skills` section.
- **Social links:** edit the icons inside `.socials` in `index.html`.
- **Theme colors:** edit the CSS custom properties at the top of `assets/css/styles.css`.

## Deploying

GitHub Pages is set to deploy from `main` branch / root. Pushing to `main` publishes within a minute.

- Settings → Pages → Source: **Deploy from a branch**
- Branch: `main` / `/ (root)`

If you want a custom domain later, drop it in the `CNAME` file.
