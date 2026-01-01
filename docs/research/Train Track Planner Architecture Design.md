# **Architectural Specification for a Client-Side Precision Model Railway Planner**

## **1\. Introduction and Scope**

The development of a web-based, client-side miniature train track planner represents a significant software engineering challenge that sits at the intersection of Computer-Aided Design (CAD), computational geometry, and high-performance interactive graphics. This report provides a comprehensive architectural analysis and technical specification for building such a system. The objective is to design a planner capable of handling the precise geometric standards of N scale (1:160) and HO scale (1:87) modeling, while simultaneously supporting the looser, physically tolerant geometry of wooden railway systems like the Ikea Lillabo series.

Unlike generic vector drawing tools, a specialized track planner must enforce domain-specific constraints—rail gauge, minimum curve radii, turnout divergence angles, and transitional easements—while operating strictly within the browser environment. The requirement for "Real Geometry" necessitates a move away from simple tile-based approximations toward a parametric vector engine capable of rendering clothoid transition curves and complex switch ladders with mathematical fidelity. Furthermore, the constraint of a "Client Side Only" architecture mandates the utilization of modern browser APIs for persistence and file management, removing the reliance on backend databases and ensuring user data privacy and offline capability.

This report evaluates the optimal technology stack, focusing on TypeScript for type safety in complex geometric calculations, and conducts a comparative analysis of rendering engines (HTML5 Canvas vs. WebGL) and UI design frameworks to deliver a desktop-class experience in the browser.

## ---

**2\. Domain Engineering and Track Geometry Standards**

To engineer a planner that produces buildable layouts, one must first codify the physical realities of the target domains. A disconnect between the planner's internal coordinate system and the manufactured track specifications results in "phantom" designs that cannot be assembled.

### **2.1 N Scale Geometry (1:160)**

N scale, with a track gauge of 9mm (representing the prototype standard of 1,435mm), requires high precision due to the compact nature of the models. The tolerance for error in N scale is significantly lower than in larger scales; a 1mm gap in a rail joint can cause derailments for lightweight rolling stock.

#### **2.1.1 Precision Standards and Clearance**

The National Model Railroad Association (NMRA) standards and manufacturer specifications define the geometric envelope for N scale. Research indicates a minimum center-to-center track spacing of 1.25 inches (31.75mm) is required for parallel straight tracks to prevent collisions between passing trains.1 However, on curves, this spacing must increase to accommodate the "overhang" of long cars (cantilever effect) and the "underhang" of long-wheelbase locomotives. The planner must dynamically calculate this clearance envelope based on the radius of curvature.

Vertical clearance is equally critical for multi-level layouts. A minimum of 2 inches (50.8mm) is the standard clearance for tunnels and bridges to accommodate rail height, roadbed, and the rolling stock itself.1

#### **2.1.2 Sectional Track Systems: The Kato Unitrack Standard**

Kato Unitrack is the dominant sectional track system in N scale due to its integrated roadbed and reliable "Unijoiner" connection. Implementing Kato geometry requires strict adherence to their metric radius standards. Unlike flex track, which can be bent to any radius, Unitrack relies on a fixed concentric circle system with a standard track spacing of 33mm.2

The planner must implement the following specific radii, as deviation will prevent the user from forming closed loops with standard components:

| Radius Class | Metric Radius (mm) | Imperial (approx) | Usage Context |
| :---- | :---- | :---- | :---- |
| **Compact** | 117mm, 150mm, 183mm | 4.6", 5.9", 7.2" | Strictly for "Pocket Line" trams. Standard locomotives will bind or derail.2 |
| **R1 (Tight)** | 216mm | 8.5" | The absolute minimum for most operational layouts. Long steam engines (4-8-4) will struggle here.2 |
| **R2 (Std)** | 249mm | 9.75" | The inner loop of a standard starter set. |
| **R3 (Std)** | 282mm | 11" | The outer loop of a standard starter set; matches R2 with 33mm spacing.2 |
| **R4 (High)** | 315mm | 12.375" | Standard for Shinkansen (Bullet Train) operation to prevent uncoupling.2 |
| **R5** | 348mm | 13.7" | Concentric outer parallel to R315. |
| **R6** | 381mm | 15" | Wide radius for mainlines. |
| **Easement** | 481mm | 19" | Used for superelevated curves (banked tracks).2 |
| **Switch** | 718mm | 28.25" | The radius of the diverging route in a \#6 Turnout.2 |

