import { ServicePageConfig } from "../types";

export const OCEAN_FREIGHT_CONFIG: ServicePageConfig = {
  slug: "ocean-freight",
  title: "Ocean Freight Maritime Carriage",
  heroTitle: "OCEAN FREIGHT",
  heroImage: "/images/hero-ocean-megaship.jpg",
  heroImageAlt: "RILFREIGHT 24,000 TEU container mega vessel navigating transoceanic trade lanes",
  breadcrumbTitle: "Ocean Freight",
  statement: {
    badge: "/ 01 . MARITIME CARRIAGE /",
    headline: "GLOBAL MARITIME FREIGHT CORRIDORS CONNECTING 180 DEEPWATER PORTS",
    description:
      "RILFREIGHT coordinates transoceanic vessel space across premier maritime trade corridors. Our carrier alliance agreements secure guaranteed full container load allocations and scheduled less than container load consolidations through major international deepwater gateways.",
    secondaryDescription:
      "Every maritime booking integrates automated pre arrival customs filing, automated electronic bills of lading, and continuous satellite AIS vessel positioning to eliminate port dwell times and protect supply chain velocity.",
    ctaText: "Request Ocean Freight Quote",
    ctaHref: "/contact",
  },
  metrics: [
    {
      value: "180+",
      label: "Direct Berths",
      description: "Dedicated deepwater container terminal allocations across North America, Europe, and Asia.",
    },
    {
      value: "99.2%",
      label: "Schedule Reliability",
      description: "Precision route planning with dynamic meteorological routing to bypass major weather disruptions.",
    },
    {
      value: "45+",
      label: "Carrier Alliances",
      description: "Direct tier one vessel space agreements ensuring guaranteed container release during peak quarters.",
    },
    {
      value: "24/7",
      label: "AIS Telemetry",
      description: "Continuous real time satellite positioning with automated port arrival milestone alerts.",
    },
  ],
  capabilities: {
    badge: "CORE MARITIME CAPABILITIES",
    headline: "ENGINEERED CONTAINER AND BREAKBULK SOLUTIONS",
    description:
      "From standard dry containers to complex oversized machinery, our marine operations deliver dependable industrial shipping capacity across every major transoceanic corridor.",
    items: [
      {
        title: "Full Container Load (FCL)",
        description:
          "Dedicated 20 foot, 40 foot, and 45 foot high cube container space with priority terminal staging and guaranteed vessel boarding allocations.",
        tag: "FCL Allocation",
      },
      {
        title: "Less than Container Load (LCL)",
        description:
          "Fixed weekly consolidation sailings with bonded container freight station de-consolidation hubs, ideal for scheduled cargo volumes.",
        tag: "Weekly Consolidation",
      },
      {
        title: "Breakbulk and Heavy Lift Cargo",
        description:
          "Specialized heavy gantry lifting and flat rack securing for non containerized industrial machinery, power turbines, and construction components.",
        tag: "Project Cargo",
      },
      {
        title: "Refrigerated Reefer Carriage",
        description:
          "Active climate controlled containers with remote digital temperature monitoring, safeguarding perishable produce and pharmaceuticals.",
        tag: "Temperature Controlled",
      },
      {
        title: "Licensed Customs Brokerage",
        description:
          "Pre arrival electronic customs clearance, tariff classification audits, and bonded warehouse transfers to minimize harbor demurrage.",
        tag: "Regulatory Compliance",
      },
      {
        title: "On Dock Rail and Drayage Transfer",
        description:
          "Synchronized container offloading directly to inland rail chassis and regional line haul trucks, bypassing marine terminal gate queues.",
        tag: "Intermodal Handoff",
      },
    ],
  },
  workflow: {
    badge: "CORRIDOR PIPELINE",
    headline: "FOUR STAGE MARITIME SHIPMENT EXECUTION",
    description:
      "A structured operational workflow providing full visibility from container gate in to destination harbor discharge.",
    steps: [
      {
        step: "01",
        title: "Booking Confirmation & Equipment Allocation",
        description:
          "Container release verification, equipment inspection at origin depot, and electronic shipping order confirmation.",
      },
      {
        step: "02",
        title: "Customs Pre Clearance & Terminal Staging",
        description:
          "Automated export document filing, port gantry loading, and master ocean bill of lading issuance.",
      },
      {
        step: "03",
        title: "Transoceanic Voyage & Satellite Telemetry",
        description:
          "Active satellite AIS tracking, dynamic voyage optimization, and continuous container condition monitoring.",
      },
      {
        step: "04",
        title: "Berth Discharge & Final Consignee Drayage",
        description:
          "Priority crane offloading, customs release confirmation, and final delivery with cryptographic proof of handover.",
      },
    ],
  },
  landscapeBanner: {
    image: "/images/quote-port-cranes.jpg",
    imageAlt: "Ship to shore container gantry cranes operating at deepwater maritime terminal",
    headline: "EXPANDING GLOBAL COMMERCE ACROSS DEEPWATER MARITIME TRADE LANES",
    subheadline: "Direct terminal access and guaranteed container allocations worldwide.",
    ctaText: "Inquire About Marine Capacity",
    ctaHref: "/contact",
  },
  faqs: {
    badge: "TECHNICAL FREIGHT INQUIRIES",
    headline: "FREQUENTLY ASKED QUESTIONS ABOUT OCEAN FREIGHT",
    description:
      "Key technical considerations regarding container specifications, transit corridors, and marine documentation.",
    items: [
      {
        question: "How do I choose between Full Container Load and Less than Container Load?",
        answer:
          "Full Container Load is optimal when your shipment volume exceeds 13 to 15 cubic meters or requires dedicated container security. Less than Container Load consolidates your cargo with other commercial goods in a shared container, making it economical for smaller pallet shipments.",
      },
      {
        question: "What documentation is required for international ocean shipping?",
        answer:
          "Standard requirements include the commercial invoice, packing list, certificate of origin, and the ocean bill of lading. For specialized commodities, hazardous material declarations or phytosanitary certificates may also be necessary.",
      },
      {
        question: "How does RILFREIGHT mitigate port demurrage and detention charges?",
        answer:
          "We leverage pre arrival electronic customs filing, direct on dock rail transfers, and dedicated regional chassis fleets to clear and move containers within free time windows, preventing costly port storage fees.",
      },
      {
        question: "Can I monitor reefer container internal temperatures during transoceanic transit?",
        answer:
          "Yes. Our active refrigerated containers feature integrated telemetry sensors that transmit internal temperature, humidity, and power status in real time to the RILFREIGHT tracking portal.",
      },
    ],
  },
  ctaBanner: {
    badge: "COMMENCE DISPATCH",
    headline: "READY TO DISPATCH YOUR MARITIME CONTAINER SHIPMENT?",
    description:
      "Contact our maritime freight specialists today to review sailing schedules, evaluate volume allocations, and receive an itemized rate proposal.",
    primaryCta: {
      text: "Request Maritime Freight Quote",
      href: "/contact",
    },
    secondaryCta: {
      text: "Track Existing Consignment",
      href: "/tracking",
    },
  },
};

