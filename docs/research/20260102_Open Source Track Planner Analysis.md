# **Architectural Paradigms in Open Source Railway Track Planning: A Comparative Analysis of Geometric Algorithms, Data Structures, and Rendering Pipelines**

## **1\. Introduction: The Divergence of Digital Logistics Modeling**

The domain of railway track planning software occupies a unique intersection of Computer-Aided Design (CAD), topological graph theory, and operational simulation. Unlike general-purpose vector illustration tools, track planners must adhere to the rigorous physical constraints of rolling stock—limitations on minimum radius, gradients, and the rate of change in curvature (jerk). The open-source landscape for these tools has evolved from simple 2D geometry plotters into complex "Digital Twin" environments capable of simulating not only the physical layout of rails but also the signaling logic, timetable capacity, and electrical block occupancy required for automated operations.

This report provides an exhaustive analysis of the architectural strategies employed by the leading open-source track planning solutions: **XTrackCAD**, **JMRI (Java Model Railroad Interface)**, **Templot**, and the emerging **OSRD (Open Source Railway Designer)**. The analysis reveals a fundamental dichotomy in the ecosystem: the tension between **Geometric Precision** (the CAD approach) and **Operational Abstraction** (the Systems approach).

Legacy desktop applications like XTrackCAD and Templot prioritize the mathematical fidelity of the "Permanent Way," utilizing complex Euler spirals (clothoids) to mimic prototype civil engineering.1 Conversely, systems like JMRI prioritize the control plane, abstracting the track into a graph of logical nodes to facilitate Digital Command Control (DCC) and signal logic.3 The newest entrant, OSRD, attempts to bridge this gap by leveraging modern web technologies (WebGL, MapLibre) and rigorous data schemas (RailJSON) to create a simulation-ready infrastructure model.5

This report dissects these approaches, analyzing the algorithmic choices for curve generation, the efficiency of rendering pipelines (Java Swing vs. GTK vs. WebGL), and the interoperability of persistent data structures. Furthermore, we investigate significant gaps in the current software ecosystem, particularly regarding the simulation of "loose tolerance" systems (like wooden toy train geometries) and the application of Generative AI for layout design.

### **1.1 The Taxonomy of Track Planning Architectures**

To understand the comparative advantages and limitations of each tool, we must first classify them based on their primary architectural drivers.

| Architectural Class | Primary Focus | Representative Tools | Key Technologies |
| :---- | :---- | :---- | :---- |
| **Precision CAD** | Geometry, Construction | XTrackCAD, Templot | C/GTK, Delphi, Cornu Spirals |
| **Control Systems** | Operations, Signaling | JMRI Layout Editor | Java Swing, XML, Graph Nodes |
| **Infrastructure Sim** | Capacity, Timetabling | OSRD | TypeScript, Rust, WebGL, RailJSON |
| **Web-Native Editors** | Accessibility, UX | Trackplanner.app | React, Canvas API, Fabric.js |

The Precision CAD class views the track as a continuous geometric surface. The Control Systems class views the track as a discrete network graph. The Infrastructure Simulation class views the track as a capacity constraint resource. These diverging philosophies dictate every downstream technical decision, from file formats to rendering loops.

## ---

**2\. Geometric Modeling Architectures: The Mathematics of the Permanent Way**

The distinction between a generic drawing tool and a dedicated track planner lies in the handling of curvature. Real-world trains cannot navigate the abrupt changes in radial acceleration associated with tangent-to-circle transitions. Consequently, competent track planners must implement easement curves (transition spirals).

### **2.1 The Euler Spiral (Cornu Clothoid) vs. Cubic Bézier**

In the realm of vector graphics, the industry standard for representing curves is the Cubic Bézier, defined by a start point, an end point, and two control handles. While Bézier curves are computationally efficient and natively supported by web standards (SVG, HTML5 Canvas), they are physically inaccurate for rail vehicles. A Bézier curve does not guarantee a linear change in curvature, often resulting in "lumpy" curves where the radius tightens and widens unpredictably—a fatal flaw for high-fidelity rail modeling.

#### **2.1.1 The Mathematical Necessity of the Clothoid**

