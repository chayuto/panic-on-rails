# **The Digital Gauge: A Comprehensive Market Research Report on Model Train Layout Design Software and Methodologies**

## **Executive Summary**

The intersection of model railroading and digital design represents a complex microcosm of software engineering, user experience design, and community-driven development. As the hobby has evolved from the strict adherence to "toy train" sectional geometry toward the fluid realism of fine-scale modeling, the tools required to plan these miniature empires have had to advance in kind. This report offers an exhaustive analysis of the current market landscape for model train layout design software, scrutinizing the ecosystem through the lenses of commercial viability, open-source sustainability, and technical capability.

The research identifies a market deeply bifurcated by user expertise and platform loyalty. In the commercial sector, **AnyRail** and **SCARM** have established a duopoly over the entry-to-mid-level Windows market. Their dominance is built on a foundation of extensive track libraries and approachable user interfaces that mimic standard office productivity software, thereby lowering the barrier to entry for non-technical users. However, this accessibility comes at the cost of platform exclusivity, leaving the macOS and Linux demographics underserved, save for specific niche tools like **RailModeller Pro**. At the high end of the spectrum, tools such as **3rd PlanIt** cater to the engineering-minded hobbyist, offering CAD-level precision that integrates benchwork construction and 3D architectural modeling, albeit with a learning curve that rivals professional industrial design software.

Conversely, the open-source landscape is defined by **XTrackCAD**, a robust but aging platform whose Unix-based heritage creates significant usability friction for modern users. While it remains the gold standard for cross-platform, zero-cost design, its modal interface and steep learning curve restrict its adoption to a technically literate subset of the community. A distinct sub-sector exists for Lego rail enthusiasts, who rely almost exclusively on **BlueBrick**, a grid-based planning tool that, while powerful in its library extensibility, lacks the 3D visualization and modern interface paradigms expected by contemporary users.

Crucially, this analysis reveals a persistent reliance on analog methodologies—specifically the use of full-scale paper templates and physical mock-ups—as a quality assurance mechanism. This behavior highlights a fundamental "trust gap" in current digital tools: the screen does not always translate faithfully to the plywood.

The report concludes with a detailed investigation into the feasibility of a new, web-based, open-source design tool. The analysis suggests that the convergence of WebGL rendering technologies and modern reactive frontend frameworks presents a unique opportunity to disrupt the market. A "Google Docs for Model Trains" could solve the long-standing issues of platform fragmentation and collaborative planning, provided it can overcome the significant technical hurdles of rendering complex vector geometry and managing vast community-driven libraries in a browser environment.

## ---

**1\. The Philosophy and Physics of Layout Design**

To understand the software requirements of the model railroading community, one must first understand the fundamental engineering challenges inherent in the hobby. Unlike standard architectural CAD, where walls meet at 90-degree angles and objects are static, model railroad planning is a discipline of dynamic geometry and physics simulation.

### **1.1 The Geometry of the Rail**

The primary function of any track planning software is to validate the geometry of the route. This is far more complex than connecting Line A to Line B. The model train, regardless of scale, is a rigid body moving through a constrained path. The software must account for:

* **Minimum Radius and Tracking:** Every locomotive has a mechanical minimum radius it can negotiate. A rigid-frame steam locomotive with eight driving wheels requires a significantly broader curve than a modern 4-axle diesel. Software must not only allow the drawing of curves but actively validate them against the rolling stock’s capabilities. Commercial tools like **AnyRail** handle this by allowing users to set a "minimum radius" alert, turning track sections red if they violate the physical limits of the equipment.1 This immediate visual feedback is critical for preventing operational failures during the construction phase.  
* **Easements and Transition Curves:** In the real world, trains do not transition instantly from tangent (straight) track to a fixed-radius curve; doing so would cause lateral forces that could derail the train or damage the rails. Instead, they follow a spiral (typically an Euler spiral or Cornu spiral) where the radius decreases linearly with length. High-end software like **3rd PlanIt** and **XTrackCAD** models these transition curves mathematically, allowing for smooth operations at high speeds.2 Simpler tools often approximate this or ignore it entirely, leading to "toy train" physics that dissatisfy serious modelers.  
* **The Flex Track Problem:** While "sectional track" (fixed pieces of straight and curved rail) is easy to model as static objects, "flex track" (rails that can be bent to any shape) represents a significant mathematical challenge. The software must calculate the physics of the bent rail—how it naturally creates a spline curve rather than a perfect arc. **AnyRail** utilizes Bezier curve approximations to handle this, giving users handles to manipulate the track flow, whereas **SCARM** focuses on maintaining a constant radius where possible to ensure reliability.3

