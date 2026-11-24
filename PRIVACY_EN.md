# DashFlow Privacy Policy

**Last Updated:** November 24, 2026

**Version:** 1.0.0

---

## Introduction

DashFlow ("we", "our extension") is an open-source browser extension that transforms your new tab page into a personalized, productive dashboard.

We take your privacy seriously. This policy describes what data DashFlow processes, how it is handled, and what rights you retain.

---

## Privacy Principles

1. **Privacy by Design**: Data stays in your browser profile by default. Sync with your own DashFlow Hub is optional.
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

DashFlow keeps workspace data in your browser until you connect your own Hub. DashFlow does not send workspace data to the developers.

### Optional DashFlow Hub sync

When you pair DashFlow, the extension requests permission for the host you enter. Tasks, notes, links, reminders, digests, saved articles, and boards sync directly with your Hub. This includes text and URLs that you save to the Inbox. A remote Hub requires HTTPS.

The device token stays in local extension storage and is excluded from JSON exports. Disconnecting stops sync and keeps the browser copy. You manage the Hub copy, its backups, and its version history separately.

When you enable integrations, your Hub connects to the services you configure using your credentials. GitHub and ICS fetch data for your workspace. Telegram accepts selected chats and can send reminder titles to the chat you choose. The mail digest uses IMAP to retrieve the sender and subject of matching messages. Provider credentials stay in the Hub environment.

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
- **`alarms`**: Schedules your reminders when the dashboard tab is closed. Reminder data stays in browser storage.
- **`notifications`** *(optional)*: Offered when you first save a reminder. The browser can display the item's title through the system notification service. If you decline, reminders remain available in the dashboard and toolbar badge.
- **`activeTab` and `contextMenus`**: When you invoke Quick Capture, DashFlow can read the current tab's title and address and lets you include them in a local Inbox item. The optional context menu saves the page, link, or selection you choose. It is disabled until you enable it.
- **Calendar host access** *(optional)*: DashFlow requests access to the specific host of an ICS calendar you add. The calendar URL is stored in this browser profile outside the exported backup. Requests go to the selected calendar provider.
- **`bookmarks`** *(optional, requested when you click "Allow access" in the widget)*: Lets the Bookmarks widget show and edit your browser bookmarks. Bookmarks are read on your device and never transmitted.
- **`tabs`, `sessions`** *(optional, requested on click)*: Power the "Open tabs" and "Recently closed" views of the Bookmarks widget. Tab titles and addresses are shown on your device only; they are never transmitted or stored.
- **Access to RSS feed sites** *(optional, requested on click)*: Granted only for the sites of feeds you add (e.g. `https://example.com/*`), solely to download those feeds. DashFlow never reads or changes pages on those sites.
- **Geolocation** *(not a manifest permission)*: Your browser asks for consent the first time the weather widget detects your city. Coordinates are sent to Open-Meteo and geocoding services (BigDataCloud, OpenStreetMap Nominatim) to get the forecast and city name, and are not stored by DashFlow. You can pick a city manually instead.
- **Weather hosts** (`api.open-meteo.com`, `geocoding-api.open-meteo.com`, `api.bigdatacloud.net`, `nominatim.openstreetmap.org`): Fetch forecasts and city names for the weather widget.

---

## User Rights & GDPR / CCPA Compliance

You can manage your local DashFlow data from your browser profile.
- **Right to Access**: You can inspect all stored settings at any time in the Settings panel or by exporting your JSON configuration.
- **Right to Rectification**: All settings and notes can be edited directly within the interface.
- **Right to Erasure**: Uninstalling the extension or clearing extension data removes the browser copy. You manage deletion from your Hub separately.
- **Right to Portability**: You can export your entire dashboard configuration to a `.json` file at any time.

---

## Contact & Bug Reports

For questions or security disclosures:
- GitHub Repository: [https://github.com/denis-ershov/dashflow](https://github.com/denis-ershov/dashflow)
- Security Policy: [`SECURITY.md`](./SECURITY.md)