The system must rigidly enforce these radii when "snapping" Unitrack pieces. A user attempting to join an R282 curve to an R315 curve without an intermediate straight or transition piece must be flagged, as the physical connectors will not align without damaging the track.

### **2.2 HO Scale Geometry (1:87)**

HO scale runs on 16.5mm gauge track. While the math is similar to N scale, the physical bulk of the models introduces different constraints regarding minimum radii and grade percentages.

#### **2.2.1 Operational Radii Constraints**

The "Minimum Radius" in HO is a critical user setting. While train set equipment can negotiate 18-inch (457mm) curves, realistic operation demands significantly broader geometry.

* **18" (457mm):** The "Train Set" minimum. Suitable for 4-axle diesels and short freight cars.  
* **22" \- 24" (559mm \- 610mm):** The functional minimum for 6-axle diesels and medium steam locomotives (2-8-2).  
* **30" \- 32" (762mm \- 813mm):** The aesthetic minimum for full-length 85-foot passenger cars. Below this radius, the diaphragms between cars will separate visibly, and the cars will look toy-like.3

#### **2.2.2 The Grade Calculation**

The planner must support 3D elevation. A critical constraint in model railroading is the grade (incline).

* **Formula:** $\\text{Grade} (\\%) \= (\\text{Rise} / \\text{Run}) \\times 100$.  
* **Constraint:** Most model locomotives cannot pull a useful load up a grade steeper than 2-3%. Ideally, grades should be kept below 2%.1  
* **Curve Compensation:** Friction increases on curves. The effective grade on a curve is higher than on a tangent. The planner should implement a "compensated grade" calculation, reducing the allowable rise on curved sections to maintain constant locomotive load. A rule of thumb is to reduce the grade by 32/R (where R is radius in inches) percent.4

### **2.3 Ikea and Wooden Railway Geometry (The "Vario" System)**

Designing for Ikea Lillabo (and the compatible Brio system) introduces a fundamentally different engineering paradigm: **Physical Indeterminacy**. Unlike the precision-molded plastics of Kato or Atlas, wooden tracks rely on loose manufacturing tolerances to function.

#### **2.3.1 The Geometry of "Play"**

Wooden track connectors are "peg and hole" systems with significant clearances. A standard Brio curve creates a 45-degree arc. Mathematically, a closed loop involving 45-degree turns leads to lengths involving $\\sqrt{2}$. Since manufacturers simplify lengths to integers (e.g., 144mm straights), a mathematically perfect loop is often impossible.

* **The Vario System:** Brio explicitly designs tracks with "play" or "wiggle room" (the Vario System) to absorb these geometric irrationalities.5  
* **Planner Implication:** A rigid constraint solver will flag valid wooden layouts as "broken" because the endpoints misalign by 2-3mm. The planner must implement a **Fuzzy Snap** algorithm for wooden tracks, allowing connections if endpoints are within a tolerance window (e.g., $\\Delta \< 5mm$ and $\\Delta\\theta \< 5^\\circ$).

#### **2.3.2 Component Dimensions**

The planner must define the Ikea/Brio catalog with unique properties:

* **Gauge:** Grooves in a 40mm wide block.  
* **Module A (Medium Straight):** 144mm.  
* **Module D (Long Straight):** 216mm ($1.5 \\times A$).  
* **Module E (Large Curve):** Radius \~182mm (Centerline). Eight pieces form a circle.  
* **Module E1 (Short Curve):** Radius \~90mm. Very tight; typically used for tight switchbacks.6

Unlike metal track, wooden track is often double-sided. The planner must allow the user to "flip" a piece, which is geometrically equivalent to mirroring the curvature.

## ---

**3\. Mathematical Foundations of Track Geometry**

To satisfy the "Real Geometry" requirement, the application cannot rely on static sprite images. It must generate track geometry procedurally using parametric equations. This allows for infinite zooming without pixelation and enables the generation of complex procedural meshes (rails, ties, ballast) for 3D visualization or high-fidelity 2D plans.

### **3.1 Euler Spirals (Transition Curves)**

