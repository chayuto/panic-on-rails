# **Architectural Specification for a High-Performance, Desktop-Grade Web-Based Railway Track Planner**

## **1\. Executive Summary and Strategic Architectural Vision**

The migration of Computer-Aided Design (CAD) workflows from native desktop applications to the web platform has historically been constrained by the performance limitations of the Document Object Model (DOM) and the single-threaded nature of the JavaScript event loop. However, the convergence of modern browser capabilities—specifically WebAssembly (WASM), OffscreenCanvas, and SharedArrayBuffer—has created an inflection point where a web-based track planner can not only match but exceed the performance and usability of legacy native tools like XTrackCAD.

This report establishes the technical foundation for a **desktop-exclusive** web application designed for model railway track planning. Unlike "mobile-first" or responsive web applications that compromise interface density for touch compatibility, this system is architected to leverage the full peripheral capability of a desktop environment: precise mouse input, keyboard shortcuts, multi-monitor display estates, and high-performance dedicated GPUs.

### **1.1 The Desktop-Only Advantage**

Restricting the scope to desktop browsers eliminates significant architectural overhead. It removes the need for touch event disambiguation (e.g., distinguishing a pan gesture from a zoom gesture on a small screen) and allows for the utilization of "hover" states as a primary interaction model—critical for precise snapping and object inspection in CAD.1 Furthermore, it permits the use of dense, multi-pane "docking" layouts that mirror Integrated Development Environments (IDEs), a paradigm familiar to the target demographic of technical hobbyists and engineers.

The proposed architecture rests on four pillars:

1. **Asynchronous Rendering Core:** A decoupled rendering pipeline utilizing OffscreenCanvas within Web Workers to guarantee a consistent 60 frames-per-second (FPS) viewport, regardless of the main thread's load.2  
2. **Rigorous Computational Geometry:** The adoption of Rust-compiled WebAssembly modules to handle the non-trivial mathematics of Euler Spirals (Clothoids) and Boolean polygon clipping, ensuring G2 geometric continuity essential for realistic track physics.4  
3. **Topological Graph Validation:** The implementation of advanced graph theory algorithms—specifically Odd Cycle Transversal and Tarjan’s Bridge Finding—to provide real-time electrical validation, identifying reverse loops and short circuits dynamically as the user designs.5  
4. **Legacy Ecosystem Compatibility:** A robust parsing strategy for XTrackCAD (.xtc) and parameter (.xtp) files, leveraging existing open-source Rust parsers compiled to WASM to ensure immediate interoperability with decades of community-generated content.7

## ---

**2\. User Interface Architecture: The "OS within a Browser" Paradigm**

In a desktop CAD context, the user interface must support high-density information display and customizable workflows. The user is not merely consuming content but manipulating a complex object graph through multiple simultaneous views: a 2D layout editor, a 3D visualization preview, a parts library, and a property inspector.

### **2.1 Windowing and Layout Management**

The standard single-column web layout is insufficient. The application requires a Tiling Window Manager architecture. Research into the React ecosystem identifies a bifurcation in layout libraries. **Golden Layout**, once the industry standard for this pattern, has in its version 2.0 migration dropped native React support in favor of a framework-agnostic approach, introducing significant friction in context propagation and component lifecycle management.8

Consequently, **FlexLayout** emerges as the superior architectural choice.9 It is designed natively for React, supporting complex tabsets, splitters, and crucially, "pop-out" windows. This feature allows users to detach the "3D Preview" or "Manifest List" into a separate browser window (leveraging window.open and React Portals) while maintaining state synchronization with the main application store. This capability is paramount for multi-monitor setups common in desktop workstations.

| Feature | FlexLayout | Golden Layout v2 | Dockview |
| :---- | :---- | :---- | :---- |
| **React Support** | Native Component Wrapping | Adapter Required | Native |
| **Popout Windows** | Full Support (Portals) | Supported | Supported |
| **Serialization** | JSON Model-based | JSON Config | JSON |
| **Touch Support** | Yes (Not required but present) | Removed in v2 | Yes |
| **Maintenance** | Active | Passive | Very Active |
| **Complexity** | High (Steep learning curve) | Medium | Medium |

**Dockview** represents a modern alternative with a "VS Code-like" aesthetic and robust TypeScript support.9 However, FlexLayout’s established stability in handling "edge constraints"—such as preventing a property panel from shrinking below a usable width—makes it the pragmatic choice for a data-dense CAD application where layout stability is critical.11

### **2.2 Component Primitives and Accessibility**

For the internal UI controls (dropdowns, context menus, dialogs), the "Headless UI" pattern is mandated. This decouples logic from styling, allowing the application to implement a bespoke "Technical CAD" aesthetic (high contrast, compact spacing) without fighting framework defaults.

**Radix UI** is selected over **React Aria** for the desktop-specific shell elements.12 While React Aria offers granular hooks for building accessible components from scratch, Radix provides higher-level primitives that handle complex desktop behaviors out-of-the-box. Specifically, the Radix **Context Menu** primitive automatically handles viewport collision detection (preventing menus from opening off-screen) and nested sub-menus, which are ubiquitous in CAD workflows (e.g., Right Click \-\> Turnout Operations \-\> Change To Wye).12

**React Aria** remains a candidate for the canvas-internal interactions (like custom tooltips on track joints) due to its lower-level hook architecture, which can be composed into the custom canvas renderer.13

