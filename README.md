# PDFWatermark Pro

A lightweight desktop application for adding custom text and image watermarks to PDF files. Built with Electron and pdf-lib.

## Features

- **Text Watermarks**: Custom text, font, size, color, opacity, rotation, and position
- **Image Watermarks**: PNG/JPG support with scale, opacity, rotation, and position controls
- **Position Presets**: 9 preset positions (top-left, center, bottom-right, etc.) or custom placement
- **Tiling/Repeat**: Cover entire pages with repeated watermark pattern
- **Page Selection**: Apply to all pages, odd/even pages, or custom page ranges (e.g., "1-5, 8, 10-15")
- **Live Preview**: Real-time PDF preview with zoom and page navigation
- **Batch Processing**: Watermark multiple PDF files at once
- **Templates**: Save and load watermark configurations as templates
- **Dark/Light Theme**: Toggle between dark and light UI themes
- **Non-destructive**: Original PDFs are never modified; output saved as new files

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop Framework | Electron |
| PDF Processing | pdf-lib (MIT license) |
| PDF Preview | pdfjs-dist (Mozilla PDF.js) |
| UI | HTML/CSS/JS with Fluent Design-inspired styling |

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Running

```bash
npm start
```

### Running Tests

```bash
npm test
```

### Building for Windows

```bash
npm run build:win
```

## Project Structure

```
src/
├── main/                    # Electron main process
│   ├── main.js              # App entry point, window management
│   ├── preload.js           # Context bridge for secure IPC
│   ├── ipc-handlers.js      # IPC handlers for PDF operations
│   └── file-utils.js        # File dialog helpers
├── renderer/                # Electron renderer (UI)
│   ├── index.html           # Main window layout
│   ├── styles/main.css      # Fluent-inspired styles with theming
│   └── js/
│       ├── app.js           # Main UI controller
│       ├── preview.js       # PDF preview with pdf.js
│       ├── watermark-ui.js  # Watermark configuration panel
│       └── batch.js         # Batch processing modal
└── services/                # Core services (main process)
    ├── pdf-watermark.js     # Orchestrator for watermark operations
    ├── text-watermark.js    # Text watermark engine
    ├── image-watermark.js   # Image watermark engine
    └── page-range.js        # Page range parser
tests/
├── page-range.test.js       # Page range parser tests
└── watermark.test.js        # Watermark service tests
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+O | Open PDF |
| Ctrl+S | Apply & Save |

## License

MIT
