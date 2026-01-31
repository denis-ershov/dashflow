# DashFlow

A Chrome New Tab extension built with WXT, React, TypeScript, and Tailwind CSS.

## Tech Stack

- **WXT** 0.20+ - Web extension framework
- **React** 19+ - UI framework
- **TypeScript** 5+
- **Vite** 7+ (via WXT)
- **Tailwind CSS** 4+

## Project Structure

```
dashflow/
├── entrypoints/
│   ├── background.ts       # Minimal background script
│   └── newtab/             # New Tab override
│       ├── index.html      # Entry HTML
│       ├── main.tsx        # React mount
│       ├── App.tsx         # Root component
│       └── style.css       # Tailwind + base styles
├── public/                 # Static assets (add icon-16.png, icon-48.png, etc.)
├── wxt.config.ts
├── tsconfig.json
└── package.json
```

## Setup

```bash
npm install
# or: pnpm install | bun install
```

## Development

```bash
npm run dev
```

Opens Chrome with the extension loaded. Open a new tab to see DashFlow.

## Build

```bash
npm run build
```

Output: `.output/chrome-mv3/`

## Load in Chrome

1. Run `npm run build`
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `.output/chrome-mv3`
