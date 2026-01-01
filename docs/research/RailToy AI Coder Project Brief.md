# **Project RailToy: Master Architectural Research & Implementation Report**

## **1\. Executive Summary: The Digital Toy Philosophy**

Project "RailToy" represents a divergent path in the landscape of modern simulation games. Where titles like *Factorio*, *Transport Tycoon*, or *Cities: Skylines* prioritize logistical rigor, complex resource management, and rigid physics simulations, RailToy is predicated on the philosophy of the "Digital Toy." A toy, unlike a game, does not necessarily require a win state, a high score, or a fail condition. Instead, it requires responsiveness, tactile delight, and an intuitive "snap" that bridges the gap between user intent and on-screen result. The core directive is "Fun over Physics," a mandate that prioritizes the user's feeling of control and creativity over the mathematical accuracy of wheel friction, torque, or momentum conservation.

This report serves as the comprehensive Master Architectural Instruction for the development of RailToy. It frames the project not merely as a software engineering task but as a research and implementation challenge that blends graph theory, creative coding mathematics, and high-performance web rendering. The target audience—children aged 6-14 and casual hobbyists—dictates specific, non-negotiable constraints: the user interface must be accessible, "fat-finger" friendly, and visually immediate. The technical architecture must support a seamless "drag-and-drop" experience where track pieces feel magnetic, snapping together with a satisfying precision that belies the messy input of a child's touch.

The technical strategy outlined herein rejects the use of complex CAD constraints or Euler spirals in favor of a **Directed Graph** simulation. The train is not a physics entity subjected to forces; it is a data token traversing the edges of a graph. This distinction is critical. It eliminates the possibility of "derailment" due to physics engine glitches and ensures that the simulation remains robust regardless of the complexity of the track layout. By leveraging **React 18**, **React-Konva**, and **Zustand**, we aim to build a hybrid application that combines the declarative power of modern UI libraries with the raw performance of imperative canvas manipulation, achieving a stable 60 frames per second (fps) even on lower-end devices.

This document details the architectural stack, the mathematical models for curve traversal and snapping, the optimization strategies for rendering, and the specific "fuzzy" logic required to interpret user intent. It provides the Agentic AI coder with the exact blueprints needed to construct the "Toy Sandbox," ensuring that technical decisions align strictly with the project's creative philosophy.

## **2\. Technical Stack Architecture**

The selection of the technology stack for RailToy is driven by a need to balance rapid user interface development with high-performance graphics rendering. The strict constraints—**React 18+**, **Vite**, **TypeScript**, **React-Konva**, **Zustand**, and **Tailwind CSS**—form a cohesive ecosystem designed to handle the specific challenges of a web-based sandbox environment.

### **2.1 The React 18 & Vite Foundation**

#### **2.1.1 Concurrent Features and Responsiveness**

The choice of **React 18** is strategic, specifically for its concurrent rendering features. In a sandbox application, the main thread is often contested ground. User interactions, such as dragging a palette item or panning the camera, must compete with the game loop updating the positions of trains. React 18's concurrent features allow the application to remain responsive by prioritizing these high-frequency user interactions over lower-priority background tasks.1 This ensures that even if the simulation logic experiences a momentary spike in calculation time, the UI remains fluid, preventing the "jank" that often plagues web-based games.

#### **2.1.2 Vite and TypeScript**

**Vite** is utilized for its superior build performance and Hot Module Replacement (HMR) capabilities, which are essential for the iterative "tweak-and-test" workflow of creative coding. **TypeScript** is non-negotiable for this project. The simulation relies heavily on strict data structures—Nodes, Edges, Vectors, and Graph connections. The distinction between a TrackNode (a connection point) and a TrackEdge (the rail itself) must be enforced at compile time to prevent runtime errors. TypeScript interfaces for NodeID, EdgeID, and Vector2 will prevent category errors in the geometry math, ensuring that a train cannot accidentally be assigned to a non-existent track segment.

### **2.2 The Canvas Engine: React-Konva**

#### **2.2.1 Declarative vs. Imperative Rendering**

The raw HTML5 Canvas API is imperative (ctx.moveTo, ctx.lineTo, ctx.stroke). While highly performant, it becomes unmanageable as scene complexity grows. Managing the state of hundreds of individual track pieces, their selection states, and their z-index layering purely through imperative code leads to a "spaghetti code" nightmare. A scene graph is required to manage hit detection, layering, and event bubbling.

