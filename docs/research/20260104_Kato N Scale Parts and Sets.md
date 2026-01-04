# **Comprehensive Technical Specification and Systems Integration Report: Kato Unitrack Ecosystem and Rolling Stock Analysis**

## **1\. Introduction: The Systems Engineering of Miniature Logistics**

The integration of physical model railroad components into a unified part library requires a rigorous understanding of the underlying engineering principles, geometric constraints, and electromechanical logic that govern their operation. This report provides an exhaustive analysis of the Kato Precision Railroad Models N-scale product line, specifically the Unitrack modular system, its associated rolling stock, and interactive logistic elements. Unlike traditional flex-track systems which rely on user-defined geometry and manual ballasting, the Kato Unitrack system functions as a discrete logic system, analogous to a physical grid-based simulation engine. Every component, from the 248mm straight track to the complex \#6 turnout, adheres to a strict integer-coordinate geometry designed to ensure mechanical interconnectivity and electrical continuity.

This analysis is structured to serve as a definitive reference for library architects, simulation designers, and systems engineers. It transcends a mere cataloging of dimensions by exploring the *functional purpose* of each component within the broader logistical network. We examine the specific deviations required for complex interlocking, the "fuzzy logic" inherent in infrared-automated crossing gates, and the kinematic envelopes of specific rolling stock like the Shinkansen E5 Series and the Union Pacific FEF-3 steam locomotive. Furthermore, this report draws comparative parallels between physical model railroading and digital logistics simulations—such as *Factorio*, *Transport Tycoon*, and *Mini Metro*—to contextualize the "gameplay loop" of physical layout design and the psychological satisfaction derived from optimizing these miniature transport networks. By treating the Unitrack system as a programmable hardware platform, we reveal the sophisticated interplay between static geometry and dynamic operation.

## **2\. Geometric Architecture of the Unitrack System**

The fundamental engineering principle of the Kato Unitrack system in N-scale (1:160 for North American/European prototypes; 1:150 for Japanese prototypes) is the modularization of track geometry into fixed radii and lengths. This standardization allows for "snap-to-grid" functionality essential for both physical assembly and digital library representation. The system prioritizes geometric stability through the "UniJoiner" interface, a patented locking mechanism that provides both structural alignment and electrical connection.1

### **2.1. The 33mm Track Center Standard**

The central axiom of Unitrack geometry is the **33mm** track center spacing. This dimension dictates the parallel spacing for double-track mainlines, passing sidings, and yard ladders.3 Understanding this constant is critical for any library definition, as it serves as the foundational "grid unit" for lateral expansion.

While standard double-track plates (found in V11, V12 sets) physically lock this 33mm spacing, the system is designed to accommodate variable spacings for specific operational requirements. The 33mm standard is not merely an aesthetic choice; it is a calculated clearance envelope designed to prevent side-swiping between long rolling stock on concentric curves.3 However, advanced layout design necessitates deviations from this standard, which the library must support through specific part combinations.

* **33mm (Standard):** The default spacing for double mainlines. Achieved using standard double-track pieces (e.g., 20-004) or by placing two single lines connected via a \#6 crossover.  
* **49.5mm (Station Spacing):** This wider spacing is required to accommodate an "island" platform between two tracks. It is geometrically achieved by inserting a specific combination of turnout and curve. For example, a \#6 turnout (diverging at 15 degrees) connected to an R718-15° curve creates a parallel line at 49.5mm spacing.3 This specific offset is critical for library collision detection, ensuring that platform assets fit correctly between the rails.  
* **66mm (Wide Spacing):** Often utilized in yard leads or complex interlockings, this is simply double the standard spacing (33mm x 2). It provides clearance for signal gantries or catenary poles located between the tracks.3

Library architects must define "snap points" not just at the rail ends, but also laterally, to allow accessories like bridge piers (23-019) and overhead catenary poles (23-061) to align with these variable track centers. The geometry is rigid but configurable; a failure to adhere to the specific straight/curve combinations detailed in Kato's geometry guides will result in "grid misalignment," accumulating stress on the rail joiners and leading to derailments.3

### **2.2. Straight Track Modules: Lengths and Utility**

Straight track sections function as the linear "edges" in the network graph. They are generally available in multiples or fractions of a base length standard, designed to balance the geometry of turnouts and crossings.

| Part ID | Length (mm) | Length (Imperial) | Type | Operational Function & Library Notes |
| :---- | :---- | :---- | :---- | :---- |
| **20-000** | 248 mm | 9 3/4" | Standard | The primary base unit. Most layout planning is calculated in units of 248mm. Equivalent to four 62mm units. 6 |
| **20-010** | 186 mm | 7 5/16" | 3/4 Length | Matches the straight leg length of the \#6 Turnout (20-202/203). Essential for maintaining grid alignment when a turnout is inserted into a straight run. 1 |
| **20-020** | 124 mm | 4 7/8" | 1/2 Length | Half of the base unit. Used frequently with 90-degree crossings (20-320) which share this dimension. 1 |
| **20-030** | 64 mm | 2 1/2" | Adjustment | **Critical Part:** This is *not* a standard fraction of 248mm. It is a compensation piece used specifically with \#4 turnouts to correct the geometric offset caused by the divergence angle. Library logic must distinguish this from the 62mm piece. 1 |
| **20-040** | 62 mm | 2 7/16" | 1/4 Length | True quarter unit (248/4). Matches the length of the standard Feeder Track (20-041) and Sensor Track. 7 |
| **20-091** | 29 mm | 1 1/8" | Short | Gap filler. Essential for closing loops where geometry does not perfectly align due to complex curves. 10 |
| **20-091** | 45.5 mm | 1 3/4" | Short | Gap filler. 10 |

