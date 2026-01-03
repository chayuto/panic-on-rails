# **External\_Research\_Findings.md**

## **Executive Summary**

The transition of "Panic on Rails" from a rudimentary sandbox environment to a high-fidelity tycoon simulation necessitates a paradigmatic shift in software architecture, specifically regarding the handling of large-scale graphical data, physical simulation fidelity, and economic balancing. The following report details the findings of an extensive investigation into web-compatible rendering techniques, railway physics mathematics, and historical simulation economy models.

The research indicates that the current naive implementation of the Konva.js scene graph will face catastrophic performance degradation as user layouts scale. To ensure a stable 60 frames-per-second (FPS) experience on standard browser hardware, the rendering pipeline must be decoupled from the full state of the world map. Furthermore, the physics simulation must move beyond simple Euclidean displacement to include spline-based arc-length parameterization and resistance calculations derived from civil engineering principles. Finally, the economic model requires a shift from arbitrary values to a deterministic function based on Manhattan distance and time-decay curves, as exemplified by the open-source transport simulation standard, OpenTTD.

Three "Must Implement" findings define the critical path for the engineering effort:

1. **Spatial Partitioning for Viewport Culling:** The native Konva.js traversal of the scene graph is insufficient for large-scale logistics maps. The implementation of a **Spatial Hash Grid** is mandatory to cull off-screen nodes before they enter the rendering pipeline. This moves the complexity of the draw loop from $O(N)$ (total objects) to $O(K)$ (visible objects), effectively solving the "mega-stage" bottleneck.1  
2. **Arc-Length Parameterized Splines:** To simulate realistic train movement, cubic Bezier curves must be utilized for track geometry. However, simply interpolating the curve parameter $t$ results in variable velocity. The adoption of **Lookup Table (LUT) Parameterization** is required to map simulation distance to curve coordinates efficiently, ensuring constant velocity without expensive real-time integration.3  
3. **Manhattan Distance & Time-Decay Revenue:** The economic loop must reward efficiency. The analysis of OpenTTD source code reveals that revenue must be calculated using **Manhattan Distance** (to prevent geometric exploits) modified by a non-linear **Time Factor** that penalizes delivery latencies based on cargo-specific decay constants ($Days\_1$, $Days\_2$). This creates a natural difficulty curve where route optimization becomes the primary driver of player progression.4

This report provides the theoretical foundations, algorithmic descriptions, and specific library recommendations required to execute these architectural changes.

## ---

**Section 1: High-Performance Canvas Rendering (Konva.js)**

The graphical rendering engine serves as the visual cortex of "Panic on Rails." As the user base transitions to building complex, sprawling rail networks, the rendering pipeline faces exponential pressure. The default HTML5 Canvas API, while hardware-accelerated, relies on the Central Processing Unit (CPU) to construct the command buffer for the Graphics Processing Unit (GPU). In scenes with thousands of nodes, the overhead of JavaScript execution and the CPU-GPU bus bandwidth becomes the primary bottleneck.

### **1.1 The Architecture of Large-Scale Graphs**

The research identified a critical performance anti-pattern often referred to as the "Mega-Stage" problem. This occurs when the application initializes a canvas element dimensioned to match the virtual world size (e.g., 50,000 x 50,000 pixels). While visually conceptually simple, this approach forces the browser to allocate massive contiguous blocks of memory for the bitmap data. Most browsers cap canvas dimensions (often around 16,384 pixels on desktop Chrome), and exceeding this results in silent failures or rendering artifacts. Even within limits, compositing such a large surface taxes the GPU fill rate significantly.5

#### **1.1.1 Viewport Culling and Scene Graph Traversal**

Konva.js operates on a retained-mode scene graph. When layer.draw() is called, the engine iterates through the list of children to issue draw commands. The native implementation of Konva does not automatically "cull" (skip) objects that are outside the current viewport. Consequently, if a user has 10,000 track segments but is zoomed in on a 10-segment station, Konva still iterates through all 10,000 objects, calculating transforms and checking bounds, before deciding what to draw. This $O(N)$ traversal cost ensures that frame rates degrade linearly with map size, regardless of what is visible on screen.1

To maintain 60 FPS, the application must implement a strict culling mechanism that modifies the visible property of nodes based on their intersection with the viewport.

#### **1.1.2 Comparison of Spatial Partitioning Algorithms**

