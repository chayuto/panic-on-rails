# 🚂 PanicOnRails

> **Free, open-source train track planner that runs entirely in your browser.**

[![Try Live Demo](https://img.shields.io/badge/Try-Live%20Demo-blue?style=for-the-badge)](https://panic-on-rails.chayuto.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![GitHub](https://img.shields.io/badge/GitHub-Source-black?style=for-the-badge&logo=github)](https://github.com/chayuto/panic-on-rails)

![PanicOnRails - Build Train Tracks in Your Browser](public/og-image.png)

## What is PanicOnRails?

PanicOnRails is an **open-source web application** for designing model train layouts and simulating train operations. It combines precision track geometry from real-world standards (Kato N-Scale) with an intuitive, playful interface inspired by classic wooden train sets.

**🎮 [Try it now - no download required!](https://panic-on-rails.chayuto.com/)**

### Key Features

- 🌐 **Runs in your browser** — No installation, works on any device
- 💰 **100% Free & Open Source** — MIT licensed, forever free
- 🛤️ **Kato N-Scale accuracy** — Real track geometry and dimensions
- 💾 **Save & Share** — Export/import layouts as JSON files
- 🖥️ **Desktop-first** — Optimized for precision with tablet support
- 🚂 **Graph-based simulation** — Realistic train movement logic

## Why PanicOnRails?

| Feature | PanicOnRails | Desktop Apps | Physical Planning |
|---------|-------------|--------------|-------------------|
| **No installation** | ✅ | ❌ | ✅ |
| **100% Free** | ✅ | ⚠️ Often paid | ❌ Requires tracks |
| **Shareable layouts** | ✅ JSON export | ⚠️ Proprietary | ❌ |
| **Kato N-Scale accurate** | ✅ | ⚠️ Varies | ✅ |
| **Instant access** | ✅ | ❌ Download needed | ❌ Setup required |

## Technology Stack

| Technology | Purpose |
|------------|---------|
| React 19 + TypeScript | UI Framework |
| Vite | Build System |
| React-Konva | Canvas Rendering |
| Zustand | State Management |
| pnpm | Package Manager |

## Getting Started

### Quick Start (Development)

```bash
# Clone the repository
git clone https://github.com/chayuto/panic-on-rails.git
cd panic-on-rails

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your browser.

### Build for Production

```bash
pnpm run build
```

### Run Tests

```bash
pnpm run test      # Unit tests
pnpm run lint      # Linting
pnpm run typecheck # TypeScript checks
```

## Frequently Asked Questions

<details>
<summary><strong>Is PanicOnRails really free?</strong></summary>

Yes! PanicOnRails is 100% free and open source under the MIT license. No ads, no subscriptions, no hidden costs. Free forever.
</details>

<details>
<summary><strong>Does it work on mobile/tablet?</strong></summary>

PanicOnRails is designed desktop-first for precision track placement, but works on tablets. Mobile phones are not recommended due to screen size limitations.
</details>

<details>
<summary><strong>Can I export my layouts?</strong></summary>

Yes! Layouts can be exported as JSON files for sharing, backup, or importing on another device. Layouts are also saved automatically to your browser's local storage.
</details>

<details>
<summary><strong>What track types are supported?</strong></summary>

Currently focused on Kato N-Scale with accurate track geometry. More track types are planned for future releases.
</details>

## Project Status

🚧 **Under Active Development**

**Current Capabilities:**
- ✅ Track placement and visualization
- ✅ Pan and zoom controls
- ✅ Layout persistence (local storage)
- ✅ File export/import (JSON)
- ✅ Snap-to-connect track placement
- ✅ Train simulation with graph-based movement, switches, sensors and crashes
- ✅ Undo/redo
- ✅ Headless, deterministic simulation core (for tests and agents)

**Next:** see [docs/ROADMAP.md](docs/ROADMAP.md) for the current assessment and the phased plan.
This covers making the controls real (signals, switches, per-train control), then a mission layer
with objectives and progression, then feel and polish.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License — See [LICENSE](LICENSE) for details.

---

**Built with 💙 by [Chayuto](https://github.com/chayuto)**