**React-Konva** bridges this gap by providing a declarative, DOM-like structure for the canvas.2 It allows the developer to define the scene using JSX syntax, which mirrors the mental model of the rest of the React application.

TypeScript

\<Stage\>  
  \<Layer\>  
    \<Circle x={100} y={100} draggable /\>  
  \</Layer\>  
\</Stage\>

This readability allows the Agentic AI to reason about the scene structure as if it were HTML. It simplifies the implementation of drag-and-drop, event delegation, and z-indexing. Crucially, Konva handles the "dirty rectangle" optimization strategies under the hood, only redrawing layers or regions that have changed.2 This abstraction allows us to focus on the game logic rather than the low-level details of pixel manipulation.

#### **2.2.2 Layer Management Strategy**

Konva's architecture supports multiple \<Layer\> components, each of which corresponds to a separate HTML5 canvas element.2 This is a critical performance lever. By segregating static elements (like the background grid and placed tracks) from dynamic elements (like moving trains and the "ghost" track being dragged), we can minimize the rendering load. The static layers need only be drawn once, while the dynamic layer is cleared and redrawn every frame. This separation is essential for maintaining 60fps on mobile devices where fill-rate limitations are common.4

### **2.3 State Management: The Transient Update Pattern**

#### **2.3.1 The Limits of React Context**

A common pitfall in React game development is storing the simulation state (e.g., the precise x,y coordinates of every train) in React State or Context. React's reconciliation process is designed for UI updates, not the 60hz updates of a game loop. If the train's position is stored in a Context Provider, every update triggers a re-render of the Provider and all its consumers.1 Even with memoization, the overhead of React's virtual DOM diffing at 60fps is prohibitive for a smooth simulation.

#### **2.3.2 Zustand and Transient Updates**

To bypass the React render cycle for high-frequency updates, we utilize **Zustand**. Zustand allows state to exist outside the React component tree.5 More importantly, it supports a pattern known as "Transient Updates." This involves subscribing to the store imperatively without binding the React component's render cycle to the state change.

**The Transient Update Workflow:**

1. **Store:** The useTrainStore holds a mutable map of train positions: trainPositions: Map\<TrainId, number\>.  
2. **Component:** The \<Train /\> component renders a Konva \<Circle\> or \<Group\> but does *not* bind its x and y props to the store state. Instead, it creates a ref to the underlying Konva Node.  
3. **Subscription:** A useEffect hook subscribes to the useTrainStore. Inside the subscription callback—which runs outside of React's render phase—the code directly mutates the Konva node: nodeRef.current.position({x: newX, y: newY}).  
4. **Result:** The visual representation of the train updates at 60fps, but the React component renders *zero* times after the initial mount.5

This approach allows RailToy to scale to hundreds of moving entities without degrading the main thread's performance. It effectively decouples the "Simulation View" (the canvas) from the "Application View" (the React tree), using Zustand as the high-speed bridge between them.

## **3\. The Core Simulation Philosophy: Fun Over Physics**

### **3.1 The "Token on a Graph" Model**

In a physics-based simulation (like *Angry Birds* or *Box2D*), objects are rigid bodies with mass, velocity, and friction. Movement is the result of forces applied over time. While realistic, this model is prone to instability. High-speed collisions can cause objects to tunnel through walls, and floating-point errors can cause trains to "derail" or jitter uncontrollably.6

For RailToy, we reject this model in favor of a **Token on a Graph** approach.

* **The World:** The track layout is a graph where **Nodes** are connection points (joints) and **Edges** are the rails themselves.  
* **The Train:** The train is not a physical object; it is a "cursor" or "token" that holds a reference to a specific EdgeID and a scalar value distanceAlongEdge.7  
* **Movement:** Movement is a simple arithmetic operation: distance \= distance \+ speed \* deltaTime.

This model guarantees that the train *cannot* derail. It is mathematically constrained to the line defined by the edge. If the simulation lags, the train simply "teleports" further down the line in the next frame to catch up; it never leaves the rail. This aligns perfectly with the "Fun over Physics" philosophy, prioritizing stability and predictability over realistic mechanics.8

### **3.2 Graph Data Structures**

#### **3.2.1 Directed vs. Undirected Graphs**

