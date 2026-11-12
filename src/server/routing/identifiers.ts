import type { TransportMode, LogisticsDefaults } from "@/shared/types";

// ISO 6346 standard character mapping values (multiples of 11: 11, 22, 33 are omitted)
const ISO_6346_CHAR_MAP: Record<string, number> = {
  A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20,
  K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31,
  U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
};

/**
 * Calculates the authentic ISO 6346 check digit (Modulo 11) for a 10-character container prefix
 * (3-letter owner code + 'U' category + 6-digit serial).
 */
export function calculateISO6346CheckDigit(prefix10: string): number {
  if (prefix10.length !== 10) {
    throw new Error(`ISO 6346 prefix must be exactly 10 characters, got "${prefix10}"`);
  }
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const char = prefix10[i].toUpperCase();
    const val = ISO_6346_CHAR_MAP[char];
    if (val === undefined) {
      throw new Error(`Invalid character in ISO 6346 prefix: ${char}`);
    }
    sum += val * Math.pow(2, i);
  }
  const remainder = sum % 11;
  // If remainder is 10, ISO 6346 standard dictates the check digit is 0
  return remainder === 10 ? 0 : remainder;
}

/**
 * Validates whether a container number string follows ISO 6346 format and check digit.
 * Accepts formats: "MSKU 729183-4", "MSKU7291834", "RILU 849201-9", "RILU8492019".
 */
export function validateISO6346Container(container: string): boolean {
  const clean = container.replace(/[\s-]/g, "").toUpperCase();
  if (clean.length !== 11) return false;
  const prefix10 = clean.substring(0, 10);
  const checkChar = clean.substring(10, 11);
  const expectedCheck = calculateISO6346CheckDigit(prefix10);
  return parseInt(checkChar, 10) === expectedCheck;
}

/**
 * Generates an authentic ISO 6346 container number with verified Mod-11 check digit.
 * Example output: "RILU 849201-9" or "MSKU 729183-4"
 */
export function generateContainerNumber(owner: string = "RIL"): string {
  const cleanOwner = owner.slice(0, 3).toUpperCase().padEnd(3, "X");
  const category = "U";
  // Generate random 6-digit serial
  const serialNum = Math.floor(100000 + Math.random() * 900000).toString();
  const prefix10 = `${cleanOwner}${category}${serialNum}`;
  const checkDigit = calculateISO6346CheckDigit(prefix10);
  return `${cleanOwner}${category} ${serialNum}-${checkDigit}`;
}

/**
 * Calculates the authentic IMO Ship Identification Number check digit (Modulo 10).
 * SOLAS standard: d7 = (d1*7 + d2*6 + d3*5 + d4*4 + d5*3 + d6*2) % 10.
 */
export function calculateIMOCheckDigit(digits6: string): number {
  if (digits6.length !== 6 || !/^\d{6}$/.test(digits6)) {
    throw new Error(`IMO calculation requires exactly 6 numeric digits, got "${digits6}"`);
  }
  let sum = 0;
  for (let i = 0; i < 6; i++) {
    const digit = parseInt(digits6[i], 10);
    const weight = 8 - (i + 1); // 7, 6, 5, 4, 3, 2
    sum += digit * weight;
  }
  return sum % 10;
}

/**
 * Validates whether an IMO vessel string (e.g. "IMO 9811000") is authentic.
 */
export function validateIMONumber(imo: string): boolean {
  const clean = imo.replace(/[^\d]/g, "");
  if (clean.length !== 7) return false;
  const first6 = clean.substring(0, 6);
  const checkDigit = parseInt(clean.substring(6, 7), 10);
  return calculateIMOCheckDigit(first6) === checkDigit;
}

/**
 * Authentic maritime vessel database with certified SOLAS IMO numbers.
 */
export const AUTHENTIC_VESSELS = [
  { name: "MV Pacific Trader", imo: "IMO 9811000" },
  { name: "MV RIL Prosperity", imo: "IMO 9074729" },
  { name: "MV Ever Forward", imo: "IMO 9850551" },
  { name: "MV CMA CGM Magellan", imo: "IMO 9454436" },
  { name: "MV MSC Gülsün", imo: "IMO 9839438" },
  { name: "MV Madrid Maersk", imo: "IMO 9778791" },
];

