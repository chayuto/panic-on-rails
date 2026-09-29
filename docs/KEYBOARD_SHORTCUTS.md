# Keyboard Shortcuts

Quick reference for all PanicOnRails keyboard shortcuts.

## Global Shortcuts

Works in both Edit and Simulate modes.

| Shortcut | Action |
|----------|--------|
| `M` | Toggle between Edit/Simulate modes |
| `Shift+M` | Toggle measurement overlay |
| `F` | Fit the whole layout in view |

## Edit Mode

Active when building and modifying tracks.

| Shortcut | Action |
|----------|--------|
| `1` | Select/Edit tool |
| `2` | Place mode |
| `3` | Delete tool |
| `4` | Sensor tool |
| `5` | Signal tool |
| `6` | Wire tool |
| `R` | Rotate track clockwise (while dragging) |
| `Shift+R` | Rotate track counter-clockwise (while dragging) |
| `Ctrl+Z` / `Cmd+Z` | Undo last edit |
| `Ctrl+Y` / `Cmd+Y` | Redo |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo (alternate) |

## Simulate Mode

Active when running trains.

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause simulation |
| `+` or `=` | Increase speed (max 3x) |
| `-` | Decrease speed (min 0.1x) |
| `S` | Toggle hovered switch |
| `1`-`9` | Toggle switch by index |

While trains run you can also **click a switch** to flip it and **click a signal** to
turn it red/green — trains stop at red signals. Each train in the side panel has
**Stop/Go** and **Reverse** buttons.

## Tips

- **Rotation**: Press `R` while dragging a track from the Parts Bin
- **Undo/Redo**: `Ctrl+Z` / `Ctrl+Y` step through layout edits — placements,
  deletions, connections, and sensor/signal/wire changes. Loading a new or
  saved layout resets the undo history.
- **Switches**: Click a switch (or hover it and press `S`) to flip it, even while trains run
- **Snapping**: Drag a part near an open track end and it rotates itself to connect.
  Hover slightly to the left or right of the end to choose which way a curve turns.
- **Speed**: Use `+`/`-` for quick speed adjustments without the slider