While physical train tracks can be traversed in both directions, the data structure for navigation is best represented as a **Directed Graph**. Each TrackEdge connects NodeA to NodeB. However, because a train can reverse, the graph traversal logic must handle bi-directional movement.

**Data Structure Definition:**

* **TrackNode:**  
  * id: Unique Identifier (UUID).  
  * position: Vector2 {x, y}.  
  * connections: List of EdgeIDs connected to this node.  
  * type: Enum (ENDPOINT, SWITCH, CONNECTOR).  
  * switchState: Boolean or Integer (indicating which "leg" of the switch is active).  
* **TrackEdge:**  
  * id: Unique Identifier (UUID).  
  * startNode: NodeID.  
  * endNode: NodeID.  
  * geometry: The mathematical definition of the path (Straight Line or Arc).  
  * length: Pre-calculated length of the segment.

#### **3.2.2 The Turnout (Switch) Logic**

A switch, or turnout, is a node where a single track splits into two or more paths. In a standard dependency graph, this represents a branch. In RailToy, strictly one path is active at a time. The TrackNode representing the switch maintains a switchState property.9

Traversal Logic at a Switch:  
When a train reaches the end of an edge (distance \>= edge.length):

1. The engine identifies the targetNode (the node at the end of the current traversal).  
2. It queries the targetNode for all connected edges.  
3. **Filtering:** It excludes the edge the train just arrived from.  
4. **Decision:**  
   * If 1 edge remains: Transition to it immediately.  
   * If \>1 edges remain (Switch): Check the switchState of the node to determine the active path.  
   * If 0 edges remain: The train has reached a dead end (buffer stop). It stops or reverses.

This logic allows for complex switching maneuvers without complex physics collision detection. The visual representation of the switch (the moving rails) is purely a reflection of the switchState data.10

### **3.3 Movement Logic & Curve Mathematics**

#### **3.3.1 Bezier Curves vs. Circular Arcs**

A critical decision in the "Creative Coding" domain is how to represent the curved sections of the track.

* **Cubic Bezier Curves:** Standard in vector graphics tools (like Illustrator). They are flexible and can form complex "S" shapes. However, they suffer from non-uniform parameterization. A train moving at a constant rate along the t parameter (0 to 1\) of a Bezier curve will visually speed up and slow down depending on the curvature.11 Implementing "Arc Length Parameterization" (remapping t to constant distance) is computationally expensive and complex.  
* **Circular Arcs:** A circular arc is a segment of a circle defined by a center point, a radius, and start/end angles.  
  * *Pros:* Constant curvature means constant speed traversal is mathematically trivial. The math for "move 10 units along the curve" is simply angle \= distance / radius.  
  * *Cons:* Less flexible shapes (rigid geometry).

**Decision:** RailToy will use **Circular Arcs** and **Straight Lines**.12 This aligns with the "Toy" aesthetic—wooden train tracks are manufactured as fixed-radius curves and straight segments. It drastically simplifies the movement math and ensures consistent train speed without complex integration algorithms.

#### **3.3.2 Parametric Equations for Movement**

Once the abstract state (edgeId, distance) is updated, the engine must map it to screen coordinates $(x,y)$ and rotation $(\\theta)$ for rendering.

For a Straight Edge:

$$x \= x\_{start} \+ (x\_{end} \- x\_{start}) \\times \\frac{distance}{length}$$

$$y \= y\_{start} \+ (y\_{end} \- y\_{start}) \\times \\frac{distance}{length}$$

Rotation $\\theta$ is constant and equal to atan2(dy, dx).  
For a Circular Arc:  
The arc is defined by centerX, centerY, radius, startAngle, and endAngle.

1. Calculate total arc angle spread: $\\Delta\_{angle} \= endAngle \- startAngle$.  
2. Calculate current angle: $\\theta \= startAngle \+ \\Delta\_{angle} \\times \\frac{distance}{length}$.  
3. Plot coordinates:

   $$x \= centerX \+ radius \\times \\cos(\\theta)$$  
   $$y \= centerY \+ radius \\times \\sin(\\theta)$$  
4. Train Rotation: $\\theta \+ 90^\\circ$ (tangent to the circle).

This simple parametric approach allows for extremely efficient 60fps rendering of thousands of trains, satisfying the performance requirements of the project.