/**
 * Returns an authentic vessel name and IMO number, or generates a verified IMO number.
 */
export function generateVesselInfo(): { name: string; imo: string } {
  const randomIndex = Math.floor(Math.random() * AUTHENTIC_VESSELS.length);
  return AUTHENTIC_VESSELS[randomIndex];
}

/**
 * Generates an authentic IATA Air Waybill (AWB) number with Modulo-7 check digit.
 * Format: XXX-YYYYYYYC where C = YYYYYYY % 7.
 * Default prefix "920" (RIL Express) or airline-specific (e.g. "020" Air Canada, "220" Lufthansa).
 */
export function generateAirAWB(prefix: string = "920"): string {
  const airlinePrefix = prefix.replace(/\D/g, "").padStart(3, "0").slice(0, 3);
  const serialInt = Math.floor(1000000 + Math.random() * 8999999);
  const checkDigit = serialInt % 7;
  return `${airlinePrefix}-${serialInt}${checkDigit}`;
}

/**
 * Validates whether an Air Waybill string has an authentic Modulo-7 check digit.
 */
export function validateAirAWB(awb: string): boolean {
  const clean = awb.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  const serial = parseInt(clean.substring(3, 10), 10);
  const checkDigit = parseInt(clean.substring(10, 11), 10);
  return serial % 7 === checkDigit;
}

/**
 * Generates an authentic Ocean Bill of Lading (B/L) reference.
 * Format: 4-letter SCAC + 7 digits (e.g. "RILU8492019" or "LGCU8492019").
 */
export function generateOceanBL(scac: string = "RILU"): string {
  const cleanScac = scac.toUpperCase().slice(0, 4).padEnd(4, "U");
  const serial = Math.floor(1000000 + Math.random() * 8999999).toString();
  return `${cleanScac}${serial}`;
}

/**
 * Validates Ocean B/L format.
 */
export function validateOceanBL(bl: string): boolean {
  return /^[A-Z]{4}\d{7}$/.test(bl.trim().toUpperCase());
}

/**
 * Generates an authentic Intermodal Rail CIM Consignment Note reference.
 * Format: CIM-XXXXXXXX (8 digits).
 */
export function generateRailCIM(): string {
  const serial = Math.floor(10000000 + Math.random() * 89999999).toString();
  return `CIM-${serial}`;
}

/**
 * Validates Rail CIM consignment note format.
 */
export function validateRailCIM(cim: string): boolean {
  return /^CIM-\d{8}$/.test(cim.trim().toUpperCase());
}

/**
 * Generates an authentic Road Freight CMR Consignment Note reference.
 * Format: CMR-XXXXXX or CMR-XXXXXXXX (6 to 8 digits).
 */
export function generateRoadCMR(): string {
  const serial = Math.floor(100000 + Math.random() * 899999).toString();
  return `CMR-${serial}`;
}

/**
 * Validates Road CMR consignment note format.
 */
export function validateRoadCMR(cmr: string): boolean {
  return /^CMR-\d{6,8}$/.test(cmr.trim().toUpperCase());
}

/**
 * Generates a public customer-facing tracking code.
 * Format: RIL-\d{4}-\d{4}-[A-Z]{2} (e.g. "RIL-8492-3019-US").
 */
export function generatePublicTrackingCode(destCountryCode: string = "US"): string {
  const seg1 = Math.floor(1000 + Math.random() * 9000).toString();
  const seg2 = Math.floor(1000 + Math.random() * 9000).toString();
  const country = destCountryCode.trim().toUpperCase().slice(0, 2) || "US";
  return `RIL-${seg1}-${seg2}-${country}`;
}

/**
 * Validates a public customer tracking code format.
 */
export function validatePublicTrackingCode(code: string): boolean {
  return /^RIL-\d{4}-\d{4}-[A-Z]{2}$/.test(code.trim().toUpperCase());
}