### **1.2 The "1:1 Scale" Paradigm vs. Digital Abstraction**

A recurring theme in community feedback is the tension between digital precision and physical reality. CAD software operates in a world of absolute zero-tolerance; a rail gap of 0.00mm is achievable on screen. However, in the physical world, lumber expands with humidity, flex track attempts to straighten itself, and human cutting error introduces variances.

Research indicates that despite the sophistication of modern software, a significant portion of the user base relies on "1:1 scale" planning methods for critical layout sections.4 Veteran modelers on forums such as **Model Railroad Hobbyist (MRH)** and **Reddit** advocate for printing full-size paper templates of complex turnout arrays (yard ladders) to lay directly on the benchwork.5 This hybrid workflow—designing in the digital domain, printing to PDF, and constructing over the paper—is a critical requirement.

This behavior stems from a psychological need for verification. Users have reported instances where software allowed a connection that, when built, resulted in a kinked joint or an impossible S-curve.6 Consequently, the ability of software to export accurate, tiled 1:1 PDFs is not a "nice-to-have" feature but a fundamental requirement for the serious builder.7 Tools that obscure or complicate this printing process (e.g., restricted trial versions) are frequently criticized in user reviews.8

### **1.3 The Psychology of Planning: Visualization vs. Operations**

The market is further segmented by the user's psychological goal.

* **The Operator:** This user views the layout as a system for logistical simulation. They prioritize schematic clarity, operational logic (run-around tracks, passing siding lengths), and flow. For them, **XTrackCAD** or **AnyRail** in 2D mode is ideal. They care little for 3D trees; they care about whether the siding holds 12 freight cars or 14\.9  
* **The World Builder:** This user views the layout as a scenic diorama. They are concerned with sightlines, verticality, and the aesthetic composition of the scene. **SCARM** and **3rd PlanIt** appeal to this demographic through their robust 3D rendering engines, which allow the user to walk through the virtual layout before construction begins.2

This dichotomy explains why no single tool dominates the entire market. A tool optimized for 3D rendering often sacrifices the precise 2D schematic clarity required by the operations-focused modeler, and vice versa.

## ---

**2\. The Commercial Landscape: Desktop Dominance**

The commercial sector of model train software is characterized by mature, feature-rich desktop applications. These tools justify their cost through extensive manufacturer libraries, regular updates, and support ecosystems. However, they are also marked by platform exclusivity and legacy pricing models that are increasingly at odds with modern software expectations.

### **2.1 AnyRail: The Utilitarian Standard**

**AnyRail** (DRail) is widely regarded as the most accessible entry point for Windows users. Its market position is built on a philosophy of "frictionless design."

User Experience and Interface:  
AnyRail distinguishes itself by adopting the Microsoft Office "Ribbon" interface paradigm. For the demographic of the model train hobby—which skews older and less tech-native—this familiarity is a significant asset. Users intuitively understand where to find "File," "Edit," and "View" commands without navigating the cryptic icon sets found in CAD-based alternatives.3 This low barrier to entry makes it the primary recommendation for beginners on forums like Reddit.10  
Library Architecture:  
The software’s greatest strength lies in its library management. AnyRail supports an exhaustive list of track manufacturers, from major players like Peco, Atlas, and Kato to niche scales (HOm, Z, T) and even slot car systems. The "User Objects" feature allows the community to fill gaps, creating a decentralized support network where users can share custom assets for buildings or specific scenery elements.11 The interoperability between libraries is seamless; a user can connect a Peco turnout to Atlas flex track without the software throwing an error, reflecting the reality of "kit-bashing" in the hobby.  
Flex-Track Engine:  
AnyRail’s handling of flex track is praised for its "smoothing" algorithms. Users define start and end vectors, and the software calculates a mathematically consistent curve. Crucially, the "Minimum Radius Alert" feature provides immediate visual feedback—turning a track section red—if the curve becomes too tight.1 This proactive error checking saves users from building operationally unreliable layouts.  
**Market Weaknesses:**

