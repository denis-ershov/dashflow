# DashFlow Chrome Extension – Security Audit

---

## 1. Risk List

| # | Risk | Severity | Status |
|---|------|----------|--------|
| 1 | **XSS via user content** – Todo text, city, locale rendered without sanitization | Medium | ✅ Mitigated (React escapes) |
| 2 | **CSP not explicitly defined** – Relying on Chrome default; unclear baseline | Low | ⚠️ Recommendation |
| 3 | **API key exposure** – Keys stored in code or storage | N/A | ✅ No API keys used |
| 4 | **Overly broad host_permissions** – Unnecessary network access | Low | ✅ Scoped (Open‑Meteo only) |
| 5 | **Storage injection** – Malformed data from chrome.storage | Low | ✅ Partial (layout validated) |
| 6 | **DOM-based XSS** – `innerHTML`, `eval`, `document.write` | High | ✅ Not used |
| 7 | **Widget type injection** – Unvalidated widget type from persisted config | Medium | ⚠️ Review |
| 8 | **window.confirm usage** – Minor spoofing / UX risk | Low | Info only |

---

## 2. Mitigation Strategies

### 2.1 XSS Prevention

**Current:** React escapes text in JSX (`{item.text}`, `{data.city}`). No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function`.

**If adding rich text later:**
- Use a sanitization library (e.g. DOMPurify) before rendering HTML.
- Prefer markdown + a safe renderer (e.g. marked + DOMPurify).
- Keep `dangerouslySetInnerHTML` out of user-controlled content.

```ts
// Example: Safe HTML rendering (only if needed)
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput, { ALLOWED_TAGS: ['b', 'i', 'a'] });
<div dangerouslySetInnerHTML={{ __html: clean }} />
```

### 2.2 API Key Protection

**Current:** Open‑Meteo is used without API keys. No secrets in code or storage.

**If adding APIs that require keys:**
- Do not commit keys. Use env vars (e.g. `import.meta.env.VITE_API_KEY`) and `.env` in `.gitignore`.
- Prefer a backend proxy so the extension never sees the key.
- Avoid `chrome.storage` for keys; they are visible in DevTools.
- Prefer `host_permissions` scoped to a single API domain.

### 2.3 User-Generated Content Sanitization

**Current:** All user input (todo text, city, locale, settings) is rendered as plain text in React.

**Recommendations:**
1. Enforce length limits for text inputs (e.g. 1000 chars for notes).
2. Validate widget config shapes before saving (e.g. Zod).
3. If HTML/markdown is added, always sanitize before render.

```ts
// Example: Config validation at persistence boundary
const WidgetConfigSchema = z.object({
  city: z.string().max(100).optional(),
  locale: z.string().max(20).optional(),
  showCompleted: z.boolean().optional(),
});
```

### 2.4 Storage & Layout Validation

**Current:** `parseLayout()` validates layout schema and version. Widget instances are checked for `instances` and `order`. Settings validate `theme` enum.

**Recommendations:**
1. Validate widget `type` against the registry before rendering.
2. Add length limits for arrays (e.g. max 100 layout items).
3. Reject unknown top-level keys in persisted objects.

### 2.5 Host Permissions

**Current:** Minimal scope:

```json
"host_permissions": [
  "https://api.open-meteo.com/*",
  "https://geocoding-api.open-meteo.com/*"
]
```

**Recommendation:** When adding new APIs, only add the exact origins needed. Do not use `<all_urls>` for a New Tab extension.

---

## 3. Example CSP Config

Chrome MV3 enforces a minimum CSP. You cannot relax beyond it; you can only tighten. Below is an explicit, safe config.

### 3.1 Add to `wxt.config.ts`

```ts
// wxt.config.ts
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'DashFlow',
    description: 'A sleek New Tab dashboard',
    permissions: ['storage', 'geolocation'],
    host_permissions: [
      'https://api.open-meteo.com/*',
      'https://geocoding-api.open-meteo.com/*',
    ],
    // Explicit CSP – matches Chrome MV3 minimum; documents baseline
    content_security_policy: {
      extension_pages:
        "script-src 'self'; object-src 'self'",
    },
  },
  vite: () => ({ /* ... */ }),
});
```

### 3.2 CSP Directives

| Directive | Value | Purpose |
|-----------|-------|---------|
| `script-src` | `'self'` | Only load scripts from the extension package |
| `object-src` | `'self'` | Block plugins; restrict object/embed sources |

**Do not add:**
- `'unsafe-inline'` – MV3 disallows for extension pages.
- `'unsafe-eval'` – MV3 disallows (unless via sandbox).
- External URLs in `script-src` – MV3 only allows `'self'`, `'wasm-unsafe-eval'`, `'none'`.

### 3.3 If You Need WebAssembly

```ts
content_security_policy: {
  extension_pages:
    "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
},
```

---

## 4. Checklist for Future Development

- [ ] Sanitize any HTML/markdown before render.
- [ ] Validate widget configs at load and save.
- [ ] Keep `host_permissions` minimal.
- [ ] Never commit API keys; use env vars or a proxy.
- [ ] Run `npm audit` regularly.
- [ ] Avoid `eval`, `new Function`, `innerHTML` for user data.
- [ ] Add a short allowlist for widget types from persisted config.
