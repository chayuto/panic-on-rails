# **Architectural Specification for Extensible Railway Simulation Systems: Geometric Integration, Mathematical Modeling, and Federated Plugin Ecosystems**

## **1\. Executive Summary**

The digital simulation of model railway logistics represents a unique convergence of constraint-based engineering, computational geometry, and user-centric design. The *PanicOnRails* project, envisioned as a browser-based planner utilizing the modern React 19 stack, faces the non-trivial challenge of unifying a fragmented landscape of physical track standards into a cohesive digital substrate. Unlike generic CAD tools, a dedicated railway planner must enforce strict compatibility rules—simulating the "snap-together" mechanics of physical parts—while simultaneously accommodating the distinct geometric philosophies of manufacturers ranging from the precision engineering of Japanese N-scale to the loose tolerances of wooden toy railways.

This comprehensive research report provides the architectural blueprint for extending the *PanicOnRails* part catalog. It synthesizes data from technical specifications of major track systems—including Tomix, Peco, Atlas, Fleischmann, Märklin, and LEGO—and proposes a mathematically rigorous framework for defining track geometry. Furthermore, it outlines a distributed extension mechanism leveraging Module Federation and runtime schema validation, enabling the platform to scale indefinitely without accruing technical debt in the core codebase.

The analysis reveals that the primary obstacle to extension is not merely data entry, but the resolution of geometric dissonance between systems. For instance, the "straight" turnouts of Atlas Code 55 require fundamentally different pathing logic than the continuous-curve turnouts of Peco Streamline. Similarly, the handling of "flex track" requires a shift from static mesh definitions to parametric curve generation using Bézier or Cornu spiral algorithms. By decoupling the geometric definition from the rendering implementation, *PanicOnRails* can support advanced track types such as helices, turntables, and scissor crossings within a unified interface.

## ---

**2\. Theoretical Framework of Digital Track Geometry**

The foundational requirement for any scalable railway planner is a robust mathematical model that abstracts physical track pieces into manipulatable data structures. This section defines the coordinate systems, vector mathematics, and mating logic required to simulate the "LEGO-style" connectivity in a React-Konva environment.

### **2.1 The Facade Mating Mechanism: A Vector-Based Approach**

The "facade mating mechanism" is the digital equivalent of the physical rail joiner. In the *PanicOnRails* architecture, a track part is treated as a rigid body possessing one or more "ports" or facades.

#### **2.1.1 Facade Definition**

A facade $F$ is defined not merely by its position, but by its orientation and compatibility attributes. Mathematically, a facade in a 2D plane (assuming flat track for simplicity, though the data structure supports 3D) is a vector tuple:

$$F \= \\langle x, y, z, \\theta, \\text{type}, \\text{gender} \\rangle$$

* **Position ($x, y, z$):** The coordinate of the connection point relative to the part's origin. The $z$ coordinate is critical for simulating multi-level layouts, helices, and viaducts.1  
* **Heading ($\\theta$):** The tangent angle of the track at the connection point. For a valid connection between Facade A ($F\_A$) and Facade B ($F\_B$), the geometric constraint is that the positions must be effectively identical ($|P\_A \- P\_B| \< \\epsilon$) and the headings must be opposed ($|\\theta\_A \- \\theta\_B| \\approx \\pi$).  
* **Type & Gender:** These attributes enforce brand and mechanical compatibility. A "Male" dogbone connector from a Brio track cannot connect to a "Female" rail joiner of an Atlas track without an adapter.

#### **2.1.2 Snap Logic and Tolerance**

Rigid systems like **Kato Unitrack** or **Tomix Fine Track** have very low tolerances; the joiners force alignment. In contrast, **Wooden Railway** systems (Brio, Thomas, Lidl) rely on loose-fitting "dogbone" connectors that allow for significant angular play—often up to $\\pm 2^\\circ$ per joint.3 To simulate this, the mating mechanism must implement a tolerance parameter.

* **Rigid Snap:** $\\epsilon\_{pos} \= 0.5mm$, $\\epsilon\_{ang} \= 0.5^\\circ$.  
* **Loose Snap:** $\\epsilon\_{pos} \= 2.0mm$, $\\epsilon\_{ang} \= 3.0^\\circ$.

This "fuzzy snap" capability is essential for closing loops in wooden track layouts, where the geometry is often solved by forcing pieces together, a behavior that must be replicated digitally to feel "real" to the user.

### **2.2 Mathematical Representation of Track Segments**

To support the diverse catalogs identified in the research, the system must support four distinct geometric primitives.

#### **2.2.1 Linear Segments**

The simplest form, defined by length $L$.

$$P(t) \= P\_{start} \+ t \\cdot \\vec{v}, \\quad t \\in \[0, L\]$$

where $\\vec{v}$ is the unit vector of the track heading.

#### **2.2.2 Constant Curvature Arcs**

Defined by Radius $R$ and Sweep Angle $\\alpha$. This is the standard for sectional track (e.g., Tomix C280-45).