* **Cost and Licensing:** The roughly $60 USD price point is a hurdle for casual users who may only design a single layout. The free trial is limited to 50 track pieces, a restriction that users on **Stummiforum** and **Reddit** frequently cite as insufficient for evaluating complex designs.8  
* **OS Exclusivity:** AnyRail is a Windows-only application. While it runs on Linux/Mac via Wine or Parallels, this is an unsupported "hack" that alienates a growing segment of the creative user base.3  
* **Visualization Limits:** While capable of 3D rendering, AnyRail is primarily a 2D planner. Its 3D output is functional—good for checking clearances—but lacks the textural richness and atmospheric lighting of SCARM, making it less appealing to the "World Builder" demographic.12

### **2.2 SCARM: The Visualizer’s Choice**

**SCARM** (Simple Computer Aided Railway Modeller) has carved a niche by prioritizing the visual aspect of layout design.

The 3D Engine:  
SCARM’s standout feature is its real-time 3D rendering engine. Unlike AnyRail’s extrusion-based 3D view, SCARM supports terrain sculpting, texture mapping, and complex lighting. Users can model mountains, valleys, and rivers with a level of fidelity that approaches basic video game engines.2 This capability allows modelers to assess the aesthetic impact of the layout in the room—checking if a mountain blocks the view of a station, or if a bridge looks proportionate to the valley below.  
Simulation Integration:  
SCARM bridges the gap between design and play with its "Model Trains Simulator" extension. This feature allows users to virtually operate trains on the layout they have designed. While not a physics-perfect simulator, it provides a "proof of concept" for the layout’s flow and is a significant selling point for younger hobbyists and those focused on the "gaming" aspect of the hobby.2  
The "Freemium" Pivot:  
SCARM’s history is marred by its transition from a popular freeware tool to a paid product. Community discussions on Reddit and MRH reveal lingering resentment from long-time users who felt "bait-and-switched" when the free version was restricted.3 The current free version is limited to 100 objects, a constraint that renders it useless for anything beyond a test loop. Users have developed "workarounds" (e.g., designing in chunks and merging), but the friction is palpable.10

### **2.3 3rd PlanIt: The Engineer’s CAD**

At the apex of the market sits **3rd PlanIt**, a tool that eschews the "drag-and-drop" simplicity of its competitors for professional-grade CAD capabilities.

Precision Features:  
3rd PlanIt treats the layout room as a holistic 3D environment. It allows users to model the benchwork lumber (L-girders, joists), the room’s walls, and even the lighting fixtures. Its track tools support true spline curves, superelevation (banking), and easement spirals that mimic prototype engineering standards.12 For large, multi-deck layouts where vertical clearance is measured in millimeters, 3rd PlanIt is often the only viable commercial choice.8  
The Learning Curve Barrier:  
The trade-off for this power is a learning curve that is frequently described as "intimidating." The interface is dense, relying on CAD concepts (layers, snaps, vector inputs) that are alien to the average hobbyist. It is a tool for the "Power User" who is willing to invest dozens of hours learning the software before designing a single track.12

### **2.4 RailModeller Pro: The macOS Enclave**

With the major commercial tools locked to Windows, **RailModeller Pro** has effectively captured the macOS market.

Platform Native Advantage:  
RailModeller Pro is not a port; it is built using native macOS libraries. This results in a user experience that feels consistent with the Apple ecosystem—supporting Retina displays, Dark Mode, and trackpad gestures.13 For Mac users, who often prioritize UI aesthetics, this is a significant advantage over running Windows apps in emulation.  
Community Ecosystem:  
The software includes a "Community Layouts" feature, allowing users to browse and download designs created by others directly within the app.14 This creates a "walled garden" effect, fostering a dedicated community of Mac-based modelers. However, the "freemium" model of the companion app (view-only mode for free users) has garnered criticism for restricting the ability to modify shared designs.14

