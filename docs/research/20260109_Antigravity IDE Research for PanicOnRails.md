# **Agentic Architecture for PanicOnRails: Deep Research on Antigravity IDE Configuration & Cognitive Workflows**

## **1\. Introduction: The Paradigm Shift to Agentic Engineering**

The software development landscape is currently undergoing a foundational transformation, shifting from a paradigm of manual syntax construction to one of high-level orchestration and agentic architecture. This shift is epitomized by the emergence of platforms like Google Antigravity, an AI-native Integrated Development Environment (IDE) that fundamentally redefines the role of the developer.1 For a project of the complexity of **PanicOnRails**—a high-performance, React 19 and TypeScript-based train track planner involving graph theory simulation and 60 FPS canvas rendering—the traditional approach of manual coding is becoming increasingly inefficient. The new imperative is to treat the IDE not merely as a text editor, but as a cognitive environment where autonomous agents, powered by advanced models such as Gemini 3 Pro, are capable of planning, executing, debugging, and verifying complex software engineering tasks.1

This report provides an exhaustive analysis of the optimal configuration for the Antigravity IDE to support the PanicOnRails initiative. It posits that for an AI agent to successfully engineer a complex, domain-specific simulation tool, the human developer must transition from being a writer of code to an "Architect of Context".4 The repository itself must evolve into a "thinking scaffold," a structured environment that encodes architectural intent, project constraints, and domain knowledge into a format that autonomous agents can discover, ingest, and strictly adhere to.4 We explore the necessity of a "Tech Stack Constitution" to prevent model hallucination of outdated patterns, the implementation of rigorous "Artifact-First" workflows, and the integration of the Model Context Protocol (MCP) to ground agentic reasoning in system-level reality.6

The following analysis synthesizes research on the internal mechanisms of Antigravity, the performance characteristics of the React 19/Vite 7 ecosystem, and the mathematical requirements of graph-based railway simulation. It aims to provide a comprehensive blueprint for configuring an environment where human creativity and machine execution are perfectly synchronized.

## **2\. The Antigravity Cognitive Architecture**

To optimize Antigravity for PanicOnRails, one must first deconstruct its underlying cognitive architecture. Unlike previous generations of AI coding assistants that operated on a "stimulus-response" basis—essentially fancy autocomplete engines—Antigravity employs a sophisticated multi-agent swarm protocol capable of long-horizon planning, iterative self-correction, and autonomous tool use.1 Understanding this architecture is prerequisite to configuring it effectively.

### **2.1. The Agentic Workspace and "Think-Act-Reflect" Loops**

The core operational difference in Antigravity is the shift from a single interaction model to a continuous loop of reasoning and action. The IDE is structured around an **Agent Manager**, a mission control interface where developers orchestrate multiple specialized agents (Coders, Reviewers, Researchers) simultaneously.3 This necessitates a workspace configuration that supports asynchronous, multi-step workflows.

The workspace is defined by specific configuration directories that serve as the agent's long-term memory and operational rulebook. Analysis of the "Antigravity Workspace Template" reveals a standardized directory structure that PanicOnRails must adopt to maximize agent efficacy 4:

