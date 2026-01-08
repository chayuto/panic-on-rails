# PanicOnRails Features

Complete feature documentation for PanicOnRails - the free, browser-based train track planner.

## Core Features

### Track Building

- **Snap-to-connect placement** — Tracks automatically connect when placed near each other
- **Kato N-Scale accuracy** — Real-world track geometry and dimensions
- **Multiple track types** — Straight, curved, switches, and crossings
- **Rotation and flip** — Full control over track orientation
- **Undo/redo support** — Never lose your work

### Train Simulation

- **Graph-based movement** — Trains follow track topology intelligently
- **Multiple trains** — Run several trains simultaneously
- **Speed control** — Adjust train velocity in real-time
- **Direction control** — Reverse trains on demand
- **Collision awareness** — Visual feedback for potential collisions

### Layout Management

- **Auto-save** — Layouts persist in browser local storage
- **Export to JSON** — Download layouts as portable files
- **Import layouts** — Load previously saved designs
- **Template library** — Start from pre-built layout templates

### User Interface

- **Pan and zoom** — Navigate large layouts smoothly
- **Keyboard shortcuts** — Efficient editing workflow
- **Touch support** — Works on tablets and touch screens
- **Dark theme** — Easy on the eyes for long sessions

## Technical Specifications

| Specification | Value |
|--------------|-------|
| Track Scale | Kato N-Scale (1:160) |
| Track Gauge | 9mm (modeled accurately) |
| Rendering | HTML5 Canvas (Konva) |
| State Management | Zustand |
| Data Format | JSON |
| Browser Support | Chrome, Firefox, Safari, Edge |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `R` | Rotate track |
| `F` | Flip track |
| `Delete` | Remove selected track |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Space` | Pan mode |
| `+/-` | Zoom in/out |

## Roadmap

- 🔜 Extended track catalog
- 🔜 URL-based sharing
- 🔜 3D view mode
- 🔜 Custom track sizing
- 🔜 Multiplayer collaboration
