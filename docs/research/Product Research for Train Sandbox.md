# **Convergence of Physical Constraints and Digital Logic in Rail Simulation Architecture: A Comprehensive Analysis**

## **1\. Introduction: The Dual Reality of Rail Modeling**

The discipline of rail simulation exists at a fascinating intersection between the immutable laws of physics and the arbitrary, yet rigorous, logic of software code. Whether one is snapping together injection-molded plastic track segments on a dining room table or placing digital signals in an infinite procedurally generated factory, the core engineering challenges remain fundamentally identical: the management of flow, the optimization of spatial resources, and the mitigation of failure states. This report provides an exhaustive, expert-level analysis of these converging systems, segmented into four critical domains of inquiry: the mechanical interactions and user interface patterns inherent in simulation software; the precise geometric cataloging of physical model railroad components; the economic modeling of hobbyist entry points; and the aesthetic theory of visual feedback systems in transit design.

To understand the modern rail simulation landscape, one must analyze the friction points where user intent meets systemic constraints. In digital environments like *TrackPlanner.app* or *Tinkercad*, these constraints are defined by "snapping tolerances" and boolean geometry operations. In gaming simulations like *Factorio* or *Unrailed\!*, constraints manifest as logic blocks and derailment physics. In the physical realm, represented here by the Kato Unitrack system and standard wooden railways, constraints are dictated by manufacturing tolerances, radius geometry, and the physical properties of couplers under lateral stress.

This analysis synthesizes technical specifications, user behavior data, and interface design patterns to establish a unified theory of rail simulation architecture. It explores how a "Budget Mode" for teenage hobbyists is not merely a financial constraint but a psychological entry point into complex systems planning, and how the "Night Mode" aesthetic of *Mini Metro* represents a triumph of utilitarian information design. By weaving together data from technical manuals, forum discussions, and software changelogs, this report aims to serve as a definitive reference for understanding the mechanics, geometry, and economics of the rail simulation ecosystem.

## **2\. Digital Mechanics and User Interface Patterns**

The translation of railroad physics into user interfaces requires a delicate balance between realism and usability. Two primary categories of interaction exist: the **Constructive Interface**, where the user builds static infrastructure (e.g., *TrackPlanner.app*, *Tinkercad*), and the **Operational Interface**, where the user manages active systems (e.g., *Factorio*, *Unrailed\!*).

### **2.1 The Geometry of Connection: Snapping Tolerances and S-Curve Handling in TrackPlanner.app**

In the realm of digital track planning, "snapping" refers to the magnetic attraction between two track connection points. While this feature facilitates a seamless user experience by assuming user intent, it often masks underlying geometric incompatibilities, leading to the construction of "S-curves"—a sequence of reverse curves with insufficient tangent track between them.

#### **2.1.1 The Physics of the S-Curve Failure State**

An S-curve occurs when a left-hand curve is immediately followed by a right-hand curve (or vice versa). In physical modeling, this configuration is disastrous due to the mechanics of couplers and wheel flanges. As a train traverses the first curve, the couplers are angled outward; upon entering the immediate reverse curve, the lateral forces shift violently. This sudden reversal of lateral force causes "stringlining," where the tension on the train pulls the cars inward off the rails, or causes the couplers to lock and derail the bogies.1

The severity of this issue is dictated by the radius of the curves involved. Prototype railroads use radii so large that S-curves are negligible, or they utilize "spiral easements"—sections of track where the radius gradually changes from infinite (straight) to the fixed curve radius.1 In model railroading, and consequently in simulation software like *TrackPlanner.app*, the radii are compressed (often 10 to 100 times tighter than prototype scale), making the S-curve interaction critical.1

*TrackPlanner.app* faces a specific User Experience (UX) challenge here. Users often rely on the software's snapping tolerance to force a connection between two misalignment points. If the application’s tolerance is too high—for example, allowing connections that deviate by significant millimeters or degrees—it permits the user to design physically impossible or operationally dangerous trackwork. Community discourse highlights that while some users view S-curves as "monsters" to be feared, the operational reality is nuanced. The insertion of a straight "tangent" section (typically between 1/4" and 1/2" in physical models, or a specific track piece like the Kato 62mm straight) between the reverse curves allows the rolling stock to straighten out, neutralizing the lateral forces before they reverse.1

#### **2.1.2 Interface Evolution and Snapping Logic**

The evolution of *TrackPlanner.app* reveals a continuous refinement of these constructive interactions. The software has moved through various beta stages, specifically targeting how users interact with track joints. "Beta 9" introduced a significant change to the behavior of the handles that appear at track joints, aimed at making "Easier Selection".2 This suggests that the developers recognized the precision required in placing track was a barrier to entry.