| Directory / File | Purpose | Cognitive Function |
| :---- | :---- | :---- |
| **.antigravity/** | Core IDE rules and configuration. | **System 2 Thinking:** Defines the fundamental laws and constraints of the environment. |
| **.agent/workflows/** | YAML/Markdown procedure definitions. | **Procedural Memory:** Step-by-step recipes for complex tasks (e.g., "Refactor Component"). |
| **.context/** | Domain knowledge documentation. | **Semantic Memory:** Auto-injected context about railway physics, graph theory, etc. |
| **artifacts/** | Generated plans, logs, and evidence. | **Working Memory:** Externalized state tracking for the agent's current task. |

This structure enables a "Think-Act-Reflect" loop. Before writing a single line of code, the agent is constrained to produce a planning artifact (e.g., implementation\_plan.md). This document serves as a contract between the human architect and the AI agent, allowing for architectural review *before* implementation costs are incurred.8 For PanicOnRails, where a wrong decision in the data structure of the track graph could necessitate a complete rewrite, this planning phase is critical.

### **2.2. Memory Architecture and Context Retention**

One of the most persistent challenges in AI-assisted development is "context drift"—the tendency for an LLM to lose track of high-level goals or architectural decisions as a conversation progresses.10 Antigravity addresses this through a dual mechanism of "recursive summarization" and persistent memory artifacts.

For a project as mathematically dense as PanicOnRails, relying solely on the model's implicit context window is perilous. The configuration must explicitly enforce context retention strategies:

1. **Project Constitution (CONTEXT.md):** A root-level file pinned in the agent's context that defines the high-level goals ("Performance-critical train simulation") and non-negotiables ("No class components," "Use Zustand for state"). This acts as an immutable anchor for the agent's reasoning.4  
2. **Active State Tracking (task.md):** The agent must be configured to continuously update a task.md artifact. This file acts as an external memory buffer, tracking completed steps and pending items. If the agent's context is reset or if a task is handed off to a different agent, the new instance can "rehydrate" its state by reading task.md, ensuring continuity.11

### **2.3. The Role of Model Context Protocol (MCP)**

The Model Context Protocol (MCP) represents a paradigm shift in how AI models interact with their environment, effectively acting as a "USB-C port for AI".6 For PanicOnRails, standard text generation capabilities are insufficient; the agent needs to interact with the local filesystem, manage Git repositories, and potentially access external databases or documentation servers.

The research indicates that PanicOnRails should leverage a mcp\_servers.json configuration to enable specific capabilities:

* **Filesystem MCP:** This server allows the agent to perform safe file operations—creating components, moving directories, and refactoring code structures—within the project's sandbox. This is essential for scaffolding new features and ensuring that file organization remains clean.13  
* **GitHub MCP:** By connecting to the repository via MCP, the agent can read issues, check pull request status, and understand the broader context of the codebase, including recent commits and active branches.7  
* **Local Documentation Server:** A custom MCP server can be configured to serve the API documentation for Konva.js and React 19 directly to the agent. This "Retrieval-Augmented Generation" (RAG) pattern reduces hallucinations regarding API signatures and ensures the agent uses the latest features.15

## **3\. Tech Stack Constitution: Defining the Rules of Engagement**

An autonomous agent is only as good as the constraints placed upon it. Without strict guidelines, an agent might conflate React patterns from 2020 with those of 2025, introduce redundant dependencies, or utilize deprecated APIs. The "Tech Stack Constitution" for PanicOnRails must be codified in .antigravity/rules.md (or the compatible .cursorrules) to enforce a unified, modern engineering standard.10

### **3.1. Core Technologies and Versioning**

The constitution must explicitly state the versions and paradigms to be used. Ambiguity leads to "confused context," where the agent might suggest solutions incompatible with the modern stack.10

| Component | Version/Standard | Agent Instruction Protocol | Reasoning & Implications |
| :---- | :---- | :---- | :---- |
| **Framework** | **React 19** | "Use Functional Components, Hooks, and React 19 Actions. DO NOT use class components. Use useOptimistic for UI updates." 17 | React 19 introduces concurrent features and Actions that simplify async logic. Agents trained on older data often default to useEffect spaghetti, which leads to race conditions in simulation loops. |
| **Language** | **TypeScript 5.9** | "Enable strict mode. Use import defer for heavy simulation modules. Avoid any." 19 | TS 5.9 features like import defer are crucial for the performance of a heavy web application, allowing lazy loading of the physics engine only when required. |
| **Build Tool** | **Vite 7** | "Target baseline-widely-available. Use Rolldown patterns if applicable. Ensure config is ESM-first." 21 | Vite 7 (powered by Rolldown) offers significant performance gains in build times. Agents must be prevented from configuring Webpack or older Vite patterns that negate these benefits. |
| **State** | **Zustand** | "Use discrete stores for independent modules. Use atomic selectors for *everything* to prevent re-renders." 23 | Zustand's performance relies entirely on correct selector usage. Agents tend to select the full state object for convenience, which would be catastrophic for a 60 FPS simulation. |
| **Canvas** | **React-Konva** | "Use react-konva for declarative bindings. Strictly follow Layering and Caching rules. No direct DOM manipulation." 25 | The abstraction layer of react-konva must be respected to maintain the declarative nature of the UI, while still leveraging Konva's imperative performance features where necessary. |

### **3.2. React 19 & Agentic "Vibe Coding"**

The concept of "vibe coding"—describing the feel and behavior rather than the implementation details—is central to the user experience of Antigravity.2 However, for PanicOnRails, "vibes" must be translated into rigorous React 19 patterns. The constitution must bridge this gap.

The agent must be instructed to utilize **React 19 Actions** and **Optimistic UI** updates. In a simulation tool, perceived latency is a critical quality metric. When a user places a track segment, the UI should reflect the change immediately (useOptimistic) while the background calculation (checking for collisions, verifying graph connectivity) processes.

* **Directive:** "When implementing user interactions that mutate state (e.g., placing a track, flipping a switch), utilize React 19's useOptimistic hook to provide immediate visual feedback. Encapsulate the mutation logic in a robust async handler that aligns with the 'Actions' pattern, rather than ad-hoc event handlers.".17  
* **Directive:** "For expensive computations (e.g., pathfinding or route validation), use the new use() hook to handle promises directly in the render phase, wrapped in Suspense boundaries. Do not use useEffect for data fetching or derived state calculation.".18

### **3.3. TypeScript 5.9 Strictness and Modern Modules**

Agents often default to any or loose typing when data structures become complex, such as in graph traversal algorithms. The constitution must enforce a "No Implicit Any" policy to maintain codebase integrity. Furthermore, with TypeScript 5.9's introduction of import defer, the agent can be tasked with optimizing the loading of heavy simulation modules.19

* **Directive:** "All new modules must use explicit return types. For optional heavy dependencies (like the train physics engine or the bezier-js library), use the import defer syntax to lazy-load the module only when the simulation starts, keeping the initial bundle size minimal.".19

## **4\. Domain-Specific Context: High-Performance Canvas Rendering**

The technical success of PanicOnRails hinges on its ability to render complex rail networks—potentially consisting of thousands of track segments, signals, and moving trains—at a steady 60 frames per second (FPS). This requirement demands deep integration of **Konva.js** optimization strategies into the agent's knowledge base. An agent untrained in canvas performance will likely render thousands of individual shapes within a single layer, leading to immediate performance degradation.

### **4.1. Layer Management Strategy**

Konva allows for the creation of multiple \<Layer\> components, each corresponding to a separate HTML Canvas element in the DOM. This is the primary mechanism for optimization: isolating static elements from dynamic ones to minimize the area that needs to be repainted each frame.28

The agent must be configured with a rigid **Layering Protocol**:

1. **Static Layer (Background/Grid/Terrain):** This layer is drawn once and rarely updated. The agent must set listening={false} on this layer to remove it from the hit-detection graph, saving significant processing power during mouse events.29  
2. **Track Layer (Infrastructure):** Contains the rail segments, sleepers, and ballast. Since tracks change only during editing, this layer should implement a cache() strategy, rasterizing groups of tracks into bitmaps.31  
3. **Dynamic Layer (Trains/Signals):** This layer is redrawn every frame (or on every simulation tick). It contains the moving train sprites and changing signal lights. It should be kept as lightweight as possible.  
4. **Interaction Layer (Drag/Drop):** A temporary, ephemeral layer used during drag operations. When a user drags a new track segment, it should be rendered here to avoid repainting the complex Track Layer underneath.30

**Agent Rule Injection:**

"When designing the Stage component, strictly separate static elements (terrain, grid) and dynamic elements (trains) into different Layer components. Set listening={false} on any layer that does not require user interaction. For the track layer, implement a cache() strategy that rasterizes groups of tracks when editing mode is disabled. Never mix high-frequency updates with static geometry.".28

### **4.2. Shape Caching & Hit Detection**

For a railway network, rendering individual vectors for every wooden sleeper and steel rail tie is computationally prohibitive. The agent must be instructed to use Konva's **caching** system effectively.

* **Caching:** "Group complex composite shapes (e.g., a rail segment consisting of 10 sleepers and 2 rails) and apply .cache() to render them as a single bitmap image. Invalidate the cache only when properties (like selection state) change.".31  
* **Hit Regions:** Train tracks are thin lines, which makes them difficult for users to click. The agent must not rely on the visible stroke for click detection. "Use the hitStrokeWidth property to define a wider, invisible hit region (e.g., 20px) for rail lines. This improves usability without compromising the visual fidelity of the thin rail lines.".32  
* **Perfect Draw:** "Disable perfectDrawEnabled on shapes where high-precision anti-aliasing is unnecessary (e.g., background textures) to save processing cycles.".30

### **4.3. Large Graph Performance: Culling and Windowing**

Dragging and zooming a canvas with 10,000 nodes is a stress test for any browser. The agent should be knowledgeable about "windowing" or "culling" techniques—only rendering what is currently visible in the user's viewport.34

* **Instruction:** "Implement viewport culling for the Track Layer. Calculate the visible bounding box based on the Stage's current scale and position. Filter out track segments that lie strictly outside this box before passing them to the React-Konva renderer. This prevents the engine from attempting to draw off-screen elements.".34

## **5\. Domain-Specific Context: Graph Theory & Simulation Logic**

PanicOnRails is not merely a drawing tool; it is a directed graph editor with a simulation engine attached. The agent must act as the "Chief Engineer," implementing the logic that prevents train collisions, manages signal states, and calculates routes.

### **5.1. Data Structures for Track Networks**

The agent must be instructed to treat the track layout as a mathematical graph, not just a collection of visual shapes.

* **Graph Representation:** The track network should be modeled as a **Directed Graph** ($G \= (V, E)$), where Stations and Switches are Nodes ($V$) and track segments are Edges ($E$).35  
* **Doubly Linked Lists:** For simple linear track segments, a doubly linked list structure is appropriate to model the "Next" and "Previous" connections, allowing trains to traverse efficiently in both directions.37  
* **Switch Logic:** Junctions must be modeled as nodes with dynamic edge weights or state-dependent connectivity (e.g., a switch can point to Track A or Track B, but not both simultaneously). The agent must implement a state machine for these nodes to manage their logical connections.39

**Agent Rule Injection:**

"Model the railway network as a directed graph. Create a strictly typed TrackGraph class that maintains adjacency lists. Use a 'Node' to represent switches and terminals, and an 'Edge' to represent track segments. Implement traversing algorithms (BFS/Dijkstra) to validate track connectivity and detect cycles.".41

### **5.2. Bézier Curves for Rail Geometry**

Realistic train tracks use cubic Bézier curves to model smooth transitions between straight sections. The agent needs to understand the mathematics of Bézier curves to calculate train positions and rotations accurately (mapping t values from 0 to 1).43

* **Math Library:** The agent should be instructed to use or build a geometry library (like bezier-js) to calculate **Look-Up Tables (LUTs)** for constant-speed traversal. Without LUTs, a train moving at a constant t increment would appear to accelerate and decelerate as the curve tightness changes, breaking the simulation's realism.45  
* **Instruction:** "Use a Look-Up Table (LUT) approach to normalize movement along Bézier curves. Do not animate t linearly; map the distance d traveled to the parameter t to ensure constant velocity along the track.".45

### **5.3. Simulation Loop & Game Logic**

The simulation requires a robust "Game Loop" that operates independently of the React render cycle.

* **Architecture:** The agent should implement a requestAnimationFrame loop that updates the simulation state (train positions, physics, collisions) independently of the React component state. Visual state should be synced to the simulation state using an ephemeral store or direct ref updates to avoid the overhead of React reconciliation.46  
* **Tick Rate:** "Implement a fixed time-step simulation loop (e.g., 20 ticks/sec) for logic updates (collision detection, signal processing) and interpolate positions for the render loop (60+ FPS). This ensures deterministic simulation behavior regardless of frame rate.".47

## **6\. State Management Architecture: Scaling with Zustand**

For a simulation-heavy application, the React Context API is a performance bottleneck due to its tendency to trigger re-renders in consuming components. **Zustand** is the chosen solution, but it must be configured correctly for an AI agent to use it effectively.23

### **6.1. The "Single Store vs. Multi-Store" Dilemma**

While a single store is conceptually simple, large applications benefit from slicing. However, passing too many slice dependencies can confuse AI agents.

* **Recommendation:** Use a **Slices Pattern**. Create one main store that combines multiple slices (createTrackSlice, createTrainSlice, createUISlice). This gives the agent a unified API (useStore) while keeping the underlying code modular and maintainable.48

### **6.2. Selector Optimization Pattern**

AI agents notoriously write inefficient selectors (e.g., const { tracks } \= useStore()), which causes the component to re-render whenever *any* part of the state changes.

* **Strict Rule:** "ALWAYS use atomic selectors. Never export the entire state object. Example: const trains \= useStore(state \=\> state.trains). For complex derived data, use useShallow or memoized selectors to ensure referential stability.".50

### **6.3. Transient Updates for Animation**

For high-frequency updates (like a train moving along a track), updating the Zustand store every frame is too slow for React to reconcile.

* **Instruction:** "For 60FPS animations (train movement), bypass React state. Use Zustand's subscribe method or direct refs to update Konva nodes imperatively. Only sync to the persistent React state when the action completes (e.g., drag end, train arrival). This 'Transient Update' pattern is crucial for maintaining performance.".25

## **7\. Workflow Orchestration: The .agent Directory**

The true power of Antigravity lies in its **workflows**—pre-defined recipes that guide the agent through complex, multi-step tasks. We define three critical workflows for PanicOnRails to standardize development.

### **7.1. Workflow: New Feature Implementation (.agent/workflows/feature.md)**

This workflow standardizes how the agent builds new features, ensuring it follows the "Artifact-First" approach.8

## ---

**description: Implement a new feature for PanicOnRails**

1. **Analyze Request:** Review the user's prompt and the CONTEXT.md file.  
2. **Plan Generation:** Create or update .agent/artifacts/implementation\_plan.md.  
   * Define the architectural changes.  
   * List affected files.  
   * Propose state management updates (Zustand slices).  
   * **STOP** and request user approval on the plan.  
3. **Task Breakdown:** Generate .agent/artifacts/task.md with a checklist of atomic steps.  
4. **Implementation Loop:**  
   * For each task in task.md:  
     * Write the code.  
     * Update the task.md status.  
5. **Verification:**  
   * Run npm run test (Vitest).  
   * If UI components were changed, run the Visual Regression workflow.  
6. **Documentation:** Update README.md or component docs if necessary.

### **7.2. Workflow: Graph Algorithm Optimization (.agent/workflows/optimize\_graph.md)**

A specialized workflow for the heavy math logic, forcing the agent to prove its improvements.

## ---

**description: Optimize or Refactor Graph Algorithms**

1. **Benchmark:** Create a benchmark test case using a large graph (e.g., 1000 nodes). Measure current execution time.  
2. **Analyze Complexity:** Review the algorithm (e.g., Dijkstra). Identify O(n^2) bottlenecks.  
3. **Refactor:** Implement the optimization (e.g., using a Priority Queue or Spatial Indexing).  
4. **Verify:** Run the benchmark again.  
   * If performance improved \> 10%, commit.  
   * If not, revert and analyze why.  
5. **Regression Test:** Ensure the optimized logic still passes all correctness tests.

### **7.3. Workflow: Component Creation (.agent/workflows/create\_component.md)**

Standardizes React component creation to enforce the Tech Stack Constitution.53

## ---

**description: Create a new UI component**

1. Ask for component name.  
2. Create directory src/components/\[Name\].  
3. Create \[Name\].tsx using Functional Component syntax.  
4. Create \[Name\].test.tsx with initial Vitest boilerplate.  
5. Ensure strict typing for Props.  
6. If using Konva, ensure Layer and Group best practices are followed.

## **8\. Quality Assurance Strategy: Agentic Testing**

Automated agents require automated verification mechanisms. We configure the environment to allow the agent to run its own tests and validate its own work.

### **8.1. Vitest 4 Configuration**

We utilize **Vitest 4** for its speed and browser mode capabilities.54

* **Browser Mode:** The agent must be configured to run tests in browser mode rather than jsdom for Konva components. Canvas APIs are often imperfectly mocked in JSDOM, leading to false positives/negatives. Running in a headless browser ensures true fidelity.55  
* **Config:**  
  TypeScript  
  // vitest.config.ts  
  export default defineConfig({  
    test: {  
      browser: {  
        enabled: true,  
        name: 'chrome', // Use headless chrome  
        provider: 'playwright',  
      },  
    },  
  });

### **8.2. Visual Regression Testing**

Since PanicOnRails is a highly visual tool, standard unit tests are insufficient. The agent needs to verify that the tracks "look" connected and that trains are rendering correctly.

* **Strategy:** The agent can use Vitest's toMatchScreenshot assertion. When refactoring the rendering engine, the agent runs a workflow that renders a sample track layout, takes a screenshot, and compares it to the baseline. If they differ, the agent halts and reports the diff to the user.55

### **8.3. The "Browser Agent"**

Antigravity's built-in Browser Agent is a powerful tool for end-to-end testing.3

* **Usage:** The developer can prompt: "Launch the app and verify that dragging a Curved Rail onto the canvas snaps it to the nearest node."  
* **Workflow:** The agent launches the dev server, opens the built-in browser, performs the mouse actions, and analyzes the DOM/Canvas state to verify the snap occurred. This effectively replaces manual QA for critical interaction paths.

## **9\. Conclusion: The "Architect" Mindset**

Configuring the Antigravity IDE for PanicOnRails is not merely an exercise in setting preferences; it is the act of defining a **cognitive architecture** for the synthetic developers (agents) that will build the software. By establishing a rigid "Project Constitution," utilizing the .agent/workflows directory for procedural guidance, and leveraging MCP for system-level grounding, we transform the IDE from a passive tool into a semi-autonomous software factory.

The research highlights a critical insight: **The more constrained and context-aware the agent is, the more creative and reliable its output becomes.** By restricting the agent to specific, high-performance patterns (React 19, Konva Caching, Graph Theory), we prevent it from falling into the "average code" trap of its training data and force it to operate at an expert level.

For PanicOnRails, this means the developer's role shifts from writing the loop for the train simulation to writing the *prompt* that defines the physics of the loop, and then reviewing the *Artifact* that the agent produces. This represents the future of software engineering: Human Intent, Machine Execution, Shared Context.

## **10\. Appendix: Quick-Start Implementation Plan**

To immediately bootstrap the PanicOnRails environment in Antigravity, follow this sequence:

1. **Initialize Repository:**  
   * Clone antigravity-workspace-template to inherit the directory structure.  
   * Run npm install react-konva konva zustand vitest.  
2. **Define Context:**  
   * Create .antigravity/rules.md (Tech Stack Constitution).  
   * Create .context/project\_goals.md (PanicOnRails Vision).  
3. **Setup Workflows:**  
   * Create .agent/workflows/feature.md and .agent/workflows/optimize.md based on the templates above.  
4. **Configure MCP:**  
   * Create mcp\_servers.json enabling filesystem and github servers.  
5. **First Prompt:**  
   * "Analyze the rules.md and project\_goals.md. Create an implementation\_plan.md for the initial Track Graph Data Structure. Do not write code yet."

This setup ensures that from the very first interaction, the agent is aligned with the project's high-performance architectural requirements.

## ---

**11\. Detailed Research: Domain-Specific Agent Instructions**

### **11.1. Instructing Agents on Graph-Based Track Logic**

The simulation core requires precise instructions on how to handle the track graph. The agent effectively needs a mini-textbook on the subject injected into its context.

**Key Concepts for Agent Context:**

* **Nodes & Edges:** "Treat the railway as a graph $G \= (V, E)$. $V$ (Vertices) are connectors/switches. $E$ (Edges) are track segments.".35  
* **Traversal:** "Use Breadth-First Search (BFS) for determining if two stations are connected. Use Dijkstra's Algorithm for finding the shortest path, where edge weight is the length of the track segment.".35  
* **Cycle Detection:** "Tracks often form loops. Your pathfinding algorithms must handle cycles. Ensure the visited set in your traversal logic accounts for directed edges properly to avoid infinite loops.".57

**Agent Instruction Snippet:**

"When implementing the Pathfinder class, use a directed graph structure. Represent switches as nodes with multiple outgoing edges. Each edge must store its length and max speed. Implement findRoute(start, end) using A\* if a heuristic (Euclidean distance) is applicable, otherwise default to Dijkstra. Handle cyclic graphs gracefully.".56

### **11.2. Instructing Agents on Konva Performance**

The difference between a laggy app and a smooth one is often a few lines of Konva configuration. The agent won't know this intuitively unless told.

**Performance Checklist for Agents:**

* **Batch Drawing:** "Always use layer.batchDraw() instead of layer.draw() to hook into the browser's animation frame.".59  
* **Event Bubbling:** "Set listening={false} on all shapes that do not require interaction. This drastically reduces the hit-graph traversal overhead.".29  
* **Custom Hit Functions:** "For thin lines (tracks), do NOT rely on the visual stroke. Implement hitFunc or use hitStrokeWidth to define a minimum 10px hit region for usability.".32

**Agent Instruction Snippet:**

"Review src/components/TrackLayer.tsx. Identify any Line or Path components representing tracks. Ensure they have hitStrokeWidth={20} set. Verify that the parent Layer for the static grid has listening={false}. If the grid is static, wrap it in a Group and call .cache() on mount.".32

### **11.3. Instructing Agents on React 19 Actions**

PanicOnRails involves complex state transitions (e.g., switching a signal, moving a switch). React 19's Action paradigm is perfect for this.

**Pattern for Agents:**

* **Transition State:** "Use useTransition to handle the pending state when a user flips a switch. This keeps the UI responsive.".26  
* **Optimistic UI:** "When a user drags a new track, show it immediately in a 'ghost' state using useOptimistic before the heavy validation logic confirms the placement.".17

**Agent Instruction Snippet:**

"Refactor the SwitchToggle component. Instead of manually managing isLoading state, use useTransition. Wrap the API call to update the switch state in a transition. Display the new switch position optimistically.".17

## **12\. Artifacts & Documentation Strategy**

In an agent-driven project, documentation is not just for humans; it is the primary interface for the AI.

### **12.1. The GEMINI.md / AGENT.md File**

This file is the "Soul" of the project. It sits in the root and tells the agent *who* it is.

**Draft Content for PanicOnRails:**

# **AGENT.md \- PanicOnRails Protocol**

## **Identity**

You are a Senior Graphics Engineer and Systems Architect specializing in Simulation Software. You value performance, type safety, and clean architecture.

## **Directives**

1. **Performance First:** Every render cycle costs ms. Optimize aggressively. Use React.memo, useMemo, and Konva caching.  
2. **Strict Types:** No any. Define interfaces for all Graph Nodes and Edges.  
3. **Artifacts:** Before writing code for a complex task, YOU MUST generate an implementation\_plan.md.  
4. **Testing:** No feature is complete without a Vitest test case.

## **Tech Stack**

* Frontend: React 19, Vite 7  
* Canvas: Konva, React-Konva  
* State: Zustand  
* Math: Bezier-js

  61

### **12.2. Interactive Artifacts**

Antigravity's artifact system allows for interactive diagrams. The agent can be instructed to generate Mermaid.js diagrams for the track graph structure in implementation\_plan.md. This allows the human architect to visually verify the proposed data structure changes before they are committed to code.35

#### **Works cited**

1. How to Set Up and Use Google Antigravity \- Codecademy, accessed January 9, 2026, [https://www.codecademy.com/article/how-to-set-up-and-use-google-antigravity](https://www.codecademy.com/article/how-to-set-up-and-use-google-antigravity)  
2. What Is Google Antigravity? Google's Gemini 3 Coding IDE \- DEV Community, accessed January 9, 2026, [https://dev.to/chloedavis/what-is-google-antigravity-googles-gemini-3-coding-ide-3j6g](https://dev.to/chloedavis/what-is-google-antigravity-googles-gemini-3-coding-ide-3j6g)  
3. An Introduction to the Google Antigravity IDE | Better Stack Community, accessed January 9, 2026, [https://betterstack.com/community/guides/ai/antigravity-ai-ide/](https://betterstack.com/community/guides/ai/antigravity-ai-ide/)  
4. study8677/antigravity-workspace-template: The ultimate starter kit for Google Antigravity IDE. Optimized for Gemini 3 Agentic Workflows, "Deep Think" mode, and auto-configuring .cursorrules. \- GitHub, accessed January 9, 2026, [https://github.com/study8677/antigravity-workspace-template](https://github.com/study8677/antigravity-workspace-template)  
5. After a Week With Google's AI Coder, I'm Not a Developer Anymore | by Muhammad Awais, accessed January 9, 2026, [https://medium.com/@muhammad.awais.professional/after-a-week-with-googles-ai-coder-i-m-not-a-developer-anymore-93215f81b639](https://medium.com/@muhammad.awais.professional/after-a-week-with-googles-ai-coder-i-m-not-a-developer-anymore-93215f81b639)  
6. Connect Google Antigravity IDE to Google's Data Cloud services | Google Cloud Blog, accessed January 9, 2026, [https://cloud.google.com/blog/products/data-analytics/connect-google-antigravity-ide-to-googles-data-cloud-services](https://cloud.google.com/blog/products/data-analytics/connect-google-antigravity-ide-to-googles-data-cloud-services)  
7. 13 MCP servers every developer should know \- Composio, accessed January 9, 2026, [https://composio.dev/blog/13-mcp-servers-every-developer-should-know](https://composio.dev/blog/13-mcp-servers-every-developer-should-know)  
8. The Future of Coding? I Tested Google Gemini 3 and Its Antigravity IDE and Here's What Blew My Mind | by Sanjay Nelagadde | Write A Catalyst \- Medium, accessed January 9, 2026, [https://medium.com/write-a-catalyst/the-future-of-coding-i-tested-google-gemini-3-and-its-antigravity-ide-and-heres-what-blew-my-mind-33a70011259c](https://medium.com/write-a-catalyst/the-future-of-coding-i-tested-google-gemini-3-and-its-antigravity-ide-and-heres-what-blew-my-mind-33a70011259c)  
9. From Idea to Execution: Building a BigQuery SQL Optimizer with Antigravity and Gemini 3 | by Marcelo Costa | Google Cloud \- Community | Dec, 2025 | Medium, accessed January 9, 2026, [https://medium.com/google-cloud/from-idea-to-execution-building-a-bigquery-sql-optimizer-with-antigravity-and-gemini-3-19d3ed280071](https://medium.com/google-cloud/from-idea-to-execution-building-a-bigquery-sql-optimizer-with-antigravity-and-gemini-3-19d3ed280071)  
10. Just wanted to share my own experience with Antigravity, Jules and AI Studio, : r/google\_antigravity \- Reddit, accessed January 9, 2026, [https://www.reddit.com/r/google\_antigravity/comments/1pk3d7p/just\_wanted\_to\_share\_my\_own\_experience\_with/](https://www.reddit.com/r/google_antigravity/comments/1pk3d7p/just_wanted_to_share_my_own_experience_with/)  
11. Where are the planning files stored? : r/GoogleAntigravityIDE \- Reddit, accessed January 9, 2026, [https://www.reddit.com/r/GoogleAntigravityIDE/comments/1p79xmz/where\_are\_the\_planning\_files\_stored/](https://www.reddit.com/r/GoogleAntigravityIDE/comments/1p79xmz/where_are_the_planning_files_stored/)  
12. Testing Google's Antigravity for Data Engineering: My End-to-End Experience \- Medium, accessed January 9, 2026, [https://medium.com/google-cloud/testing-googles-antigravity-for-data-engineering-my-end-to-end-experience-2404f808f2e7](https://medium.com/google-cloud/testing-googles-antigravity-for-data-engineering-my-end-to-end-experience-2404f808f2e7)  
13. Model Context Protocol (MCP) | AI Assistant Documentation \- JetBrains, accessed January 9, 2026, [https://www.jetbrains.com/help/ai-assistant/mcp.html](https://www.jetbrains.com/help/ai-assistant/mcp.html)  
14. Connect to local MCP servers \- Model Context Protocol, accessed January 9, 2026, [https://modelcontextprotocol.io/docs/develop/connect-local-servers](https://modelcontextprotocol.io/docs/develop/connect-local-servers)  
15. 5 Essential MCP Servers Every Developer Should Know, accessed January 9, 2026, [https://medium.com/@riccardo.tartaglia/5-essential-mcp-servers-every-developer-should-know-72e828cae18e](https://medium.com/@riccardo.tartaglia/5-essential-mcp-servers-every-developer-should-know-72e828cae18e)  
16. codingwithagent 1.1.1 on npm \- Libraries.io \- security & maintenance data for open source software, accessed January 9, 2026, [https://libraries.io/npm/codingwithagent](https://libraries.io/npm/codingwithagent)  
17. React 19 and the Role of AI in Frontend Development \- OpenReplay Blog, accessed January 9, 2026, [https://blog.openreplay.com/react-19-role-ai-frontend-development/](https://blog.openreplay.com/react-19-role-ai-frontend-development/)  
18. AI in React Development: Tools, Techniques, and Trends \- Brilworks, accessed January 9, 2026, [https://www.brilworks.com/blog/ai-in-reactjs/](https://www.brilworks.com/blog/ai-in-reactjs/)  
19. Microsoft Releases TypeScript 5.9 with Deferred Imports and Enhanced Developer Experience \- InfoQ, accessed January 9, 2026, [https://www.infoq.com/news/2025/08/typescript-5-9-released/](https://www.infoq.com/news/2025/08/typescript-5-9-released/)  
20. Unlocking TypeScript 5.9: Key Updates Every Developer Should Know, accessed January 9, 2026, [https://introduct.tech/blog/unlocking-typescript-5-9-key-updates-every-developer-should-know/](https://introduct.tech/blog/unlocking-typescript-5-9-key-updates-every-developer-should-know/)  
21. vite/packages/vite/CHANGELOG.md at main · vitejs/vite \- GitHub, accessed January 9, 2026, [https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md](https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md)  
22. Vite 7.0 – A Minimalist, High-Performance Milestone | ICreator Studio, accessed January 9, 2026, [https://icreatorstudio.com/blog/vite-7-release-whats-new](https://icreatorstudio.com/blog/vite-7-release-whats-new)  
23. Zustand: Introduction, accessed January 9, 2026, [https://zustand.docs.pmnd.rs/](https://zustand.docs.pmnd.rs/)  
24. Large-Scale React (Zustand) & Nest.js Project Structure and Best Practices \- Medium, accessed January 9, 2026, [https://medium.com/@itsspss/large-scale-react-zustand-nest-js-project-structure-and-best-practices-93397fb473f4](https://medium.com/@itsspss/large-scale-react-zustand-nest-js-project-structure-and-best-practices-93397fb473f4)  
25. Getting started with React and Canvas via Konva, accessed January 9, 2026, [https://konvajs.org/docs/react/index.html](https://konvajs.org/docs/react/index.html)  
26. React 19 Best Practices: Write Clean, Modern, and Efficient React Code \- DEV Community, accessed January 9, 2026, [https://dev.to/jay\_sarvaiya\_reactjs/react-19-best-practices-write-clean-modern-and-efficient-react-code-1beb](https://dev.to/jay_sarvaiya_reactjs/react-19-best-practices-write-clean-modern-and-efficient-react-code-1beb)  
27. Announcing TypeScript 5.9 \- Microsoft Dev Blogs, accessed January 9, 2026, [https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/)  
28. HTML5 Canvas Layer Management Performance Tip \- Konva.js, accessed January 9, 2026, [https://konvajs.org/docs/performance/Layer\_Management.html](https://konvajs.org/docs/performance/Layer_Management.html)  
29. How to Improve React Konva Performance | by Jacob \- Medium, accessed January 9, 2026, [https://j5.medium.com/react-konva-performance-tuning-52e70ab15819](https://j5.medium.com/react-konva-performance-tuning-52e70ab15819)  
30. HTML5 Canvas All Konva performance tips list, accessed January 9, 2026, [https://konvajs.org/docs/performance/All\_Performance\_Tips.html](https://konvajs.org/docs/performance/All_Performance_Tips.html)  
31. HTML5 Canvas Shape Caching Performance Tip \- Konva.js, accessed January 9, 2026, [https://konvajs.org/docs/performance/Shape\_Caching.html](https://konvajs.org/docs/performance/Shape_Caching.html)  
32. HTML5 Canvas Custom Hit Detection Function Tutorial \- Konva.js, accessed January 9, 2026, [https://konvajs.org/docs/events/Custom\_Hit\_Region.html](https://konvajs.org/docs/events/Custom_Hit_Region.html)  
33. From kanvajs to canvas to gpu, the direction of optimisation in canvas | by feynman9966 | Medium, accessed January 9, 2026, [https://medium.com/@maotong06/from-kanvajs-to-canvas-to-gpu-the-direction-of-optimisation-in-canvas-35bae1a3c886](https://medium.com/@maotong06/from-kanvajs-to-canvas-to-gpu-the-direction-of-optimisation-in-canvas-35bae1a3c886)  
34. React-konva slow drag performance with large number of lines rendered \- Stack Overflow, accessed January 9, 2026, [https://stackoverflow.com/questions/65157930/react-konva-slow-drag-performance-with-large-number-of-lines-rendered](https://stackoverflow.com/questions/65157930/react-konva-slow-drag-performance-with-large-number-of-lines-rendered)  
35. Application of Graph Theory in Mapping KRL Commuter Line Services in Jabodetabek, accessed January 9, 2026, [https://www.researchgate.net/publication/381490932\_Application\_of\_Graph\_Theory\_in\_Mapping\_KRL\_Commuter\_Line\_Services\_in\_Jabodetabek](https://www.researchgate.net/publication/381490932_Application_of_Graph_Theory_in_Mapping_KRL_Commuter_Line_Services_in_Jabodetabek)  
36. using graph theory for design and safety in railroad systems \- Rhode Island College, accessed January 9, 2026, [https://digitalcollections.ric.edu/record/6321/files/Poirier\_\_honors.pdf](https://digitalcollections.ric.edu/record/6321/files/Poirier__honors.pdf)  
37. Doubly Linked List in Data Structure (Explained With Examples) \- WsCube Tech, accessed January 9, 2026, [https://www.wscubetech.com/resources/dsa/doubly-linked-list-data-structure](https://www.wscubetech.com/resources/dsa/doubly-linked-list-data-structure)  
38. A Single Solution to Learn Everything on Doubly Linked List in C | Simplilearn, accessed January 9, 2026, [https://www.simplilearn.com/tutorials/c-tutorial/doubly-linked-list-in-c](https://www.simplilearn.com/tutorials/c-tutorial/doubly-linked-list-in-c)  
39. Train Routing Algorithms: Concepts, Design Choices, and Practical Considerations\* Luzi AndereggH Stephan Eidenbenz, accessed January 9, 2026, [https://www.cs.sjsu.edu/\~taylor/publications/AE+03alenex.pdf](https://www.cs.sjsu.edu/~taylor/publications/AE+03alenex.pdf)  
40. Railroad switch network \- Code Golf Stack Exchange, accessed January 9, 2026, [https://codegolf.stackexchange.com/questions/101742/railroad-switch-network](https://codegolf.stackexchange.com/questions/101742/railroad-switch-network)  
41. Directed Graph Pathfinding Algorithm in Functional JS | by Riky Perdana \- Medium, accessed January 9, 2026, [https://rikyperdana.medium.com/directed-graph-pathfinding-algorithm-in-functional-js-b71a39e6dec8](https://rikyperdana.medium.com/directed-graph-pathfinding-algorithm-in-functional-js-b71a39e6dec8)  
42. Implementation of a graph data structure in TypeScript \- GitHub, accessed January 9, 2026, [https://github.com/amadeuio/graph-data-structure](https://github.com/amadeuio/graph-data-structure)  
43. Bezier curve \- The Modern JavaScript Tutorial, accessed January 9, 2026, [https://javascript.info/bezier-curve](https://javascript.info/bezier-curve)  
44. Nerding Out With Bezier Curves \- Medium, accessed January 9, 2026, [https://medium.com/free-code-camp/nerding-out-with-bezier-curves-6e3c0bc48e2f](https://medium.com/free-code-camp/nerding-out-with-bezier-curves-6e3c0bc48e2f)  
45. Bezier.js, for doing Bezier curve things \- Pomax, accessed January 9, 2026, [https://pomax.github.io/bezierjs/](https://pomax.github.io/bezierjs/)  
46. Dev Diary \#2 \- Logistics & Resources | Paradox Interactive Forums, accessed January 9, 2026, [https://forum.paradoxplaza.com/forum/developer-diary/dev-diary-2-logistics-resources.1857280/](https://forum.paradoxplaza.com/forum/developer-diary/dev-diary-2-logistics-resources.1857280/)  
47. Train Trajectory-Following Control Method Using Virtual Sensors \- MDPI, accessed January 9, 2026, [https://www.mdpi.com/1424-8220/24/16/5385](https://www.mdpi.com/1424-8220/24/16/5385)  
48. Zustand and TanStack Query: The Dynamic Duo That Simplified My React State Management | by Blueprintblog | JavaScript in Plain English, accessed January 9, 2026, [https://javascript.plainenglish.io/zustand-and-tanstack-query-the-dynamic-duo-that-simplified-my-react-state-management-e71b924efb90](https://javascript.plainenglish.io/zustand-and-tanstack-query-the-dynamic-duo-that-simplified-my-react-state-management-e71b924efb90)  
49. A Modern Approach to Global State Management with Zustand | by Utku Kaba \- Medium, accessed January 9, 2026, [https://medium.com/huawei-developers/a-modern-approach-to-global-state-management-with-zustand-8a772e877f21](https://medium.com/huawei-developers/a-modern-approach-to-global-state-management-with-zustand-8a772e877f21)  
50. Do you think Zustand or other global state managers should force more pattern or instructure? : r/reactjs \- Reddit, accessed January 9, 2026, [https://www.reddit.com/r/reactjs/comments/1hwp9wc/do\_you\_think\_zustand\_or\_other\_global\_state/](https://www.reddit.com/r/reactjs/comments/1hwp9wc/do_you_think_zustand_or_other_global_state/)  
51. Best practices on using a single Zustand store with large selectors? : r/reactjs \- Reddit, accessed January 9, 2026, [https://www.reddit.com/r/reactjs/comments/1l9g5ha/best\_practices\_on\_using\_a\_single\_zustand\_store/](https://www.reddit.com/r/reactjs/comments/1l9g5ha/best_practices_on_using_a_single_zustand_store/)  
52. pmndrs/zustand: Bear necessities for state management in React \- GitHub, accessed January 9, 2026, [https://github.com/pmndrs/zustand](https://github.com/pmndrs/zustand)  
53. Antigravity Workflows: How to Create Your Own Automation Recipes, accessed January 9, 2026, [https://antigravity.codes/blog/workflows](https://antigravity.codes/blog/workflows)  
54. Vitest Team Releases Version 4.0 with Stable Browser Mode and Visual Regression Testing, accessed January 9, 2026, [https://www.infoq.com/news/2025/12/vitest-4-browser-mode/](https://www.infoq.com/news/2025/12/vitest-4-browser-mode/)  
55. Vitest 4.0 is out\!, accessed January 9, 2026, [https://vitest.dev/blog/vitest-4](https://vitest.dev/blog/vitest-4)  
56. Graph Theory: Its Application in Unraveling Problems in Modeling Train Scheduling Problems \- ResearchGate, accessed January 9, 2026, [https://www.researchgate.net/publication/381515900\_Graph\_Theory\_Its\_Application\_in\_Unraveling\_Problems\_in\_Modeling\_Train\_Scheduling\_Problems](https://www.researchgate.net/publication/381515900_Graph_Theory_Its_Application_in_Unraveling_Problems_in_Modeling_Train_Scheduling_Problems)  
57. Finding the minimum cycle path in a dynamically directed graph \- Stack Overflow, accessed January 9, 2026, [https://stackoverflow.com/questions/13199653/finding-the-minimum-cycle-path-in-a-dynamically-directed-graph](https://stackoverflow.com/questions/13199653/finding-the-minimum-cycle-path-in-a-dynamically-directed-graph)  
58. Modelling of a WDM Network Using Graph Theory and Dijkstra Algorithm for Traffic Redirection \- Scirp.org., accessed January 9, 2026, [https://www.scirp.org/journal/paperinformation?paperid=134822](https://www.scirp.org/journal/paperinformation?paperid=134822)  
59. accessed January 9, 2026, [https://raw.githubusercontent.com/konvajs/konva/464432a2a5e974ba20f2e5cf4f466ca85b3635bf/CHANGELOG.md](https://raw.githubusercontent.com/konvajs/konva/464432a2a5e974ba20f2e5cf4f466ca85b3635bf/CHANGELOG.md)  
60. Konva.Layer\#getIntersection doesn't work with Stage\#scaleX \< 1 or Stage\#scaleY \< 1 · Issue \#823 \- GitHub, accessed January 9, 2026, [https://github.com/konvajs/konva/issues/823](https://github.com/konvajs/konva/issues/823)  
61. How to write a great agents.md: Lessons from over 2,500 repositories \- The GitHub Blog, accessed January 9, 2026, [https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)  
62. AGENTS.md, accessed January 9, 2026, [https://agents.md/](https://agents.md/)  
63. Antigravity IDE Hands-On: Google's Agent-First Future — Are we ready? \- Medium, accessed January 9, 2026, [https://medium.com/@visrow/antigravity-ide-hands-on-googles-agent-first-future-are-we-ready-a6d991025082](https://medium.com/@visrow/antigravity-ide-hands-on-googles-agent-first-future-are-we-ready-a6d991025082)