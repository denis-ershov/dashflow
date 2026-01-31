# DashFlow – Chrome Web Store Submission Guide

---

## 1. Manifest Audit

### Current State

| Field | Status | Notes |
|-------|--------|-------|
| `name` | ✅ | "DashFlow" – appears in Web Store and browser |
| `version` | ⚠️ | Must be > 0.0.0 for release (e.g. 1.0.0) |
| `description` | ✅ | ≤132 chars; keep under limit |
| `icons` | ❌ | **Required** – 128×128 mandatory; 48×48, 16×16 recommended |
| `manifest_version` | ✅ | WXT outputs MV3 |
| `permissions` | ✅ | `storage`, `geolocation` – justified |
| `host_permissions` | ✅ | Scoped to Open-Meteo APIs only |
| `content_security_policy` | ✅ | Explicit, secure |
| `chrome_url_overrides.newtab` | ✅ | WXT sets from newtab entrypoint |

### Pre-Submission Checklist

- [ ] Add `icons` to manifest (16, 48, 128 px)
- [ ] Set `version` to 1.0.0 (or appropriate) in `package.json`
- [ ] Ensure description is ≤132 characters
- [ ] Verify `chrome_url_overrides.newtab` is present in built manifest

### Icon Requirements

| Size | Purpose | Format |
|------|---------|--------|
| 128×128 | **Mandatory** – installation, Web Store | PNG |
| 48×48 | Recommended – extensions page | PNG |
| 16×16 | Optional – favicon | PNG |

**Design tips:** 96×96 content with 16px transparent padding = 128px; works on light and dark; avoid heavy drop shadows.

---

## 2. Permissions Minimization

### Current Permissions

| Permission | Purpose | Required? |
|------------|---------|-----------|
| `storage` | Layout, widgets, settings persistence | ✅ Yes |
| `geolocation` | Weather widget "Use my location" | ⚠️ Only when feature used |
| `https://api.open-meteo.com/*` | Current weather API | ✅ Yes (Weather widget) |
| `https://geocoding-api.open-meteo.com/*` | City search | ✅ Yes (Weather widget) |

### Recommendations

1. **storage** – Keep. Core to dashboard persistence.

2. **geolocation** – Consider `optional_permissions`:
   - Move to `optional_permissions` in manifest
   - Call `chrome.permissions.request({ permissions: ['geolocation'] })` when user enables "Use my location" in Weather settings
   - Requires user gesture; improves trust for users who don't use Weather

3. **host_permissions** – Keep as-is. Already minimal and scoped.

### Optional Permissions Example (Future)

```json
{
  "permissions": ["storage"],
  "optional_permissions": ["geolocation"],
  "host_permissions": [
    "https://api.open-meteo.com/*",
    "https://geocoding-api.open-meteo.com/*"
  ]
}
```

Then in Weather widget: `chrome.permissions.request({ permissions: ['geolocation'] })` before `navigator.geolocation.getCurrentPosition()`.

---

## 3. Build Configuration

### Scripts (package.json)

```json
{
  "scripts": {
    "build": "wxt build",
    "build:prod": "npm run compile && wxt build",
    "zip": "wxt zip",
    "compile": "tsc --noEmit"
  }
}
```

### Pre-Submission Build Steps

```bash
# 1. Set version (e.g. 1.0.0) in package.json
# 2. Add icons to public/
# 3. Production build
npm run build

# 4. Create ZIP for upload
npm run zip
```

### Output

- **Build:** `.output/chrome-mv3/` (load unpacked for testing)
- **ZIP:** `.output/chrome-mv3.zip` (upload to Web Store)

### Version Flow

WXT reads `version` from `package.json`. Ensure it's valid semver (e.g. `1.0.0`) before each release.

---

## 4. Store Description Draft

### Short Description (≤132 characters)

> DashFlow replaces your new tab with a clean, customizable dashboard. Add widgets (clock, weather, to-do), arrange them on a grid, and choose light or dark themes. All data stays on your device.

**Character count:** ~132

### Detailed Description

> **A clean, personal dashboard for your new tab**
>
> DashFlow turns your Chrome new tab into a minimal dashboard you can customize. Add and arrange widgets on a drag-and-drop grid—no clutter, just what you need.
>
> **Features**
> • **Widgets** – Clock, Weather, To-Do list
> • **Customizable layout** – Drag, resize, and arrange widgets
> • **Light & dark themes** – Match your preference or system
> • **Offline-first** – Your data is stored locally; no account required
> • **Privacy-focused** – Layout and preferences stay on your device
>
> **Weather** – Enter a city or use your location (optional). Powered by Open-Meteo; no API key needed.
>
> Open a new tab to get started.

### Category Suggestion

**Productivity** or **Lifestyle**

---

## 5. Privacy Policy Checklist

### Data Collection

| Data | Stored | Where | Sent off-device? |
|------|--------|-------|------------------|
| Layout (positions, sizes) | Yes | chrome.storage.local | No |
| Widget config (city, theme) | Yes | chrome.storage.local | No |
| To-do items | Yes | IndexedDB (local) | No |
| Weather cache | Yes | chrome.storage.local | No |
| Geolocation | Used when enabled | Not stored | No (only for API request) |

### Third-Party Services

| Service | Purpose | Data sent |
|---------|---------|-----------|
| Open-Meteo (api.open-meteo.com) | Weather data | City name or lat/lon |
| Open-Meteo (geocoding-api.open-meteo.com) | City search | City name |

### Privacy Policy Must Include

- [ ] What data the extension collects (layout, widget config, to-do items)
- [ ] Where data is stored (local only: chrome.storage, IndexedDB)
- [ ] That no account or sign-in is required
- [ ] Use of Open-Meteo for weather (URL, purpose, data sent)
- [ ] Optional geolocation use (Weather "Use my location")
- [ ] No sale or sharing of data
- [ ] Contact or support URL

### Privacy Policy Template Snippet

```
DashFlow stores the following data locally on your device:
- Dashboard layout (widget positions and sizes)
- Widget settings (theme, city, to-do items, etc.)

This data is stored in Chrome's local storage and IndexedDB. It is not transmitted to our servers or any third party except:

Weather feature: When you use the Weather widget, we send your city name or coordinates to Open-Meteo (https://open-meteo.com) to fetch weather data. We do not control Open-Meteo's privacy practices.

Geolocation: If you enable "Use my location" in the Weather widget, your browser will request your location to fetch local weather. This is optional and used only when you enable it.

We do not sell, share, or transmit your personal data.
```

### Web Store Listing

- **Privacy practices** – Declare "Single purpose" (new tab replacement)
- **Permission justifications** – Explain storage, geolocation, host permissions in the item listing

---

## Quick Submission Checklist

- [ ] Icons in `public/` (16, 48, 128)
- [ ] Version set in `package.json` (e.g. 1.0.0)
- [ ] `npm run build` succeeds
- [ ] `npm run zip` produces uploadable ZIP
- [ ] Test extension in production build
- [ ] Privacy policy URL ready (hosted)
- [ ] Store description and screenshots prepared
