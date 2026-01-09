# **The Architecture of Interlocking Plastic Railways: An Exhaustive Technical Analysis of L-Gauge Geometry, Componentry, and System Interoperability**

## **1\. Executive Summary: The Engineering of the 40mm Gauge**

The domain of L-Gauge—the enthusiast nomenclature for LEGO® model railroading—occupies a singular and complex position in the landscape of railway modelling. Unlike traditional modeling scales such as HO (1:87) or N (1:160), which prioritize prototypical fidelity in rail profile and sleeper spacing, the L-Gauge system is defined by a rigid, integer-based geometric logic derived from the "System" grid: the stud. This report provides an exhaustive technical examination of this system, analyzing the geometric primitives, part specifications, and the expanding ecosystem of third-party components that have matured the hobby from a toy system into a precision modeling discipline.

While the primary focus remains on the proprietary components manufactured by The LEGO Group (TLG) across the 4.5V, 12V, 9V, and RC/Powered Up eras, this analysis also integrates comparative data from traditional model railway scales (N, Z, and G) to contextualize the engineering decisions inherent in L-Gauge. Furthermore, the report explores the algorithmic complexities of track planning, contrasting the fixed-geometry nature of plastic sectional track with the Bezier-curve logic required for flexible rail simulation. The analysis reveals a system that, while ostensibly simple, contains deep mathematical nuances involving trigonometry, injection molding tolerances, and the physics of friction-based adhesion.

## **2\. Fundamental Geometry of the L-Gauge System**

The "System" is built upon a proprietary grid that dictates every dimension, from the height of a brick to the radius of a curve. Understanding this grid is a prerequisite to mastering L-Gauge infrastructure.

### **2.1 The Stud Grid and Track Gauge**

The fundamental unit of measurement in this domain is the **stud** (nominally 8.0mm in pitch). This grid provides the coordinate system upon which all track geometry is mapped.

The Gauge Definition:  
While colloquially termed "L-Gauge," the system utilizes a physical track gauge (the distance between the inside surfaces of the railheads) of approximately 37.5mm. However, the centerline gauge—the distance between the geometric centers of the two rails—is exactly 40mm, which corresponds precisely to 5 studs.1 This is a critical distinction in layout planning. In traditional modelling, the gauge is the primary constraint; in L-Gauge, the grid alignment of the centerline is the primary constraint.  
The Sleeper Base (Ties):  
The standard track element features a sleeper (tie) width of 8 studs (64mm). This 8-stud width is not arbitrary; it allows the track to sit centrally on standard 16-stud or 32-stud baseplates with a symmetrical 4-stud margin on either side.2 This 4-stud margin is the foundational constant for parallel track spacing. When two baseplates are placed side-by-side, the 4-stud margin on Plate A combines with the 4-stud margin on Plate B to create an 8-stud distance between the edges of the track ties, resulting in a 16-stud center-to-center spacing.2  
The Half-Stud Offset:  
The 5-stud centerline gauge presents a unique geometric curiosity. Because LEGO elements typically follow even-number widths (2, 4, 6, 8 studs), a 5-stud gauge implies that the center of the track often falls between studs on the baseplate grid (on the "half-stud"). This necessitates specific "jumper plate" techniques (using 1x2 plates with a center stud) or tile offsets when building custom rolling stock to ensure wheels align with the rails while the chassis remains centered on the 6-wide or 8-wide body.

### **2.2 The Standard Curve (R40)**

For the majority of its history (since 1966), the LEGO Group has provided a single standard curvature radius, known universally in the hobby as **R40**.

**Geometric Properties:**

* **Radius:** The radius is defined as **40 studs** (320mm), measured from the center of the circle to the centerline of the track.3  
* **Outer Diameter:** The total footprint of a full circle is defined by the formula: $(R \+ 4\) \\times 2 \\times 8mm$. For R40, this results in an outer diameter of roughly **704mm** (approx. 27.7 inches).4  
* **Sector Geometry:** A single curved track segment represents a sector of **22.5 degrees**. Therefore, it requires **16 segments** to complete a 360-degree circle ($360 / 22.5 \= 16$).2  
* **Baseplate Integration:** A 90-degree corner (quarter circle) constructed of four R40 segments fits perfectly within a 48x48 stud area. In modular standards, this is typically modeled across three 32x32 baseplates arranged in an 'L' shape, or a single 48x48 baseplate, to ensure the track ends align with the grid boundaries.5

Constraint Analysis:  
The R40 radius is extremely tight by model railway standards. In comparison to O Scale (1:48), which is volumetrically similar to L-Gauge, a 320mm radius would be considered a sharp industrial tram curve, generally unsuitable for mainline passenger equipment. This tightness introduces significant "overhang"—the distance the ends of a carriage swing out beyond the track—and "underhang"—the distance the center of the car cuts across the inside of the curve. This strictly limits the maximum length of rolling stock; cars longer than 32 studs often suffer from coupling binding or visual incongruity on R40 curves.6

### **2.3 The Parallel Track Standard**

A defining characteristic of the L-Gauge system is the rigid definition of parallel tracking, which differs from the variable spacing found in flex-track layouts of other scales.

