# **Technical Specification & Comparative Analysis of Railway Switch Systems for Simulation Implementation in PanicOnRails**

## **1\. Introduction: The Divergent Geometries of Rail Simulation**

In the domain of railway simulation, the fidelity of the track infrastructure serves as the bedrock of the user experience. For a project such as *PanicOnRails*, which seeks to bridge the gap between casual play and technical realism, the selection of reference track systems is not merely an aesthetic choice but a foundational architectural decision. The track system dictates the physics of train movement, the logic of collision detection, the complexity of pathfinding algorithms, and ultimately, the tactile satisfaction of the gameplay loop.

This research report provides an exhaustive technical analysis of two diametrically opposed track paradigms: the **Kato Unitrack** system (N-Scale) and the **IKEA Lillabo** wooden railway system. These two systems represent the poles of the model railway spectrum. Kato Unitrack serves as the exemplar of "Precision Engineering," characterizing the rigid, deterministic grid logic of serious model railroading. It operates on sub-millimeter tolerances, complex electrical routing logic, and strict geometric rules designed to maintain parallelism and operational safety for electrically powered locomotives. Conversely, the IKEA Lillabo system represents "Tactile Play," characterized by loose tolerances, vario-geometry, and manual interaction, where the "feel" of the connection supersedes mathematical precision.

The analysis herein addresses the specific geometric dimensions, product catalogs, operational logics, and user interface (UI) patterns associated with these systems. By dissecting the "Frog Number" system of Kato and the "Vario" tolerance of Lillabo, this report synthesizes a comprehensive specification guide for digital asset creation, physics engine tuning, and UI/UX design. Furthermore, by examining established interaction patterns in market leaders such as *Derail Valley*, *Rolling Line*, and *Train Sim World*, we establish a hierarchy of best practices for switch toggling in a virtual environment. The objective is to inform a simulation environment that respects the distinct physical realities of both systems—the satisfying "snap" of the solenoid and the organic "slide" of the wooden block.

## **2\. The Kato Unitrack Ecosystem (N-Scale): Precision and Constraints**

The Kato Unitrack system is widely recognized in the model railway industry as the "System of Record" for N-scale modular track. Its design philosophy centers on the **Unijoiner**, a patented connector that integrates mechanical locking and electrical connectivity into a single, user-replaceable component.1 For a simulation engine, Unitrack represents a discrete grid system. Unlike spline-based procedural track that can curve arbitrarily, Unitrack forces the user into a puzzle-like environment where geometry must resolve mathematically.

### **2.1 The Fundamental Grid: Track Centers and Parallelism**

The cornerstone of the Kato N-scale geometry is the **33mm track center**. This dimension is the "atomic unit" of lateral spacing in the Unitrack universe. All turnouts, crossovers, and double-track segments are engineered to resolve to a parallel track spacing of exactly 33mm, or multiples thereof (49.5mm, 66mm).3

For *PanicOnRails*, this implies that the procedural generation or grid-snapping logic must be hard-coded to this 33mm standard. When a user places a turnout, the simulation must anticipate that the diverging route will eventually need to align with a parallel grid line 33mm away from the mainline. Failure to adhere to this spacing results in "geometry errors" where track pieces—specifically the molded gray roadbeds—physically collide, preventing connection.

### **2.2 Detailed Analysis of Kato Turnout Geometry**

Kato offers a curated selection of turnouts, each designed to solve specific geometric problems within the 33mm grid. Unlike hand-laid track which can assume any angle, these products are fixed geometric assets.

#### **2.2.1 The \#4 Turnout: The Standard Space-Saver**

The \#4 turnout is the workhorse of compact layouts, designed to maximize siding length in limited spaces.

* **Product Identification:** The catalog lists these as **20-220 (Left)** and **20-221 (Right)**.5  
* **The "Frog Number" 4:** In railway engineering, the frog number ($N$) defines the angle of divergence, where $N \= 0.5 \\cot(\\alpha/2)$. A \#4 frog implies a divergence of 1 unit width for every 4 units of length. Mathematically, this corresponds to an angle of approximately $14.25^\\circ$. However, to fit the modular system, Kato standardizes this to a **15-degree** diverging angle.3  
* **Dimensional Specifics:**  
  * **Main Length:** The straight leg of the \#4 turnout is **126mm**. This is a non-standard length in the Kato system (standard straights are 124mm, 186mm, 248mm). The extra 2mm is critical for resolving the hypotenuse geometry of the diverging route.3  
  * **Diverging Radius:** Unlike prototypical switches which often feature a straight divergence through the frog, the Kato \#4 incorporates a continuous curve with a radius of **R481mm (19 inches)**.3 This allows the turnout to act as the first segment of a curve, saving linear space.  
  * **Compensation Tracks:** Because the \#4 turnout is compact, the roadbed at the frog end is narrower than standard. To place tracks in parallel (creating the 33mm spacing), users *must* attach specific compensation pieces:  
    * **S60L/R (60mm Straight):** These pieces have a chamfered (cut) roadbed edge. If a standard track were used here, the roadbeds would collide. The "Left" and "Right" designation refers to which side the roadbed is cut.3  
    * **S64 (64mm Straight):** Used to balance the length of the diagonal leg.  
