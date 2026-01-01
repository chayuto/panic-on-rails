# PanicOnRails

A browser-based train track planner and sandbox simulation.

## Overview

PanicOnRails is an open-source web application for designing model train layouts and simulating train operations. It combines precision track geometry from real-world standards (Kato N-Scale) with an intuitive, playful interface inspired by classic wooden train sets.

**Key Characteristics:**
- Runs entirely in the browser — no installation required
- Desktop-first design with tablet support
- Persistent layouts via local storage
- Export and import layouts as JSON files
- Graph-based train simulation (not physics-based)

## Technology

- React 18 with TypeScript
- Vite build system
- React-Konva for canvas rendering
- Zustand for state management
- pnpm package manager

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
git clone https://github.com/chayuto/panic-on-rails.git
cd panic-on-rails
pnpm install
```

### Development

```bash
pnpm run dev
```

Open `http://localhost:5173/panic-on-rails/` in your browser.

### Build

```bash
pnpm run build
```

### Testing

```bash
pnpm run test
pnpm run lint
pnpm run typecheck
```

## Project Status

This project is under active development. Current capabilities:

- Track placement and visualization
- Pan and zoom controls
- Layout persistence (local storage)
- File export/import (JSON)

Planned features:

- Train simulation with graph-based movement
- Snap-to-connect track placement
- Extended part catalog
- URL-based layout sharing

## Contributing

Contributions are welcome. Please open an issue to discuss proposed changes before submitting a pull request.

## License

MIT License. See [LICENSE](LICENSE) for details.