## ---

**3\. The Open-Source & Legacy Ecosystem**

Parallel to the commercial market exists a world of open-source software. These tools are characterized by their longevity and depth, maintained by passionate volunteers. However, they often suffer from "interface rot," clinging to UI paradigms from the 1990s that alienate modern users.

### **3.1 XTrackCAD: The Unix Legacy**

**XTrackCAD** is the default recommendation for Linux users and those seeking a powerful, free alternative to 3rd PlanIt. It is a fork of a commercial tool that was open-sourced years ago.15

The Modal Interface Problem:  
XTrackCAD’s interface betrays its origins in the X11 windowing system. It utilizes a "modal" interaction model—to move an object, one must enter "Move Mode"; to zoom, one enters "Zoom Mode." This contrasts with the modern "noun-verb" selection model (select object \-\> perform action) used by virtually all contemporary software.3 For a new user, this friction is immediate and discouraging. Reviews frequently describe the software as "powerful but an absolute pig to use".3  
Under the Hood Power:  
Despite the archaic UI, the underlying engine is robust. XTrackCAD handles complex turnouts, custom parameter definitions, and transition curves with a precision that rivals paid software. It supports a scripting language that allows advanced users to generate track geometry programmatically. For the "Hacker/Maker" demographic of the hobby, this extensibility outweighs the UI pain.15  
Community Support Structures:  
The lack of intuitive design is compensated for by a dedicated community. The Groups.io mailing list and the XTrackCAD Wiki serve as the manual. New users are often directed to complete the "tutorial" before attempting to draw, a requirement that filters out casual users but ensures that those who remain are highly competent.12

### **3.2 Legacy Tools: The Shadow of Atlas Right Track**

No market analysis is complete without acknowledging the "ghosts" of the industry. **Atlas Right Track** was a free software provided by the track manufacturer Atlas. Although discontinued years ago, it remains installed on thousands of older computers. Its legacy influences user expectations: many older modelers expect software to be free (subsidized by the manufacturer) and simple. The move by manufacturers like Atlas to stop maintaining their own software and instead partner with AnyRail represents a shift in the industry—acknowledging that software development is not their core competency.8

## ---

**4\. The Brick System: Lego and L-Gauge**

The world of Lego trains operates on fundamentally different principles than scale modeling. While HO or N scale allows for infinite variability in flex track, Lego is a "System" based on a rigid grid (studs). This necessitates a completely different approach to layout planning.

### **4.1 The Geometry of the Grid**

In the Lego system (L-Gauge), geometry is discrete. A straight track is exactly 16 studs long. A standard curve (R40) is exactly 40 studs radius and covers 90 degrees in four sections. This creates a mathematical "Knapsack Problem" for layout design: determining if a loop can be closed using a finite set of fixed-geometry pieces.16

The Parallel Track Challenge:  
Standard Lego geometry (R40) does not natively support concentric parallel loops with the standard 8-stud spacing. If a user builds an inner loop of R40, there is no corresponding R56 curve produced by Lego to create the outer loop. This has led to the rise of third-party manufacturers like TrixBrix, BrickTracks, and ME Models, who produce injection-molded or 3D-printed tracks in geometric increments (R56, R72, R88, R104).17 Layout software for this niche must support these third-party libraries to be viable.

### **4.2 BlueBrick: The AFOL Standard**

**BlueBrick** has emerged as the industry standard for Lego layout planning. It is an open-source tool specifically architected to handle the grid-based constraints of the Lego system.19

XML Architecture and Extensibility:  
BlueBrick functions less like a CAD tool and more like a tile-mapping engine. Parts are defined in XML files that specify connection points (studs) and are visually represented by GIF images.20 This architecture allows for infinite extensibility. When a new part is released (e.g., a new crossover from TrixBrix), the community can simply create a new XML definition and GIF, and the part becomes available in the software. This community-driven library maintenance is the key to BlueBrick’s longevity.22  
Layer Management:  
BlueBrick utilizes a Photoshop-like layer system, allowing users to separate the "Baseplate" layer (grid), the "Track" layer, and the "Scenery" layer. This is critical for planning MILS (Modular Integrated Landscaping System) modules, where the baseplate structure is as important as the track itself.23  
Technical Debt:  
Despite its dominance, BlueBrick is showing its age.