### **2.3 State Management: The Undo/Redo Imperative**

Track planning involves complex transactions. A single user action, such as "Delete Turnout," may trigger a cascade of state changes: removing the turnout, healing the connected track segments, deleting associated electrical gaps, and updating the parts manifest.

The "Snapshot" pattern (deep copying the entire state tree for every undo step) is computationally prohibitive. With a large layout (10MB+ JSON state), storing 50 undo steps would consume 500MB of RAM and induce noticeable garbage collection pauses.15

The recommended architecture utilizes **Immer.js** with its **Patches** feature.16 Immer allows the application to perform mutable updates on a "draft" state, which it then finalizes into an immutable tree. Crucially, Immer can generate a **JSON Patch** (standardized RFC 6902\) describing the forward change and an **Inverse Patch** describing the rollback.

* **Forward Patch:** \[{ "op": "replace", "path": \["tracks", "t\_101", "x"\], "value": 500 }\]  
* **Inverse Patch:** \[{ "op": "replace", "path": \["tracks", "t\_101", "x"\], "value": 490 }\]

By storing only these lightweight patches in the history stack, the memory footprint is reduced by orders of magnitude. This approach also facilitates **Collaborative Editing** features in the future, as patches can be transmitted over WebSockets more efficiently than full state snapshots.15

## ---

**3\. High-Performance Graphics Pipeline**

The rendering engine is the critical path for user experience. A "laggy" viewport that drops frames during panning or zooming destroys the illusion of direct manipulation required for CAD. The browser's main thread, shared by React reconciliation, UI event handling, and layout calculations, is fundamentally ill-suited for the heavy render loop of a complex CAD drawing.

### **3.1 The OffscreenCanvas and Web Worker Architecture**

To achieve a "native-like" performance profile, the application must decouple rendering from the UI thread. The **OffscreenCanvas** API allows the transfer of a canvas's control to a **Web Worker**.2

**Implementation Strategy:**

1. **Main Thread (UI):** Handles DOM events (pointer down, move, wheel). It calculates the "Command" (e.g., PAN\_BY\_DELTA, UPDATE\_SELECTION) and posts it to the worker via postMessage.  
2. **Worker Thread (Render):** Maintains the scene graph. It executes the render loop driven by requestAnimationFrame (which is available in workers).  
3. **Synchronization:** To prevent data serialization overhead (copying huge track arrays between threads), the system should utilize **SharedArrayBuffer**. The main thread writes track coordinates to a shared buffer, and the worker reads them directly to populate vertex buffers.18

This architecture ensures that even if the React UI freezes momentarily (e.g., while reconciling a large property panel update), the canvas continues to redraw at 60 FPS, maintaining visual responsiveness.19

### **3.2 Rendering Engine Selection: Custom Hybrid Engine**

While generic 2D libraries like **PixiJS** and **Paper.js** exist, they are suboptimal for this specific domain.

* **PixiJS:** Optimized for sprites and textures (GPU-bound). A track plan consists primarily of *parametric curves* (rails) that must be tessellated into triangles. PixiJS is inefficient at drawing dynamic vector shapes that change every frame (requiring constant re-tessellation), leading to performance degradation in CAD scenarios where "redraw" is frequent.20  
* **Paper.js:** A vector graphics library that relies heavily on the DOM and main-thread Canvas 2D API. It lacks native support for OffscreenCanvas and Web Workers without significant "monkey-patching".21

**Recommendation:** A **Custom Hybrid Engine** is required.

1. **WebGL Context:** Used for drawing the dynamic track geometry (rails, centerlines). WebGL allows for "Instanced Rendering," where a single geometry (a railway tie/sleeper) can be drawn thousands of times with a single draw call, scaling, and rotating it via a matrix buffer.23 This is essential for rendering a layout with 50,000+ ties without CPU bottlenecks.  
2. **Geometry Tessellation in WASM:** The heavy lifting of converting a mathematical curve (Cornu Spiral) into a set of triangles for WebGL should be performed by a Rust WASM module to minimize garbage collection overhead.24

### **3.3 Input Abstraction and Coordinate Systems**

Input handling in CAD requires distinguishing between "Screen Coordinates" (pixels) and "World Coordinates" (meters).

* Zoom Strategy: The "Zoom-to-Point" algorithm must be implemented, where the world coordinate under the mouse cursor remains invariant during the scale operation.

  $$T\_{new} \= P\_{mouse} \- (P\_{mouse} \- T\_{old}) \\times \\frac{S\_{new}}{S\_{old}}$$  
* **Gesture Library:** **React Use Gesture** is recommended to standardize input across devices (mouse wheel vs. trackpad pinch).25 It provides kinetic scrolling (inertia) and robust delta calculations, which can be forwarded directly to the render worker.

## ---

**4\. Computational Geometry: The Mathematics of Track**

Track planning is distinct from vector illustration because the curves must adhere to physical constraints. Trains cannot navigate instantaneous changes in curvature; they require **Transition Curves** to mitigate lateral jerk.

### **4.1 The Cornu Spiral (Clothoid) Implementation**

The industry standard for rail transitions is the Cornu Spiral (Clothoid), defined by the property that curvature ($\\kappa$) changes linearly with arc length ($s$).

$$\\kappa(s) \= \\alpha s$$