Technical Insight on the 62mm vs. 64mm Distinction:  
One of the most common errors in Kato layout design—and a critical distinction for any digital part library—is the confusion between the 62mm (20-040) and 64mm (20-030) straight tracks. While visually similar, they serve fundamentally different geometric purposes.

* The **62mm** track is a standard subdivision of the 248mm base unit ($248 \\div 4 \= 62$). It is used to extend the grid linearly.  
* The **64mm** track is a "geometry correction" piece. When a \#4 turnout is used to create a passing siding, the diverging leg (R481-15°) creates a lateral offset that does not align with the 33mm grid if closed immediately. The 64mm piece provides the necessary linear extension to realign the geometry when paired with the \#6 turnout or specific crossing components.3  
* *Library Implication:* The library must prevent the user from swapping these pieces interchangeably. A constraint solver should flag a 2mm gap error if a 62mm piece is used where a 64mm piece is required.

### **2.3. Curved Track Radii and Superelevation**

Kato’s curve geometry is segmented into "Ground Level" and "Viaduct/Superelevated" tracks. The radii are stepped in 33mm increments to ensure perfectly parallel nested curves, allowing for multi-track mainlines without collision.

Standard Ground Radii Series:  
The ground-level curves (e.g., 20-100 to 20-160) are flat, meaning the inner and outer rails are at the same elevation.