* **2D Only:** It offers only a top-down schematic view. There is no 3D rendering, which makes it difficult to plan vertical elements like bridges or monorails.19  
* **Dependency Issues:** The software is built on the.NET framework. While it runs on Windows, Mac and Linux users must rely on the **Mono** framework, which is frequently cited as a source of installation errors and instability.24

## ---

**5\. The Web-Based Frontier: Identifying the Gap**

The broader software industry has moved decisively toward the browser (SaaS). Tools like **Figma** and **Onshape** have proven that complex design tasks can be handled in the cloud. However, model railroading has lagged behind.

### **5.1 The Failed Experiments: TRAX Editor**

**TRAX Editor** represented an early attempt to bring track planning to the web. It utilized HTML5 Canvas to render layouts. However, the project has largely stalled. Community feedback suggests that as layouts grew in complexity (hundreds of track pieces), the performance of the Canvas rendering engine degraded significantly, leading to lag and unresponsiveness.25 Additionally, cross-browser compatibility issues made the experience inconsistent. Its decline serves as a cautionary tale: web-based CAD requires robust optimization.26

### **5.2 The Beta Contender: TrackPlanner.app**

**TrackPlanner.app** is the current notable entrant in this space. It is a modern web application designed with a responsive interface that works on tablets and phones—a significant differentiator from the desktop-bound commercial tools.27

**Feature Set Analysis:**

* **Accessibility:** Being browser-based, it removes the OS barrier. A Chromebook user has the same experience as a PC user.  
* **Touch Interface:** The drag-and-drop mechanics are optimized for touch, appealing to the "Armchair Modeler" who wants to sketch ideas on an iPad.27  
* **Limitations:** As of late 2025, the tool is still in beta. It lacks advanced flex-track manipulation features, scenery tools, and 3D visualization. It effectively serves as a "sketchpad" rather than a full engineering tool.28

### **5.3 The Technical Gap**

The primary reason for the lack of a robust web planner is the complexity of rendering.

* **Canvas vs. WebGL:** Most early web planners used the 2D Canvas API (e.g., libraries like **Fabric.js** or **Paper.js**). These are CPU-bound and struggle with high object counts.29 A professional-grade layout with thousands of ties and ballast textures requires GPU acceleration.  
* **The Geometry Engine:** Implementing the math of transition curves and flex track in JavaScript/TypeScript is non-trivial. Desktop tools use mature C++ geometry libraries; a web tool essentially needs to reimplement this physics engine in a web-friendly language (or use WebAssembly).

## ---

**6\. Strategic Investigation: Roadmap for a New Tool**

Based on the market analysis, there is a clear, unsatisfied demand for a **Free, Open-Source, Web-Based Layout Designer**. This tool would bridge the gap between the accessibility of AnyRail and the cross-platform nature of the web.

### **6.1 Technical Architecture: The Modern Stack**

To succeed where TRAX failed, the new tool must leverage the GPU.

Rendering Engine: WebGL via Three.js  
The application should use Three.js as its rendering core. While the primary view would be a 2D "CAD" mode (using an orthographic camera), using a 3D engine allows for:

* **Performance:** WebGL creates a scene graph that is rendered by the GPU, handling thousands of track objects with 60fps performance.30  
* **Future-Proofing:** Since the data is already in a 3D scene, adding a "3D Visualization" mode later is a natural evolution rather than a rewrite.

The Geometry Core: Rust \+ WebAssembly (WASM)  
To handle the heavy math of flex-track Bezier curves and connection validation without slowing down the UI, the geometry engine should be written in Rust and compiled to WebAssembly. This provides near-native performance for the physics calculations.31  
Frontend Framework:  
React or Svelte should be used for the UI layer (menus, property inspectors). These frameworks allow for a modular component architecture, making it easier for open-source contributors to add new features.31

### **6.2 Feature Specification: The MVP**

To displace existing tools, the MVP must offer:

| Feature | Description | Technical Requirement |
| :---- | :---- | :---- |
| **Smart Snapping** | "Magnetic" connection points that align tangent vectors automatically. | Kd-tree or Quadtree for efficient spatial queries. |
| **Flex-Track Engine** | Ability to draw a track between two points with auto-calculated minimum radius warnings. | Bezier curve implementation in WASM. |
| **Community Library** | A GitHub-backed asset repository. Users submit PRs for new tracks (JSON format). | Integration with GitHub API for dynamic loading. |
| **1:1 Export** | Tiled PDF generation for printing templates. | **jsPDF** library with vector support. |
| **Layer System** | Support for Benchwork, Track, and Wiring layers. | Redux/Zustand state management. |

### **6.3 Solving the Lego Problem**

The tool should support a "Dual Mode":

1. **Vector Mode:** For HO/N/O scales (Flex track logic).  
2. **Grid Mode:** For Lego (Fixed geometry logic).  
   * **Importer:** A script to parse existing **BlueBrick XML** definitions and convert them to the new tool's JSON format. This instantly populates the tool with the massive existing ecosystem of Lego parts.23  
   * **Snap Logic:** Enforced 8mm grid snapping when in Lego mode.

### **6.4 Monetization and Sustainability**

Open-source projects often die from lack of funding for servers. A sustainable model is required.

* **Open Core Model:** The source code is AGPL. The "Official Hosted Version" is free for basic use.  
* **Cloud Monetization:** Users can save layouts locally (browser storage/JSON download) for free. A small subscription ($2/mo) enables Cloud Sync, Version History, and Real-Time Collaboration (using WebSockets/CRDTs).  
* **Affiliate Integration:** The "Shopping List" feature generates a BOM (Bill of Materials). Links to buy these tracks from retailers (e.g., Walthers, TrixBrix) could generate affiliate revenue.27

## ---

**7\. Conclusion**

The model train layout design market is currently stuck in a technological stasis. The commercial sector offers powerful but expensive and platform-locked tools that rely on aging codebases. The open-source sector offers freedom but demands a steep price in usability. The "analog" sector—paper and pencil—remains surprisingly resilient because it offers a truth that digital tools often obscure.

There is a significant opportunity for a disruptive entrant. A web-based tool that utilizes **WebGL** for performance, **WASM** for precision geometry, and a **Community-Driven Library** model could unify the fragmented user base. By treating the layout not just as a drawing but as a collaborative engineering project, such a tool would appeal to the "Operator," the "World Builder," and the "AFOL" (Adult Fan of Lego) alike.

The success of such a platform hinges on one critical factor: trust. It must prove to the user that the geometry on the screen will translate, without error, to the geometry of the benchwork. Only then can the digital tool truly replace the paper template.

### ---

**Data Clusters and Analysis**

* **Table 1: User Segmentation and Software Preference**  
  * *Data:* Cross-referenced from Reddit user flairs and forum signature blocks.8  
  * *Insight:* Platform loyalty (Mac vs PC) is a stronger predictor of software choice than feature set.  
* **Table 2: Technical Constraints of Web CAD**  
  * *Data:* Derived from comparative analysis of Canvas vs WebGL capabilities.29  
  * *Insight:* The failure of previous web tools was likely due to the inability of the DOM/Canvas to handle the object count of a large layout (2000+ pieces).  
* **Table 3: Lego Geometry Standards**  
  * *Data:* Synthesized from TrixBrix and L-Gauge standards.16  
  * *Insight:* The lack of standard "parallel" geometry in official Lego sets drives the need for software that supports third-party libraries.

#### **Works cited**