To efficiently identify visible nodes, the system requires a spatial index. Linear iteration through the node list to check bounds is too slow. Two primary data structures were analyzed for this context: **Quadtrees** and **Spatial Hash Grids**.

| Feature | Quadtree | Spatial Hash Grid |
| :---- | :---- | :---- |
| **Structure** | Hierarchical tree (recursive subdivision). | Flat array or Map (coordinate buckets). |
| **Lookup Complexity** | $O(\\log N)$ on average; depth-dependent. | $O(1)$ constant time. |
| **Update Cost** | High (tree rebalancing required on move). | Low (key recalculation). |
| **Memory Layout** | Pointer-heavy (node references). | Contiguous or Hash Map. |
| **Best Use Case** | Sparse data, varying object sizes. | Uniform distribution, uniform sizes. |

Analysis:  
Quadtrees 6 are excellent for physics engines where objects vary wildly in size or clustering (e.g., particle systems). However, a rail network typically consists of track pieces of relatively uniform length distributed across the landscape. In this specific topology, the Spatial Hash Grid 2 offers superior performance. It avoids the overhead of tree traversal and rebalancing. By dividing the world into fixed cells (e.g., 500x500 pixels), we can map any viewport rectangle to a set of keys (e.g., "2,3", "2,4") and retrieve the relevant rendering nodes instantly.  
**Recommendation:** Implement a Spatial Hash Grid. The cell size should correspond to the maximum bounding box of a standard track segment (plus a safety margin) to ensuring a single object never spans an excessive number of cells.

### **1.2 Layer Management and Compositing**

The HTML5 Canvas API supports the concept of layering via the stacking of multiple \<canvas\> DOM elements. Konva.js abstracts this via the Layer class. The browser's compositor merges these canvases to produce the final image. Efficient layer management is identified as the single most impactful optimization for complex scenes.9

#### **1.2.1 Static vs. Dynamic Compositing**

In "Panic on Rails," the visual scene is composed of elements with vastly different update frequencies.

* **Static Elements:** Terrain, grid lines, and placed track segments do not change frame-by-frame.  
* **Dynamic Elements:** Trains, signals (state changes), and construction cursors ("ghosts") update every tick (16ms).

If all elements reside on a single layer, the entire scene—including the complex vector paths of the rails—must be cleared and redrawn every time a train moves a single pixel. This is computationally prohibitive.

Optimization Strategy:  
The rendering architecture must employ a multi-layer approach:

1. **Background Layer:** Terrain tiles and environmental bitmaps. Cached and rarely redrawn.  
2. **Infrastructure Layer:** Tracks and stations. This layer uses listening(false) to prevent event bubbling overhead (see 1.3). It is redrawn only when the player places or removes a track.  
3. **Simulation Layer:** Trains and active signals. This layer is cleared and redrawn every animation frame. Because it contains only a few dozen moving agents, the draw cost is low.  
4. **Interaction Layer (UI):** Selection boxes and drag previews.

This separation ensures that the expensive operation of rasterizing thousands of Bezier curves (the tracks) occurs only upon user modification, not during the simulation loop.9

### **1.3 Hit Detection: The Hidden Performance Killer**

Konva.js implements interaction (clicks, hovers) using a "Hit Graph." For every visible layer, Konva maintains a corresponding hidden canvas. When a shape is drawn, it is rendered to the visible canvas with its visual styles and to the hit canvas with a unique hex color acting as a key. When the mouse moves, Konva samples the pixel color at the cursor's coordinates on the hit canvas to identify the shape.11

#### **1.3.1 The Cost of Bezier Hit Detection**

For complex shapes like Bezier curves, drawing to the hit canvas is nearly as expensive as drawing to the visible canvas. If the application has 1,000 track segments, enabling interactivity on all of them doubles the rendering load. Furthermore, "perfect" hit detection on a 1px wide line is a poor user experience, as it requires pixel-perfect precision from the user.

Optimization: Custom Hit Functions  
To solve both the performance and UX issues, the research recommends implementing a custom hitFunc. This function allows the developer to define a simplified geometric representation for the hit graph.

* **Technique:** Instead of drawing the complex, textured rail, the hitFunc should draw a simple, significantly thicker line (e.g., 20px width) using the same path coordinates.  
* **Benefit:** This drastically reduces the rasterization cost (no shadows, textures, or strokes) and creates a forgiving "buffer zone" around the track, making selection easier for the player.11

#### **1.3.2 Disabling Event Bubbling**