* **Simulation Implication:** The \#4 turnout cannot be modeled as a simple node. The physics engine must account for the continuous R481 curve. Furthermore, the collision box of the roadbed must be dynamic or specifically modeled to require the S60 cut pieces; otherwise, the user will be unable to build parallel yards.

#### **2.2.2 The \#6 Turnout: Mainline Operations**

The \#6 turnout is designed for high-speed operation and aesthetics, minimizing the "jerk" (change in acceleration) experienced by trains entering the diverge.

* **Product Identification:** **20-202 (Left)** and **20-203 (Right)**.2  
* **The "Frog Number" 6:** A \#6 frog corresponds to a significantly shallower angle (approx. $9.5^\\circ$). However, Kato's modular system is built on 15-degree increments. To reconcile this, the \#6 turnout uses a complex internal geometry.  
* **Geometry and The "S-Curve" Offset:**  
  * **Diverging Radius:** The effective radius is **R718mm (28 1/4 inches)**.8  
  * **Exit Angle:** Despite the shallower frog, the track piece creates a total divergence of **15 degrees**. This means the track curves, straightens through the frog, and potentially curves again or relies on the length to achieve the vector change.  
  * **Length:** The unit is **186mm** long, matching a standard straight piece.9  
  * **The Offset Anomaly:** Deep analysis of the geometry reveals that a \#6 turnout is not a perfect substitute for a straight track in all coordinate systems. When analyzing the endpoint coordinates, there is a minute X-axis offset of approximately **0.52mm** compared to a purely straight reference path.9 In the physical world, the flexibility of the plastic absorbs this. In a rigid digital simulation, this gap would prevent connection. The simulation's "snap" tolerance must be set to \>0.6mm to account for this inherent geometric discrepancy.  
* **Operational Context:** The \#6 is required for long-wheelbase rolling stock (e.g., Shinkansen, 80-foot passenger cars) which frequently derail on the sharper \#4 turnouts due to the overhang and truck rotation limits.10

#### **2.2.3 The \#2 Wye Turnout**

The Wye turnout is a symmetrical switch used for reversing loops or triangular junctions.

* **Product Identification:** **20-222**.11  
* **Geometry:** The switch splits the single line into two diverging paths, each deviating away from the center.  
* **Dimensions:**  
  * **Radius:** **R481mm (19 inches)** on both legs.11  
  * **Angle:** Each leg diverges by **15 degrees**, creating a total spread of 30 degrees between the two exit paths.  
  * **Base Length:** Matches the \#4 turnout geometry (**126mm** implicit based on radius/angle consistency).11  
* **Usage:** It essentially mirrors the geometry of the \#4 turnout but distributes the curvature. It is often used with 15-degree curves to create a localized 90-degree branch.

#### **2.2.4 The Double Crossover (V7)**

The Double Crossover is a monolithic track piece that acts as a "universal solution" for double-track lines.

* **Product Identification:** **20-210**.5  
* **Configuration:** It integrates four turnout mechanisms and a central diamond crossing into a single molded roadbed.  
* **Dimensions:**  
  * **Length:** **310mm** (12 3/16 inches).5  
  * **Track Center:** Rigidly fixed at **33mm**.  
  * **Angle:** 15 degrees internal crossing.  
* **Functionality:** It allows a train on either parallel track to switch to the other, in either direction. Crucially, the internal wiring often throws all four switches simultaneously (or in pairs), creating a distinct operational pattern compared to four individual switches.13

#### **2.2.5 The Missing Links: Double Slips and 3-Way Switches**

A critical finding of this research is the **absence** of Double Slip switches and 3-Way (Tandem) turnouts in the standard N-scale Unitrack range.1 While other manufacturers like Peco or Atlas offer these complex space-saving switches 37, Kato's N-scale line forces users to construct "ladders" using sequential \#4 or \#6 turnouts.