However, snapping is a double-edged sword. A "loose" snapping tolerance might allow a user to close a loop that, in physical reality, would require forcing the track against its natural geometry, leading to kinks. The community consensus suggests that simulation software should ideally mimic the constraints of the physical product. For example, if a user attempts to create a reverse curve without a straight interval, the software should offer visual feedback or a "tension" warning, similar to how structural engineering software highlights load-bearing failures.3

The software's development log also indicates a shift towards accessibility over pure CAD precision. Features like "Drag and Drop" (Beta 4\) and "Keyboard Access" (Beta 10\) imply a gamification of the design process.2 By allowing users to drag parts from a menu rather than strictly defining geometry through coordinates, the app encourages experimentation. This experimental approach, however, necessitates a robust backend logic to prevent the user from creating "impossible" geometry. The interface must implicitly teach the user that an S-curve requires a straight tangent, perhaps by auto-suggesting a straight piece when a reverse curve is detected.

#### **2.1.3 The "Shopping List" as a Reality Check**

A crucial bridge between the simulation and reality in *TrackPlanner.app* is the "Shopping List" feature (Beta 6).2 This feature compiles a count of all parts used in the layout. This transforms the application from a mere drawing tool into a logistical planning tool. It reinforces the concept that every digital line corresponds to a physical SKU (Stock Keeping Unit). If the snapping tolerance allows a user to place a generic "flex track" curve that doesn't match a manufactured part, the Shopping List becomes inaccurate. Therefore, the snapping logic must be strictly tied to the available geometry of specific brands (e.g., Kato, Bachmann, Hornby) to ensure that the digital plan is executable in the real world.2

### **2.2 Logic Visualization in Factorio: The Rail Signal Block System**

While *TrackPlanner.app* handles static geometry, *Factorio* represents the gold standard in visualizing the logical segmentation of active rail networks. Unlike physical models where control is often analog and collision avoidance is manual, *Factorio* treats rail networks as a series of discrete logic blocks guarded by signals.

#### **2.2.1 The Philosophy of the Block**

The fundamental unit of safety in *Factorio* is the "Block." A block is defined as a contiguous section of rail uninterrupted by a signal. The rule is absolute: only one train is allowed in a block at any given time.5 This binary state (Occupied/Empty) forms the basis of all collision detection.

The brilliance of *Factorio's* UI lies in how it visualizes these invisible logic gates. When a player holds a rail signal in their cursor, the game renders colored lines over the tracks. Each contiguous block is assigned a unique color ID.6

* **Visual Debugging:** This allows players to instantly verify if an intersection is properly isolated. If two parallel tracks share the same color line, they are electrically and logically connected, meaning a train on one track will erroneously trigger a red signal on the adjacent track.5  
* **Intersection Isolation:** By placing signals (and thus creating block breaks) before and after intersections, players use the color visualization to confirm that the crossing tracks are independent blocks, allowing for high-throughput junctions where trains can cross simultaneously without collision.5

#### **2.2.2 Signal Debugging and Ghost Visualization**

The community has identified friction points in this visualization system. A common issue is the need to hold a signal item to see the blocks. Advanced users have discovered debug options (accessed via F4) such as show-rail-blocks or show-rail-signal-states to render these visualizations permanently, freeing the cursor for other tasks.6

Furthermore, the game provides "Ghost" visualization—white boxes indicating where a train will stop relative to a signal.6 This is a predictive UI element that helps players understand braking distances and block reservation. A critical insight from user "edryk" highlights the desire for visualization *ahead* of the signal to ensure sufficient clearance for long trains after a junction.6 This demonstrates that in rail simulation, users need feedback not just on the current state (is the block empty?) but on the future state (will my train fit in the next block?).

#### **2.2.3 Chain Signals vs. Rail Signals**

The UI distinguishes between standard "Rail Signals" (which read the immediate next block) and "Chain Signals" (which read the signal *ahead* of the next block). This distinction is vital for preventing deadlocks in intersections. The visualization aids this by showing the state of the chain: a blue signal indicates that some, but not all, exit paths are open.5 This nuanced feedback loop teaches players complex logic gates (AND, OR, XOR) through spatial signaling.

### **2.3 Constructive Solid Geometry (CSG) in Tinkercad**

For modelers bridging the gap between digital design and physical fabrication (e.g., 3D printing custom track adapters), *Tinkercad* utilizes a Constructive Solid Geometry (CSG) approach. This represents a "Volume-based" interaction model, distinct from the "Line-based" model of *TrackPlanner*.

#### **2.3.1 Grouping as a Boolean Operation**

The fundamental operation in *Tinkercad* is "Grouping" (Ctrl+G). This combines multiple primitive shapes into a single complex object. The power of this system lies in the definition of primitives as either "Solid" or "Hole".10