export const AIR_CARGO_CONFIG: ServicePageConfig = {
  slug: "air-cargo",
  title: "Air Cargo Express Aviation Logistics",
  heroTitle: "AIR CARGO EXPRESS",
  heroImage: "/images/hero-air-freighter-runway.jpg",
  heroImageAlt: "Boeing widebody freighter jet loading cargo on airport tarmac at twilight",
  breadcrumbTitle: "Air Cargo Express",
  statement: {
    badge: "/ 02 . AVIATION LOGISTICS /",
    headline: "EXPEDITED AIR CARGO RUNWAY DISPATCH AND GLOBAL CHARTER CORRIDORS",
    description:
      "When market timing is urgent, RILFREIGHT air cargo services connect key commercial hubs within hours. We secure scheduled main deck and lower hold space across modern widebody freighter aircraft, operating alongside dedicated private charters for high value consignments.",
    secondaryDescription:
      "Every aviation shipment receives priority tarmac transfer, dual view security screening, and automated electronic air waybill processing to achieve swift airport apron turnaround.",
    ctaText: "Request Air Cargo Quote",
    ctaHref: "/contact",
  },
  metrics: [
    {
      value: "24-48h",
      label: "Transcontinental Velocity",
      description: "Priority runway dispatch and direct flight connections spanning global economic gateways.",
    },
    {
      value: "85+",
      label: "Aviation Gateways",
      description: "Dedicated airport handling stations with temperature secure storage at major cargo airports.",
    },
    {
      value: "100%",
      label: "Cargo Screening",
      description: "Dual view industrial X-ray inspection and trace detection compliance verified prior to loading.",
    },
    {
      value: "99.8%",
      label: "On Time Departure",
      description: "Guaranteed aircraft space allocations and expedited ramp access for time urgent freight.",
    },
  ],
  capabilities: {
    badge: "AVIATION CARGO SPECIFICATIONS",
    headline: "HIGH VELOCITY AIR CARGO AND CHARTER SOLUTIONS",
    description:
      "Engineered for rapid transit of industrial machinery, automotive assemblies, electronics, and emergency replacement components.",
    items: [
      {
        title: "Scheduled Widebody Freighter Space",
        description:
          "Guaranteed main deck and lower hold positions aboard Boeing 777F and 747-8F freighters connecting prime global corridors.",
        tag: "Widebody Capacity",
      },
      {
        title: "Emergency Aircraft Charter",
        description:
          "Dedicated point to point aircraft charter service for mission critical manufacturing parts and time urgent industrial cargo.",
        tag: "Critical Charters",
      },
      {
        title: "Climate Controlled Aviation Containers",
        description:
          "Certified unit load devices equipped with active cooling mechanisms for pharmaceuticals and biological specimens.",
        tag: "Active ULDs",
      },
      {
        title: "High Security Cargo Screening",
        description:
          "Certified airport screening facilities utilizing modern imaging equipment and continuous chain of custody tracking.",
        tag: "Certified Security",
      },
      {
        title: "Direct Tarmac Ramp Transfer",
        description:
          "Immediate apron transfer vehicles moving freight straight from cargo holds to bonded sorting warehouses.",
        tag: "Apron Speed",
      },
      {
        title: "Expedited Cross Dock Distribution",
        description:
          "Swift breakdown of air freight pallets and rapid dispatch via regional express ground distribution vehicles.",
        tag: "Rapid Handoff",
      },
    ],
  },
  workflow: {
    badge: "FLIGHT PIPELINE",
    headline: "FOUR STAGE AIR CARGO TRANSIT SEQUENCE",
    description:
      "A synchronized sequence engineered to move critical cargo from warehouse receipt to runway takeoff in minimal elapsed time.",
    steps: [
      {
        step: "01",
        title: "Space Reservation & Air Waybill Issuance",
        description:
          "Immediate confirmation of aircraft capacity, flight booking assignment, and electronic air waybill generation.",
      },
      {
        step: "02",
        title: "Tarmac Receipt & Security Inspection",
        description:
          "Cargo delivery to airport station, dual view X-ray screening, and precision unit load device build up.",
      },
      {
        step: "03",
        title: "Ramp Loading & High Altitude Flight Transit",
        description:
          "Direct apron transfer to aircraft cargo doors, main deck securing, and departure along approved flight paths.",
      },
      {
        step: "04",
        title: "Destination Unloading & Final Delivery",
        description:
          "Rapid cargo deplaning, accelerated import customs processing, and final delivery to destination facility.",
      },
    ],
  },
  landscapeBanner: {
    image: "/images/home-telemetry-control-room.jpg",
    imageAlt: "Aviation logistics telemetry control center monitoring worldwide cargo flight vectors",
    headline: "VELOCITY AND PRECISION REACHING INTERNATIONAL GATEWAYS IN HOURS",
    subheadline: "Global widebody freighter capacity coordinated 24/7 by aviation specialists.",
    ctaText: "Check Aircraft Capacity",
    ctaHref: "/contact",
  },
  faqs: {
    badge: "AVIATION INQUIRIES",
    headline: "FREQUENTLY ASKED QUESTIONS ABOUT AIR CARGO",
    description:
      "Essential details on flight timelines, dimensional limits, and handling procedures for express air shipments.",
    items: [
      {
        question: "What are the maximum piece dimensions for widebody air cargo aircraft?",
        answer:
          "Widebody freighters such as the Boeing 777F and 747-8F can accommodate main deck cargo heights up to 300 cm and single pieces weighing over 20,000 kg. Our technical team evaluates dimensional weight ratios to optimize pallet positions.",
      },
      {
        question: "How does RILFREIGHT manage dangerous goods and lithium battery air shipments?",
        answer:
          "Our certified dangerous goods specialists inspect packaging, verify UN certification markings, ensure compliant labeling, and prepare mandatory shipper declarations adhering strictly to IATA regulations.",
      },
      {
        question: "Can import customs pre clearance take place while the plane is airborne?",
        answer:
          "Yes. Our electronic data interchange links transmit full air cargo manifests and commercial invoices directly to customs authorities while the aircraft is in flight, expediting release immediately upon landing.",
      },
      {
        question: "What is the cargo tender cutoff time prior to flight departure?",
        answer:
          "For standard express air shipments, cargo is typically tendered 3 to 4 hours prior to scheduled departure. For dedicated private charters, expedited tarmac loading windows can be coordinated as late as 90 minutes before takeoff.",
      },
    ],
  },
  ctaBanner: {
    badge: "EXPEDITE SHIPMENT",
    headline: "NEED URGENT TIME CRITICAL AIR FREIGHT DISPATCH?",
    description:
      "Our air cargo operations desk operates around the clock to reserve scheduled flight allocations and deploy chartered aircraft worldwide.",
    primaryCta: {
      text: "Request Air Cargo Quotation",
      href: "/contact",
    },
    secondaryCta: {
      text: "Track In Flight Cargo",
      href: "/tracking",
    },
  },
};