In high-fidelity modeling, connecting a straight track (tangent) directly to a circular curve creates a "jerk" point—an instantaneous change in lateral acceleration. Prototypical railroads use transition curves, specifically **Euler Spirals (Clothoids)**, where curvature $\\kappa$ changes linearly with arc length $s$.

The planner must implement the Fresnel Integrals to render these curves. For a spiral of length $L$ connecting a tangent to a curve of radius $R$:

$$x(s) \= \\int\_0^s \\cos\\left(\\frac{u^2}{2A^2}\\right) du$$

$$y(s) \= \\int\_0^s \\sin\\left(\\frac{u^2}{2A^2}\\right) du$$

Where $A \= \\sqrt{R \\cdot L}$. Since these integrals have no closed-form solution, the application must use a numerical approximation method, such as the power series expansion or Simpson's rule, computed in TypeScript. This computational overhead is justified by the requirement for "Real Geometry," allowing the user to design smoother, derailment-free operations.7

### **3.2 Cubic Bézier Curves (Flex Track)**

"Flex track" allows modelers to connect two fixed endpoints with a custom curve. The industry standard for CAD representation of such curves is the **Cubic Bézier Curve**.

* Parametric Equation:

  $$B(t) \= (1-t)^3 P\_0 \+ 3(1-t)^2 t P\_1 \+ 3(1-t) t^2 P\_2 \+ t^3 P\_3$$

  where $P\_0$ and $P\_3$ are the endpoints, and $P\_1, P\_2$ are control points defining the tangent vectors.

The Arc Length Parameterization Challenge:  
Bézier curves are parameterized by time $t$ ($0 \\to 1$), not distance. However, rendering railroad ties (sleepers) requires placing objects at equidistant intervals (e.g., every 4mm) along the curve. The planner must implement an Arc Length Reparameterization algorithm.

1. **Flattening:** Decompose the curve into a polyline of sufficiently small segments to approximate length $L$.  
2. **Lookup Table:** Generate a table mapping normalized distance $s$ ($0 \\to 1$) to parameter $t$.  
3. **Inversion:** To place a tie at distance $D$, look up the corresponding $t$ value to sample the curve coordinates $(x,y)$ and tangent vector (for rotation).9

### **3.3 Geometric Constraint Solving**

When a user drags a track piece to close a loop, the system must solve for the position and rotation that satisfies the connection constraints.

* **Rigid Solver (Sectional Track):** A forward kinematics approach. The position of piece $n$ is a function of piece $n-1$'s endpoint and the geometry of $n$.  
* **Flexible Solver (Flex Track):** To connect two disconnected fixed tracks with a piece of flex track, the system must solve for a Bézier curve where $P\_0, P\_3$ are the fixed track endpoints, and the vectors $\\vec{P\_0P\_1}$ and $\\vec{P\_3P\_2}$ are collinear with the endpoint tangents. This ensures $G^1$ continuity (smooth transition).11

For advanced constraints (e.g., "Make these two tracks parallel"), a specialized solver library is required. **Planegcs**, a port of the FreeCAD geometric constraint solver to WebAssembly, is a robust option that handles complex 2D constraints.12 Integrating this allows the planner to support CAD-like features such as "tangency constraints" or "concentric constraints."

## ---

**4\. Software Architecture**

The requirement for a "Client Side Only" application running in "TypeScript" dictates a robust Single Page Application (SPA) architecture. The complexity of managing thousands of track pieces, their geometric state, and their rendering requires a clear separation of concerns.

### **4.1 Architectural Pattern: Hybrid ECS-Scene Graph**

Interactive graphical applications typically choose between a Scene Graph (hierarchical) or an Entity-Component-System (ECS) (data-oriented). For this planner, a **Hybrid Architecture** is optimal.

* **The Data Layer (ECS-Lite):** The "Source of Truth" should be a flat, normalized state store (e.g., using **Zustand** or **Redux Toolkit**). Tracks are stored as data objects with IDs, types, and coordinate properties. This facilitates serialization (saving/loading) and undo/redo history stacks.  
  TypeScript  
  interface TrackState {  
    entities: Record\<string, TrackEntity\>;  
    connections: Record\<string, Connection\>; // Graph edges  
  }

* **The View Layer (Scene Graph):** The rendering engine (Konva or Pixi) subscribes to the Data Layer. When a track entity is added to the state, the View Layer instantiates the corresponding visual object in the Scene Graph. This decouples the geometry logic from the rendering logic.13