## **4\. Research Task 1: The "Fuzzy" Snapping System**

### **4.1 The "Messy User" Problem**

Children do not align coordinates perfectly. A user might drag a track piece to (100, 105\) intending to connect it to a node at (100, 100). A strict equality check or even a simple bounding box check is often insufficient for a satisfying "toy" feel. We need a "Magnetic" system that detects intent and aggressively corrects the user's input to maintain the integrity of the graph connectivity. This is the "Snap-to-Grid" & "Fuzzy Join" logic.

### **4.2 Algorithmic Inspiration: Weighted Voronoi Stippling**

The prompt specifically references **Weighted Voronoi Stippling** as a conceptual model.13 In stippling algorithms (like Lloyd's algorithm), points are iteratively moved toward the "centroid" of their Voronoi region to find an optimal, evenly spaced distribution. This process of "iterative relaxation" is a powerful metaphor for our snapping system.

In RailToy, the dragged node is the "point," and the potential connection nodes (endpoints of existing tracks) act as "gravity wells" or centroids with high weight. When a piece enters the influence of a gravity well, it shouldn't just teleport; mathematically, we are finding the local minimum of a distance function. While we won't run a full iterative solver per frame for performance reasons, the logic mirrors the "search for best fit" inherent in Voronoi diagrams. We are looking for the Voronoi region (the area closest to a specific node) that the user's cursor currently occupies.

### **4.3 The Snapping Algorithm**

We define a SnappingManager class that executes on every dragMove event.

**The Algorithm Steps:**

1. **Input:** The dragNode (the specific endpoint of the track piece currently being dragged) and allNodes (a list of all other open endpoints in the world).  
2. **Filter:** Immediately exclude any nodes belonging to the piece being dragged to prevent self-snapping.  
3. Distance Calculation: Iterate through allNodes and calculate the Euclidean distance to the dragNode.

   $$d \= \\sqrt{(x\_2-x\_1)^2 \+ (y\_2-y\_1)^2}$$  
4. **Hotzone Check:** If $d \< 20px$ (The strict "Hotzone" radius), the node is flagged as a **Candidate**.  
5. **Angle Check (The "Smoothness" Heuristic):** This is critical for preventing awkward or impossible connections. We calculate the angle of the *incoming* track edge and the angle of the *outgoing* candidate edge.  
   * We use the **Signed Shortest Angle Difference** function 16 to compare them.  
   * $$diff \= (angle\_2 \- angle\_1 \+ 180\) \\% 360 \- 180$$  
   * If $|diff| \< 15^{\\circ}$, the connection is considered "Smooth."  
   * *Note:* Depending on the track type, we might allow 90-degree snaps, but for extending a line, this 15-degree constraint ensures straight lines remain straight.  
6. **Selection:** If multiple candidates pass both checks, select the one with the smallest Euclidean distance.

### **4.4 Visual Feedback Systems**

Visual feedback is essential to communicate that a snap *will* happen if the user releases the mouse.

1. **Ghosting:** When a valid snap candidate is found, we do *not* move the actual dragged piece immediately, as this can feel jerky and disconnect the cursor from the object. Instead, we render a **Ghost**—a semi-transparent (50% opacity) copy of the track piece—locked to the snap target's coordinates.  
2. **The Green Halo:** We render a "Ghost Green Halo" around the connection point. This can be achieved using Konva's shadowBlur property (e.g., shadowColor: 'lime', shadowBlur: 20).18 However, since shadowBlur can be performance-intensive on mobile 2, a more optimized approach for low-end devices is to render a pre-cached semi-transparent sprite (a glowing green ring) at the snap location.  
3. **Commit:** On dragEnd, if a valid snap candidate exists, the system "teleports" the real track piece to the ghost's coordinates, updates the Graph data structure to link the nodes, and destroys the ghost.

## **5\. Research Task 2: The Graph-Based Movement Engine**

### **5.1 The Game Loop & Time Steps**

To ensure the simulation runs at a consistent speed regardless of the device's refresh rate (e.g., 60hz vs 120hz monitors), we must use a frame-independent game loop.

TypeScript

let lastTime \= 0;  
const gameLoop \= (timestamp: number) \=\> {  
    const deltaTime \= (timestamp \- lastTime) / 1000; // Convert ms to seconds  
    lastTime \= timestamp;  
      
    if (isSimulationRunning) {  
        updateTrains(deltaTime);  
    }  
      
    requestAnimationFrame(gameLoop);  
}

This deltaTime is passed to the movement logic. A train with speed \= 100 pixels/second will always move 100 \* deltaTime pixels per frame.

### **5.2 Edge Traversal & Directionality**

Each Train entity maintains its position state:

* currentEdgeId: The ID of the TrackEdge it is currently on.  
* distanceAlongEdge: A scalar value from 0 to edge.length.  
* direction: A multiplier (1 or \-1).

**The Critical Update Step:**

1. **Increment:** train.distance \+= train.speed \* train.direction \* deltaTime.  
2. **Boundary Check:**  
   * If train.distance \> edge.length (End of Edge):  
     * The train is leaving the edge via nodeB.  
     * Query the Graph: getConnections(edge.nodeB).  
     * **Switch Logic:** See section 5.3.  
     * **Transition:**  
       * Set train.currentEdgeId \= newEdge.id.  
       * Set train.distance \= train.distance \- oldEdge.length (carry over the overflow distance to preserve momentum).  
       * **Direction Resolution:** If the train enters the newEdge at nodeB (traveling "backwards" relative to the edge's definition), set train.direction \= \-1 and train.distance \= newEdge.length \- overflow. If entering at nodeA, set train.direction \= 1\.

### **5.3 Turnout (Switch) Logic & State**

The handling of switches is where the Directed Graph model shines. In a physical simulation, a switch is a mechanical moving part. In RailToy, it is purely logic.10

Data Structure:  
The TrackNode for a switch contains a switchState index (e.g., 0 for Left, 1 for Right).  
Logic Flow:  
When a train approaches a switch node from the "Toe" (the single track side):

1. The engine detects multiple outgoing edges connected to this node.  
2. It reads the switchState of the node.  
3. It selects the corresponding edge from the connections array.

Merging Logic (Trailing Point Movement):  
When a train enters a switch from one of the "Heel" branches (merging into the single track), the switch state is effectively ignored in typical toy train logic—the train forces its way through. This is known as "trailing point" movement. In RailToy, we allow this merge to happen automatically. The train simply transitions from the branch edge to the main edge without checking the switch state, mimicking the spring-loaded mechanism of real toy switches.

## **6\. Research Task 3: The "Mega-UI" & Interaction Design**

### **6.1 Accessibility & Touch Targets**

The target audience includes children with developing motor skills. Fitts's Law implies that larger targets are faster and easier to hit. Research into mobile accessibility guidelines (Android Material Design, iOS Human Interface Guidelines) dictates a minimum touch target size of **48x48dp**, which corresponds to approximately **9mm** physical size.19

**Palette Item Design:**

* **Visual Size:** The icon for a track piece might be 40px.  
* **Hit Area:** The interactive DOM element must include padding to bring the total hit area to at least **64x64px**. This ensures that "fat fingers" do not miss the target or accidentally trigger adjacent items.  
* **Spacing:** Items in the palette must be separated by at least **8dp** of whitespace to prevent accidental multi-touch errors.20

### **6.2 Drag-and-Drop Architecture**

Implementing Drag-and-Drop from a DOM-based UI (the Palette) to a Canvas-based World (the Stage) presents a coordinate transformation challenge.22 The DOM uses screen coordinates; the Canvas uses an internal coordinate system that may be panned or zoomed.

**The Portal Solution:**

1. **Drag Start:** The user drags a standard HTML5 draggable element from the Palette. We capture the trackType in the dataTransfer object.  
2. **Drag Over:** We listen for the dragOver event on the container \<div\> of the Canvas. We must explicitly call e.preventDefault() to allow dropping.  
3. **Drop & Transformation:**  
   * On drop, we get the event's clientX and clientY.  
   * We define a transformation function using Konva's stage methods:

   TypeScript  
     const getStagePosition \= (stage: Konva.Stage, clientX: number, clientY: number) \=\> {  
         stage.setPointersPositions({ clientX, clientY }); // Register the pointer  
         const pointerPos \= stage.getPointerPosition(); // Get {x,y} relative to stage origin  
         const transform \= stage.getAbsoluteTransform().copy();  
         transform.invert();  
         return transform.point(pointerPos); // Apply pan/zoom inversion  
     }

   * This function returns the correct x,y in the "World Space" of the game, ensuring that if the user is zoomed in 2x, the track piece lands exactly under their finger.

### **6.3 Editor vs. Director Modes**

To minimize UI clutter—a key requirement for the "Toy" aesthetic—we implement distinct interaction modes.

* **Editor Mode:** The default state. The Palette is visible. Track pieces display "Edit Handles" (rotate/delete buttons) when selected. Simulation controls are minimized.  
* **Director Mode:** A "Play" state. The Palette is hidden. All edit handles are hidden. The simulation is running (isSimulationRunning \= true).  
  * **Interactive Switches:** In this mode, clicking a switch node does not select it; instead, it toggles the switchState (flipping the track direction).  
  * **Speed Throttle:** A large slider appears to control the global simulation speed multiplier.

This modal separation simplifies the event handling logic. If isSimulationRunning is true, the draggable prop on all track pieces is set to false, disabling the heavy event listeners associated with editing 2, which further improves performance during the simulation.

## **7\. Performance Optimization Strategy**

### **7.1 Layer Management**

Optimizing HTML5 Canvas rendering often comes down to minimizing the number of pixels that need to be repainted per frame. Konva's \<Layer\> system is the primary tool for this.2

**Layer Architecture for RailToy:**

| Layer Name | Content | Update Frequency | Optimization Strategy |
| :---- | :---- | :---- | :---- |
| **Background Layer** | Grid lines, Terrain color | Once (Static) | listening={false} to disable hit detection. |
| **Track Layer** | Placed rails, Sleepers | Low (On Edit) | Cache complex vector tracks as bitmaps. |
| **Shadow Layer** | Drop shadows for tracks | Low (On Edit) | Separate layer prevents shadow recalculation. |
| **Entity Layer** | Trains, Signals | High (60fps) | Minimized node count; use simple shapes. |
| **Drag Layer** | The "Ghost" piece being dragged | High (User Input) | Only exists during drag operations. |
| **UI Layer** | Snapping Halos, Switch Toggles | Medium | Rendered on top; sparse content. |

By moving the "Drag Layer" to a separate canvas, dragging a track piece does not force a repaint of the complex "Track Layer" or "Entity Layer".4

### **7.2 Caching & Batch Drawing**

Drawing a realistic train track involves rendering two rails and dozens of sleepers (wooden ties). If drawn as individual vector rectangles, a layout with 100 track pieces could result in 5,000+ draw calls per frame.  
We utilize Konva's cache() method. When a track piece is placed, we rasterize it into a bitmap image.24 The browser then renders a single image rather than calculating thousands of vector paths. This drastically reduces the CPU load during the render cycle.

### **7.3 Memory Management & Object Pooling**

JavaScript's garbage collector can cause "hiccups" (frame drops) if we create and destroy too many objects rapidly.

* **Vector Reuse:** Instead of creating new {x, y} objects every frame for position calculations, we reuse a pool of mutable Vector objects.  
* **Train Pooling:** If trains are frequently spawned and despawned, we implement an Object Pool. Despawned trains are deactivated and hidden, then recycled when a new train is requested, avoiding memory allocation overhead.

## **8\. Implementation Roadmap (The Agent Instructions)**

The following structured plan is designed to be fed directly to the Agentic AI coder. It adopts a "Walking Skeleton" methodology—building the end-to-end simulation loop first before adding complex interactions.

**"Agent, please execute the following Phase 1 Implementation Plan for Project RailToy:"**

**Step 1: Repository & Stack Initialization**

* Initialize a new Vite project using the react-ts template.  
* Install core dependencies: npm install konva react-konva zustand clsx tailwind-merge.  
* Install dev dependencies: npm install \-D tailwindcss postcss autoprefixer.  
* Initialize Tailwind CSS and configure content paths in tailwind.config.js.  
* Set up a basic src/stores and src/components directory structure.

**Step 2: The Data Layer (Zustand Stores)**

* Create src/stores/useTrackStore.ts. Define the TrackNode and TrackEdge interfaces. Implement a addTrack action that updates a tracks array.  
* Create src/stores/useTrainStore.ts. Use createStore (vanilla Zustand) for the transient update loop. Define a trains Map holding { id, edgeId, distance, speed }.

**Step 3: The Canvas Foundation**

* Create src/components/StageWrapper.tsx. Implement a responsive \<Stage\> that listens to window resize events.  
* Create src/components/layers/TrackLayer.tsx. Map over the useTrackStore tracks and render simple \<Line\> components.  
* Create src/components/layers/EntityLayer.tsx. This component should render the trains. *Constraint:* Do not bind train positions to React state. Use the useTrainStore.subscribe pattern to update refs directly.

**Step 4: The Playground POC (Proof of Concept)**

* In App.tsx, hardcode a simple "Figure-8" track layout into the store on mount. This layout should include 4 straight sections and 4 curved sections.  
* Spawn a single "Train" entity (a red Circle) at distance: 0 on the first edge.  
* Implement useGameLoop.ts: A hook that runs requestAnimationFrame. In the loop, calculate distance \+= speed \* dt.  
* **Success Criteria:** The red circle must travel along the visible lines of the Figure-8 track smoothly and indefinitely.

**Step 5: Interactive Drag & Snapping**

* Once the loop is proven, implement the Palette component with HTML draggable items.  
* Implement SnappingManager.ts with the findSnapTarget function (20px hotzone, 15-degree angle check).  
* Add logic to TrackLayer to render the "Ghost" piece and the "Green Halo" when a snap target is identified.

This roadmap prioritizes the core technical risks (the simulation loop and the rendering performance) before moving to UI polish, ensuring a solid foundation for the "Toy" experience.

## **9\. Conclusion**

Project RailToy is defined by what it ignores: physics. By abstracting the complex world of rigid-body dynamics into a robust **Directed Graph** model, we eliminate the frustration of derailments and instability, ensuring a delightful and accessible experience for children. The complexity is shifted from the simulation layer to the *interaction* layer—specifically, the "fuzzy" logic of the snapping system and the high-performance rendering pipeline facilitated by **React-Konva** and **Zustand**.

The architecture detailed in this report—leveraging the transient update pattern, concurrent React features, and strict layer management—ensures that the application will perform at 60fps on a wide range of devices. By adhering to the "Fun over Physics" philosophy and the strict "Mega-UI" accessibility guidelines, RailToy will deliver a tactile, responsive, and satisfying digital toy that bridges the gap between chaotic creative play and structured logical systems. This report provides the complete, exhaustive blueprint required for the Agentic AI to successfully implement the vision.

#### **Works cited**

1. State updates causing excessive re-renders in complex React dashboard with nested components \- Stack Overflow, accessed January 1, 2026, [https://stackoverflow.com/questions/79594572/state-updates-causing-excessive-re-renders-in-complex-react-dashboard-with-neste](https://stackoverflow.com/questions/79594572/state-updates-causing-excessive-re-renders-in-complex-react-dashboard-with-neste)  
2. HTML5 Canvas All Konva performance tips list, accessed January 1, 2026, [https://konvajs.org/docs/performance/All\_Performance\_Tips.html](https://konvajs.org/docs/performance/All_Performance_Tips.html)  
3. A deep dive into KonvaJS. This article is about learning the… | by Brandon Wohlwend | Medium, accessed January 1, 2026, [https://medium.com/@brandon93.w/a-deep-dive-into-konvajs-c5b88a161679](https://medium.com/@brandon93.w/a-deep-dive-into-konvajs-c5b88a161679)  
4. Drag and Drop Stress Test with 10,000 Shapes | Konva \- JavaScript Canvas 2d Library, accessed January 1, 2026, [https://konvajs.org/docs/sandbox/Drag\_and\_Drop\_Stress\_Test.html](https://konvajs.org/docs/sandbox/Drag_and_Drop_Stress_Test.html)  
5. Transient Updates | ZUSTAND \- GitHub Pages, accessed January 1, 2026, [https://awesomedevin.github.io/zustand-vue/en/docs/advanced/transiend-updates](https://awesomedevin.github.io/zustand-vue/en/docs/advanced/transiend-updates)  
6. Practical train physics using Godot's physics or custom? \- Reddit, accessed January 1, 2026, [https://www.reddit.com/r/godot/comments/tbwa1u/practical\_train\_physics\_using\_godots\_physics\_or/](https://www.reddit.com/r/godot/comments/tbwa1u/practical_train_physics_using_godots_physics_or/)  
7. How to apply canvas animations with react and konva?, accessed January 1, 2026, [https://konvajs.org/docs/react/Complex\_Animations.html](https://konvajs.org/docs/react/Complex_Animations.html)  
8. Smart Move: Intelligent Path-Finding \- Game Developer, accessed January 1, 2026, [https://www.gamedeveloper.com/programming/smart-move-intelligent-path-finding](https://www.gamedeveloper.com/programming/smart-move-intelligent-path-finding)  
9. Railroad Switch Control \- Official Satisfactory Wiki, accessed January 1, 2026, [https://satisfactory.wiki.gg/wiki/Railroad\_Switch\_Control](https://satisfactory.wiki.gg/wiki/Railroad_Switch_Control)  
10. Railway switch \- AnyLogic Help, accessed January 1, 2026, [https://anylogic.help/9/markup/switch.html](https://anylogic.help/9/markup/switch.html)  
11. Using Curves in Motion \- \#InnoBlog \- InnoGames, accessed January 1, 2026, [https://blog.innogames.com/using-curves-in-motion/](https://blog.innogames.com/using-curves-in-motion/)  
12. Curved Paths \- Red Blob Games, accessed January 1, 2026, [https://www.redblobgames.com/articles/curved-paths/](https://www.redblobgames.com/articles/curved-paths/)  
13. Weighted Voronoi stippling \- SciSpace, accessed January 1, 2026, [https://scispace.com/pdf/weighted-voronoi-stippling-3ixn1y9m00.pdf](https://scispace.com/pdf/weighted-voronoi-stippling-3ixn1y9m00.pdf)  
14. Voronoi Stippling / Mike Bostock \- Observable, accessed January 1, 2026, [https://observablehq.com/@mbostock/voronoi-stippling](https://observablehq.com/@mbostock/voronoi-stippling)  
15. Weighted Voronoi Stippling \- UBC Computer Science, accessed January 1, 2026, [https://www.cs.ubc.ca/labs/imager/tr/2002/secord2002b/secord.2002b.pdf](https://www.cs.ubc.ca/labs/imager/tr/2002/secord2002b/secord.2002b.pdf)  
16. Finding the shortest distance between two angles \- Stack Overflow, accessed January 1, 2026, [https://stackoverflow.com/questions/28036652/finding-the-shortest-distance-between-two-angles](https://stackoverflow.com/questions/28036652/finding-the-shortest-distance-between-two-angles)  
17. What is the best way to calculate angle differences? : r/gamedev \- Reddit, accessed January 1, 2026, [https://www.reddit.com/r/gamedev/comments/1onzya/what\_is\_the\_best\_way\_to\_calculate\_angle/](https://www.reddit.com/r/gamedev/comments/1onzya/what_is_the_best_way_to_calculate_angle/)  
18. Drag and Drop Multiple Images with Border Highlighting | Konva \- JavaScript Canvas 2d Library, accessed January 1, 2026, [https://konvajs.org/docs/sandbox/Image\_Border\_Highlighting.html](https://konvajs.org/docs/sandbox/Image_Border_Highlighting.html)  
19. Touch target size \- Android Accessibility Help, accessed January 1, 2026, [https://support.google.com/accessibility/android/answer/7101858?hl=en](https://support.google.com/accessibility/android/answer/7101858?hl=en)  
20. Accessible tap targets \- web.dev, accessed January 1, 2026, [https://web.dev/articles/accessible-tap-targets](https://web.dev/articles/accessible-tap-targets)  
21. Touch Target \- Material Design, accessed January 1, 2026, [https://m2.material.io/develop/web/supporting/touch-target](https://m2.material.io/develop/web/supporting/touch-target)  
22. How to drag and drop DOM image into the canvas \- Konva.js, accessed January 1, 2026, [https://konvajs.org/docs/sandbox/Drop\_DOM\_Element.html](https://konvajs.org/docs/sandbox/Drop_DOM_Element.html)  
23. Drag and drop canvas shapes \- React \- Konva.js, accessed January 1, 2026, [https://konvajs.org/docs/react/Drag\_And\_Drop.html](https://konvajs.org/docs/react/Drag_And_Drop.html)  
24. HTML5 Canvas Shape Caching Performance Tip \- Konva.js, accessed January 1, 2026, [https://konvajs.org/docs/performance/Shape\_Caching.html](https://konvajs.org/docs/performance/Shape_Caching.html)