The Cartesian coordinates are defined by Fresnel Integrals, which have no closed-form solution and must be approximated.26  
Numerical Implementation:  
Standard Riemann sum integration is too slow for real-time interaction. The application must implement Heald’s approximation or Rational Chebyshev approximations for the Fresnel Integrals $C(t)$ and $S(t)$.28

* For small $t$: Use the Taylor series expansion, which converges rapidly.

  $$S(t) \\approx \\frac{\\pi t^3}{6} \- \\frac{\\pi^3 t^7}{336} \+ \\dots$$  
* **For large $t$:** Use asymptotic expansions to avoid precision loss.29

The G1 Fitting Problem:  
The core interactivity of the "Join Tool" involves finding a specific Clothoid segment that connects two fixed endpoints with specific tangent angles. This is a Hermite G1 Interpolation problem. The solution involves solving a system of nonlinear equations to find the Clothoid parameter $A$ and length $L$. This requires a Newton-Raphson solver, which should be implemented in Rust/WASM to ensure convergence within the 16ms frame budget.30

### **4.2 Boolean Operations and Clipper2**

Track planning involves complex polygonal logic: computing the "ballast" footprint (offsetting the centerline) and detecting collisions between structures.  
Clipper2 is the definitive library for these polygon offset/clipping operations.4 Research indicates that the pure JavaScript port of Clipper is significantly slower than the C++ original. The clipper2-wasm port is mandatory, offering a 30-50% performance improvement and better numerical robustness (handling micro-self-intersections) compared to JS alternatives.24

## ---

**5\. Topological Analysis: Electrical Integrity**

A specialized requirement for model railroading (specifically 2-rail Direct Current or Digital Command Control systems) is the detection of **Reverse Loops**. A reverse loop occurs when a train can return to its starting point with its orientation reversed, causing the left rail to bridge to the right rail, creating a dead short.

### **5.1 Graph Theory Model**

The layout must be modeled not just as a geometric entity but as a **Topological Graph**:

* **Vertices:** Turnouts and track endpoints.  
* **Edges:** Track segments.  
* **Properties:** Each edge must track "Phase Continuity." A standard track preserves phase (Left Rail \-\> Left Rail). A crossover or wye might invert it depending on traversal.

### **5.2 Reverse Loop Detection Algorithms**

The detection of a reverse loop is formally equivalent to detecting an **Odd Cycle** in a **Signed Graph**.5

* **Signed Graph:** Assign a value of $+1$ to edges that preserve polarity and $-1$ to edges that invert it (conceptually, in a 2D plan, loops invert polarity).  
* **Algorithm:**  
  1. **Bipartite Checking:** A graph with no conflicting loops is Bipartite (colorable with 2 colors, representing Phase A and Phase B).  
  2. **Traversal:** Perform a Depth First Search (DFS) or BFS coloring. If we encounter a visited node with the *same* color as the current node, a "short circuit" cycle exists.5  
  3. **Odd Cycle Transversal:** Once a short is detected, the system must suggest where to place "Gaps" (Insulated Rail Joiners) to resolve it. This is the **Odd Cycle Transversal** problem—finding the minimum set of edges to remove to make the graph bipartite. While NP-hard in general, for the sparse, planar graphs typical of layouts, parameterized algorithms (or simply identifying the "feedback edge set" of the spanning tree) are efficient enough.34

This validation logic should run in a background **Web Worker** whenever the topology changes (e.g., a track is joined), providing non-blocking feedback to the user.

## ---

**6\. Legacy Ecosystem: XTrackCAD Interoperability**

To gain adoption, the tool must read the existing library of layouts and parts created for XTrackCAD (.xtc and .xtp files).

### **6.1 The.xtc File Format**

The .xtc format is a mixed text/binary format that has evolved over decades. It is not formally documented in a single specification but can be inferred from the open-source parser implementations.7

* **Structure:** Line-based commands.  
  * S: Straight Track (x1, y1, x2, y2).  
  * C: Curved Track (center\_x, center\_y, radius, angle, sweep).  
  * E: Easement/Cornu (defined by start/end curvature and length).37  
  * T: Turnout (grouped collection of S, C, and E lines).

### **6.2 The Rust Parser Strategy**

Implementing a parser for this legacy format in TypeScript is risky due to subtle float handling and undocumented edge cases in the C++ original. A **Rust parser crate** (xtrakcad\_parser) already exists.7 The optimal strategy is to compile this crate to **WASM**.

* **Workflow:** The browser reads the .xtc file as an ArrayBuffer, passes it to the WASM module, which parses the legacy structure and returns a normalized JSON object matching the new application's schema. This ensures 100% fidelity with legacy files without maintaining a parallel parser implementation.

## ---

**7\. Implementation Roadmap and Tech Stack Recommendations**

Based on the research, the following technology stack is recommended for the "Web Track Designer":

| Layer | Technology | Justification |
| :---- | :---- | :---- |
| **Language** | TypeScript | Type safety for complex domain logic. |
| **UI Framework** | React 18+ | Concurrency features, ecosystem dominance. |
| **Windowing** | FlexLayout | Best support for desktop-like docking/popouts.10 |
| **State** | Zustand \+ Immer | Transient updates \+ Patch-based Undo/Redo.15 |
| **Rendering** | Custom WebGL 2.0 | Instanced rendering for ties; performance over convenience. |
| **Workers** | Comlink | RPC-like communication with Render/Physics workers. |
| **Geometry** | Rust (WASM) | clipper2-wasm 24, xtrakcad\_parser 7, G1 Solver. |
| **Input** | React Use Gesture | Standardized kinetic input handling.25 |