For the static infrastructure layer, most track segments do not need to listen to individual events if the game uses a tool-based interaction model (e.g., a "Bulldoze Tool" that queries spatial hashes). By setting listening(false) on the specific shapes or the entire layer, the engine skips the hit graph generation entirely, recovering significant CPU cycles.5

### **1.4 Caching Strategies: Bitmaps vs. Vectors**

The Konva.Node.cache() method allows a group of shapes to be rasterized into a static bitmap (image). Subsequent renders draw this image rather than re-executing the vector draw commands.

**Research Question:** *Is Konva.Cache() effective for repeated track pieces?*

Detailed Analysis:  
While caching improves performance for static, complex vector groups (e.g., a train car with 50 sub-components), it presents challenges for track segments in a zooming interface.

1. **Memory Pressure:** Caching 1,000 unique track segments creates 1,000 bitmaps in memory. This can rapidly exhaust GPU texture memory.1  
2. **Pixelation on Zoom:** A cached bitmap is a raster image. If the player zooms in, the track will appear blurry/pixelated unless the cache is regenerated with a higher pixelRatio. Regenerating the cache is an expensive operation ($O(W \\times H)$ pixels) that causes frame stutters during zoom actions.

Conclusion:  
For the static track layer, caching individual segments is generally counter-productive due to the zoom artifacting and memory overhead. A better approach is to render standard track shapes (straight, 45-degree turn) once to an off-screen canvas and use Konva.Image instances referencing this shared bitmap. For procedural Bezier curves which are unique, standard vector drawing (optimized via layers) is preferred over caching.

### **1.5 OffscreenCanvas Integration**

The OffscreenCanvas API allows a canvas to be transferred to a Web Worker, decoupling the rendering loop from the main thread. This prevents UI jank (stutter) caused by heavy React updates or logic calculations.

Feasibility in Konva:  
Konva.js has experimental support for running in a Web Worker. However, the DOM event system (mouse clicks, key presses) does not exist in a Worker. Implementing OffscreenCanvas with Konva requires a complex proxy architecture where events are captured on the main thread and serialized to the worker.13  
Recommendation:  
Given the complexity of synchronizing the game state (Zustand store) between the main thread and a worker, OffscreenCanvas should be reserved for non-interactive background generation. For example, generating a large, static texture for the terrain grid can be done in a worker to avoid freezing the UI, but the interactive tracks and trains should remain on the main thread, optimized via the layering and culling techniques described above.

## ---

**Section 2: Railway Simulation Mathematics**

Moving from a grid-based or straight-line system to "Spline" based tracks requires a robust mathematical framework. The physics of railway motion is fundamentally different from standard game entity movement; trains are constrained to a path, and their interaction with that path determines their velocity and stability.

### **2.1 Cubic Bezier Splines and Parameterization**

To create smooth, organic track layouts, the "Panic on Rails" engine should utilize Cubic Bezier curves. A Cubic Bezier is defined by four points: a Start Point ($P\_0$), two Control Points ($P\_1, P\_2$), and an End Point ($P\_3$).

The parametric equation for a Cubic Bezier is:

$$B(t) \= (1-t)^3P\_0 \+ 3(1-t)^2tP\_1 \+ 3(1-t)t^2P\_2 \+ t^3P\_3$$

where $0 \\le t \\le 1$.

#### **2.1.1 The Constant Velocity Problem**

A critical challenge in game development is that the parameter $t$ does not correspond linearly to the distance traveled along the curve. If we increment $t$ by a constant amount (e.g., $t \+= 0.01$) per frame, the train will appear to accelerate in the sharp parts of the curve and decelerate in the straighter parts. This is because the relationship between $t$ and arc length $s$ is non-linear.14

#### **2.1.2 Arc-Length Parameterization via Lookup Tables (LUT)**

To move a train at a constant speed $V$, we need to find a value $t$ such that the arc length $s(t) \= s(t\_{prev}) \+ V \\times \\Delta time$. Since there is no closed-form analytical solution for the arc length of a Cubic Bezier (it requires an elliptic integral), numerical approximation is necessary.

**The LUT Algorithm:**