export const INTERMODAL_RAIL_CONFIG: ServicePageConfig = {
  slug: "intermodal-rail",
  title: "Intermodal Rail Freight Corridors",
  heroTitle: "INTERMODAL RAIL",
  heroImage: "/images/rail-service-hero.jpg",
  heroImageAlt: "RILFREIGHT diesel electric locomotive hauling double stack intermodal containers through mountain corridor",
  breadcrumbTitle: "Intermodal Rail",
  statement: {
    badge: "/ 03 . RAIL FREIGHT CORRIDORS /",
    headline: "TRANSCONTINENTAL DOUBLE STACK RAIL LOOPS LOWERING FREIGHT EMISSIONS BY 75 PERCENT",
    description:
      "RILFREIGHT intermodal rail solutions combine the cost efficiency and environmental sustainability of heavy rail with the flexible reach of regional road networks. Our scheduled unit trains connect major marine container terminals directly with inland industrial corridors.",
    secondaryDescription:
      "By eliminating highway congestion and delivering four times the fuel efficiency of long distance trucking, our double stack rail services provide high capacity carriage for bulk manufacturers and retail distribution networks.",
    ctaText: "Request Rail Freight Quote",
    ctaHref: "/contact",
  },
  metrics: [
    {
      value: "75%",
      label: "Lower Carbon Emissions",
      description: "Substantial greenhouse gas reduction compared to long distance highway transport.",
    },
    {
      value: "12,000t",
      label: "Trainload Capacity",
      description: "High capacity unit freight trains moving hundreds of double stacked intermodal containers per run.",
    },
    {
      value: "40+",
      label: "Inland Terminals",
      description: "Direct connectivity between coastal maritime berths and interior distribution hubs.",
    },
    {
      value: "98.4%",
      label: "Mainline Precision",
      description: "Protected transcontinental rail paths maintaining consistent delivery schedules across all seasons.",
    },
  ],
  capabilities: {
    badge: "HEAVY RAIL CAPABILITIES",
    headline: "HIGH VOLUME INTERMODAL CONTAINER AND FLATCAR LOGISTICS",
    description:
      "Engineered for large volume manufacturers seeking sustainable overland freight transport without sacrificing transit reliability.",
    items: [
      {
        title: "Double Stack Container Corridors",
        description:
          "High capacity well cars designed to transport stacked 20 foot, 40 foot, and 53 foot containers across transcontinental routes.",
        tag: "Double Stack",
      },
      {
        title: "On Dock Marine Rail Terminals",
        description:
          "Direct transfer from container ship berths straight to rail flatcars, eliminating interim road drayage and terminal congestion.",
        tag: "On Dock Ramps",
      },
      {
        title: "Heavy Industrial Rail Flatcars",
        description:
          "Heavy duty depressed center flatcars capable of transporting massive structural steel, transformers, and industrial equipment.",
        tag: "Heavy Railcars",
      },
      {
        title: "Automated Cross Border Portals",
        description:
          "High speed electronic customs scanning systems enabling unit trains to cross international boundaries with zero manual dwell.",
        tag: "Cross Border Portals",
      },
      {
        title: "Classification Yard Assembly",
        description:
          "Automated rail yard humping and computer controlled train block assembly maximizing freight throughput velocity.",
        tag: "Yard Efficiency",
      },
      {
        title: "Solar Telemetry on Railcars",
        description:
          "Solar powered satellite tracking units mounted to railcars providing continuous geolocation and impact telemetry.",
        tag: "Fleet Telemetry",
      },
    ],
  },
  workflow: {
    badge: "RAIL PIPELINE",
    headline: "FOUR STAGE OVERLAND RAIL TRANSIT PROCESS",
    description:
      "A systematic process ensuring smooth container flow from industrial origin to inland rail terminal delivery.",
  steps: [
      {
        step: "01",
        title: "Container Ramp Gate In & Chassis Lock",
        description:
          "Intermodal container arrival at rail terminal, chassis twist lock verification, and railcar well placement.",
      },
      {
        step: "02",
        title: "Train Formation & Mainline Departure",
        description:
          "Locomotive coupling, automated air brake pressure testing, and scheduled departure onto mainline tracks.",
      },
      {
        step: "03",
        title: "Transcontinental Corridor Line Haul",
        description:
          "High volume overland transit with solar satellite tracking and automated passing siding prioritization.",
      },
      {
        step: "04",
        title: "Inland Terminal Gantry Lift & Delivery",
        description:
          "Electric gantry offloading to destination drayage chassis and local final mile facility delivery.",
      },
    ],
  },
  landscapeBanner: {
    image: "/images/rail-intermodal-yard.jpg",
    imageAlt: "Massive intermodal rail classification yard with high capacity electric gantry cranes",
    headline: "SUSTAINABLE HEAVY FREIGHT CAPACITY POWERING CONTINENTAL COMMERCE",
    subheadline: "Lowering supply chain carbon footprints while expanding bulk volume carriage.",
    ctaText: "Explore Rail Corridor Rates",
    ctaHref: "/contact",
  },
  faqs: {
    badge: "RAIL INQUIRIES",
    headline: "FREQUENTLY ASKED QUESTIONS ABOUT INTERMODAL RAIL",
    description:
      "Practical answers concerning transit velocity, container gross weight limits, and carbon reduction documentation.",
    items: [
      {
        question: "How does intermodal rail transit speed compare to highway trucking?",
        answer:
          "Across distances exceeding 750 miles, intermodal rail provides competitive delivery times often within 24 hours of solo highway trucking, while delivering substantial cost savings and significant fuel efficiency.",
      },
      {
        question: "What container gross weight limits apply on intermodal rail corridors?",
        answer:
          "Standard intermodal well cars accommodate container gross weights up to 67,200 pounds for 40 foot and 53 foot equipment, allowing higher payload capacity compared to statutory highway weight limits in many jurisdictions.",
      },
      {
        question: "How is cargo protected against tampering along continental rail routes?",
        answer:
          "Double stack well cars physically block bottom container doors from opening during transit. In addition, our containers utilize high security bolt seals and optional solar satellite geofence sensors that detect unauthorized door openings.",
      },
      {
        question: "Can RILFREIGHT provide verified carbon reduction reports for corporate ESG filings?",
        answer:
          "Yes. Every rail shipment is tracked with precise ton-mile emissions data, generating certified greenhouse gas reduction certificates that verify carbon savings achieved versus equivalent highway trucking.",
      },
    ],
  },
  ctaBanner: {
    badge: "REDUCE EMISSIONS",
    headline: "OPTIMIZE YOUR BULK CARGO LOGISTICS WITH SUSTAINABLE RAIL FREIGHT",
    description:
      "Consult our intermodal rail engineers to map volume corridors, coordinate on dock rail transfers, and reduce freight transport expenses.",
    primaryCta: {
      text: "Request Rail Freight Quote",
      href: "/contact",
    },
    secondaryCta: {
      text: "Track Rail Container",
      href: "/tracking",
    },
  },
};