### **7.1 Development Phases**

1. **Phase I: The Engine Foundation**  
   * Establish the Vite build pipeline with WASM support.  
   * Implement the OffscreenCanvas \+ Worker bridge using Comlink.  
   * Build the "Instanced Mesh" renderer for efficient sleeper drawing in WebGL.  
2. **Phase II: The Mathematical Core**  
   * Implement the Rust CornuSpiral solver and compile to WASM.  
   * Create the "Join Tool" interaction utilizing the G1 fitting algorithm.  
   * Integrate clipper2-wasm for ballast generation (polygon offsetting).  
3. **Phase III: The Desktop Shell**  
   * Integrate FlexLayout.  
   * Implement the Immer patch-based history stack.  
   * Build the Property Inspector using Radix UI primitives.  
4. **Phase IV: Validation and Legacy**  
   * Implement the Graph Topology worker (Odd Cycle Transversal).  
   * Integrate the xtrakcad\_parser WASM module for .xtc import.

## **8\. Conclusion**

The feasibility of a desktop-class track planner on the web is no longer limited by the platform, but by the architectural choices of the implementation. By strictly adhering to a **desktop-only** scope, utilizing **Web Workers** for the heavy geometric lifting, and adopting **Rust/WASM** for the mathematical core, this application can surpass the performance of legacy native tools while offering the accessibility of the cloud. The key to success lies not in using high-level drawing libraries, but in engineering a bespoke rendering and logic pipeline tailored to the specific mathematical and topological constraints of railway geometry.

# **Detailed Technical Analysis**

## **9\. Window Management and The Desktop Shell**

The decision to target desktop browsers exclusively allows for a User Interface (UI) density that would be impossible on mobile devices. The application shell must function less like a website and more like an operating system window manager, handling panel docking, focus states, and z-indexing.

### **9.1 Comparative Analysis of Windowing Libraries**

The research highlights a critical divergence in the React ecosystem regarding docking layout libraries. The choice of library dictates the fundamental structure of the application's component tree.

**Golden Layout:** Historically the standard, version 2.0 represented a complete rewrite that removed the direct React integration in favor of a framework-agnostic approach.8 While technically sound, this introduces significant "glue code" requirements to mount React components into the DOM nodes Golden Layout manages. Furthermore, the removal of "Nested Stacks" in v2 limits the flexibility required for complex CAD interfaces where users might want to stack a "Properties" panel behind a "Layers" panel but strictly constrained to a sidebar column.8

**FlexLayout:** This library is identified as the optimal candidate.10 Its architecture is "React-Native" (not the framework, but the philosophy), meaning layout nodes are rendered as true React components. This preserves Context propagation (essential for theming and state management libraries like Redux or Recoil). Crucially, FlexLayout supports **Popout Windows**.

* **Use Case:** A user with a dual-monitor setup can drag the "3D Visualization" tab out of the main window. FlexLayout utilizes window.open and React Portals to render the component in the new window while keeping it connected to the main React component tree. State updates in the main window reflect instantly in the popped-out window without complex inter-window message passing.10

**Dockview:** A newer entrant that replicates the Visual Studio Code docking experience.9 While promising and highly performant, it is less mature than FlexLayout regarding the serialization of complex layouts. For a professional tool, the ability to robustly save and restore user workspace configurations (JSON serialization) is non-negotiable.9 FlexLayout's model-based approach (FlexLayout.Model.fromJson) is battle-tested for this requirement.10

### **9.2 Headless UI Components: Radix vs. React Aria**

In a desktop CAD application, widgets are complex. A "Color Picker" might need to handle alpha channels and saved palettes; a "Turnout Selector" needs to render SVG previews of switches in the dropdown list.

**Radix UI** is selected for the "Shell" components (Menus, Dialogs, Popovers).12 Its "Context Menu" primitive is particularly valuable. In a track planner, right-clicking a track segment must trigger a menu. If that click happens at the bottom of the screen, the menu must intelligently reposition itself upwards to avoid being clipped. Radix handles this collision detection automatically.

**React Aria** is recommended for "Canvas-Internal" interactions.13 When building custom controls *inside* the canvas (e.g., a "drag handle" for a Bezier curve control point), React Aria's useMove and useFocus hooks provide the logic for keyboard accessibility and focus management without imposing DOM structure. This allows the canvas renderer to remain the source of truth for layout while delegating interaction logic to robust hooks.

### **9.3 State Management: The "Patch" Architecture**

A CAD application's state is a massive graph of interconnected objects. A Layout might contain:

* tracks: Dictionary of 10,000 segments.  
* connections: Adjacency list of track joints.  
* layers: Visibility states.

Using standard Redux/Zustand patterns where every update clones the state tree is fatal for performance. If a user drags a track, the mousemove event fires every 16ms. Cloning a 10MB state object 60 times a second will crash the browser.

**Immer.js with Patches** is the solution.15

1. **Transient Updates:** During a drag, the application should *not* update the main history state. It should update a "Transient" or "Draft" layer in the store. This is a lightweight, mutable update.  
2. **Committed Updates:** On mouseup, the transaction is committed. Immer compares the start and end states and generates a **Patch**.  
3. **History Stack:** Instead of storing the full state, the history stack stores only the patches.  
   * **Undo:** Apply inversePatch.  
   * Redo: Apply patch.  
     This reduces memory consumption from $O(N \\times \\text{HistoryLength})$ to $O(N \+ \\text{Changes} \\times \\text{HistoryLength})$.15