1. **Pre-calculation:** Upon creating a track segment, subdivided the curve into $N$ small segments (e.g., 100 or 200).  
2. **Accumulation:** Calculate the Euclidean distance of each chord and store the cumulative length in an array (the Lookup Table). LUT\[i\] stores the distance at $t \= i/N$.  
3. **Runtime Lookup:** To find the $t$ value for a target distance $D$:  
   * Perform a binary search on the LUT to find the index $k$ such that $LUT\[k\] \\le D \< LUT\[k+1\]$.  
   * Linearly interpolate between $t\_k$ and $t\_{k+1}$ to find the precise $t$.

Library Recommendation:  
The Bezier.js library 3 is the industry standard for this operation in JavaScript. It includes highly optimized implementations of .length() using Legendre-Gauss quadrature and .getLUT() for table generation. Reimplementing this from scratch is error-prone and likely less performant.

### **2.2 Physics: Resistance and Tractive Effort**

To simulate the "feel" of a train, the game must model the forces acting against the locomotive.

#### **2.2.1 Rolling Resistance (Davis Formula)**

The standard equation for train resistance is the **Davis Formula**.15 It models resistance ($R$) as a quadratic function of velocity ($v$):

$$R \= A \+ Bv \+ Cv^2$$

* **$A$ (Journal Friction):** Constant mechanical friction in the axles. Dominates at low speeds (starting resistance).  
* **$B$ (Flange Friction):** Linear resistance caused by wheel oscillation and flange contact.  
* **$C$ (Air Resistance):** Aerodynamic drag, proportional to the square of velocity. Dominates at high speeds.

For "Panic on Rails," simplified coefficients can be used:

* $A \= 1.3 \+ (29 / \\text{weight per axle})$  
* $B \= 0.045$  
* $C \= 0.0005 \\times \\text{frontal area}$

#### **2.2.2 Curve Resistance**

When a train enters a curve, the wheel flanges press against the outer rail, creating significant friction. This acts as a natural speed limiter and strategic consideration for track layout.

Formula:  
The resistance due to curvature is historically approximated by the Roeckl Formula 17:

$$R\_{curve} \\approx \\frac{K}{Radius \- \\Delta}$$

Where $K$ is a constant (typically 500-700 in metric systems).  
A more modern and chemically accurate approximation for simulation games (derived from Open Rails 15\) is:

$$F\_{curve} \= \\frac{W \\cdot \\mu \\cdot (G \+ L)}{2 \\cdot R}$$

* $W$: Weight of the train.  
* $\\mu$: Coefficient of friction (0.1–0.3).  
* $G$: Gauge width.  
* $L$: Rigid wheelbase length.  
* $R$: Radius of the curve.

**Insight:** This formula implies that resistance is inversely proportional to the radius ($1/R$). Doubling the radius of a turn halves the resistance, incentivizing players to build sweeping, wide turns rather than tight loops.

#### **2.2.3 Cant Deficiency and Speed Limits**

In real-world engineering, tracks are banked (canted) to counteract centrifugal force. In a simulation where tracks are often flat, we utilize the concept of **Cant Deficiency** to determine maximum safe speeds. Cant deficiency is the amount of superelevation that *would* be needed to balance the forces at the current speed.18

Maximum Speed Calculation:

$$V\_{max} \\approx \\sqrt{R \\times (E\_a \+ E\_d)}$$

* $E\_a$: Actual cant (0 for flat tracks).  
* $E\_d$: Maximum allowable cant deficiency (tolerance).  
* $R$: Curve Radius.

This relationship ($V \\propto \\sqrt{R}$) provides the fundamental gameplay rule: **To run faster trains, you must build wider curves.**

### **2.3 Clothoid Transitions (Euler Spirals)**

A sudden transition from a straight line (infinite radius) to a circular arc (finite radius) causes an infinite spike in lateral acceleration, known as "jerk." This is physically impossible for a train to navigate smoothly. Real railways use **Clothoids** (Euler Spirals), where curvature changes linearly with distance.20

Simulation Implementation:  
Calculating true Clothoid coordinates requires computing Fresnel integrals, which is computationally expensive for a JS game loop.  
Recommendation: Use Cubic Bezier approximations. By carefully positioning the control points of a Cubic Bezier, it can mimic the curvature profile of a Clothoid to within 99% accuracy. This allows the use of the standard, hardware-accelerated Bezier rendering pipeline while achieving the physical smoothness of a spiral transition.

## ---

**Section 3: Game Design & Economy Balance**

The transition to a "Tycoon" game requires a rigorous economic model. The research indicates that the "Cargo Payment" formula is the single most important variable in balancing the game.