To ensure smooth dynamic operation, the transition between a straight track (tangent, curvature $\\kappa \= 0$) and a circular curve ($\\kappa \= 1/R$) must be gradual. The curve that satisfies the condition where curvature changes linearly with arc length is the **Euler Spiral**, also known as the Cornu spiral or Clothoid.7

The curve is defined parametrically by the Fresnel integrals:

$$x(t) \= \\int\_0^t \\cos(u^2) \\, du, \\quad y(t) \= \\int\_0^t \\sin(u^2) \\, du$$  
In this equation, $t$ represents the normalized curve length. As $t$ increases, the radius of curvature decreases inversely, creating a mathematically perfect easement.

#### **2.1.2 XTrackCAD’s Implementation of the Cornu Spiral**

XTrackCAD stands out in the open-source field for its native implementation of Cornu spirals.1 When a user manipulates a piece of "flex-track" in XTrackCAD, the software does not merely fit a tangent arc; it solves for the spiral that minimizes the internal energy of the curve while satisfying the boundary conditions (position and angle) of the connected track endpoints.

The source code analysis of XTrackCAD reveals that these integrals are not solved analytically during runtime, as this is computationally expensive. Instead, the application typically employs **numerical approximation methods** or lookup tables to determine the coordinates for rendering.7 This allows the application to maintain real-time performance on older hardware (GTK/Win32) while the user drags the track handles.9

The "Join" command in XTrackCAD explicitly utilizes these algorithms to insert easement segments automatically. This is a critical differentiator from simpler tools; it ensures that the generated track plan corresponds to the physical limitations of the model flex track, which naturally assumes a minimum-energy shape (closely approximating a cubic parabola or spiral) when bent.1

#### **2.1.3 The Bézier Compromise in Web-Based Planners**

In contrast, modern web-based planners (e.g., Trackplanner.app) often rely on JavaScript graphics libraries like **Paper.js**, **Fabric.js**, or **Pixi.js**.11 These libraries are built on top of the HTML5 Canvas API or SVG standards, which utilize Bézier primitives (quadraticCurveTo, bezierCurveTo).

The snippet data indicates a significant gap: there is no native eulerSpiralTo command in standard web graphics APIs.13 To render a true easement in a browser, developers must:

1. **Discretize** the spiral into hundreds of short linear segments.14  
2. **Approximate** the spiral by chaining multiple Bézier curves together.15

This introduces a trade-off between visual fidelity and rendering performance. Discretization increases the vertex count significantly, which can choke the rendering loop if thousands of track ties are being drawn. This is why many web planners produce tracks that look "toy-like"—rigid arcs connected to straight lines—rather than the fluid, organic flow characteristic of XTrackCAD or Templot designs.16

### **2.2 Templot and Generative Geometry**

Templot, written in Delphi/Pascal, approaches geometry from a **Generative Design** perspective rather than a library-based one.2

#### **2.2.1 Procedural Turnout Generation**

Most planners (like AnyRail or XTrackCAD) use a "pick-and-place" metaphor where a turnout is a static object loaded from a library file. If the user wants a curved turnout, they must select a specific catalog part (e.g., "Peco Curved Turnout Right").

Templot, conversely, treats the turnout as a procedural function. The user inputs engineering parameters:

* **Switch Blade Length:** (e.g., B-size).  
* **Crossing Angle:** (e.g., 1:8).  
* **Curvature:** (e.g., constant radius or transitional).

The software then algorithmically generates the rail geometry, sleeper spacing, and timbering angles on the fly.18 This allows for **turnouts of infinite variety**. A turnout can be generated on a transition curve, with the main line following a Cornu spiral and the diverging route following a different radius.

#### **2.2.2 The "Control Template" Paradigm**

In Templot, the "Control Template" is the active generator. Once the parameters are set, the geometry is "stamped" into the track plan background.18 This differs from the object-oriented approach of XTrackCAD where the object remains a parametric entity that can be tweaked later. Templot's approach mimics the prototype engineering process, prioritizing the alignment of the running lines over the snap-fitting of pre-manufactured parts.

## ---

**3\. Data Structures and Persistence Strategies**