* **The Additive/Subtractive Workflow:** To create a custom track piece with a connector socket, a user does not "draw" the hole. Instead, they position a solid block (the track tie) and a negative cylinder (the hole) and Group them. The software performs a Boolean subtraction, removing the volume of the cylinder from the block.12  
* **Iterative Refinement:** A critical UX feature is the non-destructive nature of this grouping. A user can "Ungroup" (Ctrl+Shift+G) an object at any time to revert it to its constituent primitives. This allows for iterative tweaking of tolerances—for example, adjusting a Brio connector peg by 0.5mm before re-grouping and exporting for print.12

#### **2.3.2 UI Interaction Patterns**

The UI facilitates this deep hierarchy manipulation through "Double-Click Editing." This allows the user to enter a "group edit" mode, adjusting the internal components of a group without formally ungrouping the entire assembly.13 This preserves the structural integrity of complex models (like a locomotive with hundreds of parts) while allowing for precise modification of sub-assemblies.

### **2.4 Derailment Physics in Unrailed\!**

In contrast to the rigorous logic of *Factorio* or the static geometry of *TrackPlanner*, *Unrailed\!* presents rail mechanics through the lens of arcade chaos and cooperative algorithms.

#### **2.4.1 The "Slide" Mechanic and Momentum**

Early versions of simulation games often treated derailment as a static "Game Over" state where the train simply stopped. *Unrailed\!* and similar modern simulators (like *Derail Valley*) have evolved to include momentum in failure states. When a derailment occurs, the train does not merely halt; it slides off the track, retaining its kinetic energy.14 This provides visceral feedback on the weight and speed of the train.

#### **2.4.2 Suspension Simulation**

Recent updates to *Unrailed\!* (specifically the "Simulator" update) introduced suspension physics. Trains now visually "sway" and tilt around corners due to centrifugal force.15 This is not merely cosmetic; it is a visual indicator of speed and stability. The "wheel axle oscillation" mentioned by developers adds a layer of fidelity that transforms the train from a rigid box moving on a spline to a physical object interacting with forces.15

#### **2.4.3 Algorithmic Failure States**

*Unrailed\!* is unique in that derailment is often a result of "algorithmic failure" rather than physics failure. The game enforces a cooperative loop where the "track layer" must synchronize with resource gatherers. If the track layer fails to place a rail in time, the train derails. This creates a "soft" physics interaction where the primary variable is **Time** rather than **Velocity**. The derailment is the punishment for breaking the cooperative algorithm.16

## **3\. Real Parts Catalog: Geometric Dimensions and Standards**

A digital simulation is only as valuable as its adherence to physical reality. For the "Real Parts Catalog" module, we must codify the precise dimensions of industry-standard components. This data serves as the boundary constraints for any valid layout configuration in *TrackPlanner.app* or for 3D printing components in *Tinkercad*.

### **3.1 Kato Unitrack N-Scale Geometry**

Kato Unitrack is the dominant standard for N Scale (1:160) modeling due to its integrated roadbed and high-precision Unijoiner system. The geometry is based on metric measurements, specifically derived from a standard track spacing of **33mm**.

#### **3.1.1 Straight Track Standards**