## **10\. The Rendering Core: OffscreenCanvas & Custom WebGL**

The render loop is the heartbeat of the application. The research explicitly advises against using general-purpose game engines (like Phaser) or DOM-heavy vector libraries (like Paper.js) for this specific use case.

### **10.1 The Limitations of General Purpose Engines**

**PixiJS:** Pixi is a batch renderer for 2D sprites. It is incredibly fast at drawing 10,000 identical "bunnies" (textures). However, a track plan is composed of **parametric curves**. To draw a curved rail in Pixi, one must use PIXI.Graphics. Behind the scenes, Pixi must triangulate this curve into thousands of polygons. If the curve changes (e.g., during a drag), Pixi must re-triangulate the entire shape every frame. This CPU-side triangulation creates a bottleneck that stalls the main thread.20

**Paper.js:** Paper.js models vector graphics as a scene graph of objects. While its API is elegant for geometric math, it is tied to the main thread. It does not support OffscreenCanvas in a worker environment natively.21 In a layout with 5,000 objects, the overhead of the Paper.js scene graph (traversal and event bubbling) becomes the limiting factor.

### **10.2 The Custom Hybrid Architecture**

To achieve 60FPS with 50,000+ elements (ties, spikes, rail contours), a custom architecture is required.

1. **Worker Thread (The Render Loop):**  
   * **Context:** OffscreenCanvas transferred from the main thread.2  
   * **API:** WebGL 2.0 (for Instanced Arrays).  
   * **Data:** Controlled via SharedArrayBuffer to prevent copying costs.  
2. **Instanced Rendering for Ties:**  
   * Railway ties (sleepers) are identical rectangles, differing only in position and rotation.  
   * Instead of drawing 50,000 rectangles (which would choke the GPU command buffer), we upload the geometry of *one* tie to the GPU.  
   * We then upload a Float32Array buffer containing the \[x, y, rotation\] for every tie.  
   * We issue a single gl.drawArraysInstanced() call. The GPU handles the multiplication. This allows rendering millions of ties with near-zero CPU cost.23  
3. **Vector Rendering for Rails:**  
   * Rails are continuous curves. These are drawn using gl.TRIANGLE\_STRIP.  
   * The vertices for these strips are generated in the Worker (using the Math module) whenever the track geometry changes.

### **10.3 Texture Atlases and Caching**

To further optimize, static elements (like the ballast texture or terrain background) should be rasterized into a **Texture Atlas**.40

* When a user isn't editing the terrain, the renderer shouldn't re-draw the terrain vectors. It should simply draw a cached texture (bitmap) of the terrain.  
* This "Cache-As-Bitmap" strategy is common in CAD. The application monitors "Dirty Rectangles." If a user changes a track in Sector A, only the Sector A cache is invalidated and redrawn.

## **11\. Computational Geometry: The Mathematics of Track**

This section details the specific mathematical implementation required for the "Cornu Spiral" (Clothoid), which is the standard transition curve for railways.

### **11.1 The Mathematical Definition**

The Clothoid is defined by the property that the curvature $\\kappa$ is proportional to the arc length $s$: $\\kappa \= A^2 s$, where $A$ is the scaling parameter.  
The coordinates $(x, y)$ at length $L$ are given by the Fresnel Integrals:

$$C(L) \= \\int\_0^L \\cos(\\frac{\\pi t^2}{2}) dt$$

$$S(L) \= \\int\_0^L \\sin(\\frac{\\pi t^2}{2}) dt$$

### **11.2 Numerical Approximation Strategy**

Evaluating these integrals in real-time (60 times a second during a mouse drag) requires approximation. The snippet 28 and mathematical resources 29 suggest a two-pronged approach:

1. Power Series (Small $t$):  
   For $t \< \\sqrt{2.5}$, the Taylor series converges rapidly. 10 terms are sufficient for double-precision accuracy.

   $$C(t) \= \\sum\_{n=0}^\\infty \\frac{(-1)^n (\\frac{\\pi}{2})^{2n} t^{4n+1}}{(2n)\! (4n+1)}$$  
   $$S(t) \= \\sum\_{n=0}^\\infty \\frac{(-1)^n (\\frac{\\pi}{2})^{2n+1} t^{4n+3}}{(2n+1)\! (4n+3)}$$  
2. Asymptotic Expansion (Large $t$):  
   For $t \> \\sqrt{2.5}$, the series becomes unstable. We switch to the asymptotic form involving auxiliary functions $f(t)$ and $g(t)$.28  
   $$C(t) \= \\frac{1}{2} \+ f(t)\\sin(\\frac{\\pi t^2}{2}) \- g(t)\\cos(\\frac{\\pi t^2}{2})$$  
   $$S(t) \= \\frac{1}{2} \- f(t)\\cos(\\frac{\\pi t^2}{2}) \- g(t)\\sin(\\frac{\\pi t^2}{2})$$

   Where $f(t)$ and $g(t)$ are rational approximations.

### **11.3 The G1 Fitting Algorithm (Solver)**

The user interaction "Connect Track A to Track B" poses the G1 Hermite Interpolation Problem.  
Given:

* Start Point $P\_0$, Angle $\\theta\_0$, Curvature $\\kappa\_0$ (usually 0).  
* End Point $P\_1$, Angle $\\theta\_1$, Curvature $\\kappa\_1$ (usually $1/R$).  
* Find: A Clothoid segment that smoothly connects them.

This is a boundary value problem. It results in a system of non-linear equations that must be solved for the Clothoid parameters. The robust solution utilizes a **Newton-Raphson** iterative solver.30

* **Step 1:** Guess an initial Length $L$.  
* **Step 2:** Calculate the error in position $\\Delta P$ and angle $\\Delta \\theta$ at the endpoint using the Fresnel approximations.  
* **Step 3:** Calculate the Jacobian matrix (derivatives of coordinates with respect to $L$ and $A$).  
* **Step 4:** Update guess: $L\_{new} \= L\_{old} \- J^{-1} \\times Error$.  
* **Step 5:** Repeat until Error \< Epsilon.

Because this involves hundreds of floating-point operations per iteration, implementing this in **Rust** and compiling to **WebAssembly** is strictly required to prevent frame drops during interactive editing.24

## **12\. Topological Analysis: The Reverse Loop Problem**

Topological analysis transforms the layout from a "drawing" into a "simulation." The primary safety check in model railroading is preventing short circuits caused by reverse loops (e.g., a balloon loop).

### **12.1 Graph Construction**

The layout is converted into a **Signed Graph** $G \= (V, E, \\sigma)$.

* $V$ (Vertices): Connection points (Track Joints).  
* $E$ (Edges): Tracks.  
* $\\sigma$ (Signature): A mapping $E \\to \\{+1, \-1\\}$.  
  * $+1$: Normal connection (Left Rail \-\> Left Rail).  
  * $-1$: Cross connection (Left Rail \-\> Right Rail). Note: In 2D track plans, a "Turnout" or "Crossing" essentially functions as a node that might permute connections.

### **12.2 Cycle Detection Algorithm**

A "Reverse Loop" creates a cycle where the product of the signatures of the edges is $-1$ (an "unbalanced" cycle). This means if you trace the Left Rail around the loop, you return to the Right Rail.

**Algorithm Detail:**

1. **Spanning Tree Construction:** Use BFS to build a Spanning Tree $T$ of the graph.  
2. **Fundamental Cycles:** For every edge $e$ not in $T$, adding $e$ to $T$ creates exactly one cycle.  
3. **Check Balance:** For each fundamental cycle, check if it is unbalanced (product of signatures is \-1).  
   * If unbalanced, a reverse loop exists.  
4. **Resolution (Feedback Edge Set):** The edges that form the unbalanced cycle are candidates for "Gapping" (insulation). The UI should highlight these edges. Tarjan's Bridge-Finding algorithm can be used as a pre-processing step: any edge that is a "Bridge" cannot be part of a loop and thus is safe.6 Only non-bridge edges need to be checked.

## **13\. Legacy Interoperability: Parsing.xtc Files**

The vast library of XTrackCAD layouts makes .xtc support a critical feature. The file format is not officially documented, but open-source parsers provide a Rosetta Stone.

### **13.1 Format Analysis**

Based on the Rust parser analysis 36 and snippets 41, the format is a plain text stream of commands.

* **Header:** VERSION, TITLE, SCALE.  
* **Definition Block:** Defines Turnouts/Structures.  
  * TURNOUT: Starts definition.  
  * S: Straight segment.  
  * C: Curved segment.  
  * P: Path definitions (e.g., "Path 1 connects endpoints 0 and 1").  
* **Layout Block:** Instances of tracks.  
  * T: Turnout instance (x, y, rotation).  
  * J: Join (Cornu) track.

### **13.2 The WASM Parser**

Writing a parser in TypeScript for a format with whitespace sensitivity and legacy C++ quirks is error-prone. The recommended approach is to take the existing **Rust** crate xtrakcad\_parser 7 and compile it to **WASM**.

* **Interface:** The WASM module exposes a single function parse\_xtc(buffer: Uint8Array) \-\> JSON\_String.  
* **Data transformation:** The Rust code handles the messy tokenization. The TypeScript code receives a clean JSON object and "hydrates" it into the Zustand store. This creates a reliable, high-performance import pipeline that is bug-for-bug compatible with the original XTrackCAD logic.

## **14\. Conclusion**

This report has outlined a comprehensive architecture for a desktop-class Web Track Designer. By rejecting the "one-size-fits-all" approach of responsive web design and embracing the specific capabilities of the desktop browser—Web Workers for threading, WASM for math, and FlexLayout for windowing—the proposed application can successfully displace legacy native software. The integration of rigorous mathematical models (Clothoids) and topological safety checks (Graph Theory) ensures the tool is not merely a drawing program, but a true engineering instrument for the model railroading community.

#### **Works cited**