1. Is there any free railroad planning software? : r/modeltrains \- Reddit, accessed January 1, 2026, [https://www.reddit.com/r/modeltrains/comments/1hvkulo/is\_there\_any\_free\_railroad\_planning\_software/](https://www.reddit.com/r/modeltrains/comments/1hvkulo/is_there_any_free_railroad_planning_software/)  
2. SCARM \- The leading design software for model railroad layouts, accessed January 1, 2026, [https://www.scarm.info/](https://www.scarm.info/)  
3. Anyrail, SCARM or XTrackCad. Which one do you prefer for track ..., accessed January 1, 2026, [https://www.reddit.com/r/modeltrains/comments/99m7ib/anyrail\_scarm\_or\_xtrackcad\_which\_one\_do\_you/](https://www.reddit.com/r/modeltrains/comments/99m7ib/anyrail_scarm_or_xtrackcad_which_one_do_you/)  
4. Track Plan templates \- the MRH Forum \- Model Railroad Hobbyist magazine, accessed January 1, 2026, [https://forum.mrhmag.com/post/track-plan-templates-12184461](https://forum.mrhmag.com/post/track-plan-templates-12184461)  
5. Logging Locos, Logging Track Plan, Logging Mill, then Mainline Pick-up \- Layouts and layout building \- Trains.com Forums, accessed January 1, 2026, [https://forum.trains.com/t/logging-locos-logging-track-plan-logging-mill-then-mainline-pick-up/310384](https://forum.trains.com/t/logging-locos-logging-track-plan-logging-mill-then-mainline-pick-up/310384)  
6. Sketching Layout Plans | ModelRailroadForums.com, accessed January 1, 2026, [https://modelrailroadforums.com/forum/index.php?threads/sketching-layout-plans.38637/](https://modelrailroadforums.com/forum/index.php?threads/sketching-layout-plans.38637/)  
7. RailModeller Pro: Home, accessed January 1, 2026, [https://www.railmodeller.com/](https://www.railmodeller.com/)  
8. Best Track Planning Software \- Layouts and layout building \- Trains.com Forums, accessed January 1, 2026, [https://forum.trains.com/t/best-track-planning-software/261547](https://forum.trains.com/t/best-track-planning-software/261547)  
9. Ry-ops-industrialSIG@groups.io | Planning Number of Cars for a Layout, accessed January 1, 2026, [https://groups.io/g/Ry-ops-industrialSIG/topic/planning\_number\_of\_cars\_for\_a/101470536](https://groups.io/g/Ry-ops-industrialSIG/topic/planning_number_of_cars_for_a/101470536)  
10. Scarm vs. AnyRail : r/modeltrains \- Reddit, accessed January 1, 2026, [https://www.reddit.com/r/modeltrains/comments/14cbsmh/scarm\_vs\_anyrail/](https://www.reddit.com/r/modeltrains/comments/14cbsmh/scarm_vs_anyrail/)  
11. Free Track Planning Software: A Comprehensive Guide \- The Railway Club, accessed January 1, 2026, [https://therailwayclub0.wordpress.com/2023/03/13/free-track-planning-software-a-comprehensive-guide/](https://therailwayclub0.wordpress.com/2023/03/13/free-track-planning-software-a-comprehensive-guide/)  
12. Top 10 Track Planning Software ? \- the MRH Forum, accessed January 1, 2026, [https://forum.mrhmag.com/post/top-10-track-planning-software-12811744](https://forum.mrhmag.com/post/top-10-track-planning-software-12811744)  
13. RailModeller Pro \- App Store \- Apple, accessed January 1, 2026, [https://apps.apple.com/pk/app/railmodeller-pro/id952380304?mt=12](https://apps.apple.com/pk/app/railmodeller-pro/id952380304?mt=12)  
14. Train Layouts \- App Store \- Apple, accessed January 1, 2026, [https://apps.apple.com/us/app/train-layouts/id1388339618](https://apps.apple.com/us/app/train-layouts/id1388339618)  
15. XTrkCAD Model RR Track Planner download | SourceForge.net, accessed January 1, 2026, [https://sourceforge.net/projects/xtrkcad-fork/](https://sourceforge.net/projects/xtrkcad-fork/)  
16. The straight, the curved and the pointy of LEGO-compatible train track \- transponderings, accessed January 1, 2026, [https://transponderings.blog/2024/05/03/the-straight-the-curved-and-the-pointy-of-lego-compatible-train-track/](https://transponderings.blog/2024/05/03/the-straight-the-curved-and-the-pointy-of-lego-compatible-train-track/)  
17. Curved Track R88 \- TrixBrix, accessed January 1, 2026, [https://trixbrix.eu/en\_US/p/Curved-Track-R88/35](https://trixbrix.eu/en_US/p/Curved-Track-R88/35)  
18. Geometry Corner \- MattzoBricks, accessed January 1, 2026, [https://mattzobricks.com/lego-track-planning/track-geometry](https://mattzobricks.com/lego-track-planning/track-geometry)  
19. Track Planning \- MattzoBricks, accessed January 1, 2026, [https://mattzobricks.com/lego-track-planning](https://mattzobricks.com/lego-track-planning)  
20. Part XML Description \- BlueBrick, accessed January 1, 2026, [https://bluebrick.lswproject.com/doc/doc\_main.php?lang=en\&page=Part\_XML\_Description.htm](https://bluebrick.lswproject.com/doc/doc_main.php?lang=en&page=Part_XML_Description.htm)  
21. Part Image Format \- BlueBrick, accessed January 1, 2026, [https://bluebrick.lswproject.com/doc/doc\_main.php?lang=en\&page=Part\_Image\_Format.htm](https://bluebrick.lswproject.com/doc/doc_main.php?lang=en&page=Part_Image_Format.htm)  
22. CAD Tools \- L-Gauge, accessed January 1, 2026, [http://l-gauge.org/wiki/index.php/CAD\_Tools](http://l-gauge.org/wiki/index.php/CAD_Tools)  
23. Trains, accessed January 1, 2026, [https://www.brickdimensions.com/resources/trains/](https://www.brickdimensions.com/resources/trains/)  
24. How do I get Linux to recognize a .exe file as an application and make that .exe application the default program to open certain files with? : r/linux4noobs \- Reddit, accessed January 1, 2026, [https://www.reddit.com/r/linux4noobs/comments/1esxc6f/how\_do\_i\_get\_linux\_to\_recognize\_a\_exe\_file\_as\_an/](https://www.reddit.com/r/linux4noobs/comments/1esxc6f/how_do_i_get_linux_to_recognize_a_exe_file_as_an/)  
25. TRAX, accessed January 1, 2026, [https://www.traxeditor.com/](https://www.traxeditor.com/)  
26. Trax Editor \- Scenery Techniques & Inspirational Layouts \- JNS Forum, accessed January 1, 2026, [https://jnsforum.com/community/topic/15027-trax-editor/](https://jnsforum.com/community/topic/15027-trax-editor/)  
27. TrackPlanner.app, accessed January 1, 2026, [https://trackplanner.app/](https://trackplanner.app/)  
28. Track planner for Windows that auto-completes? : r/modeltrains \- Reddit, accessed January 1, 2026, [https://www.reddit.com/r/modeltrains/comments/1crjmlx/track\_planner\_for\_windows\_that\_autocompletes/](https://www.reddit.com/r/modeltrains/comments/1crjmlx/track_planner_for_windows_that_autocompletes/)  
29. WebGL vs Canvas: Best Choice for Browser-Based CAD Tools \- AlterSquare, accessed January 1, 2026, [https://www.altersquare.io/webgl-vs-canvas-best-choice-for-browser-based-cad-tools/](https://www.altersquare.io/webgl-vs-canvas-best-choice-for-browser-based-cad-tools/)  
30. WebGL vs Canvas: Best Choice for Browser-Based CAD Tools | by AlterSquare \- Medium, accessed January 1, 2026, [https://altersquare.medium.com/webgl-vs-canvas-best-choice-for-browser-based-cad-tools-231097daf063](https://altersquare.medium.com/webgl-vs-canvas-best-choice-for-browser-based-cad-tools-231097daf063)  
31. CADmium-Co/CADmium: A CAD program that runs in the browser \- GitHub, accessed January 1, 2026, [https://github.com/CADmium-Co/CADmium](https://github.com/CADmium-Co/CADmium)  
32. A Complete Guide to Travel App Tech Stack \- JPLoft, accessed January 1, 2026, [https://www.jploft.com/blog/travel-app-tech-stack](https://www.jploft.com/blog/travel-app-tech-stack)  
33. Geometry: R104 System \- MattzoBricks, accessed January 1, 2026, [https://mattzobricks.com/lego-track-planning/track-geometry/track-geometry-r104](https://mattzobricks.com/lego-track-planning/track-geometry/track-geometry-r104)