### **4.2 Clean Architecture in TypeScript**

To ensure maintainability, the application should follow **Clean Architecture** principles 15:

1. **Domain Layer:** Contains the core entities (Track, Point, Vector) and business rules (e.g., calculateTurnoutGeometry, checkGaugeCollision). This layer has *zero* dependencies on React or the rendering engine.  
2. **Application Layer:** Contains use cases (e.g., AddTrackCommand, SnapTrackCommand). It orchestrates the flow of data.  
3. **Interface Adapters:** Connects the core logic to the UI (React components) and the persistence layer (File System API).  
4. **Infrastructure:** The concrete implementations of the Rendering Engine and Storage.

This structure allows the rendering engine (e.g., Konva) to be swapped out for another (e.g., PixiJS) without rewriting the complex geometric logic of the planner.

## ---

**5\. Rendering Engine Technical Evaluation**

The choice of rendering engine is pivotal. The browser offers three main contexts: DOM (SVG), Canvas 2D, and WebGL.

### **5.1 SVG (Scalable Vector Graphics)**

While SVG is excellent for vector fidelity and styling, it suffers from severe performance degradation when the DOM node count exceeds a few thousand. A complex layout with individual sleepers and gravel texture details would cripple the browser's layout engine.17 SVG is, however, the ideal format for the **Export/Print** feature.

### **5.2 HTML5 Canvas (Konva.js vs. Paper.js)**

Canvas 2D provides immediate-mode rendering, which is significantly faster than DOM manipulation.

* **Konva.js:** A robust 2D scene graph library. Its key advantage is its sophisticated event handling system. It utilizes a secondary, invisible "hit graph" canvas where shapes are drawn in unique colors mapped to their IDs. This allows for $O(1)$ hit detection even with thousands of overlapping shapes, making it superior for the interactive "drag-and-drop" nature of a planner.19  
* **Paper.js:** Excellent for vector math and boolean operations (e.g., merging geometry), but its scene graph can become heavy. It is better suited for vector illustration tools than CAD-like snapping environments.20

### **5.3 WebGL (PixiJS)**

PixiJS uses WebGL, offering hardware acceleration. It can render hundreds of thousands of sprites (bunnymark) at 60fps.

* **Pros:** Unmatched performance for massive layouts.  
* **Cons:** Higher complexity. Rendering crisp vector lines (rails) and text in WebGL is non-trivial compared to Canvas.  
* **Verdict:** For a standard user layout (hundreds to low-thousands of pieces), **Konva.js** offers the best balance of development velocity and performance. Its integration with React (react-konva) is mature. If the requirement shifts to rendering millions of individual ballast stones, PixiJS would be the fallback.21

## ---

**6\. UI/UX Framework and Design System**

The prompt asks for a "Design framework?". To achieve a professional CAD-like "overlay" interface, using raw HTML/CSS is inefficient.

### **6.1 React Component Libraries**

The UI should float above the canvas workspace.

* **PrimeReact / Mantine / MUI:** These libraries offer rich, pre-built components like "TreeViews" (for layout hierarchy), "Accordions" (for track libraries), and "Property Grids" (for editing track parameters).  
* **Recommendation:** **Mantine** or **Shadcn/UI**. They offer a modern, highly customizable aesthetic that blends well with complex tools. PrimeReact is also a strong contender due to its comprehensive set of complex widgets (DataTables, Menus) often needed in CAD tools.23

### **6.2 The "Overlay" Pattern**

The architecture should place the React UI layer (z-index: 10\) transparently over the Canvas layer (z-index: 0).

* **Interaction:** Events must propagate correctly. If the user clicks a button in the UI, the event must stop propagation. If they click "through" the UI (e.g., on a transparent gap), the Canvas should receive the event (or not, depending on modal state).  
* **Toolbar:** A palette of tracks (Kato, Peco, Ikea) should be draggable. This requires a bridge where dragging an HTML element from the React DOM creates a "ghost" element in the Konva Canvas.24

## ---

**7\. Geometric Constraint Solver & Snapping Algorithms**

The "Magic" of a track planner is how pieces snap together.

### **7.1 Spatial Indexing (Quadtrees)**

Naive collision detection checks every track against every other track ($O(N^2)$). For a layout with 1,000 pieces, this is too slow for 60fps dragging.