### **3.1 Revenue Modeling: The OpenTTD Standard**

OpenTTD (Open Transport Tycoon Deluxe) provides the gold standard for transport simulation economies. Its revenue model is robust, proven, and resists player exploitation.

The Revenue Formula:

$$Revenue \= \\text{BaseRate} \\times \\text{Amount} \\times \\text{Distance} \\times \\text{TimeFactor}$$

#### **3.1.1 Distance Calculation: Manhattan vs. Euclidean**

Crucially, OpenTTD calculates distance using the **Manhattan Distance** ($|\\Delta x| \+ |\\Delta y|$) between the source and destination stations.4 It does *not* use the length of the track or the path taken.

* **Why?** This prevents "padding" exploits where players build unnecessarily spiraling tracks to artificially increase the distance and ticket price.  
* **Implication:** Players are incentivized to build the straightest, most direct route possible to minimize travel time while the revenue remains fixed based on station displacement.

#### **3.1.2 The Time Factor Decay Curve**

The "Time Factor" is a multiplier that degrades based on how long the cargo spends in transit. This creates a "soft cap" on the maximum viable distance for a route.

The decay curve operates in two phases, defined by cargo-specific constants $Days\_1$ (Early Delivery) and $Days\_2$ (Late Delivery).4

1. **Fast Delivery ($t \\le Days\_1$):** No penalty. The player receives maximum possible revenue.  
2. **Slow Delivery ($Days\_1 \< t \\le Days\_2$):** Revenue decays linearly.  
3. **Late Delivery ($t \> Days\_2$):** Revenue decays rapidly (often 2x the linear rate).

Formula for Time Factor:

$$TF \= 255 \- (\\text{Time} \- Days\_1) \- (\\text{Time} \- Days\_2)$$

(Where negative terms are only applied if Time exceeds the respective Days constant).  
Example Cargo Constants:  
The following table 4 provides starting values for "Panic on Rails" cargo types:

| Cargo Type | Base Value (£) | Days 1 (Fast) | Days 2 (Slow) | Sensitivity |
| :---- | :---- | :---- | :---- | :---- |
| **Passengers** | 3,185 | 0 | 24 | High (Immediate decay) |
| **Mail** | 4,550 | 20 | 90 | High |
| **Coal** | 5,916 | 7 | 255 | Low (Bulk/Slow) |
| **Valuables** | 7,509 | 1 | 32 | Very High |
| **Goods** | 6,144 | 5 | 28 | Medium |

### **3.2 Idle Progression and Inflation**

To layer "Idle" mechanics (passive income) on top of the simulation, the economy must support exponential scaling to prevent stagnation.

Cost Scaling:  
Building costs ($C$) should scale exponentially with the number of existing buildings ($n$) 21:

$$C\_n \= C\_{base} \\times (Rate)^n$$

* **Standard Rate:** 1.15 (Costs double every \~5 items).  
* **Steep Rate:** 1.50 (Costs double every \~2 items).

Prestige/Reset Mechanics:  
To maintain long-term engagement, a "Prestige" system allows players to reset progress for a global multiplier. The standard formula involves a square-root or cubic-root relationship to ensure diminishing returns 21:

$$\\text{Multiplier} \= \\frac{\\sqrt{1 \+ 8 \\times (\\text{LifetimeEarnings} / K)} \- 1}{2}$$

This effectively requires the player to earn 4x the currency to double their prestige bonus, creating a sustainable gameplay loop.

## ---

**Section 4: Technical User Interface**

The UI requirements include a "Complex Signal Logic" editor and a "Minimap." These require specialized libraries and rendering techniques separate from the main game canvas.

### **4.1 Node-Graph Editors: React Flow**

For the Logic Gate Editor (visualizing AND/OR/NOT gates for signals), the research strongly favors **React Flow** (@xyflow/react).22

#### **4.1.1 Comparison: React Flow vs. Rete.js**

* **React Flow:**  
  * **Architecture:** UI-centric. It handles the rendering of nodes, edges, and handles, but leaves the state logic to the developer.  
  * **Advantages:** Lightweight, highly customizable via CSS/Tailwind (crucial for matching game aesthetics), excellent integration with standard React hooks (useState, useContext).  
  * **Verdict:** **Best Choice.** Since "Panic on Rails" already has a simulation loop, we only need a visual representation of the logic. React Flow allows us to bind the visual graph directly to the game's logic state.  