export const ROAD_FREIGHT_CONFIG: ServicePageConfig = {
  slug: "road-freight",
  title: "Road Freight Transport Highway Fleet",
  heroTitle: "ROAD FREIGHT TRANSPORT",
  heroImage: "/images/road-service-hero.jpg",
  heroImageAlt: "Modern aerodynamic Class 8 semi truck transporting commercial freight on coastal highway bridge",
  breadcrumbTitle: "Road Freight Transport",
  statement: {
    badge: "/ 04 . HIGHWAY CARRIAGE /",
    headline: "PRECISION HIGHWAY FREIGHT FLEETS WITH CONTINUOUS SATELLITE TELEMETRY",
    description:
      "RILFREIGHT highway transportation services deliver dependable point to point freight mobility across regional and national highway corridors. We manage an extensive fleet of modern aerodynamic tractors, temperature controlled trailers, and heavy haul flatbed units.",
    secondaryDescription:
      "Every highway run is supported by digital route planning, electronic driver logging compliance, and instant cryptographic electronic proofs of delivery delivered directly to client dispatch teams.",
    ctaText: "Request Road Freight Quote",
    ctaHref: "/contact",
  },
  metrics: [
    {
      value: "99.4%",
      label: "On Time Delivery",
      description: "Precision dispatch control with dynamic satellite traffic bypass routing.",
    },
    {
      value: "2,500+",
      label: "Qualified Rigs",
      description: "Modern aerodynamic Class 8 tractors and specialized trailers in active highway service.",
    },
    {
      value: "15min",
      label: "Telemetry Intervals",
      description: "High frequency GPS geolocation, speed monitoring, and automated geofence boundary alerts.",
    },
    {
      value: "100%",
      label: "Paperless ePODs",
      description: "Cryptographic digital proof of delivery signatures accessible immediately upon unloading.",
    },
  ],
  capabilities: {
    badge: "FLEET SPECIFICATIONS",
    headline: "FULL TRUCKLOAD, CONSOLIDATION, AND SPECIALIZED TRUCKING",
    description:
      "Flexible road freight solutions engineered to keep factory supply lines and distribution center docks moving without delay.",
    items: [
      {
        title: "Dedicated Full Truckload (FTL)",
        description:
          "Exclusive tractor trailer assignments for direct point to point deliveries with non stop transit and solo or team driver configurations.",
        tag: "Dedicated FTL",
      },
      {
        title: "Scheduled Less than Truckload (LTL)",
        description:
          "Economical consolidated highway freight utilizing regional cross dock terminals for reliable partial pallet shipments.",
        tag: "Regional LTL",
      },
      {
        title: "Temperature Controlled Trailers",
        description:
          "Advanced refrigerated trailers featuring remote climate monitoring and verified digital temperature logs throughout transit.",
        tag: "Chilled & Frozen",
      },
      {
        title: "Specialized Heavy Haul Flatbeds",
        description:
          "Step deck, lowboy, and multi axle flatbed configurations engineered for oversized industrial machinery and building materials.",
        tag: "Heavy Haul",
      },
      {
        title: "Cross Dock Terminal Operations",
        description:
          "Rapid pallet sorting and direct freight transfer between incoming line haul trailers and local distribution vehicles.",
        tag: "Cross Dock Velocity",
      },
      {
        title: "Urban Electric Delivery Vans",
        description:
          "Clean commercial electric vans providing quiet, zero emission final mile deliveries in congested metropolitan centers.",
        tag: "Urban Delivery",
      },
    ],
  },
  workflow: {
    badge: "ROAD PIPELINE",
    headline: "FOUR STAGE HIGHWAY TRANSPORT WORKFLOW",
    description:
      "A systematic process ensuring punctuality and cargo security from shipper loading dock to receiver sign off.",
    steps: [
      {
        step: "01",
        title: "Dispatch Scheduling & Driver Assignment",
        description:
          "Digital route selection, equipment safety pre trip inspection, and scheduled appointment confirmation.",
      },
      {
        step: "02",
        title: "Shipper Loading & Tamper Seal Verification",
        description:
          "Cargo weight distribution checks, pallet securement, and numbered high security bolt seal installation.",
      },
      {
        step: "03",
        title: "Highway Line Haul with GPS Telemetry",
        description:
          "Continuous satellite position tracking, real time speed monitoring, and proactive delivery window updates.",
      },
      {
        step: "04",
        title: "Consignee Dock Handover & Digital ePOD",
        description:
          "Dock unloading verification, digital stylus signature capture, and immediate automated delivery notification.",
      },
    ],
  },
  landscapeBanner: {
    image: "/images/home-about-smart-hub.jpg",
    imageAlt: "Automated logistics sorting warehouse with autonomous guided vehicles and loading docks",
    headline: "CONNECTING FACTORIES, DISTRIBUTION CENTERS, AND CUSTOMERS WITHOUT BOTTLENECKS",
    subheadline: "Modern highway fleets operating across synchronized continental networks.",
    ctaText: "Check Highway Availability",
    ctaHref: "/contact",
  },
  faqs: {
    badge: "HIGHWAY INQUIRIES",
    headline: "FREQUENTLY ASKED QUESTIONS ABOUT ROAD FREIGHT",
    description:
      "Information regarding trailer capacities, transit time expectations, and driver safety compliance standards.",
    items: [
      {
        question: "What is the difference between Full Truckload and Less than Truckload transit times?",
        answer:
          "Full Truckload moves directly from your origin dock straight to destination without intermediate stops, offering the fastest road transit. Less than Truckload involves regional hub sorting, typically adding 24 to 48 hours depending on destination distance.",
      },
      {
        question: "How does RILFREIGHT ensure driver compliance with statutory rest hours?",
        answer:
          "Our entire highway fleet utilizes certified Electronic Logging Devices that continuously record engine run times, drive hours, and statutory rest intervals, ensuring full adherence to commercial vehicle safety laws.",
      },
      {
        question: "What specialized trailer equipment is available for oversized industrial loads?",
        answer:
          "We deploy removable gooseneck trailers, multi axle step decks, and lowboy flatbed trailers complete with heavy tie downs, outriggers, pilot escort vehicles, and required state transport permits.",
      },
      {
        question: "How quickly is proof of delivery accessible after consignee sign off?",
        answer:
          "The digital signature and cargo receipt photograph are synchronized instantly to the RILFREIGHT platform upon driver stylus sign off, enabling immediate confirmation and automated invoice generation.",
      },
    ],
  },
  ctaBanner: {
    badge: "BOOK HIGHWAY CAPACITY",
    headline: "DEPLOY RELIABLE HIGHWAY TRUCKING CAPACITY FOR YOUR SUPPLY CHAIN",
    description:
      "Speak with our highway dispatch team to schedule dedicated full truckload runs or establish a regular consolidated shipping schedule.",
    primaryCta: {
      text: "Request Road Freight Quote",
      href: "/contact",
    },
    secondaryCta: {
      text: "Track Shipment Status",
      href: "/tracking",
    },
  },
};