* **Chord Length ($C$):** $2R \\sin(\\alpha/2)$.  
* Sagitta ($S$): $R(1 \- \\cos(\\alpha/2))$.  
  The endpoint calculation is derived via rotation matrices applied to the local coordinate system of the part.

#### **2.2.3 Parametric Curves (Bézier Implementation)**

For **Flex Track** and complex turnout geometries (like the "easement" curves found in high-speed switches), circular arcs are insufficient. The Peco Streamline and Atlas Custom Line series require **Cubic Bézier Curves** to model the variable curvature of switch blades.5

A cubic Bézier curve is defined by four control points: $P\_0, P\_1, P\_2, P\_3$.  
$$B(t) \= (1-t)^3 P\_0 \+ 3(1-t)^2 t P\_1 \+ 3(1-t) t^2 P\_2 \+ t^3 P\_3, \\quad t \\in $$  
For a railway turnout diverging at angle $\\phi$ with a lead length $L$:

1. $P\_0$ is the switch toe (origin).  
2. $P\_3$ is the frog point.  
3. $P\_1$ lies on the tangent of the stock rail (straight).  
4. $P\_2$ lies on the tangent of the diverging angle $\\phi$ projecting backward from the frog.

The lengths of the control handles ($|P\_0 P\_1|$ and $|P\_2 P\_3|$) determine the "sharpness" of the turnout entry. Research into computer graphics applications for splines suggests that setting these handle lengths to approximately $1/3$ of the arc length provides a curvature approximation close enough for visual simulation.6

#### **2.2.4 Transition Curves (Euler Spirals)**

While not strictly required for toy trains, prototypical planning (Peco Code 55\) benefits from **Cornu Spirals** (Clothoids), where curvature $\\kappa$ varies linearly with arc length $s$: $\\kappa(s) \\propto s$. This prevents the "lurch" seen when a train enters a circular curve directly from a tangent. Implementing this in *PanicOnRails* involves numerically integrating the Fresnel integrals, or approximating them with piecewise cubic Béziers for performance in the React render loop.8

### **2.3 Advanced Geometry: Verticality and Helices**

Track planning is three-dimensional. A **Helix** is a stack of circular curves with a vertical offset.

* **Grade Calculation:** $Grade (\\%) \= \\frac{\\text{Rise}}{\\text{Run}} \\times 100$.  
* **Run per Turn:** $2 \\pi R$.  
* **Clearance:** Essential for N scale is approx 2 inches ($50mm$). Thus, a single turn of a helix must gain $50mm$.  
  * For a 2% grade (maximum for realistic operation), the required run is $2500mm$.  
  * Required Radius: $R \= \\frac{2500}{2\\pi} \\approx 398mm$.  
  * This implies that radii smaller than Tomix C391 or Peco R3 cannot support a functional helix at realistic grades.1

The *PanicOnRails* engine must support a grade property on tracks, propagating the $z$-height change to the connected facade.

## ---

**3\. Comprehensive Track Brand Analysis**

This section details the specific geometric parameters for the requested brands, normalizing the data into a format ready for catalog ingestion.

### **3.1 N Scale (1:160): The High-Fidelity Ecosystem**

N scale offers the widest variety of geometries, often with subtle incompatibilities that the software must manage.

#### **3.1.1 Tomix Fine Track**

**System Overview:** Tomix uses a grid-based geometry centered on $140mm$ lengths and $37mm$ track centers.9 The integrated ballast bed is $18.5mm$ wide.

**Geometry Specifications:**

* **Standard Straight:** $280mm$ (Base). Sub-segments: $140mm$, $72.5mm$, $99mm$.  
* **Curve Logic:** Radii are spaced by $37mm$ to allow perfectly parallel nested loops.  
  * *Standard:* C280 ($45^\\circ, 15^\\circ$), C317, C354, C391.  
  * *Mini-Rail:* C140, C177 ($30^\\circ, 60^\\circ$).  
  * *Super-Mini:* C103.  
* **Turnout Geometry:** The standard turnout is $140mm$ long. The diverging route is a curve of radius $541mm$ sweeping $15^\\circ$.  
  * *Implication:* To return to a parallel siding at $37mm$ spacing, a C541-15 curve must be attached to the diverging leg. This creates a mathematically perfect parallel track.9  
* **Special Parts:**  
  * **3-Way Turnout:** Diverges left and right.  
  * **Double Slip:** $140mm$ length, matches standard geometry.  
  * **Turntable (N-AT212-15):** The turntable has a diameter of $212mm$ with tracks indexing at $15^\\circ$ intervals. The logic for this part requires a "Parent-Child" relationship in the software, where the bridge rotates and snaps to fixed perimeter ports.11

#### **3.1.2 Peco N Scale (Code 80 & Code 55\)**

Peco dominates the UK/European market with two distinct lines that are technically compatible but geometrically divergent.

Setrack (Code 80):  
Designed for rigid, "train set" geometry.