* **Rete.js:**  
  * **Architecture:** Engine-centric. Includes a data processing engine.  
  * **Disadvantages:** Heavier, more opinionated structure. Overkill for a system where the logic simulation runs elsewhere (in the game loop).

#### **4.1.2 Logic Simulation Implementation**

The visual graph (React Flow) must be decoupled from the execution graph.

* **Execution Model:** Use an **Event-Driven** model.  
* **Algorithm:**  
  1. When a sensor triggers (e.g., Train enters Block A), push the sensor node to a DirtyQueue.  
  2. Process the queue: Evaluate the node's logic (e.g., Signal \=\!Sensor).  
  3. If the output changes, push all downstream connected nodes to the DirtyQueue.  
  4. Repeat until queue is empty or cycle limit reached (to prevent infinite loops).

### **4.2 Minimap Implementation Patterns**

Rendering a minimap for a massive Konva stage requires optimization to avoid doubling the rendering cost.

Performance Pattern:  
Do not render the main stage to an image (toDataURL()) every frame. This is extremely slow.  
Recommended Approach:

1. **Cached Static Layer:** Render the static track/terrain layer to an OffscreenCanvas or standard image *only* when the map layout changes.  
2. **Dynamic Overlay:** Use a separate, small canvas for the minimap.  
3. **Render Loop:**  
   * Draw the Cached Static Image.  
   * Draw simple geometric primitives (colored dots) representing trains on top.  
   * Draw the "Viewport Rect" representing the camera position.  
     This separates the heavy lifting (rendering tracks) from the per-frame updates (dots for trains).

## ---

**Conclusion & Code Snippets**

### **Top 3 "Must Implement" Findings**

1. **Spatial Hash Grid for Culling:** The Konva.js scene graph is not performant enough for large maps on its own. Implementing a spatial hash to manage node visibility ($O(1)$ lookup) is the single most critical step to achieving 60 FPS.  
2. **Manhattan-Based Revenue with Time Decay:** Adopt the OpenTTD formula ($Revenue \= Base \\times ManhattanDist \\times TimeFactor$) to create a balanced, exploit-resistant economy.  
3. **Lookup Table (LUT) for Bezier Splines:** Use Bezier.js to generate LUTs for arc-length parameterization. This is the only way to achieve constant-speed train movement along curved tracks without solving integrals in the game loop.

### **Resource List**