The interoperability of track plans is severely hampered by the fragmentation of file formats. An analysis of the schemas used by XTrackCAD, JMRI, and OSRD reveals distinct philosophies regarding what constitutes a "layout."

### **3.1 XTrackCAD: The .xtp Domain Specific Language**

XTrackCAD utilizes a custom ASCII-based text format for its parameter libraries (.xtp files) and layout files (.xtc).19 This format functions as a Domain Specific Language (DSL) for track geometry.

#### **3.1.1 Anatomy of a Turnout Definition**

Analysis of an .xtp file reveals a terse, imperative syntax.21 A turnout definition is a sequence of drawing commands and logical path definitions:

TURNOUT "Description"  
S color width x1 y1 x2 y2 (Straight Segment)  
C color width xc yc r a1 a2 (Curve Segment)  
P "Normal" 1 2 (Path Definition)  
P "Reverse" 1 3

* **Geometry (S, C):** Defines the visual lines.  
* **Logic (P):** The P command links the visual geometry to operational logic. P "Normal" 1 2 instructs the software that when the switch is in the "Normal" state, a train can traverse from Segment 1 to Segment 2\.

**Critical Limitation:** This format is purely *local*. It describes the internal connectivity of the turnout but does not inherently describe the topological connection to the rest of the layout. In XTrackCAD, connectivity is inferred at runtime by checking if the endpoint coordinates of different objects are coincident.1 This "implicit topology" makes it extremely difficult to export XTrackCAD designs to simulation engines or signaling logic tools without a complex parsing step to "heal" the graph and establish node-edge relationships.

### **3.2 JMRI: The XML Configuration Bean**

JMRI (Java Model Railroad Interface) utilizes an XML schema that reflects its Java object hierarchy (Beans).3 The structure prioritizes the control bus over the physical geometry.

* **LayoutBlock:** The primary unit of organization. A block corresponds to a physical electrical section of the track detected by a sensor.  
* **PositionablePoint:** Anchors for the drawing, representing the nodes in the graph.  
* **LayoutTurnout:** Contains state information (Closed/Thrown) and, crucially, the DCC hardware address (e.g., "LT1") required to actuate the physical switch.

**Insight:** The JMRI Layout Editor is fundamentally a **schematic capture tool**. While it allows for positioning track, its primary goal is to build a logical control table. The geometric fidelity is secondary to the topological correctness required for signaling logic. The XML format is verbose and mixes view state (window position, zoom level) with model data, complicating version control and diffing.4

### **3.3 RailJSON: The Modern Interoperability Standard (OSRD)**

The Open Source Railway Designer (OSRD) project has introduced **RailJSON**, a JSON-schema-based format designed to bridge the gap between CAD and Simulation.6

#### **3.3.1 Topology-Geometry Decoupling**

RailJSON represents a maturity shift in the domain by explicitly separating the *Topology* (logical connections) from the *Geometry* (spatial representation).

* **Topology:** Defined by Nodes and Ports. A Point Switch is a node with ports A, B1, and B2. Connectivity is explicit: Node1.PortB is referenced as connected to Node2.PortA.  
* **Geometry:** Defined by TrackSections containing GeoJSON LineStrings.24  
* **Physics:** Attributes such as gradient, loading\_gauge, and electrification are attached to the TrackSections.