* **Radii:** R1 ($228mm$), R2 ($263.5mm$), R3 ($298.5mm$), R4 ($333.4mm$). Note the spacing is $\\approx 35mm$, slightly tighter than Tomix.12  
* **Turnouts (ST-5/ST-6):** These use a sharp $228mm$ radius and a $22.5^\\circ$ angle. This allows them to substitute directly for a standard curve section.14

Streamline (Code 55 & 80):  
Designed for realistic, flowing trackwork. Crucial Distinction: Code 55 geometry differs from Code 80 geometry.

* **Code 55 Turnouts:** Standardized on a $10^\\circ$ frog angle.  
  * Small (SL-E391F): Radius $305mm$, Angle $10^\\circ$, Length $123mm$.16  
  * Medium (SL-E395F): Radius $457mm$, Angle $10^\\circ$, Length $137mm$.17  
  * Large (SL-E388F): Radius $914mm$, Angle $10^\\circ$, Length $164mm$.18  
* **Code 80 Turnouts:** Use varying angles ($8^\\circ \- 14^\\circ$).  
  * Medium (SL-395): Radius $457mm$, Angle $14^\\circ$.19  
  * Large (SL-388): Radius $914mm$, Angle $8^\\circ$.21  
* **Advanced Components:**  
  * **Scissors Crossing (SL-E383F):** A massive assembly comprising four turnouts and a diamond. Length $271mm$, track centers fixed at $27mm$. This fixed spacing ($27mm$) is narrower than the Setrack standard, requiring care in planning.22  
  * **Double Slip (SL-390F):** Length $154mm$, Angle $10^\\circ$.24

#### **3.1.3 Atlas N Scale**

The standard for North American modeling.