1. Panning and Zooming \- React Flow, accessed January 1, 2026, [https://reactflow.dev/learn/concepts/the-viewport](https://reactflow.dev/learn/concepts/the-viewport)  
2. OffscreenCanvas \- Web APIs | MDN, accessed January 1, 2026, [https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas)  
3. Enhancing Graphics Performance with OffscreenCanvas and D3.js \- DEV Community, accessed January 1, 2026, [https://dev.to/jeevankishore/enhancing-graphics-performance-with-offscreencanvas-and-d3js-19ka](https://dev.to/jeevankishore/enhancing-graphics-performance-with-offscreencanvas-and-d3js-19ka)  
4. Clipper2 \- Polygon Clipping Offsetting & Triangulating \- angusj.com, accessed January 1, 2026, [https://www.angusj.com/clipper2/Docs/Overview.htm](https://www.angusj.com/clipper2/Docs/Overview.htm)  
5. Check if a graphs has a cycle of odd length \- GeeksforGeeks, accessed January 1, 2026, [https://www.geeksforgeeks.org/dsa/check-graphs-cycle-odd-length/](https://www.geeksforgeeks.org/dsa/check-graphs-cycle-odd-length/)  
6. Possibly all the ways to get loop-finding in graphs wrong, accessed January 1, 2026, [https://www.chiark.greenend.org.uk/\~sgtatham/quasiblog/findloop/](https://www.chiark.greenend.org.uk/~sgtatham/quasiblog/findloop/)  
7. xtrakcad\_parser \- Rust \- Docs.rs, accessed January 1, 2026, [https://docs.rs/xtrakcad\_parser](https://docs.rs/xtrakcad_parser)  
8. Version 2 | golden-layout \- GitHub Pages, accessed January 1, 2026, [https://golden-layout.github.io/golden-layout/version-2/](https://golden-layout.github.io/golden-layout/version-2/)  
9. Show HN: TypeScript/React/Vue Window Layout Manager (Tabs, Floating, Popouts) | Hacker News, accessed January 1, 2026, [https://news.ycombinator.com/item?id=42666492](https://news.ycombinator.com/item?id=42666492)  
10. caplin/FlexLayout: Docking Layout Manager for React \- GitHub, accessed January 1, 2026, [https://github.com/caplin/FlexLayout](https://github.com/caplin/FlexLayout)  
11. Dockview is phenomenal, and congrats to @mathuo on a great project \- I've recent... | Hacker News, accessed January 1, 2026, [https://news.ycombinator.com/item?id=42669734](https://news.ycombinator.com/item?id=42669734)  
12. Explore the Bright Side: Base UI Vs Radix UI Features \- Shadcn Studio, accessed January 1, 2026, [https://shadcnstudio.com/blog/base-ui-vs-radix-ui](https://shadcnstudio.com/blog/base-ui-vs-radix-ui)  
13. Radix-ui vs React Aria vs Headless UI : r/reactjs \- Reddit, accessed January 1, 2026, [https://www.reddit.com/r/reactjs/comments/1989sd3/radixui\_vs\_react\_aria\_vs\_headless\_ui/](https://www.reddit.com/r/reactjs/comments/1989sd3/radixui_vs_react_aria_vs_headless_ui/)  
14. React Aria vs Radix UI: Which Headless UI Component Library do you prefer? \- Reddit, accessed January 1, 2026, [https://www.reddit.com/r/reactjs/comments/1gbq7yt/react\_aria\_vs\_radix\_ui\_which\_headless\_ui/](https://www.reddit.com/r/reactjs/comments/1gbq7yt/react_aria_vs_radix_ui_which_headless_ui/)  
15. Rethinking Undo/Redo \- Why We Need Travels \- DEV Community, accessed January 1, 2026, [https://dev.to/unadlib/rethinking-undoredo-why-we-need-travels-2lcc](https://dev.to/unadlib/rethinking-undoredo-why-we-need-travels-2lcc)  
16. Use Immer Patches to Build Redo Functionality | egghead.io, accessed January 1, 2026, [https://egghead.io/lessons/react-use-immer-patches-to-build-redo-functionality](https://egghead.io/lessons/react-use-immer-patches-to-build-redo-functionality)  
17. What is the best way to implement undo state change (undo store/history implementation) in React Redux \- Stack Overflow, accessed January 1, 2026, [https://stackoverflow.com/questions/43060953/what-is-the-best-way-to-implement-undo-state-change-undo-store-history-implemen](https://stackoverflow.com/questions/43060953/what-is-the-best-way-to-implement-undo-state-change-undo-store-history-implemen)  
18. How to use canvas in Web Workers with OffscreenCanvas \- DEV Community, accessed January 1, 2026, [https://dev.to/sachinchaurasiya/how-to-use-canvas-in-web-workers-with-offscreencanvas-5540](https://dev.to/sachinchaurasiya/how-to-use-canvas-in-web-workers-with-offscreencanvas-5540)  
19. Using Web Workers and OffscreenCanvas for Smooth Rendering in JavaScript \- Medium, accessed January 1, 2026, [https://medium.com/@lightxdesign55/using-web-workers-and-offscreencanvas-for-smooth-rendering-in-javascript-1c9df43fdb52](https://medium.com/@lightxdesign55/using-web-workers-and-offscreencanvas-for-smooth-rendering-in-javascript-1c9df43fdb52)  
20. Something is definitely up with this benchmark \- PixiJS can handle over 60k obje... | Hacker News, accessed January 1, 2026, [https://news.ycombinator.com/item?id=23086287](https://news.ycombinator.com/item?id=23086287)  
21. Allow using paperjs without canvas · Issue \#634 \- GitHub, accessed January 1, 2026, [https://github.com/paperjs/paper.js/issues/634](https://github.com/paperjs/paper.js/issues/634)  
22. Cannot rasterize the layer in worker thread · Issue \#1643 · paperjs/paper.js \- GitHub, accessed January 1, 2026, [https://github.com/paperjs/paper.js/issues/1643](https://github.com/paperjs/paper.js/issues/1643)  
23. WebGL best practices \- Web APIs | MDN, accessed January 1, 2026, [https://developer.mozilla.org/en-US/docs/Web/API/WebGL\_API/WebGL\_best\_practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)  
24. clipper2-wasm \- NPM, accessed January 1, 2026, [https://www.npmjs.com/package/clipper2-wasm](https://www.npmjs.com/package/clipper2-wasm)  
25. samselikoff/react-use-gesture: Bread n butter utility for component-tied mouse/touch gestures in React \- GitHub, accessed January 1, 2026, [https://github.com/samselikoff/react-use-gesture](https://github.com/samselikoff/react-use-gesture)  
26. Track transition curves, accessed January 1, 2026, [https://courses.grainger.illinois.edu/tam212/su2025/avt.html](https://courses.grainger.illinois.edu/tam212/su2025/avt.html)  
27. Euler's spiral (Clothoid) | JSXGraph share, accessed January 1, 2026, [https://jsxgraph.org/share/example/eulers-spiral-clothoid](https://jsxgraph.org/share/example/eulers-spiral-clothoid)  
28. Computation of Fresnel Integrals \- PMC \- NIH, accessed January 1, 2026, [https://pmc.ncbi.nlm.nih.gov/articles/PMC4894596/](https://pmc.ncbi.nlm.nih.gov/articles/PMC4894596/)  
29. asymptotic approximation of Fresnel integrals with complex argument, accessed January 1, 2026, [https://math.stackexchange.com/questions/4288912/asymptotic-approximation-of-fresnel-integrals-with-complex-argument](https://math.stackexchange.com/questions/4288912/asymptotic-approximation-of-fresnel-integrals-with-complex-argument)  
30. The Clothoid Computation: A Simple and Efficient Numerical Algorithm \- USC, accessed January 1, 2026, [https://investigacion.usc.gal/documentos/5d9dae1b299952484ef80db1/f/62d04f6f1aa9016cd991537f.pdf](https://investigacion.usc.gal/documentos/5d9dae1b299952484ef80db1/f/62d04f6f1aa9016cd991537f.pdf)  
31. ebertolazzi/G1fitting: G1 fitting with clothoids \- GitHub, accessed January 1, 2026, [https://github.com/ebertolazzi/G1fitting](https://github.com/ebertolazzi/G1fitting)  
32. Seeking suggestions to optimize Clipper2 performance in WebAssembly \#20985 \- GitHub, accessed January 1, 2026, [https://github.com/emscripten-core/emscripten/discussions/20985](https://github.com/emscripten-core/emscripten/discussions/20985)  
33. Bipartition: Detecting Odd Length Cycles in Graphs | by Manthan chauhan | Medium, accessed January 1, 2026, [https://medium.com/@manthanchauhan913/bipartition-detecting-odd-length-cycles-in-graphs-699d1b25ffab](https://medium.com/@manthanchauhan913/bipartition-detecting-odd-length-cycles-in-graphs-699d1b25ffab)  
34. Odd cycle transversal \- Wikipedia, accessed January 1, 2026, [https://en.wikipedia.org/wiki/Odd\_cycle\_transversal](https://en.wikipedia.org/wiki/Odd_cycle_transversal)  
35. An (almost) Linear Time Algorithm For Odd Cycles Transversal \- ResearchGate, accessed January 1, 2026, [https://www.researchgate.net/publication/220780054\_An\_almost\_Linear\_Time\_Algorithm\_For\_Odd\_Cycles\_Transversal](https://www.researchgate.net/publication/220780054_An_almost_Linear_Time_Algorithm_For_Odd_Cycles_Transversal)  
36. main@xtrackcad.groups.io | Topics, accessed January 1, 2026, [https://xtrackcad.groups.io/g/main/topics](https://xtrackcad.groups.io/g/main/topics)  
37. XTrackCAD \- Sumida Crossing, accessed January 1, 2026, [http://www.sumidacrossing.org/LayoutConstruction/PlanningTrack/XTrackCAD/](http://www.sumidacrossing.org/LayoutConstruction/PlanningTrack/XTrackCAD/)  
38. RobertPHeller/xtrakcad\_parser: XTrackCAD layout file parser \- GitHub, accessed January 1, 2026, [https://github.com/RobertPHeller/xtrakcad\_parser](https://github.com/RobertPHeller/xtrakcad_parser)  
39. Rendering One Million Datapoints with D3 and WebGL \- Scott Logic Blog, accessed January 1, 2026, [https://blog.scottlogic.com/2020/05/01/rendering-one-million-points-with-d3.html](https://blog.scottlogic.com/2020/05/01/rendering-one-million-points-with-d3.html)  
40. 60 to 1500 FPS — Optimising a WebGL visualisation | by Dhia Shakiry | Medium, accessed January 1, 2026, [https://medium.com/@dhiashakiry/60-to-1500-fps-optimising-a-webgl-visualisation-d79705b33af4](https://medium.com/@dhiashakiry/60-to-1500-fps-optimising-a-webgl-visualisation-d79705b33af4)  
41. main@xtrackcad.groups.io | Parameter Files, accessed January 1, 2026, [https://xtrackcad.groups.io/g/main/topic/103935374](https://xtrackcad.groups.io/g/main/topic/103935374)