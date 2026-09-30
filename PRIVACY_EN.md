# DashFlow Privacy Policy

**Last Updated:** September 30, 2026  
**Version:** 1.0.0

---

## Introduction

DashFlow ("we", "our extension") is an open-source browser extension that transforms your new tab page into a personalized, productive dashboard.

We take your privacy seriously. This policy describes what data DashFlow processes, how it is handled, and what rights you retain.

---

## Privacy Principles

1. **Privacy by Design**: All user data is stored locally on your device.
2. **Zero Telemetry**: We do not collect analytics, usage metrics, or personally identifiable information.
3. **Data Minimization**: We only request permissions strictly necessary for the extension features you choose to use.
4. **Transparency**: Our complete source code is publicly accessible on GitHub for independent audit.
5. **User Control**: You retain 100% ownership and control over your configuration, with one-click export and deletion options.

---

## What Data We Process

### 1. Local Storage (Stored inside your browser)

DashFlow stores the following configuration items **strictly locally** in your browser's sandboxed storage (`chrome.storage.local` / `localStorage`):

- **Appearance Settings**: Theme preset, wallpaper URLs, dark mode preference, font selections.
- **Hero & Layout**: Grid column count, layout mode (Modular, Canvas, Zen), element toggles.
- **Widget Data**:
  - Todo items and completion status
  - Quick link bookmarks and titles
  - Notes content and markdown formatting
  - Pomodoro timer preferences
  - Selected city name for weather display
  - Embedded iframe URLs
- **Diagnostics**: Rotating buffer of local crash events (max 20 entries), viewable only by you in the settings panel.

**None of this data is ever transmitted to our servers or third-party tracking services.**

---

### 2. Network Requests to Third-Party Services

Certain optional widgets query public third-party APIs to provide real-time information. These requests are made directly from your browser:

| Service | Purpose | Data Transmitted | Privacy Policy |
|---|---|---|---|
| **Open-Meteo** | Weather forecast and geocoding | Latitude and longitude coordinates | [open-meteo.com/en/terms](https://open-meteo.com/en/terms) |
| **BigDataCloud** | Reverse geocoding (City name detection) | Latitude and longitude coordinates | [bigdatacloud.com/privacy-policy](https://www.bigdatacloud.com/privacy-policy) |
| **OpenStreetMap Nominatim** | Fallback geocoding | Coordinates | [osmfoundation.org/wiki/Privacy_Policy](https://wiki.osmfoundation.org/wiki/Privacy_Policy) |
| **Unsplash** | Wallpaper imagery | Image ID / search query | [unsplash.com/privacy](https://unsplash.com/privacy) |

No personal identity tokens, cookies, or account identifiers are attached to these external requests.

---

## Browser Permissions Justification

In compliance with the Chrome Web Store and Mozilla Add-ons Developer Program Policies:

- **`storage`**: Required to persist your dashboard layout, theme preferences, and widget content locally on your computer.
- **`bookmarks`** *(Optional)*: Required solely for the Bookmarks widget to display your browser bookmarks in a visual Speed Dial format.
- **`geolocation`** *(Optional)*: Used solely to detect your local city for weather forecasts. Coordinates are never saved or uploaded.
- **`tabs` / `topSites`** *(Optional)*: Used to display open tabs or frequently visited sites in the quick-access panels.

---

## User Rights & GDPR / CCPA Compliance

Because DashFlow stores all data locally on your device:
- **Right to Access**: You can inspect all stored settings at any time in the Settings panel or by exporting your JSON configuration.
- **Right to Rectification**: All settings and notes can be edited directly within the interface.
- **Right to Erasure**: Uninstalling the extension or clearing extension data immediately and permanently removes all stored data.
- **Right to Portability**: You can export your entire dashboard configuration to a `.json` file at any time.

---

## Contact & Bug Reports

For questions or security disclosures:
- GitHub Repository: [https://github.com/denis-ershov/dashflow](https://github.com/denis-ershov/dashflow)
- Security Policy: [`SECURITY.md`](./SECURITY.md)