* **Code 80 (Snap-Track):**  
  * Standard Turnout (\#4): Angle $14.25^\\circ$. Note this is sharper than a true \#4.26  
  * \#6 Turnout: Angle $9.53^\\circ$.  
  * Radii: Defined in inches ($9.75"$, $11"$, $19"$).27  
* **Code 55 (Custom Line):**  
  * \#5 Turnout: Closure radius approx $13.75"$.  
  * \#7 Turnout: Closure radius approx $25.75"$.  
  * \#10 Turnout: Closure radius approx $62"$.  
  * *Note:* Unlike Peco, Atlas Code 55 turnouts are "straight" turnouts. The diverging leg becomes straight after the frog. This requires specific "Assistant" curves to return to parallel.28

#### **3.1.4 Fleischmann N (Piccolo)**

* **Grid:** Based on $111mm$ length.  
* **Geometry:**  
  * R1: $192mm$ ($45^\\circ$).  
  * R2: $225.6mm$ ($45^\\circ$).  
  * Turnouts: $111mm$ length, matching the straight grid. This makes Fleischmann one of the easiest systems to calculate geometry for, as turnouts replace standard straights without length compensation.29

### **3.2 Z Scale (1:220) \- Märklin**

Märklin Z is the progenitor of the scale and dictates the standard.

* **Module Length:** $110mm$.  
* **Track Spacing:** $25mm$.31  
* **Radii:**  
  * R1: $145mm$ ($45^\\circ, 30^\\circ$).  
  * R2: $195mm$.  
  * R3: $220mm$.  
* **Turnouts:** Length $110mm$, Frog Angle $13^\\circ$.32  
* **Double Slip (8560):** A critical space-saver in Z scale, maintaining the $110mm$ length grid.31

### **3.3 Toy & Large Scale Systems**

#### **3.3.1 LEGO Train Track (RC/Power Functions)**

LEGO uses a distinct geometry based on "studs" ($1 \\text{ stud} \= 8mm$).

* **Gauge:** $\\approx 38mm$ inside rails.  
* **Standard Curve (R40):** The only official radius for decades. Radius is 40 studs ($320mm$). A circle takes 16 segments ($22.5^\\circ$ each).33  
* **Straights:** 16 studs ($128mm$).  
* **Flex Track:** Segments of 4 studs ($32mm$) linked by ball joints. This allows for variable radii and must be modeled as a chain of short, constrained segments.35  
* **Turnouts:** Diverge at $22.5^\\circ$ but are geometrically complex offset S-bends designed to create parallel tracks at 8-stud ($64mm$) centers.  
* **Third-Party (TrixBrix/BrickTracks):** To fix the limitation of R40, the community developed R56 ($448mm$), R72 ($576mm$), R88, and R104. These are nested in 16-stud increments.36

#### **3.3.2 Wooden Railway (Brio/Thomas/Hape/Lidl)**

A standardized but loose system.

* **Track Width:** $40mm$. (Thomas Wood sometimes $42mm$, creating friction issues).38  
* **Connectors:** "Dogbone" jigsaw.  
* **Lengths:**  
  * Mini: $54mm$.  
  * Short: $108mm$.  
  * Medium: $144mm$.  
  * Long: $216mm$.  
* **Curves:**  
  * Short (E1): Radius $\\approx 90mm$.  
  * Long (E): Radius $\\approx 182mm$.3  
* **Compatibility:** Brio, IKEA (Lillabo), and Lidl (Playtive) are mechanically compatible. The *PanicOnRails* system must classify these as a single "Wooden Universal" family with a high snap tolerance.39

#### **3.3.3 Disney Monorail**

* **Scale:** $\\approx 1:48$ (O Scale).  
* **Geometry:**  
  * Curve Radius: $\\approx 25"$ (derived from layout dimensions).  
  * A typical oval is $61.5" \\times 49"$.  
  * Third-party tracks (DJRV) offer tighter $22"$ radii for double-tracking.41

## ---

**4\. Connector Compatibility & Adapter Logic**

The power of a digital planner lies in its ability to simulate valid connections. *PanicOnRails* requires a **Compatibility Matrix**.

### **4.1 Connector Types**

1. **Rail Joiner (Standard):** Used by Atlas, Peco, Märklin. Compatibility is determined by **Rail Code** (height in thousandths of an inch).  
   * *Rule:* Code 80 connects to Code 80\.  
   * *Exception:* Code 80 connects to Code 55 *only* if a transition joiner is used or if the underlying track base aligns the railheads (as in Peco's design).  
2. **Unijoiner (Kato):** Proprietary clip. Compatible only with Kato unless a specific conversion track (Kato 20-045) is used.  
3. **FineTrack Joiner (Tomix):** Proprietary "Click" system. Visually distinct but mechanically similar to Rail Joiners.  
4. **Dogbone (Wooden):** Universal gendered (Male/Female). Adapters exist for Male-Male and Female-Female.  
5. **Stud Plate (LEGO):** Vertical connection. Tracks connect implicitly by attaching to the baseplate grid.

### **4.2 The Adapter Data Structure**

The catalog must define explicit adapter parts that bridge two systems.

* **Example:** Atlas 2590 (Code 80 to Code 65 Transition).43  
* **Example:** Disney Monorail "Double Track Adapter" (allows two beams on one support).44

**Proposed Data Schema for Adapters:**

TypeScript

{  
  "partId": "ATL-2590",  
  "name": "Code 80 to 65 Transition",  
  "length": 62.0, // mm  
  "facades":  
}

## ---

**5\. Geometric Data Structures: Lessons from Legacy Systems**

To ensure *PanicOnRails* surpasses existing tools, we analyzed the data structures of market leaders.

### **5.1 XTrackCAD (.xtp Format)**

XTrackCAD uses a procedural definition file.

* **Straight:** S \<color\> \<width\> \<x1\> \<y1\> \<x2\> \<y2\>  
* **Turnout:** Defined as a collection of paths (P). P "Normal" 1 2 implies the straight path uses segments 1 and 2\.  
* **Insight:** XTrackCAD breaks turnouts into constituent rails. This is highly accurate but computationally expensive for a web app. *PanicOnRails* should simplify this to "Paths" defined by entry/exit vectors, rendering the internal details visually but abstracting the collision logic.45

### **5.2 SCARM and AnyRail (.lib)**

These systems use library files that group tracks by manufacturer.

* **Key Feature:** They handle "Flex Track" by allowing the user to define a path, which the software then validates against a minimum radius.  
* **Insight:** *PanicOnRails* must implement a min\_radius constraint in its flex track logic to prevent users from drawing physically impossible curves (e.g., bending N scale flex track to a 4-inch radius).47

## ---

**6\. Real-World Reference Data Tables**

The following tables normalize the scattered research data into a format directly usable for database population.

### **Table 1: N Scale Turnout Geometry Comparison**

| Brand | Series | Part | Type | Length (mm) | Radius (mm) | Angle (deg) | Notes |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Peco** | Setrack | ST-5 | RH Turnout | 87.0 | 228.0 | 22.5 | Dead frog, matches R1 curve 14 |
| **Peco** | Streamline 80 | SL-395 | Med RH | 123.7 | 457.0 | 14.0 | Insulfrog 19 |
| **Peco** | Streamline 55 | SL-E395F | Med RH | 137.0 | 457.0 | 10.0 | Electrofrog, smoother angle 16 |
| **Peco** | Streamline 55 | SL-E388F | Lrg RH | 164.0 | 914.0 | 10.0 | Mainline geometry 18 |
| **Atlas** | Code 80 | 2704 | \#6 RH | \~156.0 | N/A | 9.53 | Straight divergence 26 |
| **Atlas** | Code 55 | 2052 | \#7 RH | \~180.0 | N/A | \~8.1 | Closure Radius 25.75" 28 |
| **Tomix** | FineTrack | 1243 | PR280-30 | 140.0 | 280.0 | 30.0 | Synthetic geometry 9 |
| **Fleischmann** | Piccolo | 9170 | LH Turnout | 111.0 | 430.0 | 15.0 | Integrated ballast 29 |

### **Table 2: Complex Crossing Specifications**

| Brand | Part ID | Type | Length (mm) | Angle (deg) | Radius (mm) | Track Centers (mm) | Notes |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Peco** | SL-390F | Double Slip | 154.0 | 10.0 | \~511 | N/A | Code 55 24 |
| **Peco** | SL-E383F | Scissors | 271.0 | 10.0 | 511 | 27.0 | Fixed geometry 22 |
| **Tomix** | 1240 | Wye | 140.0 | 15.0 | 280 | N/A | Electric 9 |
| **LEGO** | 60128 | Double Cross | 24 studs | 90 | N/A | 8 studs | 2007 version 35 |

### **Table 3: Wooden & Toy Geometry**

| System | Part | Length (mm) | Radius (mm) | Connection | Notes |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Brio** | Long Straight (D) | 216 | \- | Dogbone | Base unit 3 |
| **Brio** | Med Straight (A) | 144 | \- | Dogbone | 2/3 Base |
| **Brio** | Short Curve (E1) | \- | \~90 | Dogbone | 45 deg, 8 to circle 3 |
| **LEGO** | Standard Straight | 128 | \- | Studs | 16 studs |
| **LEGO** | Standard Curve | \- | 320 | Studs | R40 (40 studs) 33 |

## ---

**7\. Extension Mechanism: The Federated Plugin Architecture**

To allow the community to add these thousands of parts without requiring core application updates, *PanicOnRails* should adopt a **Federated Plugin Architecture**.

### **7.1 Architecture Overview**

Instead of a monolithic database, the application will load "Track Packs" at runtime.

* **Core:** Handles rendering, state (Zustand), and interaction logic.  
* **Plugins:** JSON manifests hosting geometry data and assets (SVG/GLTF).

### **7.2 Technology Stack**

* **Schema Validation:** **Zod**. External data is untrusted. Zod ensures that a loaded plugin conforms to the strict geometric types required by the engine, preventing runtime crashes due to missing radius or facade definitions.48  
* **Module Federation:** For complex parts that require custom code (e.g., a programmable turntable or a signal logic controller), Webpack Module Federation allows the host app to import React components from a remote build at runtime.49

### **7.3 The Data Schema (TypeScript/Zod)**

A rigorous schema is the backbone of this system.

TypeScript

// Zod Schema Definition for a Track Part  
import { z } from "zod";

const FacadeSchema \= z.object({  
  id: z.string(),  
  x: z.number(),  
  y: z.number(),  
  angle: z.number(), // degrees  
  type: z.enum(\["rail\_joiner", "unijoiner", "dogbone", "stud"\]),  
  gender: z.enum(\["male", "female", "neutral"\]).optional()  
});

const TrackPartSchema \= z.object({  
  id: z.string(),  
  brand: z.string(),  
  sku: z.string(),  
  geometry: z.discriminatedUnion("type", \[  
    z.object({ type: z.literal("straight"), length: z.number() }),  
    z.object({ type: z.literal("curve"), radius: z.number(), angle: z.number() }),  
    z.object({   
      type: z.literal("turnout"),   
      paths: z.array(z.object({  
        type: z.enum(\["main", "diverging"\]),  
        bezierControlPoints: z.tuple(\[  
            z.object({x: z.number(), y: z.number()}),   
            z.object({x: z.number(), y: z.number()})  
        \]).optional()   
      }))  
    })  
  \]),  
  facades: z.array(FacadeSchema)  
});

### **7.4 Implementation Strategy regarding React 19**

Using React 19's **Server Components** and **Suspense**, the application can asynchronously fetch these plugins. When a user selects "Peco Code 55" from the menu, the app triggers a dynamic import of the remote manifest. The TrackPartSchema.parse() method validates the data. If successful, the parts are injected into the Zustand store's catalog slice. If complex logic is required (e.g., a React component for a functional transfer table), Module Federation handles the code splitting and execution context.50

## ---

**8\. Conclusion**

The expansion of *PanicOnRails* into a universal railway planner is a feasible engineering challenge that requires moving beyond simple "radius and angle" definitions. By acknowledging the distinct geometric philosophies of manufacturers—from the grid-logic of Tomix to the flow-logic of Peco Streamline—and implementing them via a unified **Facade Mating Mechanism**, the system can achieve high-fidelity simulation.

The adoption of **Bézier curves** for turnout modeling and **Euler spirals** for transitions will elevate the tool from a toy planner to a serious layout design application. Furthermore, the **Federated Plugin Architecture** backed by **Zod validation** ensures that the ecosystem can grow organically, allowing community contributions for obscure brands like Hape or specific regional track systems without destabilizing the core platform.

**Final Recommendation:** Prioritize the implementation of the Zod-based schema and the vector-based facade engine. Once this "physics engine" is stable, treating Peco Code 55 and LEGO tracks as simply two different datasets within the same system becomes a trivial data entry task rather than a code refactoring nightmare.

#### **Works cited**

1. N scale track dimensions and specifications : r/modeltrains \- Reddit, accessed January 9, 2026, [https://www.reddit.com/r/modeltrains/comments/1iw7thg/n\_scale\_track\_dimensions\_and\_specifications/](https://www.reddit.com/r/modeltrains/comments/1iw7thg/n_scale_track_dimensions_and_specifications/)  
2. Ingenious N scale track plans for free\!, accessed January 9, 2026, [https://track-plans.net/n-scale/](https://track-plans.net/n-scale/)  
3. BRIO Track Guide, accessed January 9, 2026, [https://woodenrailway.info/track/brio-track-guide](https://woodenrailway.info/track/brio-track-guide)  
4. Third Party Track \- BRIO® Wooden Railway Guide, accessed January 9, 2026, [https://woodenrailway.info/track/third-party-track](https://woodenrailway.info/track/third-party-track)  
5. Bézier curve \- Wikipedia, accessed January 9, 2026, [https://en.wikipedia.org/wiki/B%C3%A9zier\_curve](https://en.wikipedia.org/wiki/B%C3%A9zier_curve)  
6. Bezier curve \- The Modern JavaScript Tutorial, accessed January 9, 2026, [https://javascript.info/bezier-curve](https://javascript.info/bezier-curve)  
7. Finding the Control Points of a Bezier Curve | \- HTML5 Gamer, accessed January 9, 2026, [https://blog.sklambert.com/finding-the-control-points-of-a-bezier-curve/](https://blog.sklambert.com/finding-the-control-points-of-a-bezier-curve/)  
8. Railway Transition Curves Curvature—Should It Be Smooth in the Extreme Points or Not, or Something Else? \- MDPI, accessed January 9, 2026, [https://www.mdpi.com/2076-3417/15/22/12066](https://www.mdpi.com/2076-3417/15/22/12066)  
9. Tomix Finetrack \- Sumida Crossing, accessed January 9, 2026, [http://www.sumidacrossing.org/ModelTrains/TrackandRoadbed/TomixFinetrack/](http://www.sumidacrossing.org/ModelTrains/TrackandRoadbed/TomixFinetrack/)  
10. Design of Tomix and Kato N-Gauge Sectional Track Systems \- TrainWeb.org, accessed January 9, 2026, [http://trainweb.org/tomix/track/tomix\_track\_systems.htm](http://trainweb.org/tomix/track/tomix_track_systems.htm)  
11. Tomix Track \- TrainWeb.org, accessed January 9, 2026, [http://trainweb.org/tomix/track/index.htm](http://trainweb.org/tomix/track/index.htm)  
12. PECO N Setrack ST-18 Radius 4 Standard curve \- Scale Model Scenery, accessed January 9, 2026, [https://www.scalemodelscenery.co.uk/peco-n-setrack-st-18-radius-4-standard-curve-20654-p.asp](https://www.scalemodelscenery.co.uk/peco-n-setrack-st-18-radius-4-standard-curve-20654-p.asp)  
13. ST-18 Standard Curve, 4th Radius \- PECO, accessed January 9, 2026, [https://peco-uk.com/products/standard-curve-4th-radius](https://peco-uk.com/products/standard-curve-4th-radius)  
14. accessed January 9, 2026, [https://peco-uk.com/products/turnout-1st-radius-right-hand-2\#:\~:text=Technical%20Specification%3A,Radius%3A%20228mm](https://peco-uk.com/products/turnout-1st-radius-right-hand-2#:~:text=Technical%20Specification%3A,Radius%3A%20228mm)  
15. ST-5 Turnout, 1st Radius, Right Hand \- PECO, accessed January 9, 2026, [https://peco-uk.com/products/turnout-1st-radius-right-hand-2](https://peco-uk.com/products/turnout-1st-radius-right-hand-2)  
16. PECO Streamline N 55 Turnout, Small Radius RH, Electrofrog \- DCC Hobby Supply, accessed January 9, 2026, [https://www.dcchobbysupply.com/product-page/peco-streamline-n-55-turnout-small-radius-rh-electrofrog](https://www.dcchobbysupply.com/product-page/peco-streamline-n-55-turnout-small-radius-rh-electrofrog)  
17. SL-E395 Turnout, Medium Radius, Right Hand \- PECO, accessed January 9, 2026, [https://peco-uk.com/products/turnout-medium-radius-right-hand13](https://peco-uk.com/products/turnout-medium-radius-right-hand13)  
18. SL-E388F Turnout, Large Radius, Right Hand \- PECO, accessed January 9, 2026, [https://peco-uk.com/products/turnout-large-radius-right-hand11](https://peco-uk.com/products/turnout-large-radius-right-hand11)  
19. accessed January 9, 2026, [https://peco-uk.com/products/turnout-medium-radius-right-hand3\#:\~:text=Technical%20Specification%3A,Radius%3A%20457mm](https://peco-uk.com/products/turnout-medium-radius-right-hand3#:~:text=Technical%20Specification%3A,Radius%3A%20457mm)  
20. PECO SL-395 N Code 80 RH Medium Radius Turnout \- Tony's Train Exchange, accessed January 9, 2026, [https://tonystrains.com/product/peco-sl-395-n-code-80-rh-medium-radius-turnout](https://tonystrains.com/product/peco-sl-395-n-code-80-rh-medium-radius-turnout)  
21. PECO N Streamline Turnout, Large Radius, Right Hand Electrofrog Code 80 (SLE388), accessed January 9, 2026, [https://www.hearnshobbies.com/products/peco-r-h-large-radius-1](https://www.hearnshobbies.com/products/peco-r-h-large-radius-1)  
22. accessed January 9, 2026, [https://peco-uk.com/products/scissors-crossing-medium-radius\#:\~:text=Technical%20Specification%3A,Radius%3A%20511mm](https://peco-uk.com/products/scissors-crossing-medium-radius#:~:text=Technical%20Specification%3A,Radius%3A%20511mm)  
23. PECO SL-E383F N Code 55 Electrofrog Medium Radius Double Crossover Turnout, accessed January 9, 2026, [https://tonystrains.com/product/peco-sl-e383f-n-code-55-electrofrog-medium-radius-double-crossover-turnout](https://tonystrains.com/product/peco-sl-e383f-n-code-55-electrofrog-medium-radius-double-crossover-turnout)  
24. accessed January 9, 2026, [https://midwestmodelrr.com/pcosl-390f/\#:\~:text=Length%20164mm(6%207%2F16in,36in)%20Crossing%20angle%2010%C2%B0.](https://midwestmodelrr.com/pcosl-390f/#:~:text=Length%20164mm\(6%207%2F16in,36in\)%20Crossing%20angle%2010%C2%B0.)  
25. Peco Streamline SL-390F N Scale Code 55 Insulfrog Double Slip Turnout | eBay, accessed January 9, 2026, [https://www.ebay.com/itm/256965334886](https://www.ebay.com/itm/256965334886)  
26. N Code 80 Track, accessed January 9, 2026, [http://www.princeton.edu/\~mae412/HANDOUTS/atlas-n-code80%20(1).pdf](http://www.princeton.edu/~mae412/HANDOUTS/atlas-n-code80%20\(1\).pdf)  
27. Atlas \~ N Scale \~ Code 80 \~ 9.75" Radius Curved Track (100 pcs) \~ 2514, accessed January 9, 2026, [https://ironplanethobbies.com/product/atlas-n-scale-code-80-9-75-radius-curved-track-100-pcs-2514](https://ironplanethobbies.com/product/atlas-n-scale-code-80-9-75-radius-curved-track-100-pcs-2514)  
28. Atlas N Code 55 Turnouts \- Trains.com Forums, accessed January 9, 2026, [https://forum.trains.com/t/atlas-n-code-55-turnouts/238814](https://forum.trains.com/t/atlas-n-code-55-turnouts/238814)  
29. Fleischmann N \- RR-Track, accessed January 9, 2026, [http://www.rrtrack.com/html/fleischmann\_n.html](http://www.rrtrack.com/html/fleischmann_n.html)  
30. Fleischmann N Railtracks \- Euro Model Trains, accessed January 9, 2026, [https://euromodeltrains.com/collections/fleischmann-n-railtracks](https://euromodeltrains.com/collections/fleischmann-n-railtracks)  
31. Marklin Z Scale Track Geometry \- Ajckids, accessed January 9, 2026, [https://ajckids.com/pages/marklin-z-scale-track-geometry](https://ajckids.com/pages/marklin-z-scale-track-geometry)  
32. accessed January 9, 2026, [https://www.eurorailhobbies.com/Marklin/8562\#:\~:text=Length%20110%20mm%20%2F%204%2D3,solenoid%20mechanisms%20and%20hand%20levers.](https://www.eurorailhobbies.com/Marklin/8562#:~:text=Length%20110%20mm%20%2F%204%2D3,solenoid%20mechanisms%20and%20hand%20levers.)  
33. accessed January 9, 2026, [https://www.dolfmeister.com/collections/lego/lego-train-track-geometry/\#:\~:text=The%20geometry%20is%20based%20on,with%20a%2040%20stud%20radius.](https://www.dolfmeister.com/collections/lego/lego-train-track-geometry/#:~:text=The%20geometry%20is%20based%20on,with%20a%2040%20stud%20radius.)  
34. Track Planning for LEGO® Trains, Part 2: Track Geometry and Tips & Tricks \- Monty's Trains, accessed January 9, 2026, [http://montystrains.net/workshop-blog/2018/2/22/track-planning-for-lego-trains-part-2-track-geometry-and-tips-tricks](http://montystrains.net/workshop-blog/2018/2/22/track-planning-for-lego-trains-part-2-track-geometry-and-tips-tricks)  
35. Track Geometry \- L-Gauge, accessed January 9, 2026, [http://l-gauge.org/wiki/index.php/Track\_Geometry](http://l-gauge.org/wiki/index.php/Track_Geometry)  
36. The straight, the curved and the pointy of LEGO-compatible train track \- transponderings, accessed January 9, 2026, [https://transponderings.blog/2024/05/03/the-straight-the-curved-and-the-pointy-of-lego-compatible-train-track/](https://transponderings.blog/2024/05/03/the-straight-the-curved-and-the-pointy-of-lego-compatible-train-track/)  
37. Track Planning for LEGO® Trains, Part 3: Custom Track Pieces \- Monty's Trains, accessed January 9, 2026, [http://montystrains.net/workshop-blog/2018/5/9/track-planning-for-lego-trains-part-3](http://montystrains.net/workshop-blog/2018/5/9/track-planning-for-lego-trains-part-3)  
38. Wooden Train Track X-crossing: Brio, Lillabo, Playtive Compatible \- Etsy, accessed January 9, 2026, [https://www.etsy.com/listing/1667975760/wooden-train-track-x-crossing-brio](https://www.etsy.com/listing/1667975760/wooden-train-track-x-crossing-brio)  
39. Straight 30/60/110/150/200 mm \- Brio/IKEA Wooden Train Track by timqui \- Printables.com, accessed January 9, 2026, [https://www.printables.com/model/86961-straight-3060110150200-mm-brioikea-wooden-train-tr](https://www.printables.com/model/86961-straight-3060110150200-mm-brioikea-wooden-train-tr)  
40. Are wooden train tracks, trains and sets compatible with each other? \- Wooden Railways, accessed January 9, 2026, [https://www.woodenrailways.co.uk/blog/are-wooden-train-tracks-trains-and-sets-compatible-with-each-other](https://www.woodenrailways.co.uk/blog/are-wooden-train-tracks-trains-and-sets-compatible-with-each-other)  
41. Walt Disney World Resort Monorail Play Set, accessed January 9, 2026, [https://www.disneystore.com/walt-disney-world-resort-monorail-play-set-417158586995.html](https://www.disneystore.com/walt-disney-world-resort-monorail-play-set-417158586995.html)  
42. 1/2 Length 22 deg curve Track for Disney Monorail Set \- eBay, accessed January 9, 2026, [https://www.ebay.com/itm/236018344380](https://www.ebay.com/itm/236018344380)  
43. N Scale Code 80 | Track | Model Trains | Midwest Model RR, accessed January 9, 2026, [https://midwestmodelrr.com/n-scale/n-scale-track-and-accessories/n-scale-code-80/](https://midwestmodelrr.com/n-scale/n-scale-track-and-accessories/n-scale-code-80/)  
44. DJRV Custom Disney Monorail | eBay Stores, accessed January 9, 2026, [https://www.ebay.com/str/djrvcustomdisneymonorailtrack](https://www.ebay.com/str/djrvcustomdisneymonorailtrack)  
45. main@xtrackcad.groups.io | Parameter Files, accessed January 9, 2026, [https://xtrackcad.groups.io/g/main/topic/103935374](https://xtrackcad.groups.io/g/main/topic/103935374)  
46. XTrkCAD Model RR Track Planner / Wiki / ParameterFile \- SourceForge, accessed January 9, 2026, [https://sourceforge.net/p/xtrkcad-fork/wiki/ParameterFile/](https://sourceforge.net/p/xtrkcad-fork/wiki/ParameterFile/)  
47. N gauge peco code 55 question (newbie warning\!) \- New Railway Modellers Forums, accessed January 9, 2026, [https://www.newrailwaymodellers.co.uk/Forums/viewtopic.php?t=47577](https://www.newrailwaymodellers.co.uk/Forums/viewtopic.php?t=47577)  
48. Zod: The Simple and Concise Way to Validate Input Data in Your Backend and Build a Better API with… \- Oladipupo Ishola, accessed January 9, 2026, [https://olaishola.medium.com/zod-the-simple-and-concise-way-to-validate-input-data-in-your-backend-and-build-a-better-api-with-0fc699c69ea0](https://olaishola.medium.com/zod-the-simple-and-concise-way-to-validate-input-data-in-your-backend-and-build-a-better-api-with-0fc699c69ea0)  
49. Module Federation in React — A Practical 15‑Minute Guide (with configs & data‑sharing patterns) | by Abhinav Singh | Medium, accessed January 9, 2026, [https://medium.com/@iamabhinav30/module-federation-in-react-a-practical-15-minute-guide-with-configs-data-sharing-patterns-1a4a4948a8b8](https://medium.com/@iamabhinav30/module-federation-in-react-a-practical-15-minute-guide-with-configs-data-sharing-patterns-1a4a4948a8b8)  
50. React Micro Frontends with Module Federation | Nearform, accessed January 9, 2026, [https://nearform.com/insights/react-micro-frontends-module-federation/](https://nearform.com/insights/react-micro-frontends-module-federation/)