* **216 mm (8.5") \[20-170\]:** Minimum radius. Navigable only by smaller rolling stock such as trams, short 4-axle diesels, and 2-axle freight cars. Shinkansens and large steamers (e.g., FEF-3, Big Boy) will physically derail due to truck rotation limits and overhang.1  
* **249 mm (9.75") \[20-100\]:** "Standard" tight radius. Most 4-axle and shorter 6-axle diesels can navigate this. However, long passenger cars (85ft) will show significant overhang, potentially striking scenery objects placed too close to the track centerline.9  
* **282 mm (11") \[20-110\]:** The industry standard "minimum" for reliable operation of larger equipment like the Union Pacific FEF-3 and Big Boy. Below this radius, the articulated tender mechanisms may bind.11  
* **315 mm (12.375") \[20-120\]:** The standard radius for "Master" (M1/M2) sets. This is considered the "safe" baseline for all N-scale equipment, including Shinkansens with full diaphragm details.9  
* **348 mm (13.7") \[20-130\]:** Parallel partner to 315mm (315 \+ 33 \= 348).  
* **381 mm (15") \[20-140\]:** Wide radius.  
* **414 mm (16.3") \[20-150\]:** Very wide radius.  
* **481 mm (19") \[20-160\]:** Matches the diverging radius of the \#4 Turnout. 9  
* **718 mm (28.25") \[20-150\]:** Matches the diverging radius of the \#6 Turnout. Used for easing trains into sidings or creating very gentle, realistic curves.14

Superelevated (Banked) Curves:  
Kato introduced "Superelevated" curves (found in V11/V12/V13/V14 sets) where the track is physically banked (tilted) to simulate the centripetal dynamics of high-speed trains. This feature is critical for modeling Japanese Shinkansen or modern European high-speed lines realistically.

* **Engineering Mechanics:** The roadbed is molded such that the outer rail is higher than the inner rail. This banking (superelevation) reduces the visual "toying" effect of trains entering curves flatly.  
* **Easement Requirement:** A superelevated curve cannot connect directly to a flat straight track. It *must* use a specific "Easement" track (e.g., 20-182) which acts as a transition spiral, gradually introducing the bank angle over its length.15  
* *Library Implication:* The library logic must enforce the placement of Easement tracks at the interface between flat and banked sections. Connecting a standard straight (20-000) directly to a superelevated curve (20-181) is a geometric violation that results in a vertical kink at the rail joint.  
* **Common Dimensions:** The most common superelevated radii come in double-track pairs: **381mm (15") / 414mm (16.3")** and **282mm (11") / 315mm (12.375")**.1

### **2.4. Turnout Geometry and Kinematics**

The turnout (switch) is the most mechanically complex component of the track system. Kato produces two primary geometries, often referred to as \#4 and \#6, though their actual frog angles and lead lengths differ slightly from NMRA prototype definitions. These turnouts act as the "routers" of the physical network.

#### **2.4.1. The \#6 Turnout (20-202 Left / 20-203 Right)**

* **Diverging Radius:** 718mm (approx. 28").  
* **Diverging Angle:** 15°.  
* **Straight Length:** 186mm.1  
* **Operational Profile:** Designed for high reliability and speed. The broad 718mm radius allows 16-car Shinkansen consists and massive articulated steam locomotives (4-8-8-4 Big Boy) to navigate the turnout without "picking the point" or derailing due to wheelbase stiffness.4  
* **Geometry Integration:** The 186mm straight leg matches the 20-010 straight track. The diverging leg, being an R718-15° curve, can be corrected to parallel using a specific curved track piece (**R718-15**, part 20-150) to bring the track back to parallel, creating a **49.5mm** track center spacing.3 This spacing is essential when building crossovers that need to fit specific platform types.

#### **2.4.2. The \#4 Turnout (20-220 Left / 20-221 Right)**

* **Diverging Radius:** 481mm (approx. 19").  
* **Diverging Angle:** 15°.  
* **Straight Length:** **126mm**. (Note: This is unique. It is *not* the standard 124mm length found in piece 20-020).17  
* **Operational Profile:** More compact, allowing for denser yard ladders. However, the sharper divergence angle can cause "S-curve" derailments with long-wheelbase steam locomotives if not carefully managed. It is generally recommended for yard and industrial switching rather than mainline operations.3  
* **Engineering Constraints:** The 126mm straight leg is a "trap" for unwary designers. Connecting it directly to a 124mm grid will result in a 2mm misalignment. Over a long yard ladder, this error accumulates, stressing rail joiners and causing derailments. Kato includes specific compensation tracks (60mm cut track, 64mm straight) in the \#4 turnout package to mitigate this.17  
* **Power Routing:** Both turnout types feature selectable modes via screws on the underside:  
  * **Power Routing:** The direction of the switch points determines which track receives power. This acts like a logic gate, energizing only the selected path. Useful for DC block control without extra wiring.4  
  * **Non-Power Routing:** All rails are energized regardless of switch position. Essential for DCC operations where the locomotive's digital decoder controls movement, not the track power.4

**Insight on Turnout Selection:** For simulation purposes, the \#6 is the "Mainline" switch, capable of handling speed and length. The \#4 is the "Yard/Industrial" switch. The library must explicitly display the straight leg length difference (186mm vs 126mm) to preventing grid-breaking design errors.

## **3\. Electromechanical Interactive Systems**

Beyond static track, Kato offers dynamic components that introduce logic gates and automation into the layout. These require specific attributes in a digital library to simulate their behavior accurately. They transform the layout from a static diorama into a programmable system.

### **3.1. Automatic Crossing Gate (20-652-1)**

This component simulates a grade crossing with active protection (gates, lights, bells). It operates independently of the track power, using its own logic controller.

* **Sensor Logic:** Unlike simple pressure plates or current detectors found in other systems, Kato uses **Infrared (IR) Optical Sensors** embedded in specific track sections (62mm sensor tracks).19  
* **Directionality & Fuzzy Logic:** The system uses two sensors per track (one on each side of the crossing). The internal logic controller counts "entry" interruptions and "exit" interruptions to determine the state of the gate.  
  * *State 1 (Approach):* Train trips Sensor A. Logic state \= "Occupied." Gates lower, lights flash.  
  * *State 2 (Traversing):* Train passes crossing. The logic holds the "Occupied" state.  
  * *State 3 (Departure):* Train clears Sensor B. Logic state \= "Clear." Gates raise.19  
* **Deployment Constraints:**  
  * The sensors are sensitive to ambient IR (sunlight, halogen bulbs). Direct sunlight can flood the sensor, causing a "False Occupied" state where the gates remain down indefinitely.20  
  * **Expansion:** The system is modular. Expansion sets (20-653) allow the logic to handle up to 6 parallel tracks. The logic controller sums the "Occupied" states using an OR gate (if Track 1 OR Track 2 is occupied, Gate \= DOWN).19  
* **Library Attribute:** The part library needs to define the "Sensor Cable Length" attribute, as the sensors must be placed physically distant from the gate to allow for realistic operation time (gates lowering *before* the train arrives).

### **3.2. Automatic 3-Color Signal (20-605)**

This component provides visual block signaling without the need for a computer-controlled DCC system.

* **Logic Mechanism:** It operates on a **Timer-Based State Machine**, not true block occupancy detection.  
  * *Trigger:* A metal wheelset bridges the rail gap at the signal base, completing a sensing circuit.  
  * *State 1 (Red):* Immediate upon trigger. Timer 1 starts (approx. 3-5 seconds).21  
  * *State 2 (Yellow):* Timer 1 expires. Timer 2 starts (approx. 3-5 seconds).  
  * *State 3 (Green):* Timer 2 expires. Signal resets to Green.  
* **Limitations:** This system is "dumb" regarding actual track occupancy ahead. If a train stops just past the signal (within the visual block), the signal will eventually turn green despite the block being occupied. This distinction is vital for simulation accuracy—it simulates the *visual appearance* of signaling, not the *safety logic* of positive train control (PTC).22  
* **Power:** Requires an external 12V DC power source (Kato Power Pack accessory port), distinct from track power.23

### **3.3. Sound Box (22-101)**

This analog sound synthesizer sits between the power pack and the track.

* **Mechanism:** It reads the **Back-EMF (Electromotive Force)** generated by the locomotive's DC motor. As the motor spins, it generates a voltage counter to the driving voltage. The Sound Box interprets this feedback to synchronize sound effects (steam chuffs, diesel prime mover RPM) with the actual speed of the locomotive.24  
* **Integration:** It creates a "sound container" for DC layouts, bridging the gap between silent DC and fully digital DCC sound systems. It uses "Sound Cards" (cartridges) specific to locomotive types (e.g., E5 Shinkansen, FEF-3 Steam).

## **4\. Locomotive Engineering and Dimensions**

The library must contain precise physical dimensions to ensure rolling stock fits within tunnel portals, clears platform edges, and navigates specific radii. This section analyzes the engineering of key models.

### **4.1. Scale Discrepancy: The 1:150 vs. 1:160 Dichotomy**

A critical attribute for the database is the **Scale Ratio**.

* **Shinkansen (Bullet Trains):** Modeled at **1:160**. Because real-world Shinkansens run on Standard Gauge (1435mm), the 9mm model track accurately represents this at 1:160 ($1435 / 160 \\approx 8.97mm$).25  
* **Japanese Commuter/National Rail (JR):** Modeled at **1:150**. Real-world JR lines use Narrow Gauge (1067mm). To make them run on standard N-scale 9mm track (which would scale to 1350mm at 1:150), the bodies are slightly oversized (1:150) to prevent the "narrow gauge on standard track" look from being too jarring.26  
* **North American/European Models:** Strict **1:160**.25

**Impact:** A 1:150 Japanese suburban train is physically larger (volumetrically) than a 1:160 Amtrak locomotive. Mixing them on a layout can create visual dissonance, though they run on the same track.

### **4.2. Featured Locomotive Specifications**

#### **Shinkansen E5 "Hayabusa" (Series E5)**

* **Configuration:** 10-car consist (Standard).27  
* **Length:** End cars \~27.35m (prototype) scaled to approx 170mm. Intermediate cars \~160mm. Total train length \~1.6 meters (10 cars).28  
* **Mechanism:** Uses a specialized **Tilting Mechanism** in the trucks. As the train enters a superelevated curve, the body physically leans into the turn, replicating the prototype's centroid-shift dynamics.24  
* **Nose:** The "long nose" (15m prototype) is accurately modeled, requiring significant clearance on curves.  
* **Minimum Radius:** **R315mm** is the recommended minimum. While R282mm is physically possible, the diaphragm connections between cars may gap or bind, compromising visual integrity.29

#### **Union Pacific FEF-3 (4-8-4 Steam Locomotive)**

* **Prototype:** UP \#844 (Excursion), \#838 (Freight).  
* **Engineering:** Features a **Coreless Motor** with dual flywheels. This provides exceptional low-speed torque and momentum (coast-down), essential for smooth starts with heavy loads.11  
* **Articulation:** The frame is rigid, but the driver axles have lateral play. The tender (Centipede type) has a special articulated pedestal to negotiate **R282mm (11")** curves.12  
* **Traction:** Drivers are equipped with traction tires (rubber inserts) to increase pulling power for prototypical 15+ car excursion trains.11  
* **DCC:** Designed as "DCC Ready" but requires a specific drop-in decoder due to the tight shell space.12

#### **EMD SD70ACe / GE ES44 "Gevo"**

* **Length:** Approx 135mm over couplers.  
* **Lighting:** "Ditch lights" (alternating flashing lights at grade crossings) are a signature feature. Kato implements this via intricate light pipes from a central LED board to the pilot.30  
* **DCC Readiness:** "DCC Friendly" design allows the analog light board to be swapped for a digital decoder (e.g., Digitrax DN163K1C) without soldering.31

#### **GE P42 "Genesis"**

* **Usage:** Amtrak's primary diesel.  
* **Design Note:** The streamlined monocoque body requires a specific long-shank coupler for tight radius operation (below 249mm) to prevent the pilot from fouling the cars.32 Standard couplers may cause derailments on tight R216/R249 curves due to the lack of swing clearance.

## **5\. Wiring and Electrical Infrastructure**

Accurate simulation of a layout requires understanding the connectivity nodes.

### **5.1. The UniJoiner System**

* **Standard UniJoiner (Gray/Blue):** Conductive metal clip encased in plastic. Provides mechanical locking and electrical continuity.2  
* **Insulated UniJoiner (Flesh/Grey Plastic):** Non-conductive. Used to isolate electrical blocks.33 Essential for:  
  * Stopping trains at signals (in DC operations).  
  * Isolating the two rails of a return loop (with a reverser).  
  * Separating power districts in large DCC layouts.33  
* **Terminal UniJoiner (Wired):** Standard joiner with soldered 24AWG feeder wires (blue/white leads). This allows power injection at *any* rail joint, eliminating the need for specific "Feeder Tracks" (like the 20-041). This offers superior aesthetic flexibility and is crucial for maintaining voltage over long runs (bus wiring).33

### **5.2. DC vs. DCC Considerations**

* **DC (Analog):** Voltage varies (0-12V) to control speed. Polarity determines direction. Block wiring is required to run multiple trains (using insulated joiners and toggle switches). This mimics the "traffic control" logic of older transport games.  
* **DCC (Digital):** Constant voltage (approx 14V AC square wave). Digital packets control specific locomotives. Wiring is simpler (bus wire \+ feeders), but turnouts must be "Power Routing" friendly to avoid shorting frogs if not using "Electrofrog" specific setups. Kato \#4 turnouts are notorious for needing "tuning" in DCC to prevent micro-shorts at the frog.4

## **6\. Train Sets and V-Set Expansion Philosophy**

Kato’s marketing and engineering strategy relies on the "Master" (M) and "Variation" (V) set taxonomy. This modular approach is critical for parsing the part library, as a single SKU (e.g., V3) decomposes into multiple track SKUs.

### **6.1. Master Sets (The Core)**

* **M1 (20-850/852):** Basic Oval. R315mm curves. 4x 248mm straights. Includes Power Pack SX.13  
* **M2 (20-851/853):** Oval with Passing Siding. Adds \#6 turnouts to the M1 configuration. This is the "Gold Standard" starter for serious modelers due to the reliable \#6 switches which handle long rolling stock better than the \#4s found in other starter sets.13

### **6.2. Variation Sets (The Expansion)**

* **V1 (Passing Siding):** Adds \#6 turnouts to create a passing loop.37  
* **V3 (Rail Yard):** Uses \#6 turnouts to create a 3-track yard. Geometry aligns perfectly with the 33mm track center.37  
* **V4 (Switching Siding):** Uses \#4 turnouts. Designed for tighter industrial spurs. This set is functionally distinct from V1/V3 due to the different turnout geometry (\#4 vs \#6).37  
* **V11/V12/V13/V14 (Double Track):** These sets introduce the concrete-tie double track with superelevation.  
  * *V11:* Ground level double track oval.  
  * *V12:* Viaduct double track oval (features bridge piers).  
  * *V15:* Station expansion (widens track centers from 33mm to 49.5mm to fit island platforms).1

**Ripple Effect Insight:** The progression from M1 \-\> V11 \-\> V15 demonstrates a carefully curated "upgrade path." A user starting with M1 (Single track) can upgrade to V11 (Double track) easily, but integrating V15 requires planning for the *length* of the station, as the widening geometry consumes linear space (using \#6 turnouts and R718 curves as offsets).

## **7\. Comparative Analysis: Physical vs. Digital Logistics**

The user query references simulation games like *Factorio*, *Transport Tycoon*, and *Mini Metro*. Analyzing Kato parts through this lens provides unique insights for the "interactive" aspect of the library, bridging the gap between physical modeling and systems gaming.

### **7.1. The "Main Bus" Concept vs. Track Spacing**

In *Factorio*, a "Main Bus" is a dense parallel array of conveyor belts designed for high throughput and expandability.38 In the Kato Unitrack ecosystem, this is physically replicated by the **33mm parallel spacing**.

* **Digital:** In games, space is often infinite or low-cost. Belts can weave ("spaghetti") effortlessly.  
* **Physical:** Space is the ultimate constraint (limited by table size). The 33mm spacing is engineered to maximize density while preventing collision on curves (overhang). The "V3 Rail Yard" set is the physical embodiment of a "buffered output" in simulation terms—a place to store rolling stock (items) until needed.  
* **Psychology:** Players of *Factorio* often struggle with "rebuilding anxiety".39 Unitrack's snap-together modularity mitigates this in the physical world; unlike flex-track which is destructive to move (glued ballast), Unitrack allows for "refactoring" of the layout, appealing to the same iterative design psychology found in *Satisfactory* or *Unrailed\!*.40

### **7.2. "Signal Logic" vs. "Chain Signals"**

* **Factorio/OpenTTD:** Signals are "smart." A Chain Signal reads the state of the *next* block and the pathing logic of the train to prevent gridlock.41  
* **Kato 20-605 Signal:** It is "dumb." It is a timer. It does not know if the next block is free; it only knows "a train passed me 3 seconds ago."  
  * *Implication:* In a physical layout, "deadlocks" (gridlock) must be prevented by the human operator (the dispatcher) or by complex PC-based automation (JMRI software) connected via DCC block detectors. The Kato signal is purely cosmetic ("Eye Candy"), whereas in *Transport Tycoon*, signals are functional safety devices that prevent crashes. This difference is crucial for users expecting video-game logic in physical models.

### **7.3. "Chaos Management" (Unrailed\! vs. Layout Operations)**

* **Unrailed\!:** Gameplay focuses on resource scarcity and the panic of track building ahead of a moving train.42  
* **Kato Operations:** The "panic" in physical modeling comes from **Derailments**.  
  * *Risk Factor:* The \#4 turnout is the "chaos element." Its sharp diverging angle is the most common cause of operational failure (derailment), similar to a track placement error in *Unrailed\!*.4  
  * *Mitigation:* Using \#6 turnouts (higher cost, more space) decreases "chaos" and increases system stability, akin to upgrading tools/engines in a game to reduce difficulty. This mirrors the "tech tree" progression in strategy games.

## **8\. Detailed Part Library Data Specifications**

For the construction of the parts library, the following data fields are required for each entry to ensure compatibility with simulation logic and physical planning.

### **8.1. Data Fields**

* **SKU:** (e.g., 20-000)  
* **Type:** (Straight, Curve, Turnout, Crossing, Accessory)  
* **Length/Radius:** (mm)  
* **Angle:** (Degrees, if curve/turnout)  
* **Material:** (Wood Tie, Concrete Tie, Slab, Viaduct)  
* **Connection Type:** (UniJoiner A / B \- usually symmetric, but some viaduct pieces have orientation)  
* **Electrical Feature:** (Power Routing / Non-Power Routing / Insulated / Fed)

### **8.2. Sample Data Set**

| SKU | Type | Dimensions | Operational Notes & Logic |
| :---- | :---- | :---- | :---- |
| **20-000** | Straight | L: 248mm | Standard ground level, wood ties. Base grid unit. |
| **20-041** | Feeder | L: 62mm | Includes wire harness. Usage: Power injection node. |
| **20-150** | Curve | R: 718mm, A: 15° | "Curve 718". Matches \#6 turnout diverging geometry for parallel track (49.5mm center). |
| **20-160** | Curve | R: 481mm, A: 15° | "Curve 481". Matches \#4 turnout diverging geometry. |
| **20-202** | Turnout | L: 186mm, R: 718mm | \#6 Left. Electric. Screw-selectable power routing. High reliability for long wheelbases. |
| **20-220** | Turnout | L: 126mm, R: 481mm | \#4 Left. Electric. **Warning:** 126mm length requires 64mm+62mm compensation to match 248mm grid. |
| **20-400** | Viaduct | L: 248mm | Single track viaduct. Requires piers (23-015). Aesthetic variant. |
| **20-874** | Set | V15 | Double track station widening set. 33mm \-\> 49.5mm transition logic. |
| **20-652-1** | Accessory | 124mm (Base) | Auto Crossing Gate. Requires 2x 62mm sensor tracks. Unidirectional IR logic. |

## **9\. Conclusion**

The Kato Unitrack system offers a sophisticated blend of rigid standardization and modular flexibility. For the purposes of a parts library, treating the track pieces not just as static geometry but as functional logic gates (in the case of turnouts and signals) is essential. The distinction between "cosmetic simulation" (3-color signals) and "operational physics" (superelevation, turnout radii) defines the user experience.

By acknowledging specific engineering constraints—such as the **126mm** length of the \#4 turnout, the **easement** requirements of superelevated curves, and the **scale ratio** discrepancies of rolling stock—the library can prevent common user errors (misalignment, S-curve derailments). Furthermore, integrating the locomotive data allows for "compatibility checks" (e.g., flagging that a Big Boy cannot run on R216mm curves), thereby elevating the library from a simple catalog to an intelligent design tool. This holistic approach bridges the gap between the "toy" aspect of model trains and the rigorous "simulation" aspect of transport logistics, offering a depth of engagement that rivals complex strategy games.

#### **Works cited**

1. Kato\_N\_HO\_Track\_Catalog.pdf \- Gaugemaster, accessed January 4, 2026, [https://www.gaugemasterretail.com/media/downloads/Kato\_N\_HO\_Track\_Catalog.pdf](https://www.gaugemasterretail.com/media/downloads/Kato_N_HO_Track_Catalog.pdf)  
2. N 3-Color Automatic Signal – USA (1 ea), accessed January 4, 2026, [https://store.katousa.com/product/product-176/](https://store.katousa.com/product/product-176/)  
3. Determining the “Track Centers” between lines using the ... \- Kato USA, accessed January 4, 2026, [https://katousa.com/wp-content/uploads/2022/06/N-plan-6-turnouts-1.pdf](https://katousa.com/wp-content/uploads/2022/06/N-plan-6-turnouts-1.pdf)  
4. What You Need to Know About Kato Unitrack Turnouts \- TrainWeb.org, accessed January 4, 2026, [http://www.trainweb.org/nrmrc/pubs/AppNote%20Unitrack%20Turnouts.pdf](http://www.trainweb.org/nrmrc/pubs/AppNote%20Unitrack%20Turnouts.pdf)  
5. N 15deg Crossing \- Kato USA, accessed January 4, 2026, [https://katousa.com/wp-content/uploads/2021/11/N-plan-15-crossings.pdf](https://katousa.com/wp-content/uploads/2021/11/N-plan-15-crossings.pdf)  
6. Mainline Modules \- T-Trak Handbook, accessed January 4, 2026, [https://t-trakcincy.com/TTrak.030000000/TTrak.030000000.htm?](https://t-trakcincy.com/TTrak.030000000/TTrak.030000000.htm)  
7. KATO N Scale Unitrack Track \- TrainWorld, accessed January 4, 2026, [https://www.trainworld.com/model-train-track/kato-n-scale-unitrack-track.html](https://www.trainworld.com/model-train-track/kato-n-scale-unitrack-track.html)  
8. Kato 20-220 \- \#4 Left Turnout with 481mm (19") Radius Curve \- N Scale, accessed January 4, 2026, [https://midwestmodelrr.com/kat20-220/](https://midwestmodelrr.com/kat20-220/)  
9. Download N Tracklist \- Kato USA, accessed January 4, 2026, [https://katousa.com/wp-content/uploads/2021/03/Download-N-Tracklist.pdf](https://katousa.com/wp-content/uploads/2021/03/Download-N-Tracklist.pdf)  
10. Making Kato Unitrack Curves Using Multiple Sizes | N Scale Model Trains, accessed January 4, 2026, [https://www.fiferhobby.com/making-kato-unitrack-curves-using-multiple-sizes-2/](https://www.fiferhobby.com/making-kato-unitrack-curves-using-multiple-sizes-2/)  
11. Kato N Scale Union Pacific FEF-3 4-8-4 UP \#844 Steam Locomotive \- eBay, accessed January 4, 2026, [https://www.ebay.com/itm/116721319972](https://www.ebay.com/itm/116721319972)  
12. N UP FEF-3 \#844 (Excursion Version) \- Kato USA Online Store, accessed January 4, 2026, [https://store.katousa.com/product/n-up-fef-3-844-excursion-version/](https://store.katousa.com/product/n-up-fef-3-844-excursion-version/)  
13. HO & N Track Catalog | KATO USA, accessed January 4, 2026, [https://katousa.com/wp-content/uploads/2023/12/Unitrack-Catalog-final.pdf](https://katousa.com/wp-content/uploads/2023/12/Unitrack-Catalog-final.pdf)  
14. How change Kato turnout \#6 to a curve? : r/modeltrains \- Reddit, accessed January 4, 2026, [https://www.reddit.com/r/modeltrains/comments/1h7i4q8/how\_change\_kato\_turnout\_6\_to\_a\_curve/](https://www.reddit.com/r/modeltrains/comments/1h7i4q8/how_change_kato_turnout_6_to_a_curve/)  
15. Kato N 20181 Unitrack Concrete Tie Double Super-Elevated 15"/19" Radiu, accessed January 4, 2026, [https://modeltrainstuff.com/products/kato-n-20181-unitrack-concrete-tie-double-super-elevated-15-19-radius-45-degree-curved-track-2](https://modeltrainstuff.com/products/kato-n-20181-unitrack-concrete-tie-double-super-elevated-15-19-radius-45-degree-curved-track-2)  
16. Kato 20-188 \- Concrete Slab Double Track Superelevated Easement Curve 19"/15" \- N Scale \- Midwest Model Railroad, accessed January 4, 2026, [https://midwestmodelrr.com/kat20-188/](https://midwestmodelrr.com/kat20-188/)  
17. accessed January 4, 2026, [https://trains.ix23.com/kato-unitrack-4-turnout-geometry/\#:\~:text=The%20straight%20segment%20of%20the,the%20124%20mm%20straight%20piece.](https://trains.ix23.com/kato-unitrack-4-turnout-geometry/#:~:text=The%20straight%20segment%20of%20the,the%20124%20mm%20straight%20piece.)  
18. Kato Unitrack \#4 Turnout Geometry \- Chuck's Train Blog, accessed January 4, 2026, [https://trains.ix23.com/kato-unitrack-4-turnout-geometry/](https://trains.ix23.com/kato-unitrack-4-turnout-geometry/)  
19. 20-652-1 North American Style Automatic Crossing Gate \- KATO USA, accessed January 4, 2026, [https://www.dev3.katousa.com/PDF/20-652-1.EManual.pdf](https://www.dev3.katousa.com/PDF/20-652-1.EManual.pdf)  
20. KATO 20-652 extend a Automatic Crossing Gate detection track \- JNS Forum, accessed January 4, 2026, [https://jnsforum.com/community/topic/13735-kato-20-652-extend-a-automatic-crossing-gate-detection-track/](https://jnsforum.com/community/topic/13735-kato-20-652-extend-a-automatic-crossing-gate-detection-track/)  
21. 20-605 Automatic 3 Colour Signal \- Train Trax UK, accessed January 4, 2026, [https://traintrax.co.uk/20605-automatic-colour-signal-p-254.html](https://traintrax.co.uk/20605-automatic-colour-signal-p-254.html)  
22. DC Signals I: Kato | Electrical, DC \- Sumida Crossing, accessed January 4, 2026, [http://www.sumidacrossing.org/Musings/files/110627\_DC\_Signals\_I\_Kato.php](http://www.sumidacrossing.org/Musings/files/110627_DC_Signals_I_Kato.php)  
23. Kato 20-605-1 N 3 COLOR AUTO SIGNAL \- Crazy Model Trains, accessed January 4, 2026, [https://crazymodeltrains.com/kato-20-605-n-scale-124-mm-4-7-8-automatic-3-color-signal-straight-unitrack/](https://crazymodeltrains.com/kato-20-605-n-scale-124-mm-4-7-8-automatic-3-color-signal-straight-unitrack/)  
24. KATO N Gauge E5 Hayabusa Shinkansen 4-Car Set, DCC Friendly, New | eBay, accessed January 4, 2026, [https://www.ebay.com/itm/127225119213](https://www.ebay.com/itm/127225119213)  
25. N scale \- Wikipedia, accessed January 4, 2026, [https://en.wikipedia.org/wiki/N\_scale](https://en.wikipedia.org/wiki/N_scale)  
26. Kato locomotive scale? : r/modeltrains \- Reddit, accessed January 4, 2026, [https://www.reddit.com/r/modeltrains/comments/1htub36/kato\_locomotive\_scale/](https://www.reddit.com/r/modeltrains/comments/1htub36/kato_locomotive_scale/)  
27. JR E5 Series Shinkansen Hayabusa 3 Car Add on Set-Kato-10-1664 | Gaugemaster, accessed January 4, 2026, [https://www.gaugemasterretail.com/kato-k10-1664.html](https://www.gaugemasterretail.com/kato-k10-1664.html)  
28. Train length information? \- Rolling Stock \- JNS Forum, accessed January 4, 2026, [https://jnsforum.com/community/topic/17706-train-length-information/](https://jnsforum.com/community/topic/17706-train-length-information/)  
29. Kato N700 Shinkansen model review | JMTN blog \- WordPress.com, accessed January 4, 2026, [https://jmtn.wordpress.com/2007/12/22/kato-n700-shinkansen-model-review/](https://jmtn.wordpress.com/2007/12/22/kato-n700-shinkansen-model-review/)  
30. N SD70ACe UP \#8497 \- Kato USA Online Store, accessed January 4, 2026, [https://store.katousa.com/product/n-sd70ace-up-8497/](https://store.katousa.com/product/n-sd70ace-up-8497/)  
31. Kato 176-8528, N Scale EMD SD70ACe, Std. DC, UP 8962 \- Tony's Train Exchange, accessed January 4, 2026, [https://tonystrains.com/product/kato-176-8528-n-scale-emd-sd70ace-std-dc-up-8962](https://tonystrains.com/product/kato-176-8528-n-scale-emd-sd70ace-std-dc-up-8962)  
32. N Scale Amtrak P42 Locomotive Set Kato Product Review \- YouTube, accessed January 4, 2026, [https://www.youtube.com/watch?v=SNdE9fqYDmk](https://www.youtube.com/watch?v=SNdE9fqYDmk)  
33. UniJoiner \- Kato USA, accessed January 4, 2026, [https://katousa.com/wp-content/uploads/2021/06/HOtrack.pdf](https://katousa.com/wp-content/uploads/2021/06/HOtrack.pdf)  
34. Kato N/HO Unitrack 24-818 Terminal UniJoiner 35" long \- 1 pair, accessed January 4, 2026, [https://lombardhobby.com/kato-n-ho-unitrack-24-818-terminal-unijoiner-35-long-1-pair/](https://lombardhobby.com/kato-n-ho-unitrack-24-818-terminal-unijoiner-35-long-1-pair/)  
35. Kato \#4 Turnout Problem \- Track Systems \- JNS Forum, accessed January 4, 2026, [https://jnsforum.com/community/topic/20311-kato-4-turnout-problem/](https://jnsforum.com/community/topic/20311-kato-4-turnout-problem/)  
36. DCC, DC, or Dead Rail? : r/modeltrains \- Reddit, accessed January 4, 2026, [https://www.reddit.com/r/modeltrains/comments/1kcpi0z/dcc\_dc\_or\_dead\_rail/](https://www.reddit.com/r/modeltrains/comments/1kcpi0z/dcc_dc_or_dead_rail/)  
37. N Master and variation series Track Sets \- Kato USA, accessed January 4, 2026, [https://katousa.com/n-unitrack-mastervar-2/](https://katousa.com/n-unitrack-mastervar-2/)  
38. Very cool and also pretty expected results tbh. Some thoughts: Factorio is a gam... | Hacker News, accessed January 4, 2026, [https://news.ycombinator.com/item?id=43332084](https://news.ycombinator.com/item?id=43332084)  
39. Getting annoyed of rebuilding again and again : r/SatisfactoryGame \- Reddit, accessed January 4, 2026, [https://www.reddit.com/r/SatisfactoryGame/comments/1oueqij/getting\_annoyed\_of\_rebuilding\_again\_and\_again/](https://www.reddit.com/r/SatisfactoryGame/comments/1oueqij/getting_annoyed_of_rebuilding_again_and_again/)  
40. Unrailed 2: Back on Track\!, accessed January 4, 2026, [https://unrailed-game.com/](https://unrailed-game.com/)  
41. Can someone explain why I as a veteran TTD/OPENTTD player just can't get hooked to this game? :: Transport Fever 2 General Discussions \- Steam Community, accessed January 4, 2026, [https://steamcommunity.com/app/1066780/discussions/0/4210371957564593654/](https://steamcommunity.com/app/1066780/discussions/0/4210371957564593654/)  
42. Save 85% on Unrailed\! on Steam, accessed January 4, 2026, [https://store.steampowered.com/app/1016920/Unrailed/](https://store.steampowered.com/app/1016920/Unrailed/)  
43. Unrailed\! Review \- Putting the “Loco” in Locomotive \- COGconnected, accessed January 4, 2026, [https://cogconnected.com/review/unrailed-review-putting-the-loco-in-locomotive/](https://cogconnected.com/review/unrailed-review-putting-the-loco-in-locomotive/)