* **Solution:** Implement a **Quadtree** spatial index.  
* **Mechanism:** Recursively divide the 2D space into four quadrants. Store track objects in the leaf nodes.  
* **Snapping:** When dragging a track, query the Quadtree for objects within a bounding box of the cursor \+ 20px. This reduces the check to a constant number of neighbors ($O(\\log N)$).25  
* **Library:** d3-quadtree is a standard, highly optimized implementation easily integrated into TypeScript.25

### **7.2 The Magnet Algorithm**

1. **Proximity:** Identify "Connectors" (endpoints) within threshold distance $T$ (e.g., 10px).  
2. **Orientation:** Check vector alignment. For rigid track, the angle difference $\\Delta\\theta$ must be $\\approx 180^\\circ$ (connectors facing each other).  
3. **Snap:** If valid, mathematically override the dragged piece's coordinates to perfectly match the target connector's coordinate and tangent.  
4. **Vario Logic (Ikea):** If the track type is "Wooden", relax the angle constraint to $\\pm 5^\\circ$ and the distance constraint to allow a visual gap/overlap of 2-3mm, visualizing the connection with a "stressed" color (e.g., orange joint).5

## ---

**8\. Persistence and Data Serialization**

The "Client Side Only" requirement necessitates using browser-native storage solutions.

### **8.1 File System Access API**

This API allows the web application to read and write files directly to the user's local disk, providing a desktop-app experience.

* **Implementation:** The user clicks "Save". The app requests a file handle. The app writes the JSON serialization of the state tree to .json or a custom extension .track.  
* **Security:** The user must grant permission for every save/open session, though recent browser updates allow persistent permissions for "recent files".27

### **8.2 IndexedDB for Auto-Save**

To prevent data loss during browser crashes, the application should implement an auto-save mechanism using **IndexedDB**.

* **Why not LocalStorage?** LocalStorage is synchronous (blocks the main thread) and capped at \~5MB. A complex layout JSON can easily exceed this. IndexedDB is asynchronous and supports large binary blobs (hundreds of MBs).  
* **Library:** **Dexie.js** or **idb** provides a clean Promise-based wrapper around the verbose native IndexedDB API.28

## ---

**9\. Implementation Roadmap**

### **Phase 1: Core Engine (Weeks 1-4)**

* Setup TypeScript/React/Vite environment.  
* Implement clean architecture layers (Entity, UseCase).  
* Initialize Konva.js stage and implement Pan/Zoom (Affine Transformations).  
* Define the Track interface and basic Straight and Curve geometry classes.

### **Phase 2: Libraries & Rendering (Weeks 5-8)**

* Ingest Kato Unitrack and Ikea catalogs (define radii/lengths in JSON).  
* Implement the Rendering System: Draw rails (double lines), ties (perpendicular lines along path), and roadbed.  
* Implement d3-quadtree for spatial indexing.

### **Phase 3: Interaction & Constraint Solver (Weeks 9-12)**

* Implement Drag-and-Drop from UI to Canvas.  
* Implement the "Magnet" snapping algorithm with Quadtree lookups.  
* Develop the cubic Bézier "Flex Track" tool with handle manipulation.  
* Implement the "Vario" tolerance logic for wooden tracks.

### **Phase 4: Polish & Persistence (Weeks 13-16)**

* Integrate File System Access API for Save/Load.  
* Implement IndexedDB auto-backup.  
* Add BOM (Bill of Materials) generation.  
* Implement SVG export for printing 1:1 templates.

## ---

**10\. Conclusion**

The construction of a client-side miniature train track planner is a viable and complex engineering task. It requires a rigorous application of **Computational Geometry** (Euler spirals, Bézier curves, Quadtrees) and a disciplined **Software Architecture** (Clean Architecture, ECS/Scene Graph Hybrid) to ensure performance and maintainability. By leveraging **TypeScript** for safety, **Konva.js** for interactive rendering, and the **File System Access API** for persistence, it is possible to build a professional-grade CAD tool that runs entirely in the browser, capable of handling the precision of N scale and the flexibility of wooden railways alike.

## ---

**11\. Appendix: Technical Reference Tables**

### **11.1 Kato N Scale Unitrack Geometry**