* **Rendering Library:** [Konva.js](https://konvajs.org/) \- 2D Canvas framework.  
* **Graph UI Library:**([https://reactflow.dev/](https://reactflow.dev/)) \- For the Logic Gate Editor.  
* **Spline Mathematics:**([https://pomax.github.io/bezierjs/](https://pomax.github.io/bezierjs/)) \- For LUT generation and curve length.  
* **Spatial Indexing:** [Quadtree-js](https://github.com/timohausmann/quadtree-js) (or custom Hash Grid).  
* **Physics Reference:**([https://open-rails.readthedocs.io/en/latest/physics.html](https://open-rails.readthedocs.io/en/latest/physics.html)) \- Resistance formulas.  
* **Economic Reference:**([https://wiki.openttd.org/en/Manual/Game%20Mechanics/Cargo%20income](https://wiki.openttd.org/en/Manual/Game%20Mechanics/Cargo%20income)) \- Revenue algorithms.

### **Code Snippets**

**1\. Spatial Hash Key Generation (TypeScript)**

TypeScript

// Maps a world coordinate rect to a set of "Bucket Keys"  
const CELL\_SIZE \= 500;

function getSpatialKeys(rect: {x: number, y: number, width: number, height: number}): string {  
    const startX \= Math.floor(rect.x / CELL\_SIZE);  
    const endX \= Math.floor((rect.x \+ rect.width) / CELL\_SIZE);  
    const startY \= Math.floor(rect.y / CELL\_SIZE);  
    const endY \= Math.floor((rect.y \+ rect.height) / CELL\_SIZE);

    const keys: string \=;  
    for (let x \= startX; x \<= endX; x++) {  
        for (let y \= startY; y \<= endY; y++) {  
            keys.push(\`${x},${y}\`);  
        }  
    }  
    return keys;  
}

**2\. OpenTTD-Style Revenue Calculation**

TypeScript

interface CargoType {  
    baseRate: number; // e.g. 3185 for Passengers  
    days1: number;    // e.g. 0  
    days2: number;    // e.g. 24  
}

function calculateRevenue(  
    cargo: CargoType,   
    amount: number,   
    source: {x: number, y: number},   
    dest: {x: number, y: number},   
    transitDays: number  
): number {  
    // 1\. Manhattan Distance (prevent spiraling exploits)  
    const distance \= Math.abs(source.x \- dest.x) \+ Math.abs(source.y \- dest.y);

    // 2\. Time Factor Decay  
    let timeFactor \= 255; // Max efficiency  
      
    if (transitDays \> cargo.days1) {  
        // Linear decay phase  
        timeFactor \-= (transitDays \- cargo.days1);  
    }  
    if (transitDays \> cargo.days2) {  
        // Accelerated decay phase (additional penalty)  
        timeFactor \-= (transitDays \- cargo.days2);  
    }

    // Clamp to minimum floor (usually 31 in OpenTTD) to prevent negative income  
    timeFactor \= Math.max(31, timeFactor);

    // 3\. Final Calculation (OpenTTD scales by 2^21 approx, simplified here)  
    const SCALE\_CONSTANT \= 20000;   
    return (cargo.baseRate \* amount \* distance \* timeFactor) / SCALE\_CONSTANT;  
}

**3\. Bezier LUT Navigation**

TypeScript

import { Bezier } from "bezier-js";

class TrackSegment {  
    curve: Bezier;  
    lut: {x: number, y: number, t: number};  
    totalLength: number;

    constructor(p0, p1, p2, p3) {  
        this.curve \= new Bezier(p0, p1, p2, p3);  
        // Generate 100 equidistant points  
        this.lut \= this.curve.getLUT(100);   
        this.totalLength \= this.curve.length();  
    }

    // Get (x,y) at a specific distance from the start  
    getPositionAtDistance(dist: number) {  
        // 1\. Normalize distance to t (approximate)  
        const targetT \= dist / this.totalLength;  
          
        // 2\. Lookup in LUT (Simplified: binary search is better for precision)  
        // This maps the linear distance back to the curved geometry  
        const index \= Math.min(this.lut.length \- 1, Math.floor(targetT \* 100));  
        return this.lut\[index\];  
    }  
}

**Library Recommendations:**

* **Use Konva** for the canvas scene graph but **implement the Spatial Hash manually** immediately.  
* **Use React Flow** for the Signal/Logic editor; it is the correct abstraction level for React applications.  
* **Use Bezier.js** for all spline math. Do not attempt to implement Legendre-Gauss integration manually unless absolutely necessary.

#### **Works cited**

1. Optimizing Konva.js for Many Images \- Stack Overflow, accessed January 3, 2026, [https://stackoverflow.com/questions/42729872/optimizing-konva-js-for-many-images](https://stackoverflow.com/questions/42729872/optimizing-konva-js-for-many-images)  
2. Redesign Your Display List With Spatial Hashes \- Code \- Envato Tuts+, accessed January 3, 2026, [https://code.tutsplus.com/redesign-your-display-list-with-spatial-hashes--cms-27586t](https://code.tutsplus.com/redesign-your-display-list-with-spatial-hashes--cms-27586t)  
3. Bezier.js, for doing Bezier curve things \- Pomax, accessed January 3, 2026, [https://pomax.github.io/bezierjs/](https://pomax.github.io/bezierjs/)  
4. Cargo income \- OpenTTD's Wiki, accessed January 3, 2026, [https://wiki.openttd.org/en/Manual/Game%20Mechanics/Cargo%20income](https://wiki.openttd.org/en/Manual/Game%20Mechanics/Cargo%20income)  
5. HTML5 Canvas All Konva performance tips list, accessed January 3, 2026, [https://konvajs.org/docs/performance/All\_Performance\_Tips.html](https://konvajs.org/docs/performance/All_Performance_Tips.html)  
6. timohausmann/quadtree-js: A lightweight quadtree implementation for javascript \- GitHub, accessed January 3, 2026, [https://github.com/timohausmann/quadtree-js](https://github.com/timohausmann/quadtree-js)  
7. Efficient (and well explained) implementation of a Quadtree for 2D collision detection, accessed January 3, 2026, [https://stackoverflow.com/questions/41946007/efficient-and-well-explained-implementation-of-a-quadtree-for-2d-collision-det](https://stackoverflow.com/questions/41946007/efficient-and-well-explained-implementation-of-a-quadtree-for-2d-collision-det)  
8. Data structures for partitioning an infinite 2D canvas? : r/GraphicsProgramming \- Reddit, accessed January 3, 2026, [https://www.reddit.com/r/GraphicsProgramming/comments/1du0pwd/data\_structures\_for\_partitioning\_an\_infinite\_2d/](https://www.reddit.com/r/GraphicsProgramming/comments/1du0pwd/data_structures_for_partitioning_an_infinite_2d/)  
9. HTML5 Canvas Layer Management Performance Tip \- Konva.js, accessed January 3, 2026, [https://konvajs.org/docs/performance/Layer\_Management.html](https://konvajs.org/docs/performance/Layer_Management.html)  
10. From kanvajs to canvas to gpu, the direction of optimisation in canvas \- Medium, accessed January 3, 2026, [https://medium.com/@maotong06/from-kanvajs-to-canvas-to-gpu-the-direction-of-optimisation-in-canvas-35bae1a3c886](https://medium.com/@maotong06/from-kanvajs-to-canvas-to-gpu-the-direction-of-optimisation-in-canvas-35bae1a3c886)  
11. HTML5 Canvas Custom Hit Detection Function Tutorial \- Konva.js, accessed January 3, 2026, [https://konvajs.org/docs/events/Custom\_Hit\_Region.html](https://konvajs.org/docs/events/Custom_Hit_Region.html)  
12. HTML5 Canvas Shape Caching Performance Tip \- Konva.js, accessed January 3, 2026, [https://konvajs.org/docs/performance/Shape\_Caching.html](https://konvajs.org/docs/performance/Shape_Caching.html)  
13. Offscreen canvas inside Web Worker | Konva \- JavaScript Canvas 2d Library, accessed January 3, 2026, [https://konvajs.org/docs/sandbox/Web\_Worker.html](https://konvajs.org/docs/sandbox/Web_Worker.html)  
14. Points evenly spaced along a bezier curve \- Game Development Stack Exchange, accessed January 3, 2026, [https://gamedev.stackexchange.com/questions/105230/points-evenly-spaced-along-a-bezier-curve](https://gamedev.stackexchange.com/questions/105230/points-evenly-spaced-along-a-bezier-curve)  
15. 8\. Open Rails Physics — Open Rails Manual, accessed January 3, 2026, [https://open-rails.readthedocs.io/en/latest/physics.html](https://open-rails.readthedocs.io/en/latest/physics.html)  
16. Train Resistance \- Physics \- Coals to Newcastle, accessed January 3, 2026, [https://www.coalstonewcastle.com.au/physics/resistance/](https://www.coalstonewcastle.com.au/physics/resistance/)  
17. Curve resistance (railroad) \- Wikipedia, accessed January 3, 2026, [https://en.wikipedia.org/wiki/Curve\_resistance\_(railroad)](https://en.wikipedia.org/wiki/Curve_resistance_\(railroad\))  
18. Part\_1025\_Rail\_Track\_geometry.doc, accessed January 3, 2026, [https://www.dit.sa.gov.au/\_\_data/assets/word\_doc/0004/40684/Part\_1025\_Rail\_Track\_geometry.doc](https://www.dit.sa.gov.au/__data/assets/word_doc/0004/40684/Part_1025_Rail_Track_geometry.doc)  
19. Cant deficiency \- Wikipedia, accessed January 3, 2026, [https://en.wikipedia.org/wiki/Cant\_deficiency](https://en.wikipedia.org/wiki/Cant_deficiency)  
20. Euler's spiral (Clothoid) \- JSXGraph Wiki, accessed January 3, 2026, [https://jsxgraph.org/wiki/index.php?title=Euler%27s\_spiral\_(Clothoid)](https://jsxgraph.org/wiki/index.php?title=Euler's_spiral_\(Clothoid\))  
21. The Math of Idle Games, Part III \- Game Developer, accessed January 3, 2026, [https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)  
22. Tools for building a Graph/Node based user interface in a webapp \- Stack Overflow, accessed January 3, 2026, [https://stackoverflow.com/questions/72164885/tools-for-building-a-graph-node-based-user-interface-in-a-webapp](https://stackoverflow.com/questions/72164885/tools-for-building-a-graph-node-based-user-interface-in-a-webapp)  
23. Building a Flow \- React Flow, accessed January 3, 2026, [https://reactflow.dev/learn/concepts/building-a-flow](https://reactflow.dev/learn/concepts/building-a-flow)