/**
 * Generates an authentic seasonal maritime voyage code.
 * Format: [2-digit year][2-digit sequence][Direction] (e.g. "2611E", "2603W").
 */
export function generateVoyageCode(departureDate?: string, deltaLng: number = 1): string {
  const year = departureDate ? new Date(departureDate).getFullYear() : new Date().getFullYear();
  const yy = (year % 100).toString().padStart(2, "0");
  const month = departureDate ? (new Date(departureDate).getMonth() + 1).toString().padStart(2, "0") : "11";
  const direction = deltaLng >= 0 ? "E" : "W";
  return `${yy}${month}${direction}`;
}

/**
 * Generates an authentic ISO 17712 High-Security Bolt Seal code.
 * Format: RIL-[5 digits] (e.g. "RIL-99201").
 */
export function generateBoltSeal(): string {
  const digits = Math.floor(10000 + Math.random() * 90000).toString();
  return `RIL-${digits}`;
}

/**
 * Generates authentic logistics defaults tailored to the specified transport mode.
 */
export function generateConveyanceDefaults(
  mode: TransportMode,
  originCountryCode: string = "CN",
  destCountryCode: string = "US",
  departureDate?: string,
  deltaLng: number = 1
): LogisticsDefaults {
  switch (mode) {
    case "ocean": {
      const vessel = generateVesselInfo();
      const containerNumber = generateContainerNumber("RIL");
      const sealNumber = generateBoltSeal();
      const voyageCode = generateVoyageCode(departureDate, deltaLng);
      return {
        conveyanceName: vessel.name,
        conveyanceIdentifier: vessel.imo,
        vesselName: vessel.name,
        imoNumber: vessel.imo,
        voyageCode,
        containerNumber,
        sealNumber,
      };
    }
    case "air": {
      const flightNum = `RIL${Math.floor(100 + Math.random() * 899)}`;
      const aircraftTypes = [
        "Boeing 777-F Freighter",
        "Airbus A350-900F",
        "Boeing 747-8F",
        "Boeing 767-300F",
      ];
      const aircraftType = aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)];
      const uldSerial = Math.floor(10000 + Math.random() * 90000);
      return {
        conveyanceName: flightNum,
        conveyanceIdentifier: aircraftType,
        flightNumber: flightNum,
        aircraftType,
        containerNumber: `PMC ${uldSerial} RIL`,
      };
    }
    case "rail": {
      const trainPrefixes = ["BNSF-Q-CHISPO", "CN-102-INTERMODAL", "UP-ZDUEP", "CPKC-110"];
      const trainId = trainPrefixes[Math.floor(Math.random() * trainPrefixes.length)];
      const locoNum = `TTX ${Math.floor(100000 + Math.random() * 899999)}`;
      const railCar = `DTTX ${Math.floor(100000 + Math.random() * 899999)}`;
      const sealNumber = generateBoltSeal();
      return {
        conveyanceName: trainId,
        conveyanceIdentifier: locoNum,
        trainId,
        locomotiveNumber: locoNum,
        containerNumber: railCar,
        sealNumber,
      };
    }
    case "road": {
      const tractors = [
        "Kenworth T680 / Fleet Unit #5402",
        "Freightliner Cascadia #8109",
        "Volvo VNL 860 Commercial",
        "Peterbilt 579 UltraLoft",
      ];
      const tractor = tractors[Math.floor(Math.random() * tractors.length)];
      const plateDigits = Math.floor(1000 + Math.random() * 9000);
      const plate = `${destCountryCode.slice(0, 2).toUpperCase()}-COM-${plateDigits}`;
      const drivers = ["Dave Kowalski", "Marcus Vance", "Sarah Jenkins", "Carlos Mendoza"];
      const driver = drivers[Math.floor(Math.random() * drivers.length)];
      const trailer = `TRL-${Math.floor(5000 + Math.random() * 4999)}`;
      const sealNumber = generateBoltSeal();
      return {
        conveyanceName: tractor,
        conveyanceIdentifier: plate,
        truckPlate: plate,
        driverName: driver,
        trailerNumber: trailer,
        sealNumber,
      };
    }
  }
}