| Item | Radius (mm) | Angle | Notes |
| :---- | :---- | :---- | :---- |
| **20-170** | 216 | 45° | R1; Tight radius. |
| **20-100** | 249 | 45° | R2; Standard inner loop. |
| **20-110** | 282 | 45° | R3; Standard outer loop. |
| **20-120** | 315 | 45° | R4; Shinkansen. |
| **20-132** | 348 | 45° | R5. |
| **20-140** | 381 | 30° | R6; Note 30° arc. |
| **20-150** | 718 | 15° | Large radius; matches \#6 Turnout divergence. |

### **11.2 Ikea Lillabo / Brio Geometry (Approximate)**

| Item | Length/Radius (mm) | Notes |
| :---- | :---- | :---- |
| **Mini Straight** | 54 | 1/4 length of Long Straight. |
| **Short Straight** | 108 | 1/2 length of Long Straight. |
| **Medium Straight** | 144 | Standard Brio Unit. |
| **Long Straight** | 216 | 1.5x Standard Unit. |
| **Short Curve** | \~90 | Very tight; 45° arc. |
| **Long Curve** | \~182 | Standard curve; 45° arc. |

***End of Report***

#### **Works cited**

1. N scale track dimensions and specifications : r/modeltrains \- Reddit, accessed January 1, 2026, [https://www.reddit.com/r/modeltrains/comments/1iw7thg/n\_scale\_track\_dimensions\_and\_specifications/](https://www.reddit.com/r/modeltrains/comments/1iw7thg/n_scale_track_dimensions_and_specifications/)  
2. Track Radius \- Train Trax UK, accessed January 1, 2026, [https://traintrax.co.uk/track-radius](https://traintrax.co.uk/track-radius)  
3. HO Minimum Track Radius \- General Discussion (Model Railroader) \- Trains.com Forums, accessed January 1, 2026, [https://forum.trains.com/t/ho-minimum-track-radius/323021](https://forum.trains.com/t/ho-minimum-track-radius/323021)  
4. How to figure grade on a curve \- Layouts and layout building \- Trains.com Forums, accessed January 1, 2026, [https://forum.trains.com/t/how-to-figure-grade-on-a-curve/193126](https://forum.trains.com/t/how-to-figure-grade-on-a-curve/193126)  
5. Track Math | BRIO® Wooden Railway Guide, accessed January 1, 2026, [https://woodenrailway.info/track/track-math](https://woodenrailway.info/track/track-math)  
6. BRIO Track Guide, accessed January 1, 2026, [https://woodenrailway.info/track/brio-track-guide](https://woodenrailway.info/track/brio-track-guide)  
7. Track transition curves \- Dynamics, accessed January 1, 2026, [https://dynref.engr.illinois.edu/avt.html](https://dynref.engr.illinois.edu/avt.html)  
8. Track transition curve \- Wikipedia, accessed January 1, 2026, [https://en.wikipedia.org/wiki/Track\_transition\_curve](https://en.wikipedia.org/wiki/Track_transition_curve)  
9. Curved Paths \- Red Blob Games, accessed January 1, 2026, [https://www.redblobgames.com/articles/curved-paths/](https://www.redblobgames.com/articles/curved-paths/)  
10. A Primer on Bézier Curves \- Pomax, accessed January 1, 2026, [https://pomax.github.io/bezierinfo/](https://pomax.github.io/bezierinfo/)  
11. How to get connect two part of curve and get the points position of connecting curve?, accessed January 1, 2026, [https://stackoverflow.com/questions/34894837/how-to-get-connect-two-part-of-curve-and-get-the-points-position-of-connecting-c](https://stackoverflow.com/questions/34894837/how-to-get-connect-two-part-of-curve-and-get-the-points-position-of-connecting-c)  
12. Salusoft89/planegcs: A webassembly wrapper for FreeCAD's 2D geometric solver. \- GitHub, accessed January 1, 2026, [https://github.com/Salusoft89/planegcs](https://github.com/Salusoft89/planegcs)  
13. \[2302.07691\] Project Elements: A computational entity-component-system in a scene-graph pythonic framework, for a neural, geometric computer graphics curriculum \- ar5iv, accessed January 1, 2026, [https://ar5iv.labs.arxiv.org/html/2302.07691](https://ar5iv.labs.arxiv.org/html/2302.07691)  
14. How to Implement a Scene Graph in ECS: A Simple Level-Based Approach, accessed January 1, 2026, [https://www.haroldserrano.com/blog/how-to-implement-a-scene-graph-in-ecs-a-simple-level-based-approach](https://www.haroldserrano.com/blog/how-to-implement-a-scene-graph-in-ecs-a-simple-level-based-approach)  
15. Typical TypeScript Clean Architecture \- Zac Fukuda, accessed January 1, 2026, [https://www.zacfukuda.com/blog/typical-typescript-clean-architecture](https://www.zacfukuda.com/blog/typical-typescript-clean-architecture)  
16. Building Robust Clean Architecture with TypeScript: A Detailed Look at the Project Structure | by Deivison Isidoro | Medium, accessed January 1, 2026, [https://medium.com/@deivisonisidoro\_94304/revolutionizing-software-development-unveiling-the-power-of-clean-architecture-with-typescript-5ee968357d35](https://medium.com/@deivisonisidoro_94304/revolutionizing-software-development-unveiling-the-power-of-clean-architecture-with-typescript-5ee968357d35)  
17. Which is best method to draw the graphics on the Web page (canvas or svg)? | Sololearn: Learn to code for FREE\!, accessed January 1, 2026, [https://www.sololearn.com/en/Discuss/791093/which-is-best-method-to-draw-the-graphics-on-the-web-page-canvas-or-svg](https://www.sololearn.com/en/Discuss/791093/which-is-best-method-to-draw-the-graphics-on-the-web-page-canvas-or-svg)  
18. SVG versus Canvas: Which technology to choose and why? \- JointJS, accessed January 1, 2026, [https://www.jointjs.com/blog/svg-versus-canvas](https://www.jointjs.com/blog/svg-versus-canvas)  
19. HTML5 Canvas Layer Management Performance Tip \- Konva.js, accessed January 1, 2026, [https://konvajs.org/docs/performance/Layer\_Management.html](https://konvajs.org/docs/performance/Layer_Management.html)  
20. Paper.js vs Pixi.js for 2D Solar System : r/learnjavascript \- Reddit, accessed January 1, 2026, [https://www.reddit.com/r/learnjavascript/comments/earwre/paperjs\_vs\_pixijs\_for\_2d\_solar\_system/](https://www.reddit.com/r/learnjavascript/comments/earwre/paperjs_vs_pixijs_for_2d_solar_system/)  
21. Jumping Bunnies Performance Stress Test | Konva \- JavaScript Canvas 2d Library, accessed January 1, 2026, [https://konvajs.org/docs/sandbox/Jumping\_Bunnies.html](https://konvajs.org/docs/sandbox/Jumping_Bunnies.html)  
22. I evaluated this vs pixi and native canvas API. In the end I decided to use nati... | Hacker News, accessed January 1, 2026, [https://news.ycombinator.com/item?id=43413691](https://news.ycombinator.com/item?id=43413691)  
23. PrimeReact \- React UI Component Library, accessed January 1, 2026, [https://primereact.org/](https://primereact.org/)  
24. How to Improve React Konva Performance | by Jacob \- Medium, accessed January 1, 2026, [https://j5.medium.com/react-konva-performance-tuning-52e70ab15819](https://j5.medium.com/react-konva-performance-tuning-52e70ab15819)  
25. d3-quadtree | D3 by Observable \- D3.js, accessed January 1, 2026, [https://d3js.org/d3-quadtree](https://d3js.org/d3-quadtree)  
26. timohausmann/quadtree-ts: Quadtree Typescript Implementation \- GitHub, accessed January 1, 2026, [https://github.com/timohausmann/quadtree-ts](https://github.com/timohausmann/quadtree-ts)  
27. Should I switch from File System Access API to Indexed DB for my screen recorder, Which one do you prefer? : r/SideProject \- Reddit, accessed January 1, 2026, [https://www.reddit.com/r/SideProject/comments/1ne5qa5/should\_i\_switch\_from\_file\_system\_access\_api\_to/](https://www.reddit.com/r/SideProject/comments/1ne5qa5/should_i_switch_from_file_system_access_api_to/)  
28. IndexedDB API \- MDN Web Docs, accessed January 1, 2026, [https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB\_API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)  
29. LocalStorage vs. IndexedDB vs. Cookies vs. OPFS vs. WASM-SQLite | RxDB \- JavaScript Database, accessed January 1, 2026, [https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html](https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html)