export const COLD_CHAIN_CONFIG: ServicePageConfig = {
  slug: "cold-chain",
  title: "Cold Chain Logistics Temperature Controlled Solutions",
  heroTitle: "COLD CHAIN LOGISTICS",
  heroImage: "/images/home-cold-chain-pharma.jpg",
  heroImageAlt: "Technician monitoring refrigerated pharmaceutical cleanroom containers with digital climate telemetry",
  breadcrumbTitle: "Cold Chain Logistics",
  statement: {
    badge: "/ 05 . TEMPERATURE CONTROLLED LOGISTICS /",
    headline: "MULTI ZONE CLIMATE CONTROLLED TRANSPORTATION FOR FOOD AND PERISHABLE ASSETS",
    description:
      "RILFREIGHT cold chain logistics provides certified temperature containment for perishables, dairy, seafood, sensitive produce, and specialty confectionery. Our climate controlled reefer fleet maintains continuous internal temperature stability across all transit environments.",
    secondaryDescription:
      "From pre trip thermal sanitization to destination temperature verification, our calibrated IoT sensors track internal conditions second by second, preventing thermal excursions and safeguarding food safety compliance.",
    ctaText: "Request Cold Chain Quote",
    ctaHref: "/contact",
  },
  metrics: [
    {
      value: "±0.1°C",
      label: "Thermal Precision",
      description: "Microprocessor climate regulation with continuous temperature sensor calibration.",
    },
    {
      value: "3,200+",
      label: "Active Reefer Units",
      description: "Modern climate controlled maritime containers and highway trailers in constant operation.",
    },
    {
      value: "100%",
      label: "Pre Trip Inspection",
      description: "Rigorous thermal chamber testing and hygiene sanitization performed before every departure.",
    },
    {
      value: "0 Sec",
      label: "Excursion Latency",
      description: "Instant automated warning dispatch the moment any unauthorized temperature variance is detected.",
    },
  ],
  capabilities: {
    badge: "THERMAL CONTROL REGIMES",
    headline: "PRECISION MULTI TEMPERATURE MANAGEMENT",
    description:
      "Specialized refrigerated logistics supporting distinct temperature ranges tailored to your commodity specifications.",
    items: [
      {
        title: "Deep Frozen Storage (-20°C to -80°C)",
        description:
          "Heavy duty multi stage refrigeration units safeguarding frozen seafood, concentrated poultry, and industrial biological cultures.",
        tag: "Deep Freeze",
      },
      {
        title: "Chilled Fresh Cargo (+2°C to +8°C)",
        description:
          "Regulated humidity and constant air circulation maintaining freshness for fresh dairy, organic meats, and sensitive produce.",
        tag: "Chilled Produce",
      },
      {
        title: "Controlled Ambient (+15°C to +25°C)",
        description:
          "Insulated climate containment protecting luxury confectionery, vintage wines, and specialized chemical compounds from heat spikes.",
        tag: "Controlled Ambient",
      },
      {
        title: "Dual Temperature Compartments",
        description:
          "Partitioned reefer trailers featuring independent evaporators, enabling frozen and chilled freight in a single trip.",
        tag: "Dual Zone",
      },
      {
        title: "Calibrated IoT Data Loggers",
        description:
          "Continuous electronic temperature recording with certified audit proof logging downloadable at delivery points.",
        tag: "IoT Logging",
      },
      {
        title: "Sealed Cold Dock Transfers",
        description:
          "Cushioned dock seals and refrigerated cross dock staging rooms preventing warm air ingress during loading transfers.",
        tag: "Thermal Docks",
      },
    ],
  },
  workflow: {
    badge: "COLD PIPELINE",
    headline: "FOUR STAGE TEMPERATURE ASSURANCE PROTOCOL",
    description:
      "A rigorous chain of custody protocol preserving product freshness and hygiene across every leg of the journey.",
    steps: [
      {
        step: "01",
        title: "Pre Trip Sanitization & Pre Cooling",
        description:
          "Chamber thermal pull down, automated diagnostic self test, and digital probe calibration verification.",
      },
      {
        step: "02",
        title: "Thermal Dock Ingress & Temperature Check",
        description:
          "Rapid loading through airtight dock gaskets and core temperature spot audits prior to departure.",
      },
      {
        step: "03",
        title: "Monitored Line Haul with Live Telemetry",
        description:
          "Active satellite temperature telemetry, continuous auxiliary generator power, and immediate excursion alerting.",
      },
      {
        step: "04",
        title: "Destination Thermal Audit & Receipt",
        description:
          "Digital temperature graph extraction, consignee temperature verification, and clean custody handover.",
      },
    ],
  },
  landscapeBanner: {
    image: "/images/hero-ocean-megaship.jpg",
    imageAlt: "Refrigerated intermodal container vessel at sea with active cooling systems powered",
    headline: "PRESERVING PERISHABLE INTEGRITY FROM SOURCE HARVEST TO FINAL DESTINATION",
    subheadline: "Active multi zone climate containers engineered for freshness and compliance.",
    ctaText: "Inquire About Cold Logistics",
    ctaHref: "/contact",
  },
  faqs: {
    badge: "COLD CHAIN INQUIRIES",
    headline: "FREQUENTLY ASKED QUESTIONS ABOUT COLD CHAIN LOGISTICS",
    description:
      "Answers regarding temperature maintenance, backup cooling power, and food safety regulatory compliance.",
    items: [
      {
        question: "How do you prevent temperature spikes during cross dock transfers?",
        answer:
          "We utilize inflatable dock seals that create an airtight tunnel between the trailer and our refrigerated warehouse staging zone. Freight is transferred within controlled ambient conditions, preventing external warm air contact.",
      },
      {
        question: "What backup systems protect refrigerated freight during equipment faults?",
        answer:
          "Our reefer units feature dual compressor systems and independent auxiliary generator sets. If power interruption occurs, automated failsafe generators engage within 10 seconds while alerting the 24/7 central monitoring desk.",
      },
      {
        question: "Can shippers view real time internal temperature data during transit?",
        answer:
          "Yes. Our client tracking portal displays live internal temperature readouts, relative humidity percentages, and refrigeration power status updated via satellite every 15 minutes.",
      },
      {
        question: "What food safety certifications govern RILFREIGHT cold chain corridors?",
        answer:
          "All operations comply with FSMA Sanitary Transportation of Food guidelines, HACCP hygiene principles, and ISO 22000 food safety management standards.",
      },
    ],
  },
  ctaBanner: {
    badge: "SAFEGUARD PERISHABLES",
    headline: "SAFEGUARD YOUR PERISHABLE CARGO WITH CERTIFIED TEMPERATURE CONTROLS",
    description:
      "Our cold chain specialists design customized thermal transit plans with verified multi zone temperature capabilities.",
    primaryCta: {
      text: "Request Cold Chain Quote",
      href: "/contact",
    },
    secondaryCta: {
      text: "Monitor Active Reefer",
      href: "/tracking",
    },
  },
};

