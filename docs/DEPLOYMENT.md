# Deployment

The build also emits `manifest.webmanifest`, local PNG/SVG icons and a versioned
`sw.js`. Serve HTML, `sw.js` and the manifest with revalidation/no-cache, and preserve
COOP/COEP headers on cached responses. Fingerprinted assets may use immutable caching.
The service worker caches the app shell eagerly, then caches Python/WASM tools as
they are used; it never stores project source files in the network cache.

Run `npm ci` and `npm run build`; serve `dist/` at the origin root. The build includes
same-origin Python runtime files, pinned Jedi/Parso wheels and worker/WASM assets.
Do not commit `dist/` or `public/runtime/`; they are generated from locked dependencies.

Use HTTPS (localhost is allowed for development) and send these headers on application
responses, including the HTML entry point:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Serve `.wasm` as `application/wasm`, JavaScript modules as `text/javascript`, and allow
same-origin worker/module requests. Do not rewrite existing `/runtime/` or `/assets/`
requests to HTML. Apply long-lived caching to fingerprinted `/assets/` files; revalidate
the HTML and `/runtime/` files when releasing a dependency update.

Example nginx configuration inside an existing HTTPS server:

```nginx
root /srv/code-atlas/dist;
include mime.types;
add_header Cross-Origin-Opener-Policy same-origin always;
add_header Cross-Origin-Embedder-Policy require-corp always;
location / { try_files $uri $uri/ /index.html; }
location /assets/ { try_files $uri =404; }
location /runtime/ { try_files $uri =404; }
```

Verify `window.crossOriginIsolated === true` in the browser. Without isolation,
ordinary execution works, while interactive input and breakpoints report the missing
requirement. Browser storage is local to the origin and profile; a domain change does
not move projects automatically.