Standard Spacing:  
The system is designed around a center-to-center spacing of 16 studs (128mm) for parallel mainlines. This leaves an 8-stud gap between the outer edges of the ties of two parallel tracks.2 This 16-stud spacing is critical because standard straight tracks are 16 studs long. It ensures that cross-track geometry (like crossovers and sidings) aligns with the integer grid of the baseplates.  
Switch Geometry:  
The geometry of standard LEGO switches (points) is hard-coded to create this spacing. A standard switch typically has a divergence angle of approximately 22.5 degrees. When a standard switch is combined with a standard R40 return curve attached to the diverging leg, it creates a parallel siding exactly 8 studs (center-to-center difference of 16 studs) away from the mainline.2 This "Switch \+ Curve" assembly is the fundamental atom of L-Gauge layout design.

### **2.4 Vertical Geometry and Gradients**

While the horizontal geometry is defined by the stud, the vertical geometry is defined by the plate (3.2mm) and the brick (9.6mm).

* **Clearance:** The standard overhead clearance for L-Gauge trains is typically cited as 12-14 bricks (approx 115mm-135mm), necessitating careful planning for tunnels and bridges.8  
* **Gradients:** Due to the low friction coefficient of ABS plastic wheels on plastic rails (or even metal rails), L-Gauge trains struggle with steep gradients. While N scale layouts might tolerate 4% grades, L-Gauge trains, often heavy with battery boxes and lacking traction tires, perform best at grades below 3%.9

## **3\. The Official Component Ecosystem: A Historical Taxonomy**

The evolution of L-Gauge components is categorized by the method of power delivery. Each era introduced specific part numbers and geometric quirks that remain relevant for collectors and layout designers. The following breakdown provides a definitive catalog of these components.

### **3.1 The Blue Era (1966–1980): The 4.5V and 12V Foundations**

The "Blue Era" is named for the characteristic blue color of the rails. This era established the fundamental geometry that persists today.

4.5V System:  
Trains were powered by onboard battery boxes. The rails were purely structural guiding elements.

* **Key Component:** **Part 3230** (Curved Rail) and **Part 3228** (Straight Rail). These were often two separate rails clipped onto distinct 2x8 sleeper plates (**Part 4166**). This modularity allowed for some flexibility but resulted in fragile connections.10  
* **Switching:** Manual switches relied on mechanical levers. Part **3231** represents the 90-degree crossing from this era, a geometry that has persisted.11

12V System:  
This "High Line" system introduced a central third rail for power conduction, allowing for sophisticated remote control. It is often regarded as the most technically advanced era relative to its time.

* **Conducting Rails:** **Part 3241** (Curved) and **Part 3242** (Straight) included the central metal conductor.12  
* **Remote Operation:** The 12V system is legendary for its remote-controlled accessories.  
  * **7852 Switch Button:** A control panel component for operating remote points.12  
  * **decbase01 Decoupler:** A mechanized track section that physically pushed up on the train's magnetic couplers to separate wagons—a feature rarely seen in modern sets and highly prized by switching enthusiasts.12  
* **Geometry:** The 12V switches (**sw12v1left/right**) introduced the streamlined parallel track geometry that 9V would later inherit.12

### **3.2 The Grey Era (1991–2006): The 9V Metal System**

In 1991, TLG revolutionized the system by integrating stainless steel rail caps directly onto the running rails, eliminating the central third rail and moving to a 2-rail DC system similar to traditional HO/N scale model trains.

**Technical Specifications:**

* **Geometry:** Retained the 16-stud straight and R40 curve.  
* **Conductivity:** Power was picked up via metal wheels on the motor bogie. The rails act as the positive and negative poles.  
* **Part Numbers:**  
  * **2865 / 4515:** Straight Track (16 studs).  
  * **2867 / 4520:** Curved Track (R40).  
  * **2861:** Left Manual Point (Switch). Note: These switches conduct power but do not have polarity switching frogs, which can cause stalling with short wheelbase engines.3  
  * **2859:** Right Manual Point (Switch).  
  * **4519 / 32087:** 90-degree Crossing Rail.3  
* **Legacy:** The 9V system is widely considered the "Gold Standard" for serious L-Gauge exhibitions because it allows for infinite run times without battery changes. However, the electrical resistance of the stainless steel caps increases over distance, requiring power injection (feeder wires) every few meters on large layouts.

### **3.3 The Modern Era (2006–Present): RC, Power Functions, Powered Up**

In 2006, TLG transitioned to all-plastic track (removing the metal rails) to reduce manufacturing costs and adhere to new safety/radio regulations. Power delivery shifted back to onboard batteries (RC trains), then infrared control (Power Functions), and finally Bluetooth (Powered Up).

**Geometry & Parts:**

* **53401:** Straight Track (16 studs). This is the standard building block of modern layouts.3  
* **53400:** Curved Track (R40). Mechanically identical to the 9V curve but without the metal cap.3  
* **53407:** Left Switch Point (Plastic).12  
* **53404:** Right Switch Point (Plastic).12  
* **88492:** Flex Track. A new innovation for this era, these 4-stud long segments utilize a flexible joint mechanism to allow variable radii and non-grid alignments. **Critique:** While versatile, flex track introduces significant friction. The serrated inner edge of the rail creates vibration and drag, significantly increasing the load on motors and draining batteries faster.3  
* **60128:** Double Crossover (Half). A 32-stud long crossover track that allowed trains to switch tracks in both directions. It was only produced from 2007-2010 and is now a rare collector's item.3

### **3.4 Narrow Gauge and Roller Coaster Elements**

Beyond standard L-Gauge, the system includes variants for specific themes.

* **Narrow Gauge:** Introduced with the "Indiana Jones" Mine Cart sets.  
  * **Part 85976:** Curved Track, Narrow. Radius is significantly tighter than R40, often cited as R24 equivalent in geometry.13  
  * **Part 25086:** Ramp / Elevation piece for narrow gauge.13  