* **Implication for *PanicOnRails*:** If the simulation aims to strictly emulate the Kato Unitrack catalog, it **must not** include a single-piece double slip or 3-way switch. Instead, users must be forced to build yard throats using daisy-chained standard turnouts. This significantly increases the **minimum space** required for a yard. A standard 3-track yard throat using \#6 switches requires approximately **500-600mm** of linear space just for the switching, whereas a 3-way switch would accomplish this in \<200mm. This constraint is a defining characteristic of the "Unitrack Style" layout—expansive, linear, and geometrically simple.

### **2.3 Electrical Logic: Power Routing Mechanism**

The "Power Routing" feature of Kato turnouts is a mechanism that deeply influences gameplay logic, specifically for DC (Direct Current) operations.

* **Mechanism:** In "Power Routing" mode (standard for DC), the switch acts as an electrical gate. Current is *only* sent to the track leg that is selected. If the switch is thrown straight, the diverging leg is electrically dead.13  
* **Gameplay Utility:** This allows a single power pack to control multiple trains. A user can drive a train into a siding, throw the switch "against" it, and the train will lose power and park. They can then run a second train on the mainline. This creates a "puzzle" element to switching where the state of the turnout dictates the active locomotive.  
* **Non-Power Routing (DCC):** For Digital Command Control (DCC), where rails must be constantly powered, the user must alter the turnout. On \#4 switches, this is done via screws on the underside.16 On older \#6 switches, this sometimes required internal modification or cutting traces.14  
* **Frog Polarity:** The frogs in N-scale Unitrack are typically isolated or plastic. In the \#4 turnout, the rails leaving the frog are not physically connected; the electrical continuity is handled internally.16 In a simulation, this means the physics engine must ensure the train's electrical pickup (virtual) bridges this gap, or the train will stall.

### **2.4 Connection to Standard Curves**

Kato turnouts connect to standard curves to form specific geometric shapes. The standard curves available are:

* **R249 (9 3/4"):** The sharpest standard curve.  
* **R282 (11"):** Often used for inner loops.  
* **R315 (12 3/8"):** Often used for outer loops parallel to R282.  
* **R481 (19"):** Matches the \#4 turnout divergence.  
* **R718 (28 1/4"):** Matches the \#6 turnout divergence.

When a \#4 turnout (R481) is used, attaching a **R481-15** curve to the diverging leg creates a parallel track at **33mm** spacing. For the \#6 turnout (R718), attaching a **R718-15** curve creates a parallel track at **49.5mm** spacing.4 This precise relationship confirms that the "curve" in the switch is a standard geometric segment, not a unique spline.

## **3\. The IKEA Lillabo & Wooden Railway Ecosystem: The Vario Paradigm**

In contrast to the rigid Cartesian logic of Kato, the IKEA Lillabo system operates on a "Topological" or "Vario" logic. The defining characteristic here is **tolerance**.

### **3.1 The "Vario" Tolerance System**

The Lillabo connection system utilizes a peg-and-hole mechanism. The geometry is loose by design:

* **Peg Diameter:** \~11.5mm.  
* **Hole Diameter:** \~15-17mm.17  
* **The Gap:** This differential allows for a "slop" of 2-3mm per joint and an angular deviation of several degrees.  
* **Simulation Logic:** In *PanicOnRails*, wooden track pieces should not snap to a rigid grid. Instead, they should utilize a **Spline-based Snap**. If two connectors are within a threshold distance ($D \< 5mm$) and angle ($\\theta \< 10^\\circ$), the mesh should procedurally deform (stretch or bend) to bridge the gap. This mimics the physical act of a child forcing the wooden tracks together.17

### **3.2 Switch Products and Geometry**

IKEA's range is streamlined, focusing on playability over prototypical accuracy.

#### **3.2.1 The Mechanical Switch**

Unlike the simple Y-splitters found in generic sets, the Lillabo mechanical switch features a moving part.

* **Mechanism:** A plastic insert slides within a routed groove in the wooden block. This insert physically guides the wheel flange to the left or right path.18  
* **Geometry:**  
  * **Length:** Corresponds to the standard "Medium Straight" ($\\approx 144mm$) to maintain interchangeability.17  
  * **Angle:** Wooden railway geometry is based on **45-degree** sectors (Circle \= 8 pieces). The diverging leg typically corresponds to a "Short Curve" ($\\approx 90mm$ radius) or "Large Curve" ($\\approx 180mm$ radius).17  
* **Visuals:** Detailed inspection of user modifications reveals that the plastic slider can sometimes be loose. In a simulation, this slider should be the clickable element.

#### **3.2.2 The Turntable (Product ID: 103.438.56)**

The turntable is a critical component in the Lillabo ecosystem, serving as the "Ultimate Switch".19

* **Design:** A central wooden disc rotating within a plastic ring, offering multiple outlet points (usually 8).  
* **Function:** It negates the need for complex wye reversals. A train enters, the player rotates the entire track segment 180 degrees, and the train exits.  
* **Simulation Utility:** This is a distinct switch type where the "toggle" is a rotational drag interaction, rather than a binary click.

#### **3.2.3 The Y-Splitter vs. Switch**

Newer Lillabo sets (e.g., the 50-piece set) include "Y" tracks.20 These are **passive**. They have no moving parts.

* **Physics Logic:** A train entering from the single leg will choose a path based on momentum, entry angle, or random chance. A train entering from the split legs will merge. In *PanicOnRails*, this requires a specific "Passive Switch" logic where the player cannot toggle the path, but the train's vector determines the outcome.

### **3.3 Compatibility and Materiality**

* **Materials:** Originally solid beech wood, newer Lillabo sets utilize polypropylene plastic for connectors and bridges.21 This affects the visual texture (wood grain vs matte plastic).  
* **Compatibility Issues:** While nominally compatible with Brio, users report that IKEA's plastic connectors can be tight or short when mated with classic Brio tracks.20 The simulation could gamify this by giving "Generic" (IKEA-style) tracks slightly higher friction or connection difficulty when mixed with "Premium" (Brio-style) tracks.

## **4\. Operational Layouts and Common Configurations**

Understanding how these switches are combined is essential for designing the "Level Editor" or "Layout Builder" logic in *PanicOnRails*.

### **4.1 The Passing Siding (Kato V1 Set)**

The **V1 Mainline Passing Siding Set** is the archetypal use case for \#6 turnouts.23

* **Components:** 2x \#6 Turnouts, R718-15 curves, and straight fillers.  
* **Geometry:**  
  * The R718-15 curve is placed *immediately* on the diverging leg of the turnout to bring the track parallel.  
  * This creates a track center spacing of **49.5mm**.4 This is wider than the standard 33mm, deliberately designed to accommodate an island platform (Station) between the tracks.  
* **Simulation Logic:** The game must recognize this "Turnout \+ Inverse Curve" pattern as a valid "Siding" object, potentially auto-completing the geometry for the user.

### **4.2 The Yard Ladder (Kato V3 Set)**

The **V3 Rail Yard Switching Set** utilizes \#6 turnouts to create compact storage.25

* **Geometry:** To maintain the tight **33mm** spacing required for a yard, the turnouts are not used with the R718 curve. Instead, they are daisy-chained directly.  
* **The Critical Component:** The **S60 (Cut-Corner Straight)** is mandatory here. Without it, the roadbeds of the parallel turnout legs would overlap. The sequence is: Turnout \-\> S60 on Diverge \-\> Next Turnout.7  
* **Space Requirement:** A functional 3-track yard using this system requires a minimum length of **1000mm-1200mm** (3-4 feet) to account for the ladder length and usable siding length.26 This dictates the minimum map size for a "realistic" N-scale scenario.

### **4.3 The Double Crossover (Kato V7 Set)**

The V7 set introduces the Double Crossover, allowing full bidirectional movement between two mainlines.27

* **Interaction:** This unit represents a high cognitive load for the player. It has four routes. In *PanicOnRails*, the UI should likely simplify this into two states: "Through" (||) and "Cross" (X), as the internal wiring typically links the opposing switches.13

## **5\. Switch Interaction Patterns & UI/UX Design**

A critical failure point in train simulators is the disconnect between the player's intent and the switch's state. We analyzed three interaction paradigms to propose an optimal solution.

### **5.1 Analysis of Competitor Interaction Models**

* **Derail Valley (First-Person/VR):**  
  * **Method:** Physical interaction. The player walks to the switch stand and clicks it. Alternatively, a handheld "Remote Switch Setter" allows toggling from a distance.28  
  * **Feedback:** A physical "target" (flag) rotates.  
  * **Pros:** High immersion. **Cons:** Tedious in large yards; checking switch states requires walking.  
* **Rolling Line (Model Scale):**  
  * **Method:** "Giant Hand" controller. The player hovers over a switch and clicks.  
  * **UI:** "Switchboards" (2D diagrams) can be placed in the world to control clusters of switches remotely.29  
  * **Automation:** AI trains have "Auto-Switch" capability, flipping switches ahead of them to avoid collisions.29  
* **Train Sim World (High Fidelity):**  
  * **Method:** 2D Map (Dispatcher View). The player opens a map, sees the route as a blue line, and clicks nodes to toggle.31  
  * **Pros:** Strategic clarity. **Cons:** Breaks immersion.

### **5.2 Proposed UI Framework for PanicOnRails**

Based on the "Precision vs. Play" dichotomy, *PanicOnRails* should implement a hybrid interaction system:

#### **5.2.1 The "Clickable Frog" (World Space)**

For both Kato and Lillabo modes, the switch itself must be the primary interface.

* **Hover State:** When the cursor hovers over a switch, a **holographic arrow** should project over the track, indicating the *current* path. This solves the visibility issue of small switch blades in N-scale.  
* **Click Action:**  
  * **Kato:** Clicking the switch triggers a rapid, satisfying "Snap" sound (solenoid audio) and an instant animation of the points. The manual throw tab on the roadbed should also animate.32  
  * **Lillabo:** Clicking triggers a "Slide/Scrape" sound (wood on wood) and a slower translation animation of the plastic insert.

#### **5.2.2 The "Dispatcher Board" (2D Abstract)**

For complex operations (V3 Yard Sets), a 2D interface is required.

* **Topological Map:** Instead of a geographic map, use a simplified "Tube Map" style schematic.  
* **Node Logic:** Each turnout is a node.  
* **Path Highlighting:** The active route should be illuminated (e.g., Green line) while blocked routes are dimmed. This mimics the "Power Routing" logic of the physical Kato track—showing the user exactly where the electricity (and the train) will go.

## **6\. Geometry Capture & Implementation Requirements**

To digitize these systems accurately, the following specifications must be adhered to.

### **6.1 Kato Unitrack Digitization Table**

| Component | Product ID | Main Length | Diverge Angle | Diverge Radius | Offset (X) | Physics Notes |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **\#4 Turnout** | 20-220/1 | 126mm | 15° | R481mm | 0mm | **Critical:** Requires S60 clearance logic. High derailment friction for long locos. |
| **\#6 Turnout** | 20-202/3 | 186mm | 15° | R718mm | 0.52mm | **Critical:** Diverge path is an S-curve/Compound curve. Simulation must tolerate 0.52mm gap. |
| **\#2 Wye** | 20-222 | 126mm | 15° (x2) | R481mm | 0mm | Symmetric divergence. |
| **Double X** | 20-210 | 310mm | 15° | N/A | 0mm | 4 internal switches. Rigid 33mm track centers. |

**Physics Note on Frogs:** The physical gap in the rail at the frog (where the rails cross) is a potential point of failure for physics engines. The wheel collider must be programmed to "fly" over this gap or have a diameter large enough to bridge it, otherwise, the physics engine will register a "fall" and derail the train.14

### **6.2 IKEA Lillabo Digitization Table**

| Component | ID | Length | Angle | Radius | Tolerance | Physics Notes |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Mech. Switch** | Generic | \~144mm | 45° | \~180mm | ±3mm | "Vario" snap tolerance. Sliding insert collider. |
| **Y-Splitter** | 50-Piece Set | \~144mm | 45° | \~180mm | ±3mm | Passive switch. Train vector determines path. |
| **Turntable** | 103.438.56 | N/A | N/A | N/A | ±3mm | Rotational interaction. 8 output nodes. |

### **6.3 Guard Rail Specifications**

* **Kato:** Guard rails are molded plastic or metal rails opposite the frog. Their function is to pull the wheelset away from the frog point. In simulation, this acts as a **lateral constraint**. The physics engine should apply a correcting force vector towards the stock rail when a wheel is within the guard rail zone, preventing "picking the points".13

## **7\. Conclusion**

The implementation of switch functionality in *PanicOnRails* requires a dual-physics approach. The **Kato Unitrack** mode must function as a precision simulator, rewarding the player for understanding the rigid mathematical relationships of the 33mm grid and the specific use cases of \#4 vs \#6 geometry. The "Power Routing" feature offers a unique gameplay mechanic for puzzle-solving with DC locomotives, turning the layout into an electrical logic gate system.

Conversely, the **IKEA Lillabo** mode should emphasize tactile playfulness. The physics engine must be forgiving, employing a "magnetic spline" system that mimics the loose tolerances of wooden pegs. The switch interaction here is mechanical and manual, centered on the turntable and the sliding block.

By explicitly modeling the "Missing Links" (the absence of Kato double slips) and the "Geometric Offsets" (the \#6 turnout anomaly), *PanicOnRails* will achieve a level of authenticity that distinguishes it from generic train games, appealing to the "rivet counter" enthusiast while remaining accessible to the wooden train builder.

---

**Citations:** 1

#### **Works cited**

1. Fine Kato N scale track plans for free\!, accessed January 8, 2026, [https://track-plans.net/kato-n-scale/](https://track-plans.net/kato-n-scale/)  
2. Kato 20-202 Unitrack \#6 Left Turnout with 718mm (28 1/4") Radius Curve \- YankeeDabbler, accessed January 8, 2026, [https://yankeedabbler.com/products/kato-usa-inc-turnout-6-electric-l-h-scale-n-part-381-20202](https://yankeedabbler.com/products/kato-usa-inc-turnout-6-electric-l-h-scale-n-part-381-20202)  
3. Kato Unitrack \#4 Turnout Geometry – Chuck's Train Blog, accessed January 8, 2026, [https://trains.ix23.com/kato-unitrack-4-turnout-geometry/](https://trains.ix23.com/kato-unitrack-4-turnout-geometry/)  
4. N 4Turnout \- KATO USA, accessed January 8, 2026, [https://dev3.katousa.com/PDF/plans/N-plan-4-turnouts.pdf](https://dev3.katousa.com/PDF/plans/N-plan-4-turnouts.pdf)  
5. Kato 20-210 \- 310mm (12 3/16") Double Crossover Turnout \- N Scale, accessed January 8, 2026, [https://midwestmodelrr.com/kat20-210/](https://midwestmodelrr.com/kat20-210/)  
6. Turnout geometry question.... \- General Discussion (Model Railroader) \- Trains.com Forums, accessed January 8, 2026, [https://forum.trains.com/t/turnout-geometry-question/181795](https://forum.trains.com/t/turnout-geometry-question/181795)  
7. Kato switches \- Track Systems \- JNS Forum, accessed January 8, 2026, [https://jnsforum.com/community/topic/5115-kato-switches/](https://jnsforum.com/community/topic/5115-kato-switches/)  
8. 20-202 Kato Unitrack N Scale \#6 Remote Turnout Left R28 1/4"-15 Degree \- T and K Hobby, accessed January 8, 2026, [https://tandkhobby.com/20-202-kato-unitrack-n-scale-6-remote-turnout-left-r28-1-4-15-degree/](https://tandkhobby.com/20-202-kato-unitrack-n-scale-6-remote-turnout-left-r28-1-4-15-degree/)  
9. Kato \#6 turnout geometry – small X-offset vs straight equivalent (am I missing something?), accessed January 8, 2026, [https://www.reddit.com/r/modeltrains/comments/1q3yv47/kato\_6\_turnout\_geometry\_small\_xoffset\_vs\_straight/](https://www.reddit.com/r/modeltrains/comments/1q3yv47/kato_6_turnout_geometry_small_xoffset_vs_straight/)  
10. Determining the “Track Centers” between lines using the \#20-202/20-203 \#6 Electric Turnout \- Kato USA, accessed January 8, 2026, [https://katousa.com/wp-content/uploads/2022/06/N-plan-6-turnouts-1.pdf](https://katousa.com/wp-content/uploads/2022/06/N-plan-6-turnouts-1.pdf)  
11. Kato Unitrack 20-222 \#2 Electric Wye (Y) Turnout \- N Scale, accessed January 8, 2026, [https://www.katomodeltrains.com/product-page/kato-unitrack-20-222-2-electric-wye-y-turnout-n-scale](https://www.katomodeltrains.com/product-page/kato-unitrack-20-222-2-electric-wye-y-turnout-n-scale)  
12. KATO 20-222 (N) no.2 Electric Wye Turnout with 481mm (19") Radius Curves \- HobbyTech, accessed January 8, 2026, [https://ishop.hobbytech.ca/iShop\_p17/kato-unitrack-n/1677-kato-20-222-n-no2-electric-wye-turnout-with-481mm-19-radius-curves.html](https://ishop.hobbytech.ca/iShop_p17/kato-unitrack-n/1677-kato-20-222-n-no2-electric-wye-turnout-with-481mm-19-radius-curves.html)  
13. What You Need to Know About Kato Unitrack Turnouts \- TrainWeb.org, accessed January 8, 2026, [http://www.trainweb.org/nrmrc/pubs/AppNote%20Unitrack%20Turnouts.pdf](http://www.trainweb.org/nrmrc/pubs/AppNote%20Unitrack%20Turnouts.pdf)  
14. Setting Up a Kato N4 N scale turnout to prevent shorting \- Proto Design Labs, accessed January 8, 2026, [https://www.protodesignlabs.com/post/setting-up-a-kato-n4-n-scale-turnout-to-prevent-shorting](https://www.protodesignlabs.com/post/setting-up-a-kato-n4-n-scale-turnout-to-prevent-shorting)  
15. Modifying Kato Unitrack Turnouts \- Electronics and DCC \- Trains.com Forums, accessed January 8, 2026, [https://forum.trains.com/t/modifying-kato-unitrack-turnouts/302668](https://forum.trains.com/t/modifying-kato-unitrack-turnouts/302668)  
16. Kato Turnouts \- Wiring for DCC, accessed January 8, 2026, [https://www.wiringfordcc.com/switches\_kato.htm](https://www.wiringfordcc.com/switches_kato.htm)  
17. BRIO Track Guide | BRIO® Wooden Railway Guide, accessed January 8, 2026, [https://woodenrailway.info/track/brio-track-guide](https://woodenrailway.info/track/brio-track-guide)  
18. Removable Turnout for Wooden Train Compatible With Brio Ikea Lillabo \- Etsy, accessed January 8, 2026, [https://www.etsy.com/listing/1215344857/removable-turnout-for-wooden-train](https://www.etsy.com/listing/1215344857/removable-turnout-for-wooden-train)  
19. LILLABO turntable \- IKEA, accessed January 8, 2026, [https://www.ikea.com/us/en/p/lillabo-turntable-10343856/](https://www.ikea.com/us/en/p/lillabo-turntable-10343856/)  
20. LILLABO 50-piece track set \- IKEA, accessed January 8, 2026, [https://www.ikea.com/us/en/p/lillabo-50-piece-track-set-10320077/](https://www.ikea.com/us/en/p/lillabo-50-piece-track-set-10320077/)  
21. LILLABO 45-piece train set with track \- IKEA, accessed January 8, 2026, [https://www.ikea.com/us/en/p/lillabo-45-piece-train-set-with-track-20330066/](https://www.ikea.com/us/en/p/lillabo-45-piece-train-set-with-track-20330066/)  
22. Modifying Brio Pieces to work with IKEA Lillabo track? \- Reddit, accessed January 8, 2026, [https://www.reddit.com/r/BRIO/comments/1pyudur/modifying\_brio\_pieces\_to\_work\_with\_ikea\_lillabo/](https://www.reddit.com/r/BRIO/comments/1pyudur/modifying_brio_pieces_to_work_with_ikea_lillabo/)  
23. V1 Mainline Passing Siding Set \- N Scale Supply \- KATO, accessed January 8, 2026, [https://www.nscalesupply.com/kat/kat-20-860.html](https://www.nscalesupply.com/kat/kat-20-860.html)  
24. HO & N Track Catalog | Kato USA, accessed January 8, 2026, [https://katousa.com/wp-content/uploads/2023/12/Unitrack-Catalog-final.pdf](https://katousa.com/wp-content/uploads/2023/12/Unitrack-Catalog-final.pdf)  
25. Kato \~ N Scale \~ UniTrack Yard Switching Set Variation \~ V3 \~ 20-862-1, accessed January 8, 2026, [https://ironplanethobbies.com/product/kato-n-scale-unitrack-yard-switching-set-variation-v3-20-862-1](https://ironplanethobbies.com/product/kato-n-scale-unitrack-yard-switching-set-variation-v3-20-862-1)  
26. Kato 20-862, N Scale Unitrack V3 Rail Yard Switching Set \- VisualSP, accessed January 8, 2026, [https://www.visualsp.com/1161327/N-Scale-Unitrack-V3-Rail-Yard-Switching-Set](https://www.visualsp.com/1161327/N-Scale-Unitrack-V3-Rail-Yard-Switching-Set)  
27. N Master and variation series Track Sets \- Kato USA, accessed January 8, 2026, [https://katousa.com/n-unitrack-mastervar-2/](https://katousa.com/n-unitrack-mastervar-2/)  
28. DISPATCHER :: Derail Valley General Discussions \- Steam Community, accessed January 8, 2026, [https://steamcommunity.com/app/588030/discussions/0/594010977920354659/](https://steamcommunity.com/app/588030/discussions/0/594010977920354659/)  
29. Rolling Line \- Train AI official guide \- Steam Community, accessed January 8, 2026, [https://steamcommunity.com/sharedfiles/filedetails/?id=2753143585](https://steamcommunity.com/sharedfiles/filedetails/?id=2753143585)  
30. Switchboards\! v3.32 :: Rolling Line Events & Announcements \- Steam Community, accessed January 8, 2026, [https://steamcommunity.com/app/754150/eventcomments/3108017414030649093/](https://steamcommunity.com/app/754150/eventcomments/3108017414030649093/)  
31. Switching/Shunting | Train Sim World Wiki \- Fandom, accessed January 8, 2026, [https://train-sim-world.fandom.com/wiki/Switching/Shunting](https://train-sim-world.fandom.com/wiki/Switching/Shunting)  
32. HO-Unitrack.pdf \- Kato USA, accessed January 8, 2026, [https://katousa.com/wp-content/uploads/2022/01/HO-Unitrack.pdf](https://katousa.com/wp-content/uploads/2022/01/HO-Unitrack.pdf)  
33. Turnout geometry in US and Canada \- Trainz, accessed January 8, 2026, [https://forums.auran.com/threads/turnout-geometry-in-us-and-canada.101880/](https://forums.auran.com/threads/turnout-geometry-in-us-and-canada.101880/)  
34. The basics of model railroad track \- World's Greatest Hobby, accessed January 8, 2026, [https://www.greatesthobby.com/get-started/the-basics-of-model-railroad-track](https://www.greatesthobby.com/get-started/the-basics-of-model-railroad-track)  
35. Kato \~ N Scale \~ UniTrack \#2 Wye Electric Turnout Switch \~ 481mm 19" Radius (1 pc) \~ 20-222, accessed January 8, 2026, [https://ironplanethobbies.com/product/kato-n-scale-unitrack-2-wye-electric-turnout-switch-481mm-19-radius-1-pc-20-222](https://ironplanethobbies.com/product/kato-n-scale-unitrack-2-wye-electric-turnout-switch-481mm-19-radius-1-pc-20-222)  
36. Kato\_N\_HO\_Track\_Catalog.pdf \- Gaugemaster, accessed January 8, 2026, [https://www.gaugemasterretail.com/media/downloads/Kato\_N\_HO\_Track\_Catalog.pdf](https://www.gaugemasterretail.com/media/downloads/Kato_N_HO_Track_Catalog.pdf)  
37. N Scale Switches & Turnouts \- TrainWorld, accessed January 8, 2026, [https://www.trainworld.com/shop-scale/n-scale/track-and-accessories/switches-turnouts.html](https://www.trainworld.com/shop-scale/n-scale/track-and-accessories/switches-turnouts.html)  
38. KATO turnout frog \- the MRH Forum, accessed January 8, 2026, [https://forum.mrhmag.com/post/kato-turnout-frog-12215926](https://forum.mrhmag.com/post/kato-turnout-frog-12215926)  
39. frog switch points no. \- 16.5 \- Union Pacific, accessed January 8, 2026, [https://www.up.com/cs/groups/public/@uprr/@customers/@industrialdevelopment/@operationsspecs/@specifications/documents/up\_pdf\_nativedocs/pdf\_up\_ind\_exhibit\_f.pdf](https://www.up.com/cs/groups/public/@uprr/@customers/@industrialdevelopment/@operationsspecs/@specifications/documents/up_pdf_nativedocs/pdf_up_ind_exhibit_f.pdf)  
40. Switch Setter settings : r/DerailValley \- Reddit, accessed January 8, 2026, [https://www.reddit.com/r/DerailValley/comments/1hu51el/switch\_setter\_settings/](https://www.reddit.com/r/DerailValley/comments/1hu51el/switch_setter_settings/)  
41. LILLABO rail \- IKEA, accessed January 8, 2026, [https://www.ikea.com/us/en/p/lillabo-rail-30363725/](https://www.ikea.com/us/en/p/lillabo-rail-30363725/)  
42. I am proud of my 4 year old daughter. Neat layout she made. : r/trains \- Reddit, accessed January 8, 2026, [https://www.reddit.com/r/trains/comments/1aeswfz/i\_am\_proud\_of\_my\_4\_year\_old\_daughter\_neat\_layout/](https://www.reddit.com/r/trains/comments/1aeswfz/i_am_proud_of_my_4_year_old_daughter_neat_layout/)  
43. Kato 20-202 \- \#6 Left Turnout with 718mm (28 1/4") Radius Curve \- N Scale, accessed January 8, 2026, [https://midwestmodelrr.com/kat20-202/](https://midwestmodelrr.com/kat20-202/)  
44. Switch Track Mechanical Switch Train Track Adapter, Fits Brio, IKEA, Hape and more\! 3 way Track adapter. Christmas Present, Birthday Gift \- Etsy, accessed January 8, 2026, [https://www.etsy.com/in-en/listing/1577791149/switch-track-mechanical-switch-train](https://www.etsy.com/in-en/listing/1577791149/switch-track-mechanical-switch-train)  
45. KB117: Notes on Kato HO-Scale Unitrack Turnouts \- Digitrax, Inc., accessed January 8, 2026, [https://www.digitrax.com/tsd/KB117/notes-on-kato-ho-scale-unitrack-turnouts/](https://www.digitrax.com/tsd/KB117/notes-on-kato-ho-scale-unitrack-turnouts/)