**Architectural Advantage:** This decoupling allows simulation engines (like OSRD's backend) to traverse the graph and calculate routes, interlockings, and timetables without needing to load or process the heavy rendering geometry. This capability is entirely absent in legacy tools like XTrackCAD and Templot. Furthermore, the use of **GeoJSON** allows the layout to be projected onto real-world maps using WGS84 coordinates, facilitating "Digital Twin" modeling of actual prototypes.5

## ---

**4\. Rendering Pipelines and Visualization Engines**

The user experience and performance ceiling of a track planner are dictated by its rendering pipeline. As layouts grow to include thousands of sleepers (ties) and rail fastenings, the choice of rendering technology becomes critical.

### **4.1 Desktop Legacy: Immediate Mode (GTK and Swing)**

#### **4.1.1 XTrackCAD (GTK/Win32)**

XTrackCAD relies on a platform-abstraction layer that maps to native drawing calls (GDI on Windows, GTK on Linux).26 This is an **Immediate Mode** rendering architecture. Every time the window needs repainting (e.g., during a pan or zoom), the CPU must reissue thousands of draw commands (DrawLine, DrawArc).

* **Implication:** While efficient for simple wireframes, this architecture lacks hardware acceleration for advanced features. Anti-aliasing is often CPU-bound, and smooth animated zooming is difficult to achieve without significant frame drops on large layouts.

#### **4.1.2 JMRI (Java Swing)**

JMRI utilizes Java Swing, based on the Java 2D API.3 Swing uses a JComponent hierarchy, where elements can be objects in a tree.

* **Performance Bottleneck:** Swing represents a "Retained Mode" on the CPU side. For complex layouts with thousands of sensors and track segments, the overhead of managing these component objects can be substantial. JMRI mitigates this by often drawing the layout on a single canvas, but the rendering remains largely CPU-bound. Users with large panel files often report "gray rectangle" artifacts during scrolling as the repaint loop struggles to keep up.3

### **4.2 The WebGL Shift: OSRD and MapLibre**

OSRD represents the modern standard by utilizing **MapLibre GL JS**, a library originally designed for geographic mapping.28

#### **4.2.1 Vector Tiles and Shader Logic**

OSRD treats the railway infrastructure as a map layer. The track data is sliced into **Vector Tiles**.29

* **Efficiency:** The browser only loads the geometry tiles required for the current viewport.  
* **GPU Acceleration:** The rendering is handled by the GPU via WebGL. Line widths, rail styling, and sleeper details are generated by **Shaders** rather than individual draw calls.  
* **Scalability:** This allows OSRD to handle country-sized rail networks or massive model layouts with equal performance, maintaining 60 FPS even at high zoom levels—a feat impossible for SVG or Canvas-based DOM libraries.

### **4.3 JavaScript Libraries for Lightweight Planners**

For web-based planners that do not require the geospatial power of MapLibre, developers choose between HTML5 Canvas and SVG.

* **Fabric.js (Canvas):** Provides an interactive object model on top of the Canvas API.30 It is excellent for "drag-and-drop" functionality and sprite manipulation (moving trains). However, it relies on the Canvas 2D API, which is slower than WebGL for massive object counts.  
* **Paper.js (Canvas):** Focuses on vector mathematics and boolean operations (e.g., union/intersection of shapes).12 It is powerful for calculating track connections but can suffer performance degradation with \>5,000 objects compared to Pixi.js.  
* **Pixi.js (WebGL):** A 2D rendering engine that uses WebGL.31 It is significantly faster than Fabric.js or Paper.js for rendering thousands of static items (like track ties) because it batches draw calls to the GPU.

**Strategic Insight:** For a future open-source web planner aiming to rival XTrackCAD, **Pixi.js** or a custom WebGL implementation is the superior architectural choice over DOM-based SVG libraries (like D3.js) due to the sheer volume of geometric primitives required for realistic track rendering.

## ---

**5\. Operational Simulation and Graph Theory**

The "Holy Grail" of track planning is verifying that the layout operates correctly before a single rail is laid. This moves the domain from Geometry to **Graph Theory**.

### **5.1 The Topology Graph: Converting Lines to Logic**

To simulate operations, the visual lines of the CAD drawing must be parsed into a **Train Graph** $G \= (V, E)$.32

* **Vertices ($V$):** Turnouts, End-of-track buffers, Block boundaries, Signals.  
* **Edges ($E$):** Track segments connecting these nodes, weighted by attributes like length, speed limit, and gradient.

### **5.2 Routing and Timetabling Algorithms**

While Dijkstra’s algorithm and A\* are standard for finding the shortest path, modern railway simulation requires more sophisticated approaches.

#### **5.2.1 The Connection Scan Algorithm (CSA)**

OSRD and advanced scheduling engines utilize variations of the **Connection Scan Algorithm (CSA)**.34 Unlike Dijkstra, which explores the graph topology, CSA operates on the timetable structure itself.

* **Application:** This allows the planner to answer complex capacity questions: "If I run 4 passenger trains and 2 freight trains per hour, where will the bottlenecks occur?"  
* **Gap in Hobbyist Tools:** XTrackCAD has a basic "Train Mode" that functions as a simple collision-box sprite mover. It lacks the directed graph logic to perform automated routing. JMRI’s "Dispatcher" module implements this logic but requires the user to manually build the logical table linking visual blocks to sensors, a tedious and error-prone process.

### **5.3 Signal Logic and Interlocking**

Simulation requires **Interlocking Logic**—the safety system that prevents conflicting movements.

* **Blocking Problem:** This is a classic graph coloring problem. If Train A occupies Block 1, the system must identify all adjacent blocks and potential routes to lock them.  
* **Cycle Detection:** Essential for 2-rail model railroads to identify "Reverse Loops" which cause electrical shorts. An effective planner must traverse the graph to identify sub-graphs where the polarity would invert upon re-entry.

## ---

**6\. Library Architecture and the Tolerance Challenge**

A critical "target gap" in open-source planners is the handling of component libraries, particularly regarding the divergence between precision scale modeling and modular "toy" systems.

### **6.1 Static vs. Parametric Libraries**

* **Static Libraries (XTrackCAD):** Commercial tracks (Atlas, Peco) are defined as static lists of geometry in .xtp files. If a manufacturer updates a turnout specification, the library file becomes obsolete. Community maintenance is required to update these coordinate lists manually.22  
* **Parametric Generation (Templot):** As noted, Templot avoids this by generating the geometry from parameters. This is more robust but imposes a steeper learning curve on the user.2

### **6.2 The "Wooden Track" Tolerance Problem (Brio/IKEA)**

An overlooked segment in open-source planning is the wooden train ecosystem (Brio, IKEA Lillabo).

* **Geometry:** A standard Brio straight is nominally 144mm, but the connector (peg/hole) allows for significant mechanical play.36  
* **The Constraint Gap:** Precision tools like XTrackCAD assume rigid tangent matching. If a loop is off by 1mm, it will not close. Wooden track, however, allows for $\\pm 2^\\circ$ of angular deviation and $\\pm 1-2mm$ of linear play at each joint.  
* **Requirement:** A planner for this domain requires a **Constraint Solver** (similar to 2D mechanical CAD solvers) rather than rigid geometric plotting. It needs to model "slop" as a variable in the connection logic. The snippets indicate that 3D printed adapters are often needed to bridge the gap between Brio and IKEA due to slight variances in peg neck length, further complicating the "perfect" geometric model.37

## ---

**7\. Conclusions and Strategic Recommendations**

The open-source track planning ecosystem is bifurcated but complementary. **XTrackCAD** and **Templot** serve as the **Geometric Conservators**, preserving the art of precision track laying through rigorous mathematical implementations of easement curves. **JMRI** and **OSRD** serve as the **System Integrators**, viewing the track as a topological abstraction for controlling trains and managing capacity.

### **7.1 Identified Gaps and Future Research Targets**

1. Unified Open Interchange Format (ModelRailJSON):  
   There is no "PDF for Model Railroads." RailJSON is the closest contender, but it is weighted towards real-world infrastructure (catenary voltage, electrification). A lightweight profile, ModelRailJSON, is a high-value target. It would extend RailJSON with model-specific attributes (DCC addresses, manufacturer part numbers, scale ratios) to allow seamless file transfer between XTrackCAD (design) and JMRI (operation).  
2. Web-Based Cornu Integration:  
   Current web planners rely on Bézier approximations. Developing a highly optimized JavaScript/WebAssembly library that efficiently renders Euler Spirals using WebGL shaders would allow for a web-based planner that rivals XTrackCAD in precision, removing the need for desktop installations.  
3. Generative AI Layout Design:  
   The potential for Generative Design—using algorithms to "fill" a given room shape with a valid, operationally interesting track plan—remains largely untapped.38 The application of Wave Function Collapse (WFC) algorithms (commonly used in game level generation) to track geometry constraints is a massive unexploited area for open-source research.  
4. Auto-Documentation:  
   While XTrackCAD can generate parts lists, no tool currently automates the Wiring Diagram. Since the graph topology exists (in RailJSON/JMRI), procedurally generating the electrical bus wiring plan (e.g., identifying feeder wire locations, polarity reversers, and occupancy detector breaks) is a logical and highly useful next step for development.

### **7.2 Final Summary**

The future of open-source track planning lies in the architecture pioneered by OSRD: decoupling the data (RailJSON) from the rendering (MapLibre/WebGL). By applying this separation of concerns to the model scale and integrating the precise geometric algorithms of XTrackCAD via WebAssembly, the community can create a next-generation platform that is both accessible in the browser and rigorously accurate for construction and operation.

---

**Table 1: Comparative Architectural Matrix of Open Source Track Planners**

| Feature | XTrackCAD | JMRI Layout Editor | Templot | OSRD |
| :---- | :---- | :---- | :---- | :---- |
| **Primary Goal** | CAD / Construction | Operations / Control | Prototype Geometry | Capacity / Infrastructure |
| **Geometry Core** | Cornu / Euler Spiral | Schematic / Tangent | Procedural / Generative | Geo-spatial / RailJSON |
| **Rendering Pipeline** | Native GDI/GTK | Java Swing (CPU) | Delphi VCL | WebGL (MapLibre) |
| **Data Model** | .xtc (Drawing commands) | XML (Logical beans) | .box (Binary/Proprietary) | RailJSON (Topology Graph) |
| **Library Strategy** | Static .xtp files | Hardware definitions | Parametric generation | Database driven |
| **Scripting/API** | Macro language | Jython / Python | Scripting interface | Python / REST API |
| **Simulation** | Collision detection | Signaling / Dispatching | None (Visual only) | Timetable / Capacity (CSA) |

#### **Works cited**

1. XTrackCAD User's Manual \- OlderGeeks.com, accessed January 1, 2026, [https://www.oldergeeks.com/downloads/files/XTrackCAD\_Users\_Manual\_V5.3.0GA.pdf](https://www.oldergeeks.com/downloads/files/XTrackCAD_Users_Manual_V5.3.0GA.pdf)  
2. 8\_basic\_track\_planning \[Templot Info\], accessed January 1, 2026, [https://c7514493.myzen.co.uk/dokuwiki/doku.php?id=8\_basic\_track\_planning](https://c7514493.myzen.co.uk/dokuwiki/doku.php?id=8_basic_track_planning)  
3. JMRI Code: Use of Swing, accessed January 1, 2026, [https://www.jmri.org/help/en/html/doc/Technical/Swing.shtml](https://www.jmri.org/help/en/html/doc/Technical/Swing.shtml)  
4. Package jmri.jmrit.display.layoutEditor, accessed January 1, 2026, [https://www.jmri.org/JavaDoc/doc/jmri/jmrit/display/layoutEditor/package-summary.html](https://www.jmri.org/JavaDoc/doc/jmri/jmrit/display/layoutEditor/package-summary.html)  
5. The Netzgrafik-Editor is a powerful software that enables the creation, modification, and analysis of regular-interval timetable. \- GitHub, accessed January 1, 2026, [https://github.com/OpenRailAssociation/netzgrafik-editor-frontend](https://github.com/OpenRailAssociation/netzgrafik-editor-frontend)  
6. Infrastructure example \- OSRD, accessed January 1, 2026, [https://osrd.fr/en/docs/explanation/models/data-models-full-example/](https://osrd.fr/en/docs/explanation/models/data-models-full-example/)  
7. Cornu's spiral \- Applied Mathematics Consulting, accessed January 1, 2026, [https://www.johndcook.com/blog/2016/03/23/cornus-spiral/](https://www.johndcook.com/blog/2016/03/23/cornus-spiral/)  
8. Euler spiral \- Wikipedia, accessed January 1, 2026, [https://en.wikipedia.org/wiki/Euler\_spiral](https://en.wikipedia.org/wiki/Euler_spiral)  
9. I need help understanding and making Bezier curves and what is Cornu? \- Xtrackcad, accessed January 1, 2026, [https://xtrackcad.groups.io/g/main/topic/i\_need\_help\_understanding\_and/103767925](https://xtrackcad.groups.io/g/main/topic/i_need_help_understanding_and/103767925)  
10. XTrkCAD Model RR Track Planner / Wiki / Concepts \- SourceForge, accessed January 1, 2026, [https://sourceforge.net/p/xtrkcad-fork/wiki/Concepts/](https://sourceforge.net/p/xtrkcad-fork/wiki/Concepts/)  
11. canvas vs three vs fabric vs pixi.js vs paper vs p5 | JavaScript Graphics Libraries, accessed January 1, 2026, [https://npm-compare.com/canvas,fabric,p5,paper,pixi.js,three](https://npm-compare.com/canvas,fabric,p5,paper,pixi.js,three)  
12. Canvas API \- MDN Web Docs, accessed January 1, 2026, [https://developer.mozilla.org/en-US/docs/Web/API/Canvas\_API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)  
13. Can we draw a Euler Spiral curve? \- Questions \- three.js forum, accessed January 1, 2026, [https://discourse.threejs.org/t/can-we-draw-a-euler-spiral-curve/6475](https://discourse.threejs.org/t/can-we-draw-a-euler-spiral-curve/6475)  
14. high-speed drawing algorithm for cornu spiral/spline? \- Stack Overflow, accessed January 1, 2026, [https://stackoverflow.com/questions/11211655/high-speed-drawing-algorithm-for-cornu-spiral-spline](https://stackoverflow.com/questions/11211655/high-speed-drawing-algorithm-for-cornu-spiral-spline)  
15. Understanding Euler Spirals and Their Parallel Curves \- Hackernoon, accessed January 1, 2026, [https://hackernoon.com/understanding-euler-spirals-and-their-parallel-curves](https://hackernoon.com/understanding-euler-spirals-and-their-parallel-curves)  
16. Euler Spirals, Curves, Spiro \- Boxbase, accessed January 1, 2026, [https://boxbase.org/entries/2014/dec/1/euler-spirals/](https://boxbase.org/entries/2014/dec/1/euler-spirals/)  
17. OpenTemplot2024 \- Templot Club, accessed January 1, 2026, [https://85a.uk/templot/club/index.php?threads/opentemplot2024.839/](https://85a.uk/templot/club/index.php?threads/opentemplot2024.839/)  
18. Process for refining a design, modify or replace template? \- Templot Club, accessed January 1, 2026, [https://85a.uk/templot/club/index.php?threads/process-for-refining-a-design-modify-or-replace-template.1320/](https://85a.uk/templot/club/index.php?threads/process-for-refining-a-design-modify-or-replace-template.1320/)  
19. XTC File Extension: What Is It & How To Open It? \- Solvusoft, accessed January 1, 2026, [https://www.solvusoft.com/en/file-extensions/file-extension-xtc/](https://www.solvusoft.com/en/file-extensions/file-extension-xtc/)  
20. main@xtrackcad.groups.io | DXF Export \- Import, accessed January 1, 2026, [https://xtrackcad.groups.io/g/main/topic/dxf\_export\_import/35947748](https://xtrackcad.groups.io/g/main/topic/dxf_export_import/35947748)  
21. main@xtrackcad.groups.io | Parameter Files, accessed January 1, 2026, [https://xtrackcad.groups.io/g/main/topic/103935374](https://xtrackcad.groups.io/g/main/topic/103935374)  
22. main@xtrackcad.groups.io | xtp questions, accessed January 1, 2026, [https://xtrackcad.groups.io/g/main/topic/xtp\_questions/110860548](https://xtrackcad.groups.io/g/main/topic/xtp_questions/110860548)  
23. APIs | OSRD, accessed January 1, 2026, [https://osrd.fr/en/docs/reference/apis/](https://osrd.fr/en/docs/reference/apis/)  
24. opengeospatial/ogc-feat-geo-json \- GitHub, accessed January 1, 2026, [https://github.com/opengeospatial/ogc-feat-geo-json](https://github.com/opengeospatial/ogc-feat-geo-json)  
25. maplibre/maplibre-rs: Experimental Maps for Web, Mobile and Desktop \- GitHub, accessed January 1, 2026, [https://github.com/maplibre/maplibre-rs](https://github.com/maplibre/maplibre-rs)  
26. XTrkCAD Model RR Track Planner \- Browse /XTrackCad/Version 4.3.0 at SourceForge.net, accessed January 1, 2026, [https://sourceforge.net/projects/xtrkcad-fork/files/XTrackCad/Version%204.3.0/](https://sourceforge.net/projects/xtrkcad-fork/files/XTrackCad/Version%204.3.0/)  
27. Layout Editor Help \- JMRI, accessed January 1, 2026, [https://www.jmri.org/help/en/package/jmri/jmrit/display/LayoutEditor.shtml](https://www.jmri.org/help/en/package/jmri/jmrit/display/LayoutEditor.shtml)  
28. MapLibre GL JS \- NPM, accessed January 1, 2026, [https://www.npmjs.com/package/maplibre-gl](https://www.npmjs.com/package/maplibre-gl)  
29. MapLibre GL JS | OS National Geographic Database, accessed January 1, 2026, [https://docs.os.uk/osngd/getting-started/access-the-os-ngd-api/os-ngd-api-tiles/getting-started/libraries/maplibre-gl-js](https://docs.os.uk/osngd/getting-started/access-the-os-ngd-api/os-ngd-api-tiles/getting-started/libraries/maplibre-gl-js)  
30. Fabric.js Javascript Canvas Library, accessed January 1, 2026, [https://fabric5.fabricjs.com/](https://fabric5.fabricjs.com/)  
31. Show HN: Canvas engines performance comparison – PixiJS, Two.js, and Paper.js | Hacker News, accessed January 1, 2026, [https://news.ycombinator.com/item?id=23083730](https://news.ycombinator.com/item?id=23083730)  
32. Using Graph Layout to Visualize Train Interconnection Data \- World Scientific Publishing, accessed January 1, 2026, [https://www.worldscientific.com/doi/abs/10.1142/9789812794741\_0009](https://www.worldscientific.com/doi/abs/10.1142/9789812794741_0009)  
33. Graph Theory: Its Application in Unraveling Problems in Modeling Train Scheduling Problems \- ResearchGate, accessed January 1, 2026, [https://www.researchgate.net/publication/381515900\_Graph\_Theory\_Its\_Application\_in\_Unraveling\_Problems\_in\_Modeling\_Train\_Scheduling\_Problems](https://www.researchgate.net/publication/381515900_Graph_Theory_Its_Application_in_Unraveling_Problems_in_Modeling_Train_Scheduling_Problems)  
34. So you want to build a journey planner | by Assertis Tech Team | Medium, accessed January 1, 2026, [https://medium.com/@assertis/so-you-want-to-build-a-journey-planner-f99bfa8d069d](https://medium.com/@assertis/so-you-want-to-build-a-journey-planner-f99bfa8d069d)  
35. XTrkCAD Model RR Track Planner / Wiki / ParameterFile \- SourceForge, accessed January 1, 2026, [https://sourceforge.net/p/xtrkcad-fork/wiki/ParameterFile/](https://sourceforge.net/p/xtrkcad-fork/wiki/ParameterFile/)  
36. BRIO Track Guide, accessed January 1, 2026, [https://woodenrailway.info/track/brio-track-guide](https://woodenrailway.info/track/brio-track-guide)  
37. IKEA- and BRIO- and others- compatible train tracks generator by torwan \- Thingiverse, accessed January 1, 2026, [https://www.thingiverse.com/thing:5598668](https://www.thingiverse.com/thing:5598668)  
38. Implementation of Generative Design Tools in the Construction Process \- TEM JOURNAL, accessed January 1, 2026, [https://www.temjournal.com/content/142/TEMJournalMay2025\_983\_991.pdf](https://www.temjournal.com/content/142/TEMJournalMay2025_983_991.pdf)  
39. Generative Design for Architectural Space Planning | Autodesk University, accessed January 1, 2026, [https://www.autodesk.com/autodesk-university/article/Generative-Design-Architectural-Space-Planning](https://www.autodesk.com/autodesk-university/article/Generative-Design-Architectural-Space-Planning)