The fundamental unit of length in the Unitrack system is **248mm** (9 3/4"). All other lengths are derivatives or specific functional adjusters for this base unit.17

**Table 1: Kato Unitrack Straight Dimensions**

| Component ID | Length (mm) | Description | Operational Context |
| :---- | :---- | :---- | :---- |
| **20-000** | **248 mm** | Standard Straight | The primary building block for tangents. |
| **20-010** | **186 mm** | 3/4 Straight | Used to offset geometry in complex yards; matches the length of the turnout offset. |
| **20-020** | **124 mm** | 1/2 Straight | Standard subdivision; matches crossing gate width and viaduct sections. |
| **20-030** | **64 mm** | Adjustment Straight | Critical for balancing \#4 turnout geometry. |
| **20-040** | **62 mm** | Feeder Straight | Often used as the spacer between S-curves to prevent derailments. |
| **20-050** | **78-108 mm** | Expansion Track | Variable length sliding track to close gaps in non-standard geometry layouts. |
| **20-091** | **29 mm** | Short Straight | Used for fine adjustments in yard ladders. |

#### **3.1.2 Curve Radii and Track Centers**

Kato curves are designed in concentric pairings to facilitate double-track mainlines with a consistent **33mm** track center spacing.19

* **R315 / R282 Pairing:** The most common double-track curve configuration found in starter sets (M1/M2/V sets).  
  * **Outer Rail (20-120):** Radius **315mm** (12 3/8").  
  * **Inner Rail (20-110):** Radius **282mm** (11").  
  * **Geometric Logic:** $315 \- 282 \= 33mm$. This difference exactly matches the standard track spacing, allowing parallel curves without collision.21  
* **Banked (Superelevated) Curves:** The V11 and V16 sets introduce "Superelevated" curves where the track is physically tilted.  
  * **Transition Requirement:** These curves cannot connect directly to flat track. They require specific "Easement" tracks (e.g., 20-184) which transition the banking angle from 0 degrees to the full tilt, mirroring prototype engineering principles.21

#### **3.1.3 Turnout Footprints and Geometry**

Turnout geometry dictates the operational capacity of a layout. The choice between \#4 and \#6 turnouts is a trade-off between space and reliability.

* **\#6 Turnout (EP718-15):**  
  * **Radius:** The diverging route has a radius of **718mm** (28 1/4").  
  * **Angle:** 15 degrees.  
  * **Usage:** This large radius is critical for long wheelbase steam locomotives (like 4-8-4 Northerns) and 85-foot passenger cars (like Amfleet or Superliners) to avoid derailments.  
  * **Footprint:** Requires a 186mm straight base length.20  
* **\#4 Turnout (EP481-15):**  
  * **Radius:** The diverging route has a radius of **481mm** (19").  
  * **Angle:** 15 degrees.  
  * **Usage:** More compact, suitable for industrial switching or small yards.  
  * **Components:** Utilizes a **60mm** cut-corner straight base. It typically requires a **64mm** straight (20-030) to balance the leg lengths in a ladder configuration to return to parallel geometry.25  
* **Geometry Warning:** While \#4 turnouts save space, community feedback indicates they are more prone to causing derailments with six-axle diesels or long steam engines due to the sharper deviation angle.20

### **3.2 Wooden Railway Standards (Brio/IKEA)**

The wooden railway standard (often called the "Vario" system) is less precise than N scale but relies on a widely accepted de facto standard established by Brio.

#### **3.2.1 Track Cross-Section**

* **Track Width:** **40 mm**.  
* **Track Height:** **12 mm**.  
* **Groove Geometry:** Two grooves, **6 mm** wide, **3 mm** deep.  
* **Gauge:** The grooves are spaced **20 mm** apart (land width), creating a center-to-center gauge of **26 mm**.27

#### **3.2.2 The Dogbone Connector System**

The "Dogbone" connector is the defining feature of this system. It relies on loose tolerances to allow children with developing motor skills to assemble track easily.

* **Male Peg:** Approximately **11.5 mm** diameter sphere on a **7 mm** neck.  
* **Female Socket:** Ranges from **15 mm to 17 mm** diameter. This 3-5mm variance (tolerance) allows for "wiggle room" (play) in the track layout, enabling loops to close even if the geometry isn't mathematically perfect.28

#### **3.2.3 IKEA Lillabo Compatibility Issues**

IKEA’s *Lillabo* system is nominally compatible with Brio but introduces geometric deviations to reduce manufacturing costs.

* **Connector Mismatch:** IKEA connectors are often plastic inserts rather than carved wood. Users report the male connectors are slightly shorter or shaped differently, causing tight or insecure fits when mixed with Brio or Thomas & Friends track.29  
* **Radius Deviation:** A significant geometric deviation is found in IKEA’s curved tracks. Standard Brio geometry typically uses 8 large curves to complete a circle. IKEA’s short curves are not a tighter radius; they are simply "half-length" segments of the large curve. This means 10 IKEA short curves are required to complete a circle, and the radius remains large.29 This makes creating tight inner loops impossible with IKEA track alone, a critical constraint for layout planning.

## **4\. Economic Modeling: The "Budget Mode" Database (Teen Psychology)**

This section establishes a pricing baseline for the "Teen Psychology" module. We must understand the "Entry Point" not just as a financial transaction, but as a psychological commitment. The goal is to maximize "Play Value" per dollar (or pound).

### **4.1 The "Starter Set" Economy**

The Kato **M1 Basic Oval Set (20-852)** is the fundamental economic unit of N scale modeling. It represents the minimum viable product for operation (Track \+ Power).

* **US Pricing (MSRP):** $120.00.  
* **US Street Price:** **$93.99 \- $108.00**.30  
* **UK Pricing:** Approximately **£119.99** (estimated based on import parity and similar sets like the M2).  
* **Content Value:** The set contains a loop of R315 track, a power pack (SX), and a rerailer. Purchasing these components individually—specifically the Power Pack SX ($64 standalone)—would cost significantly more.  
* **Psychological Hook:** The M1 serves as a "loss leader" or high-value bundle. By securing the user with the proprietary Unijoiner system and power pack, Kato locks the user into their ecosystem. The "Budget Mode" strategy for a teen is to buy the M1 for the core electronics, then expand with individual track packs rather than buying larger, more expensive sets initially.

### **4.2 Turnout Pricing and the Cost of Complexity**

Turnouts are the primary cost scalers in a layout. A complex yard requires exponential investment compared to a simple loop.

**Table 2: Turnout Cost Analysis (N Scale)**

| Component | SKU | US MSRP | US Street Price | UK Price (Approx) | Operational Value Note |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **\#6 Turnout (Electric)** | 20-202/203 | $27.00 | **$21.95 \- $21.99** | **£27.00** | High reliability; best investment for long-term satisfaction. |
| **\#4 Turnout (Electric)** | 20-220/221 | $28.95 | **$28.83** | **£28.00** | Slightly more expensive; higher derailment risk. |
| **Double Crossover** | 20-210 | \~$52.50 | **$49.95** | **£52.50** | High density, high cost. Combines 4 turnouts functionality. |

Budget Insight:  
For a budget-conscious user, the \#6 Turnout ($21.95) offers better value than the \#4 ($28.83). Although the \#6 takes up more space, it is cheaper and significantly more reliable for all types of trains.32 A teen with a limited budget should be advised to prioritize the \#6 to avoid the frustration of derailments, which can lead to layout abandonment. The "cost" of the \#4 includes the potential psychological cost of frustration.

### **4.3 Expansion Pack Economics (V Sets)**

Kato offers "V" (Variation) sets for expansion.

* **V1 (Passing Siding):** \~$72.00 street price. Adds passing capabilities.  
* **Individual Track Packs:** A 4-pack of straights costs \~$10.00 ($2.50/piece).  
* **Strategic Recommendation:** A teen budget is better served by buying an M1 set ($100) and one \#6 Turnout ($22) plus a few straights ($10) for a total of \~$132, rather than jumping to the M2 set ($190+), allowing for incremental growth.

## **5\. Visual Aesthetics: The "Night Mode" Paradigm**

The "Visuals" module requires a stylistic direction based on *Mini Metro*. This game’s aesthetic is not merely a "dark theme" but a specific translation of transit cartography into interactive media.

### **5.1 The Mini Metro Aesthetic Theory**

*Mini Metro* utilizes a **flat, high-contrast design language** inspired by Harry Beck’s iconic 1933 London Underground map. The visual style is defined by "Utilitarian Beauty"—the aesthetic appeal comes from the clarity of the data, not ornamentation.35

#### **5.1.1 Night Mode Composition**

The "Night Mode" (or Dark Mode) in *Mini Metro* and its sequel *Mini Motorways* is characterized by specific color relationships:

* **Background:** Deep slate or near-black (Hex \#1A1A1A or similar). It is **not** pure black (\#000000). Using a dark grey prevents eye strain and the "smearing" effect often seen on OLED screens when scrolling high-contrast elements. It also provides a softer canvas that makes the neon lines pop without vibrating visually.36  
* **Foreground Elements (Lines):** Lines are rendered in bright, saturated pastel neons (Cyan, Magenta, Lime Green). This creates a "glow" effect against the dark background.  
* **Information Hierarchy:** The aesthetic removes all terrain data (trees, altitude) unless functionally relevant (rivers/coastlines). The "Night Mode" aesthetic is a reductive process: if it doesn't convey transit information, it is removed.35

### **5.2 Psychological Impact of Dark Mode**

Research into player preferences indicates that "Night Mode" is often preferred not just for style, but for clarity. The high contrast of neon-on-dark allows players to distinguish between overlapping lines more easily than in Light Mode. For example, distinguishing a Navy Blue line from a Black background (Light Mode) is harder than distinguishing a Neon Blue line from a Dark Grey background (Night Mode).37

In *Mini Motorways*, the dark aesthetic is further refined to include "bloom" lighting effects from headlights and streetlamps, creating a living, breathing city feel. However, users have noted that excessive detail can sometimes clutter the "transit map" purity. Therefore, for our rail report's visual style, we lean towards the *Mini Metro* standard: crisp, un-bloomed lines on matte grey.

### **5.3 Defining the "Night Mode" Style Guide**

For the "Visuals" module of the Rail Sim report, we define the following rules based on this research:

1. **Canvas:** Matte Dark Grey (\#1A1A1A).  
2. **Active Elements (Track/Block):** Luminescent, color-coded by "Block" (referencing the *Factorio* mechanic). Colors should be high-saturation pastels.  
3. **UI Elements:** Minimalist white/grey (Hex \#DDDDDD), utilizing iconography over text to match the "international" feel of transit maps.  
4. **Feedback:** Use color changes (e.g., Red for occupied block) rather than text alerts.

## **6\. Synthesis: The Unified Rail Theory**

Combining these modules reveals the overarching system architecture of rail simulation. The **Geometric Constraints** (Kato/Brio dimensions) dictate the physical possibility space. The **Constructive Interfaces** (TrackPlanner/Tinkercad) provide the tools to navigate that space, often requiring **Snapping Logic** to assist the user in managing complex interactions like S-curves.

Once built, the **Logic Systems** (*Factorio* signals) govern the flow of entities, preventing **Derailment States** (*Unrailed\!* physics). Finally, the entire system is viewed through an **Aesthetic Lens** (*Mini Metro* Night Mode) that prioritizes information clarity, all while being constrained by the **Economic Reality** (Kato pricing) of the builder.

This interconnected web of geometry, logic, physics, and economics forms the backbone of any robust rail simulation or modeling project. Future development in this space must prioritize the visualization of these invisible constraints—showing the "tension" in an S-curve, the "cost" of a turnout, or the "block logic" of a signal *before* the user commits to the placement.

### **Detailed Component Reference Tables**

#### **Table 3: Kato N Scale Unitrack Comprehensive Geometry**

| Track Type | Code | Length/Radius | Angle | Notes |
| :---- | :---- | :---- | :---- | :---- |
| **Straight** | 20-000 | 248 mm | \- | Standard Base Unit |
| **Straight** | 20-010 | 186 mm | \- | Matches \#6 turnout offset |
| **Straight** | 20-020 | 124 mm | \- | Half Unit |
| **Straight** | 20-040 | 62 mm | \- | Spacer for S-curves |
| **Curve** | 20-110 | R282 mm | 45° | Inner Mainline Radius |
| **Curve** | 20-120 | R315 mm | 45° | Outer Mainline Radius |
| **Curve** | 20-100 | R249 mm | 45° | Tight Radius (Shunting) |
| **Curve** | 20-170 | R216 mm | 45° | Min Radius (Streetcar) |
| **Turnout** | 20-202 | R718 mm | 15° | \#6 Left (High Speed) |
| **Turnout** | 20-220 | R481 mm | 15° | \#4 Left (Compact) |
| **Crossing** | 20-300 | 186 mm | 15° | Left Crossing |
| **Crossing** | 20-320 | 124 mm | 90° | 90 Degree Crossing |

#### **Table 4: Brio/Standard Wooden Track Dimensions**

| Dimension | Measurement (mm) | Tolerance Note |
| :---- | :---- | :---- |
| **Track Width** | 40 mm | Standard across brands |
| **Track Thickness** | 12 mm | \- |
| **Groove Spacing** | 20 mm | Land width between grooves |
| **Groove Depth** | 3 mm | \- |
| **Male Peg** | \~11.5 mm | On 7mm neck |
| **Female Hole** | 15-17 mm | Loose fit for easy assembly |

This report serves as a foundational document for the development, analysis, and execution of rail simulation projects, bridging the gap between toy, hobby, and software architecture. By respecting the precise dimensions of the physical world and the logic of the digital world, we can create systems that are both playable and engineering-accurate.

#### **Works cited**

1. S curves \- the MRH Forum, accessed January 1, 2026, [https://forum.mrhmag.com/post/s-curves-12207488](https://forum.mrhmag.com/post/s-curves-12207488)  
2. TrackPlanner.app, accessed January 1, 2026, [https://trackplanner.app/](https://trackplanner.app/)  
3. S-curves in trackwork \- Marklin Users Net, accessed January 1, 2026, [https://www.marklin-users.net/forum/posts/t48389-S-curves-in-trackwork](https://www.marklin-users.net/forum/posts/t48389-S-curves-in-trackwork)  
4. More Tracks \- Beta 5 \- TrackPlanner.app, accessed January 1, 2026, [https://trackplanner.app/blog/2022-04-30--track-geometry.html](https://trackplanner.app/blog/2022-04-30--track-geometry.html)  
5. Rail signal \- Official Factorio Wiki, accessed January 1, 2026, [https://wiki.factorio.com/Rail\_signal](https://wiki.factorio.com/Rail_signal)  
6. Train Visualisation Ahead of Signal : r/factorio \- Reddit, accessed January 1, 2026, [https://www.reddit.com/r/factorio/comments/1ne5ztx/train\_visualisation\_ahead\_of\_signal/](https://www.reddit.com/r/factorio/comments/1ne5ztx/train_visualisation_ahead_of_signal/)  
7. Better way to see rail blocks than holding a signal in cursor? : r/factorio \- Reddit, accessed January 1, 2026, [https://www.reddit.com/r/factorio/comments/1gr9z4h/better\_way\_to\_see\_rail\_blocks\_than\_holding\_a/](https://www.reddit.com/r/factorio/comments/1gr9z4h/better_way_to_see_rail_blocks_than_holding_a/)  
8. TIL there's a debug setting (hit F4) to show rail blocks, helpful for setting up signals : r/factorio \- Reddit, accessed January 1, 2026, [https://www.reddit.com/r/factorio/comments/6ejqof/til\_theres\_a\_debug\_setting\_hit\_f4\_to\_show\_rail/](https://www.reddit.com/r/factorio/comments/6ejqof/til_theres_a_debug_setting_hit_f4_to_show_rail/)  
9. I wish there was an option to see rail signal blocks in alt-mode : r/factorio \- Reddit, accessed January 1, 2026, [https://www.reddit.com/r/factorio/comments/b5bhg4/i\_wish\_there\_was\_an\_option\_to\_see\_rail\_signal/](https://www.reddit.com/r/factorio/comments/b5bhg4/i_wish_there_was_an_option_to_see_rail_signal/)  
10. How to Group Objects in Tinkercad w/Mr Keir \- YouTube, accessed January 1, 2026, [https://www.youtube.com/watch?v=PCBQrJZDZis](https://www.youtube.com/watch?v=PCBQrJZDZis)  
11. Combining Multiple Objects \- Makerlab \- Boise State University, accessed January 1, 2026, [https://www.boisestate.edu/library-makerlab/albertsons-library-makerlab/tutorials/tinkercad-tutorials-test/combining-multiple-objects/](https://www.boisestate.edu/library-makerlab/albertsons-library-makerlab/tutorials/tinkercad-tutorials-test/combining-multiple-objects/)  
12. Grouping Shapes in Tinkercad \- YouTube, accessed January 1, 2026, [https://www.youtube.com/watch?v=vNVBb8bFUDk](https://www.youtube.com/watch?v=vNVBb8bFUDk)  
13. Tinkertip: Quick Edit Grouped Objects \- Tinkercad, accessed January 1, 2026, [https://www.tinkercad.com/blog/tinkertip-quick-edit-grouped-objects](https://www.tinkercad.com/blog/tinkertip-quick-edit-grouped-objects)  
14. Derailment Physics? | Dovetail Games Forums, accessed January 1, 2026, [https://forums.dovetailgames.com/threads/derailment-physics.57605/](https://forums.dovetailgames.com/threads/derailment-physics.57605/)  
15. Uncalled for derailing still rarely happens :: Derail Valley General Discussions \- Steam Community, accessed January 1, 2026, [https://steamcommunity.com/app/588030/discussions/0/3196991938888814345/](https://steamcommunity.com/app/588030/discussions/0/3196991938888814345/)  
16. Strategy \- Unrailed\! Wiki, accessed January 1, 2026, [https://unrailed-wiki.com/page/Strategy](https://unrailed-wiki.com/page/Strategy)  
17. Kato 20-010 \- 186mm (7 5/16") Straight Track \[4 pcs\] \- N Scale, accessed January 1, 2026, [https://midwestmodelrr.com/kat20-010/](https://midwestmodelrr.com/kat20-010/)  
18. Kato\_N\_HO\_Track\_Catalog.pdf \- Gaugemaster, accessed January 1, 2026, [https://www.gaugemasterretail.com/media/downloads/Kato\_N\_HO\_Track\_Catalog.pdf](https://www.gaugemasterretail.com/media/downloads/Kato_N_HO_Track_Catalog.pdf)  
19. T-TRAK Standards \- NRail, accessed January 1, 2026, [https://ntrak.org/T-TRAK-Standards](https://ntrak.org/T-TRAK-Standards)  
20. Determining the “Track Centers” between lines using the \#20-202/20-203 \#6 Electric Turnout \- Kato USA, accessed January 1, 2026, [https://katousa.com/wp-content/uploads/2022/06/N-plan-6-turnouts-1.pdf](https://katousa.com/wp-content/uploads/2022/06/N-plan-6-turnouts-1.pdf)  
21. 20-184 Double Approach Tracks Curved R315/282-22.5 Deg 2 pcs \- Train Trax UK, accessed January 1, 2026, [https://traintrax.co.uk/20184-double-approach-tracks-curved-r315282225-p-395.html](https://traintrax.co.uk/20184-double-approach-tracks-curved-r315282225-p-395.html)  
22. Kato N 20-121 Unitrack Curved Track 'R315-15' 12-3/8" Radius 15 degree curve \- 4 Pieces, accessed January 1, 2026, [https://lombardhobby.com/kato-n-20-121-unitrack-curved-track-r315-15-12-3-8-radius-15-degree-curve-4-pieces/](https://lombardhobby.com/kato-n-20-121-unitrack-curved-track-r315-15-12-3-8-radius-15-degree-curve-4-pieces/)  
23. Download N Tracklist \- Kato USA, accessed January 1, 2026, [https://katousa.com/wp-content/uploads/2021/03/Download-N-Tracklist.pdf](https://katousa.com/wp-content/uploads/2021/03/Download-N-Tracklist.pdf)  
24. Kato 20-203 \- \#6 Right Turnout with 718mm (28 1/4") Radius Curve \- N Scale, accessed January 1, 2026, [https://midwestmodelrr.com/kat20-203/](https://midwestmodelrr.com/kat20-203/)  
25. Kato Unitrack \#4 Turnout Geometry \- Chuck's Train Blog, accessed January 1, 2026, [https://trains.ix23.com/kato-unitrack-4-turnout-geometry/](https://trains.ix23.com/kato-unitrack-4-turnout-geometry/)  
26. \#4 or \#6 turnouts for yard? : r/nscalemodeltrains \- Reddit, accessed January 1, 2026, [https://www.reddit.com/r/nscalemodeltrains/comments/1l77cz9/4\_or\_6\_turnouts\_for\_yard/](https://www.reddit.com/r/nscalemodeltrains/comments/1l77cz9/4_or_6_turnouts_for_yard/)  
27. BRIO Track Guide, accessed January 1, 2026, [https://woodenrailway.info/track/brio-track-guide](https://woodenrailway.info/track/brio-track-guide)  
28. accessed January 1, 2026, [https://woodenrailway.info/track/brio-track-guide\#:\~:text=A%20typical%20piece%20of%20BRIO,with%20a%205mm%20long%20throat.](https://woodenrailway.info/track/brio-track-guide#:~:text=A%20typical%20piece%20of%20BRIO,with%20a%205mm%20long%20throat.)  
29. LILLABO 50-piece track set \- IKEA, accessed January 1, 2026, [https://www.ikea.com/us/en/p/lillabo-50-piece-track-set-10320077/](https://www.ikea.com/us/en/p/lillabo-50-piece-track-set-10320077/)  
30. Kato N 20-852 Unitrack Master Set M1 Basic Oval 12-3/8" Radius complete with Kato Power Pack Standard SX \- Lombard Hobbies, accessed January 1, 2026, [https://lombardhobby.com/kato-n-20-852-unitrack-master-set-m1-basic-oval-12-3-8-radius-complete-with-kato-power-pack-standard-sx/](https://lombardhobby.com/kato-n-20-852-unitrack-master-set-m1-basic-oval-12-3-8-radius-complete-with-kato-power-pack-standard-sx/)  
31. 20852 Kato USA Inc / M1 Basic Oval Track Set Unitrack (SCALE=N) Part \- YankeeDabbler, accessed January 1, 2026, [https://yankeedabbler.com/products/kato-usa-inc-m1-basic-oval-track-set-scale-n-part-381-208501](https://yankeedabbler.com/products/kato-usa-inc-m1-basic-oval-track-set-scale-n-part-381-208501)  
32. Kato Unitrack Turnouts For Sale Online | Tony's Train Xchange, accessed January 1, 2026, [https://tonystrains.com/store/layout/track/kato-unitrack/unitrack-turnouts](https://tonystrains.com/store/layout/track/kato-unitrack/unitrack-turnouts)  
33. Kato N 20-203 Unitrack Electric Turnout \#6 Right Hand with Radius 718mm 28 1/4" Curve, accessed January 1, 2026, [https://lombardhobby.com/kato-n-20-203-unitrack-electric-turnout-6-right-hand-with-radius-718mm-28-1-4-curve/](https://lombardhobby.com/kato-n-20-203-unitrack-electric-turnout-6-right-hand-with-radius-718mm-28-1-4-curve/)  
34. Kato N 20-203 Unitrack Electric Turnout \#6, Right Hand \- Tony's Train Exchange, accessed January 1, 2026, [https://tonystrains.com/product/kato-n-20-203-unitrack-electric-turnout-6-right-hand](https://tonystrains.com/product/kato-n-20-203-unitrack-electric-turnout-6-right-hand)  
35. 5 Ways Mini Motorways is Better than Mini Metro \- The Gemsbok, accessed January 1, 2026, [https://thegemsbok.com/art-reviews-and-articles/mini-motorways-metro-comparison/](https://thegemsbok.com/art-reviews-and-articles/mini-motorways-metro-comparison/)  
36. Mini Metro (Switch) Review \- Nintendo World Report, accessed January 1, 2026, [http://www.nintendoworldreport.com/review/48238/mini-metro-switch-review](http://www.nintendoworldreport.com/review/48238/mini-metro-switch-review)  
37. Light vs dark mode : r/MiniMetro \- Reddit, accessed January 1, 2026, [https://www.reddit.com/r/MiniMetro/comments/u9x1zi/light\_vs\_dark\_mode/](https://www.reddit.com/r/MiniMetro/comments/u9x1zi/light_vs_dark_mode/)