* **Roller Coaster:** A gravity-based system that has seen adoption for train modeling.  
  * **Part 25061:** 90-degree curve.  
  * **Part 26559:** Ramp section.  
  * **Part 26022:** Straight 8L.  
  * **Compatibility:** While Roller Coaster track uses a tubular rail profile distinct from the I-beam profile of standard train track, the gauge is similar, allowing for creative "hybrid" uses, though standard train wheels do not interface perfectly.10

## **4\. Advanced Geometric Analysis: The Third-Party Renaissance**

The limitations of the standard R40 curve—specifically its inability to facilitate nested loops or realistic ease-in curves—have catalyzed a thriving third-party market. Manufacturers like **TrixBrix**, **Fx Bricks**, **BrickTracks**, and **4DBrix** have expanded the L-Gauge geometry significantly, effectively "forking" the system into a professional tier that adheres to the stud grid while offering the geometric variety of N or HO scale.

### **4.1 The Expanded Radius Library (The R-System)**

To allow for concentric circles (parallel tracks on curves) and realistic high-speed turns, the community has standardized a series of radii based on the 16-stud parallel spacing rule.

| Radius ID | Radius (Studs) | Radius (mm) | Segments/Circle | Geometry Logic | Application | Citation |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **R24** | 24 | 192mm | 16 | $R\_{40} \- 16$ | Industrial trams, narrow gauge simulation. Equivalent to Fleischmann N-Scale R1 (192mm).14 | 15 |
| **R32** | 32 | 256mm | 16 | $R\_{40} \- 8$ | Inner loop for compact tables. Zero gap to R40. | 4 |
| **R40** | 40 | 320mm | 16 | Standard | The baseline LEGO geometry. Matches Kato N-Scale R315 (315mm) closely.16 | 2 |
| **R56** | 56 | 448mm | 16 | $R\_{40} \+ 16$ | First parallel outer loop. | 17 |
| **R72** | 72 | 576mm | 16 | $R\_{56} \+ 16$ | Second parallel outer loop. | 17 |
| **R88** | 88 | 704mm | 32 | $R\_{72} \+ 16$ | High speed. Note 32 segments/circle for smoothness. | 3 |
| **R104** | 104 | 832mm | 32 | $R\_{88} \+ 16$ | Grand curves. Essential for 8-wide steam engines. | 18 |
| **R120** | 120 | 960mm | 32 | $R\_{104} \+ 16$ | Maximum realism, nearly 2 meters diameter. | 19 |

**Mathematical Insight:** The shift from 16 segments/circle (22.5° per segment) to 32 segments/circle (11.25° per segment) at R88 is crucial. As the radius increases, the chord length of a 22.5° segment becomes unwieldy, and the angular deflection at the joint becomes too "polygonal," causing derailments for long-wheelbase locomotives. Breaking it down to 11.25° ensures smoother operation.7

### **4.2 Switch Geometry and the 22.62° Anomaly**

A critical geometric constraint in L-Gauge is the switch divergence.

* **The Standard:** The official LEGO switch is often cited as having a divergence of roughly 22.5 degrees.  
* **The Anomaly:** Detailed analysis by Fx Bricks reveals that the theoretically perfect angle for a switch to align with the LEGO stud grid (intersecting at exact stud intervals) is actually **22.62 degrees** (specifically 22.61986...). This angle is derived from the trigonometry of a 1-stud lateral shift over a 2-stud length (slope 0.5).20  
* **Implication:** This minute discrepancy explains why rigid geometric loops constructed with standard switches sometimes require slight "stressing" or flex track to close perfectly. The math of the grid does not perfectly align with the integer degrees of the circle sectors.

### **4.3 Complex Junctions**

Third-party innovation has introduced complex formations previously absent from L-Gauge:

* **Double Slips:** These allow trains to cross or switch directions in a compact footprint, effectively functioning as a crossing and four switches combined. This is a staple of European railway modeling (Fleischmann 9170, Peco SL-E390F) now available in L-Gauge.21  
* **Grand Unions:** By utilizing modular 3D-printed components, modelers can now build "Grand Union" junctions—complex intersections involving multiple double crossovers—mirroring prototypical urban tram networks.  
* **Dual Gauge Track:** Systems like TrixBrix offer tracks with 3 rails or 4 rails to support both standard gauge (L-Gauge) and narrow gauge (approx 24mm gauge) trains on the same right-of-way, mimicking the dual-gauge tracks seen in Switzerland.23

## **5\. Comparative Analysis: L-Gauge vs. Traditional Model Scales**

To fully appreciate the L-Gauge geometry, one must contrast it with established model railway standards such as N Scale and Z Scale. This comparison highlights the "Toy vs. Model" design philosophy.

### **5.1 Geometry Philosophies: The "Integer Grid" vs. "Prototypical Ratio"**