export const LIFE_SCIENCES_CONFIG: ServicePageConfig = {
  slug: "life-sciences",
  title: "Life Sciences & Healthcare Pharmaceutical Logistics",
  heroTitle: "LIFE SCIENCES & HEALTHCARE",
  heroImage: "/images/home-cold-chain-pharma.jpg",
  heroImageAlt: "Pharmaceutical cleanroom logistics facility with sealed cryogenic biocontainers and automated monitoring",
  breadcrumbTitle: "Life Sciences & Healthcare",
  statement: {
    badge: "/ 06 . HEALTHCARE & BIOPHARMA /",
    headline: "GDP CERTIFIED BIOPHARMACEUTICAL TRANSPORTATION WITH CHAIN OF CUSTODY VERIFICATION",
    description:
      "RILFREIGHT delivers Good Distribution Practice certified transportation solutions for clinical trials, active pharmaceutical ingredients, vaccines, biologics, and cellular therapies. Every shipment is managed under strict quality protocols with complete chain of custody validation.",
    secondaryDescription:
      "Our dedicated healthcare control tower coordinates specialized cryogenic vapor shippers, vacuum insulated packaging systems, and white glove delivery teams to ensure life saving medical treatments arrive in pristine condition.",
    ctaText: "Request Life Sciences Quote",
    ctaHref: "/contact",
  },
  metrics: [
    {
      value: "100%",
      label: "GDP Audit Pass Rate",
      description: "Full compliance with international Good Distribution Practice healthcare standards.",
    },
    {
      value: "0.02°C",
      label: "Max Temperature Drift",
      description: "Precision thermal containment utilizing vacuum insulated panels and phase change materials.",
    },
    {
      value: "-196°C",
      label: "Cryogenic Capability",
      description: "Validated liquid nitrogen dry vapor shippers supporting advanced cell and gene therapies.",
    },
    {
      value: "24/7",
      label: "Healthcare Tower",
      description: "Specialized pharmaceutical logistics experts overseeing every critical medical consignment.",
    },
  ],
  capabilities: {
    badge: "HEALTHCARE LOGISTICS CAPABILITIES",
    headline: "VALIDATED PHARMACEUTICAL AND CLINICAL CORRIDORS",
    description:
      "Engineered specifically for biotechnology researchers, hospital networks, and global pharmaceutical manufacturers.",
    items: [
      {
        title: "GDP Certified Distribution Corridors",
        description:
          "Fully audited transit routes, trained clinical handling personnel, and validated temperature control equipment.",
        tag: "GDP Certified",
      },
      {
        title: "Liquid Nitrogen Cryogenic Shippers",
        description:
          "Dry vapor nitrogen dewars maintaining deep cryogenic stability down to -196°C for up to 10 days without external power.",
        tag: "Cryogenic Dewars",
      },
      {
        title: "Clinical Trial Supply Distribution",
        description:
          "White glove delivery of blinded patient medication kits, diagnostic specimens, and investigational medical products.",
        tag: "Clinical Trials",
      },
      {
        title: "Passive Vacuum Insulated Packaging",
        description:
          "Advanced phase change material containers providing 96 hour thermal autonomy under extreme external ambient heat.",
        tag: "Passive VIP",
      },
      {
        title: "Tamper Evident Serialized Security",
        description:
          "Serialized electronic security seals, biometric verification, and unbroken chain of custody documentation.",
        tag: "Serialized Seals",
      },
      {
        title: "Runway Apron Medical Priority",
        description:
          "Expedited airport tarmac transfers bypassing standard cargo storage areas for immediate loading onto departing aircraft.",
        tag: "Apron Priority",
      },
    ],
  },
  workflow: {
    badge: "CLINICAL PIPELINE",
    headline: "FOUR STAGE BIOPHARMA TRANSPORT VALIDATION",
    description:
      "An unbroken, auditable protocol ensuring regulatory compliance from laboratory cleanroom to patient bedside.",
    steps: [
      {
        step: "01",
        title: "Standard Operating Procedure Alignment",
        description:
          "Protocol validation, shipper packaging qualification, and temperature logging parameter configuration.",
      },
      {
        step: "02",
        title: "Sterile Staging & Barcode Verification",
        description:
          "Certified cleanroom handling, serialized barcode scanning, and electronic custody sign off.",
      },
      {
        step: "03",
        title: "Dedicated Express Monitored Transit",
        description:
          "Continuous GPS geolocation, internal temperature logging, tilt sensing, and dedicated tarmac priority escort.",
      },
      {
        step: "04",
        title: "Hospital White Glove Handover",
        description:
          "Immediate delivery to hospital pharmacy staff, digital temperature data extraction, and clinical sign off.",
      },
    ],
  },
  landscapeBanner: {
    image: "/images/home-customer-handover.jpg",
    imageAlt: "Healthcare logistics specialist handing over temperature verified medical consignment to hospital staff",
    headline: "DELIVERING LIFE SAVING THERAPIES WITH UNCOMPROMISING PRECISION AND INTEGRITY",
    subheadline: "Global Good Distribution Practice certified healthcare logistics networks.",
    ctaText: "Consult Healthcare Logistics",
    ctaHref: "/contact",
  },
  faqs: {
    badge: "HEALTHCARE INQUIRIES",
    headline: "FREQUENTLY ASKED QUESTIONS ABOUT LIFE SCIENCES LOGISTICS",
    description:
      "Regulatory, security, and thermal specifications for pharmaceutical and clinical trial freight movements.",
    items: [
      {
        question: "How does RILFREIGHT demonstrate Good Distribution Practice regulatory compliance?",
        answer:
          "Our facilities and transport processes are audited against EU GDP guidelines and FDA 21 CFR Part 11 requirements. We provide full validation documentation, temperature mapping reports, and calibration certificates for every route.",
      },
      {
        question: "What security measures protect high value biopharmaceuticals against diversion?",
        answer:
          "We employ discreet unmarked vehicles, two person driver teams, remote electronic door lock controls, active geofencing, and immediate law enforcement escalation protocols to prevent theft or unauthorized access.",
      },
      {
        question: "How are cryogenic liquid nitrogen shippers managed during unexpected international transit delays?",
        answer:
          "Our dry vapor cryogenic dewars carry a 10 to 14 day static holding time. In addition, our global partner hubs maintain certified liquid nitrogen replenishment facilities to re-charge shippers if customs holds occur.",
      },
      {
        question: "What emergency protocols engage if a temperature excursion warning is triggered?",
        answer:
          "Our 24/7 healthcare control tower receives instantaneous telemetry alerts. Dedicated field responders are deployed immediately to apply backup cooling materials, move cargo to local validated cold storage, or execute pre agreed contingency routing.",
      },
    ],
  },
  ctaBanner: {
    badge: "PARTNER WITH SPECIALISTS",
    headline: "PARTNER WITH A CERTIFIED LIFE SCIENCES SUPPLY CHAIN SPECIALIST",
    description:
      "Connect with our life sciences logistics directors to plan clinical trial distributions or establish validated international pharmaceutical corridors.",
    primaryCta: {
      text: "Request Healthcare Freight Quote",
      href: "/contact",
    },
    secondaryCta: {
      text: "Track Sensitive Consignment",
      href: "/tracking",
    },
  },
};

export const ALL_SERVICES_MAP: Record<string, ServicePageConfig> = {
  "ocean-freight": OCEAN_FREIGHT_CONFIG,
  "air-cargo": AIR_CARGO_CONFIG,
  "intermodal-rail": INTERMODAL_RAIL_CONFIG,
  "road-freight": ROAD_FREIGHT_CONFIG,
  "cold-chain": COLD_CHAIN_CONFIG,
  "life-sciences": LIFE_SCIENCES_CONFIG,
};

export const ALL_SERVICES_LIST: ServicePageConfig[] = [
  OCEAN_FREIGHT_CONFIG,
  AIR_CARGO_CONFIG,
  INTERMODAL_RAIL_CONFIG,
  ROAD_FREIGHT_CONFIG,
  COLD_CHAIN_CONFIG,
  LIFE_SCIENCES_CONFIG,
];