* **L-Gauge (LEGO):** Driven by the **Grid**. Every component must ostensibly align with the 8mm stud matrix. This forces radii to be integer multiples. It prioritizes *connectability* over *accuracy*.  
* **N Scale (1:160):** Driven by **Ratio**. N scale track (e.g., Kato Unitrack, Peco Setrack) uses radii derived from prototypical curves scaled down.  
  * *Kato Unitrack:* Uses a 33mm parallel spacing (vs LEGO's 64mm). Radii are stepped in \~33mm increments: R216 (216mm), R249 (249mm), R282 (282mm), R315 (315mm).24  
  * *Comparison:* Note that Kato's R315 is almost identical to LEGO's R40 (320mm). This suggests that LEGO's "Standard" curve is roughly equivalent to a "Mainline" curve in N-Scale, despite LEGO trains being vastly larger (approx O-Scale volume). This highlights the "Toy Scale" nature of standard LEGO geometry—it is drastically underscaled for the size of the trains.

### **5.2 Rail Profile and Code**

* **L-Gauge:** The rail profile is massive relative to the scale. The rail height is fixed and robust to withstand floor play (stepped on by children).  
* **N Scale:** Defined by "Code," which represents rail height in thousandths of an inch.  
  * *Code 80:* Standard, robust, slightly oversized (0.080 inches).25  
  * *Code 55:* Finescale (0.055 inches), more realistic. Peco Code 55 cleverly embeds the rail deeper into the sleeper to maintain strength while showing less profile.25  
  * *Insight:* If LEGO track were measured in "Code," it would likely be **Code 250** or higher. This massive profile is necessary for the mechanical strength of the plastic "click" connections and to provide a contact surface for the thick flanges of LEGO train wheels.

### **5.3 Turnout Mechanics**

* **LEGO:** Manual or spring-loaded. Non-polarised frogs (plastic). This simplifies wiring (no short circuits) but can cause stalls for short-wheelbase locos (e.g., 4-wheeled shunters) as they lose electrical contact over the plastic frog.  
* **N/HO Scale:** Offers "Electrofrog" (powered frogs) and "Insulfrog" (insulated). Electrofrogs provide better continuity but require complex wiring to switch polarity.26  
* **Märklin Z Scale:** Uses a 13-degree turnout angle, deviating from the 15/30 degree standards common in other scales, creating unique geometry challenges.28

## **6\. Algorithmic Track Planning and Simulation**

The transition from physical assembly to digital design requires sophisticated algorithms to model the behavior of track components, particularly flexible track.

### **6.1 Rigid Body vs. Bezier Logic**

Standard track planning software (like BlueBrick or Track Designer) treats LEGO track as rigid sprites with fixed entry/exit vectors. However, modeling flex track (Part 88492\) requires Bezier curve algorithms.

* **Cubic Bezier Curves:** Defined by four points: Start ($P\_0$), Control 1 ($P\_1$), Control 2 ($P\_2$), and End ($P\_3$).  
* **Application:** To simulate a flex track connection between two fixed points with specific tangent vectors (the direction of the track at the joint), the control points ($P\_1, P\_2$) are placed along the tangent vectors of the start and end points.29  
* Calculation: The curve is generated using the formula:

  $$B(t) \= (1-t)^3P\_0 \+ 3(1-t)^2tP\_1 \+ 3(1-t)t^2P\_2 \+ t^3P\_3$$

  where $t$ ranges from 0 to 1.30  
* **Constraint Modeling:** In L-Gauge planning, the "stiffness" of the flex track imposes limits on the distance between $P\_0$ and $P\_1$. Unlike a pure vector line, real LEGO flex track has a minimum bend radius. Advanced planners (like OSRD or custom scripts using React Konva) must constrain the Bezier control points to prevent generating curves tighter than the physical limit (approx R24-R32 equivalent).31

### **6.2 Software Tools and File Formats**

* **XTrackCAD:** A robust CAD tool that uses parameter files to define track libraries. It supports easement calculations (transitioning radius) which are critical for high-speed layout realism. The parameter files define the geometry (length, angle, radius) of each piece, allowing users to import custom TrixBrix definitions.33  
* **SCARM:** "Simple Computer Aided Railway Modeller" offers 3D visualization and extensive libraries. It handles flex tracks by allowing users to shape them intuitively, effectively calculating the underlying geometry dynamically. It uses specific library files (.lib) that define the track geometry.35  
* **React Konva:** For web-based planners, libraries like React Konva are used to render the canvas. They employ the same Bezier mathematics to draw smooth rail paths in the browser, allowing for interactive manipulation of track geometry. This is essential for modern, open-source railway planning tools.31

## **7\. Interoperability and System Integration**

### **7.1 Hybridization with Wooden Systems**

Interestingly, the research highlights a significant crossover between wooden train systems (Brio, IKEA Lillabo, Lidl Playtive) and the L-Gauge universe, facilitated by 3D printing.

* **Gauge:** Wooden tracks have a \~20mm central guide/gap, with a track width of roughly 40mm.  
* **Adapters:** The community has developed "Bone" connectors (dogbones) and vertical risers to bridge LEGO Duplo/System bricks with wooden tracks.37 This allows modelers to use LEGO pillars to create elevated wooden track layouts.  
* **Geometry:** Wooden track geometry is "loose" compared to the precision of L-Gauge. "Straight" tracks vary in length (e.g., Maxim 3" is actually 82mm), relying on the loose fit of the connectors to absorb tolerances.39 This contrasts sharply with the LEGO "clutch power" requirement which demands near-micron precision.

### **7.2 The Monorail Dimension**

The Disney/LEGO Monorail systems represent a parallel branch of geometry.

* **Disney Monorail:** Uses a beam track. Curves are typically 22-inch radius (inside curve).40  
* **Scale:** Approximately 1:64 (S Scale) to O Scale, comparable to L-Gauge in volume but distinct in mechanics.41  
* **Compatibility:** While not directly compatible with LEGO track, the support pillars are often modified by enthusiasts using 3D printed adapters to interface with LEGO baseplates.42

## **8\. Detailed Reference: Standard Track Configurations**

Based on the \[L-Gauge.org\] standards, here are the canonical configurations for layout planning:

### **8.1 The Standard Loop**

* **Components:** 16x R40 Curves (53400), 4x Straights (53401).  
* **Dimensions:** Fits on a 48x48 stud footprint (approx).  
* **Expansion:** Inserting straight tracks expands the loop into an oval. Every 16-stud straight adds 128mm to the length. A standard "Starter Set" loop usually includes 16 curves and 4 straights (approx 704mm x 832mm).2

### **8.2 The Return Loop (Reverse Loop)**

* **Geometry:** Requires a switch, a curve, and a return section.  
* **Polarity Issue:** On 9V systems, a reverse loop creates a short circuit as the left rail connects to the right rail. This requires **isolation gaps** (plastic track segments) or polarity reverser modules.7 On RC/Battery systems, this is not an issue as the track is not powered.

### **8.3 The Yard Ladder**

* **Concept:** A series of switches allowing a single main line to branch into multiple parallel sidings.  
* **Geometry:** Because standard switches diverge at 22.5° (nominal), placing them immediately after one another creates diagonal sidings. To create parallel sidings, intermediate curves or "S-bend" configurations are required to bring the track back to the 90-degree grid.  
  * *Grid Aligned Ladder:* Uses R40 curves to return each branch to parallel.  
  * *Compact Ladder:* Uses the diagonal geometry to pack tracks closer, though they don't align with the baseplate grid.7

### **8.4 The Helix**

While not explicitly a standard LEGO part, the helix is a critical structure for multi-level layouts.

* **Application:** To bridge vertical height (e.g., from a staging yard to the display level).  
* **Calculations:** Based on N-Scale helix data 9, a functional helix requires a grade of \<3%. For LEGO trains, which rely on rubber traction tires, a 3% grade is manageable.  
* **Dimensions:** A 12cm rise (to clear a train tunnel) at 3% grade requires 400cm of track run. A single circle of R40 is roughly 200cm ($2 \* \\pi \* 32cm$). Thus, R40 is too steep (6% grade) for a helix unless the vertical clearance is very low.  
* **Recommendation:** Functional LEGO helixes typically require **R72 or R88** radii to achieve a shallow enough grade for long trains.43

## **9\. Insights and Future Outlook**

The analysis of the L-Gauge ecosystem reveals a hobby in transition. The official LEGO system has settled into a "mass market" equilibrium: durable, battery-powered, and geometrically simple (R40). However, the "prosumer" market has effectively forked the system. Companies like TrixBrix and Fx Bricks are not just making compatible parts; they are engineering the "missing link" between toy trains and model railways.

The "Metal" Renaissance:  
The emergence of Fx Bricks (metal track compatible with 9V) suggests a strong market demand for track-powered systems, rejecting the battery-centric philosophy of the official product line. This mirrors the durability vs. realism debates seen in N scale (Code 80 vs Code 55), where enthusiasts often "downgrade" to older, more robust standards for reliability, or upgrade to finer standards for aesthetics.  
Algorithmic Integration:  
The use of Bezier curves in planning software indicates that L-Gauge modeling is becoming increasingly digitized. Modelers are simulating physics and geometry in CAD before snapping a single brick, applying the same rigor as civil engineers.

## **10\. Comprehensive Part Number Encyclopedia**

The following tables serve as a definitive lookup for track components, synthesizing data from all provided sources.

### **Table A: LEGO Brand Track Components (Official)**

| Era | Type | Part ID | Description | Geometry | Citation |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **RC/PU** | Straight | 53401 | Standard Straight | 16 studs (128mm) | 3 |
| **RC/PU** | Curve | 53400 | Standard Curve | R40, 22.5° (16/circle) | 3 |
| **RC/PU** | Flex | 88492 | Flexible Segment | 4 studs, variable | 3 |
| **RC/PU** | Switch L | 53407 | Left Turnout | Diverges \~22.5° | 12 |
| **RC/PU** | Switch R | 53404 | Right Turnout | Diverges \~22.5° | 12 |
| **RC/PU** | Crossing | 60128 | Double Crossover (Half) | Req. 2 halves, 32-stud len | 3 |
| **9V** | Straight | 2865 | Metal Rail Straight | 16 studs | 3 |
| **9V** | Curve | 2867 | Metal Rail Curve | R40, 22.5° | 3 |
| **9V** | Switch L | 2861 | Metal Rail Switch L | \~32 studs long | 3 |
| **9V** | Switch R | 2859 | Metal Rail Switch R | \~32 studs long | 12 |
| **9V** | Crossing | 32087 | 90° Crossing | 16x16 studs | 12 |
| **12V** | Straight | 3242 | Conducting Rail | Center conductor | 12 |
| **12V** | Curve | 3241 | Conducting Rail | Center conductor | 12 |
| **12V** | Decoupler | decbase01 | Remote Uncoupler | Automated action | 12 |
| **4.5V** | Crossing | 3231 | 90° Crossing | Blue Rails | 11 |
| **Misc** | Narrow | 85976 | Narrow Gauge Curve | R24 approx | 13 |
| **Misc** | Roller | 25061 | Roller Coaster Curve | 90 degree | 10 |

### **Table B: Third-Party Radii Standards (TrixBrix/BrickTracks)**

| Radius ID | Radius (Studs) | Radius (mm) | Segments/Circle | Application | Citation |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **R24** | 24 | 192mm | 16 | Trams, Industrial | 15 |
| **R32** | 32 | 256mm | 16 | Inner Loop | 4 |
| **R40** | 40 | 320mm | 16 | Standard LEGO | 2 |
| **R56** | 56 | 448mm | 16 | Parallel to R40 | 7 |
| **R72** | 72 | 576mm | 16 | Parallel to R56 | 17 |
| **R88** | 88 | 704mm | 32 | Wide curves | 3 |
| **R104** | 104 | 832mm | 32 | High Speed | 18 |
| **R120** | 120 | 960mm | 32 | Maximum Realism | 19 |

### **Table C: Comparative N Scale Geometry (Reference Context)**

| System | Track | Radius (mm) | Notes | Citation |
| :---- | :---- | :---- | :---- | :---- |
| **Kato** | R216 | 216mm | "Radius 1" equivalent | 16 |
| **Kato** | R249 | 249mm | "Radius 2" equivalent | 16 |
| **Kato** | R282 | 282mm | "Radius 3" equivalent | 16 |
| **Kato** | R315 | 315mm | Standard Mainline (Matches L-Gauge R40) | 16 |
| **Fleischmann** | R1 | 192mm | Tight curve (Matches L-Gauge R24) | 14 |
| **Fleischmann** | R2 | 225.6mm | Parallel to R1 | 44 |
| **Peco** | Setrack | Varies | 22.5° Turnouts (Matches L-Gauge) | 27 |
| **Peco** | Streamline | Varies | 10°/12° Turnouts (Matches L-Gauge Custom) | 45 |

### **Table D: N Scale Turntable Dimensions (Reference for Scale Comparison)**

| Brand | Model | Deck Length | Pit Diameter | Indexing | Citation |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Kato** | 20-283 | 160mm | 217mm | 10° steps | 46 |
| **Peco** | NB-55 | 151mm | 155mm | Manual | 48 |

## **11\. Conclusion**

The L-Gauge system represents a unique intersection of toy design and engineering rigor. Its integer-based geometry, centered on the 8mm stud and the 40mm gauge, provides a rigid framework that ensures compatibility across generations of products. While the official components from The LEGO Group prioritize playability and durability (manifested in the R40 curve and steep switches), the ecosystem has evolved.

The integration of third-party geometries (R56-R120), advanced switchgear, and digital planning tools has elevated L-Gauge to a legitimate modeling scale. It now sits uniquely between O Scale (in volume) and N Scale (in track geometry philosophy), offering a modular, solder-free entry point into the world of railway engineering. Whether constructing a simple floor loop or a massive, automated MILS layout, the fundamental "stud math" remains the immutable law of the L-Gauge universe. By understanding the geometric constraints detailed in this report, the builder can transcend the limitations of the starter set and achieve a level of precision that rivals the most advanced prototypical scales.

#### **Works cited**

1. Welcome to L-Gauge \- L-Gauge, accessed January 9, 2026, [http://l-gauge.org/wiki/index.php/Welcome\_to\_L-Gauge](http://l-gauge.org/wiki/index.php/Welcome_to_L-Gauge)  
2. LEGO track geometry \- Bricks McGee, accessed January 9, 2026, [https://www.bricksmcgee.com/blog/lego-track-geometry/](https://www.bricksmcgee.com/blog/lego-track-geometry/)  
3. Track Geometry \- L-Gauge, accessed January 9, 2026, [http://l-gauge.org/wiki/index.php/Track\_Geometry](http://l-gauge.org/wiki/index.php/Track_Geometry)  
4. Curved Track R32 \- TrixBrix, accessed January 9, 2026, [https://trixbrix.eu/en\_US/p/Curved-Track-R32/156](https://trixbrix.eu/en_US/p/Curved-Track-R32/156)  
5. Track Planning for LEGO® Trains, Part 2: Track Geometry and Tips & Tricks \- Monty's Trains, accessed January 9, 2026, [http://montystrains.net/workshop-blog/2018/2/22/track-planning-for-lego-trains-part-2-track-geometry-and-tips-tricks](http://montystrains.net/workshop-blog/2018/2/22/track-planning-for-lego-trains-part-2-track-geometry-and-tips-tricks)  
6. The straight, the curved and the pointy of LEGO-compatible train track \- transponderings, accessed January 9, 2026, [https://transponderings.blog/2024/05/03/the-straight-the-curved-and-the-pointy-of-lego-compatible-train-track/](https://transponderings.blog/2024/05/03/the-straight-the-curved-and-the-pointy-of-lego-compatible-train-track/)  
7. Reference Track Configurations \- L-Gauge, accessed January 9, 2026, [http://l-gauge.org/wiki/index.php/Reference\_Track\_Configurations](http://l-gauge.org/wiki/index.php/Reference_Track_Configurations)  
8. N scale track dimensions and specifications : r/modeltrains \- Reddit, accessed January 9, 2026, [https://www.reddit.com/r/modeltrains/comments/1iw7thg/n\_scale\_track\_dimensions\_and\_specifications/](https://www.reddit.com/r/modeltrains/comments/1iw7thg/n_scale_track_dimensions_and_specifications/)  
9. Helix Minimum Space Requirements \- N \- Precision Model Railroad, accessed January 9, 2026, [https://precisionmodelrailroad.com/pages/n-scale-helix-minimum-space-requirements](https://precisionmodelrailroad.com/pages/n-scale-helix-minimum-space-requirements)  
10. Parts \- Train, Track \- BrickLink Reference Catalog, accessed January 9, 2026, [https://www.bricklink.com/catalogList.asp?pg=2\&catType=P\&catID=128](https://www.bricklink.com/catalogList.asp?pg=2&catType=P&catID=128)  
11. Train, Track 4.5V Crossing : Part 3231 \- BrickLink, accessed January 9, 2026, [https://www.bricklink.com/v2/catalog/catalogitem.page?P=3231](https://www.bricklink.com/v2/catalog/catalogitem.page?P=3231)  
12. Parts \- Category Train, Track \- BrickLink Reference Catalog, accessed January 9, 2026, [https://www.bricklink.com/catalogList.asp?catType=P\&catString=128](https://www.bricklink.com/catalogList.asp?catType=P&catString=128)  
13. Parts \- Train, Track \- Appearing In Sets in Medium Azure Color \- BrickLink Reference Catalog, accessed January 9, 2026, [https://www.bricklink.com/catalogList.asp?catID=128\&catXrefLevel=0\&colorPart=156\&catType=P](https://www.bricklink.com/catalogList.asp?catID=128&catXrefLevel=0&colorPart=156&catType=P)  
14. Fleischmann 9120 Gauge N Curved track, radius R1, 45 \- modellbahnshop-lippe.com, accessed January 9, 2026, [https://www.modellbahnshop-lippe.com/Railtracks/Standard+Railtracks/Fleischmann-9120/gb/modell\_4565.html](https://www.modellbahnshop-lippe.com/Railtracks/Standard+Railtracks/Fleischmann-9120/gb/modell_4565.html)  
15. Curved Track R24 \- TrixBrix, accessed January 9, 2026, [https://trixbrix.eu/en\_US/p/Curved-Track-R24/32](https://trixbrix.eu/en_US/p/Curved-Track-R24/32)  
16. Track Radius \- Train Trax UK, accessed January 9, 2026, [https://traintrax.co.uk/track-radius](https://traintrax.co.uk/track-radius)  
17. Curved Track R72 \- TrixBrix, accessed January 9, 2026, [https://trixbrix.eu/en\_US/p/Curved-Track-R72/34](https://trixbrix.eu/en_US/p/Curved-Track-R72/34)  
18. Curved Track R104 \- TrixBrix, accessed January 9, 2026, [https://trixbrix.eu/en\_US/p/Curved-Track-R104/36](https://trixbrix.eu/en_US/p/Curved-Track-R104/36)  
19. Curved Track R120 \- TrixBrix, accessed January 9, 2026, [https://trixbrix.eu/en\_US/p/Curved-Track-R120/134](https://trixbrix.eu/en_US/p/Curved-Track-R120/134)  
20. Why 22.62 degrees? \- Fx Bricks, accessed January 9, 2026, [https://shop.fxbricks.com/blogs/news/why-22-62-degrees](https://shop.fxbricks.com/blogs/news/why-22-62-degrees)  
21. H0 Fleischmann Profi sínrendszer \- Vasutmodell.com, accessed January 9, 2026, [https://vasutmodell.com/pics/h0-fleischmann-profi-sinrendszer-geometriaja-338454.pdf](https://vasutmodell.com/pics/h0-fleischmann-profi-sinrendszer-geometriaja-338454.pdf)  
22. accessed January 9, 2026, [https://hennings-trains.shoplightspeed.com/copy-of-sl-90-double-slip-crossing-code-100-ho-sca.html\#:\~:text=10%20Degree%20Crossing%20Angle%2C%20Electrofrog,Code%2080%20track%20system%20components.](https://hennings-trains.shoplightspeed.com/copy-of-sl-90-double-slip-crossing-code-100-ho-sca.html#:~:text=10%20Degree%20Crossing%20Angle%2C%20Electrofrog,Code%2080%20track%20system%20components.)  
23. Geometry: Dual Gauge \- MattzoBricks, accessed January 9, 2026, [https://mattzobricks.com/lego-track-planning/track-geometry/geometry-dual-gauge](https://mattzobricks.com/lego-track-planning/track-geometry/geometry-dual-gauge)  
24. Design of Tomix and Kato N-Gauge Sectional Track Systems \- TrainWeb.org, accessed January 9, 2026, [http://trainweb.org/tomix/track/tomix\_track\_systems.htm](http://trainweb.org/tomix/track/tomix_track_systems.htm)  
25. Code 55 vs Code 80 N Scale track : r/modeltrains \- Reddit, accessed January 9, 2026, [https://www.reddit.com/r/modeltrains/comments/11kfh3b/code\_55\_vs\_code\_80\_n\_scale\_track/](https://www.reddit.com/r/modeltrains/comments/11kfh3b/code_55_vs_code_80_n_scale_track/)  
26. Code 80 or Code 55 for layout, how do I decide? \- the MRH Forum, accessed January 9, 2026, [https://forum.mrhmag.com/post/code-80-or-code-55-for-layout-how-do-i-decide-12282819](https://forum.mrhmag.com/post/code-80-or-code-55-for-layout-how-do-i-decide-12282819)  
27. Peco \- N Scale Supply, accessed January 9, 2026, [https://www.nscalesupply.com/pec/pec-.html](https://www.nscalesupply.com/pec/pec-.html)  
28. Rokuhan Track \- Z-Scale \- Groups.io, accessed January 9, 2026, [https://groups.io/g/z-scale/topic/rokuhan\_track/30143399](https://groups.io/g/z-scale/topic/rokuhan_track/30143399)  
29. Bézier curve \- Wikipedia, accessed January 9, 2026, [https://en.wikipedia.org/wiki/B%C3%A9zier\_curve](https://en.wikipedia.org/wiki/B%C3%A9zier_curve)  
30. Bezier curve \- The Modern JavaScript Tutorial, accessed January 9, 2026, [https://javascript.info/bezier-curve](https://javascript.info/bezier-curve)  
31. Modify Curves with Anchor Points | Konva \- JavaScript Canvas 2d Library, accessed January 9, 2026, [https://konvajs.org/docs/sandbox/Modify\_Curves\_with\_Anchor\_Points.html](https://konvajs.org/docs/sandbox/Modify_Curves_with_Anchor_Points.html)  
32. Guide to canvas manipulation with React Konva \- LogRocket Blog, accessed January 9, 2026, [https://blog.logrocket.com/canvas-manipulation-react-konva/](https://blog.logrocket.com/canvas-manipulation-react-konva/)  
33. XTrkCAD Model RR Track Planner / Wiki / FirstLayout \- SourceForge, accessed January 9, 2026, [https://sourceforge.net/p/xtrkcad-fork/wiki/FirstLayout/](https://sourceforge.net/p/xtrkcad-fork/wiki/FirstLayout/)  
34. XTrackCAD User's Manual \- OlderGeeks.com, accessed January 9, 2026, [https://www.oldergeeks.com/downloads/files/XTrackCAD\_Users\_Manual\_V5.3.0GA.pdf](https://www.oldergeeks.com/downloads/files/XTrackCAD_Users_Manual_V5.3.0GA.pdf)  
35. SCARM \- The leading design software for model railroad layouts, accessed January 9, 2026, [http://www.scarm.info/index\_en.html](http://www.scarm.info/index_en.html)  
36. QuickTip: Custom/Cutout Track Pieces in SCARM Layout Plan, accessed January 9, 2026, [https://www.scarm.info/blog/outdated-topics/quicktip-customcutout-track-pieces-in-scarm-layout-plan/](https://www.scarm.info/blog/outdated-topics/quicktip-customcutout-track-pieces-in-scarm-layout-plan/)  
37. Wooden Train Track X-crossing: Brio, Lillabo, Playtive Compatible \- Etsy, accessed January 9, 2026, [https://www.etsy.com/listing/1667975760/wooden-train-track-x-crossing-brio](https://www.etsy.com/listing/1667975760/wooden-train-track-x-crossing-brio)  
38. Lidl Playtive / Ikea compatible wooden train rails / Koleje pro dřevěné vlaky Lidl Playtive / Ikea by tomasN | Download free STL model | Printables.com, accessed January 9, 2026, [https://www.printables.com/model/612423-lidl-playtive-ikea-compatible-wooden-train-rails-k/related](https://www.printables.com/model/612423-lidl-playtive-ikea-compatible-wooden-train-rails-k/related)  
39. Third Party Track \- BRIO® Wooden Railway Guide, accessed January 9, 2026, [https://woodenrailway.info/track/third-party-track](https://woodenrailway.info/track/third-party-track)  
40. 1/2 Length 22 deg curve Track for Disney Monorail Set \- eBay, accessed January 9, 2026, [https://www.ebay.com/itm/236018344380](https://www.ebay.com/itm/236018344380)  
41. Walt Disney World Monorail System \- Wikipedia, accessed January 9, 2026, [https://en.wikipedia.org/wiki/Walt\_Disney\_World\_Monorail\_System](https://en.wikipedia.org/wiki/Walt_Disney_World_Monorail_System)  
42. Monorail Beam for Disney Model \- 500 mm radius \*\*\*older design, use the newer ones, accessed January 9, 2026, [https://www.printables.com/model/1324125-monorail-beam-for-disney-model-500-mm-radius-older/related](https://www.printables.com/model/1324125-monorail-beam-for-disney-model-500-mm-radius-older/related)  
43. Single/Double Track Standard Helix 360/437.5mm Radius-Noch-53004 | Gaugemaster, accessed January 9, 2026, [https://www.gaugemasterretail.com/noch-n53004.html](https://www.gaugemasterretail.com/noch-n53004.html)  
44. Fleischmann N Scale Straight and Curved Track \- Euro Rail Hobbies, accessed January 9, 2026, [https://www.eurorailhobbies.com/products.asp?mn=5\&ca=9\&sc=N](https://www.eurorailhobbies.com/products.asp?mn=5&ca=9&sc=N)  
45. SL-396 Turnout, Medium Radius, Left Hand \- PECO, accessed January 9, 2026, [https://peco-uk.com/en-us/products/turnout-medium-radius-left-hand4](https://peco-uk.com/en-us/products/turnout-medium-radius-left-hand4)  
46. Kato \#20-283 N Gauge Electric Turntable \- TrainWorld, accessed January 9, 2026, [https://www.trainworld.com/kato-20-283-n-gauge-electric-turntable-kato-20-283.html](https://www.trainworld.com/kato-20-283-n-gauge-electric-turntable-kato-20-283.html)  
47. Unitrack Electric Turntable-Kato-20-283 | Gaugemaster, accessed January 9, 2026, [https://www.gaugemasterretail.com/kato-k20-283.html](https://www.gaugemasterretail.com/kato-k20-283.html)  
48. PECO LK-55 \- Turntable, Well Type \- HO Scale \- Midwest Model Railroad, accessed January 9, 2026, [https://midwestmodelrr.com/pcolk-55/](https://midwestmodelrr.com/pcolk-55/)  
49. Peco NB-55 Turntable – N Gauge \- AGR Model Railway Store, accessed January 9, 2026, [https://agrmodelrailwaystore.co.uk/product/peco-nb-55-turntable/](https://agrmodelrailwaystore.co.uk/product/peco-nb-55-turntable/)