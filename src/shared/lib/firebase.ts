import { initializeApp, getApps, getApp } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  query,
  where,
  limit,
  orderBy,
  runTransaction,
  getCountFromServer,
} from "firebase/firestore";
import type {
  Firestore,
  CollectionReference,
  DocumentData,
  Unsubscribe,
} from "firebase/firestore";
import type { Shipment } from "@/shared/types";
import type { PlatformUser } from "@/features/admin/types";
import { generatePublicTrackingCode } from "@/server/routing/identifiers";

/**
 * Normalises a tracking code for use as a document id.
 */
function normaliseTrackingCode(code: string): string {
  return code.trim().toUpperCase();
}

// Firebase configuration for RILFREIGHT (project: webedge-96a41)
// Values come from the environment so the project can be pointed elsewhere
// without touching source. The literals are the fallback for the default
// project, which keeps the app bootable without a populated .env.local.
const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyAdDYNMoUrTtBxhn_Box-rZNbUm55_ntZU",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "webedge-96a41.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "webedge-96a41",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "webedge-96a41.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "972563936686",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "1:972563936686:web:def67f16178f34864ac43f",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-B7CSVWKR4V",
};

// Initialize Firebase safely for Next.js SSR / HMR Fast Refresh
export const app: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Cloud Firestore instance
export const db: Firestore = getFirestore(app);

// Typed collection reference for 'shipments'
export const shipmentsCollection = collection(
  db,
  "shipments"
) as CollectionReference<Shipment, DocumentData>;

/**
 * Result of a successful shipment write.
 */
export interface CreatedShipment {
  /** Firestore document id — identical to the tracking code. */
  id: string;
  /** The tracking code that was actually allocated. */
  trackingCode: string;
}

/**
 * Firestore cannot store an array whose elements are themselves arrays.
 *
 * The route polyline is a list of coordinate pairs, so it is persisted as a
 * flat list of numbers — [lon0, lat0, lon1, lat1, ...] — and expanded back
 * into pairs when the record is read. The in-memory {@link Shipment} shape is
 * unaffected; only the stored representation differs.
 *
 * Waypoints and milestones are arrays of maps, which Firestore accepts, so
 * they are stored as they are.
 */
type StoredShipment = Omit<Shipment, "routeCoordinates"> & {
  routeCoordinates: number[];
};

/**
 * Converts a shipment into its stored representation.
 */
function encodeShipment(shipment: Shipment): StoredShipment {
  return {
    ...shipment,
    routeCoordinates: (shipment.routeCoordinates || []).flat(),
  };
}

/**
 * Converts a stored document back into a shipment.
 */
function decodeShipment(data: DocumentData): Shipment {
  const stored = (data.routeCoordinates || []) as number[];
  const routeCoordinates: [number, number][] = [];

  for (let i = 0; i + 1 < stored.length; i += 2) {
    routeCoordinates.push([stored[i], stored[i + 1]]);
  }

  return { ...data, routeCoordinates } as Shipment;
}

/**
 * How many candidate identifiers are tried before giving up.
 */
const SHIPMENT_ID_ATTEMPTS = 6;

/**
 * Raised internally when a candidate identifier is already taken.
 */
class ShipmentIdTakenError extends Error {
  constructor(code: string) {
    super(`Shipment identifier ${code} is already in use.`);
    this.name = "ShipmentIdTakenError";
  }
}

/**
 * Extracts the country suffix from an existing tracking code so regenerated
 * candidates keep the same shape.
 */
function countrySuffixFromCode(code: string): string {
  const match = /-([A-Z]{2})$/.exec(code.trim().toUpperCase());
  return match ? match[1] : "US";
}

/**
 * Creates a shipment record in Firestore.
 *
 * The document id **is** the public tracking code, which is what lets the
 * customer-facing tracking page read a single shipment with a point read
 * instead of a collection query.
 *
 * Uniqueness is guaranteed by the database rather than by the randomness of
 * the generator: the write runs inside a transaction that reads the target
 * document first and refuses to overwrite it. If the identifier is already
 * taken the next candidate is tried, so two shipments can never share an id.
 */
export async function createShipmentRecord(
  shipment: Shipment
): Promise<CreatedShipment> {
  const requestedCode = normaliseTrackingCode(shipment.trackingCode);
  const countrySuffix = countrySuffixFromCode(requestedCode);

  const candidates = [
    requestedCode,
    ...Array.from({ length: SHIPMENT_ID_ATTEMPTS - 1 }, () =>
      generatePublicTrackingCode(countrySuffix)
    ),
  ];

  for (const candidate of candidates) {
    const docRef = doc(db, "shipments", candidate);

    const record: Shipment = {
      ...shipment,
      id: candidate,
      trackingCode: candidate,
      createdAt: shipment.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      // Atomic claim: read the target, refuse to overwrite, then write.
      await runTransaction(db, async (tx) => {
        const snapshot = await tx.get(docRef);
        if (snapshot.exists()) {
          throw new ShipmentIdTakenError(candidate);
        }
        tx.set(docRef, encodeShipment(record));
      });

      return { id: candidate, trackingCode: candidate };
    } catch (error) {
      if (error instanceof ShipmentIdTakenError) {
        // Identifier already in use — try the next candidate.
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    "Unable to allocate a unique shipment identifier. Please try again."
  );
}

/**
 * Fetches a single shipment record by its document ID.
 */
export async function getShipmentRecord(id: string): Promise<Shipment | null> {
  const docRef = doc(db, "shipments", id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) {
    return null;
  }
  return decodeShipment(snapshot.data());
}

/**
 * Fetches a single shipment record by its public tracking code.
 *
 * The tracking code is the document id, so this is a point read — which the
 * Security Rules grant to the public, unlike a collection query.
 */
export async function getShipmentByTrackingCode(
  trackingCode: string
): Promise<Shipment | null> {
  const docRef = doc(db, "shipments", normaliseTrackingCode(trackingCode));
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) {
    return null;
  }
  return decodeShipment(snapshot.data());
}

/**
 * Updates specific fields of an existing shipment record in Firestore.
 */
export async function updateShipmentRecord(
  id: string,
  updates: Partial<Shipment>
): Promise<void> {
  const docRef = doc(db, "shipments", id);

  // The polyline is stored flat, so an update that touches it needs encoding.
  const payload: Partial<StoredShipment> = updates.routeCoordinates
    ? { ...updates, routeCoordinates: updates.routeCoordinates.flat() }
    : (updates as Partial<StoredShipment>);

  await updateDoc(docRef, {
    ...payload,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Replaces a shipment record with the supplied document.
 *
 * Used when the shape of the record changes rather than just its values —
 * for example when a hold gate is released, where the pause fields have to
 * disappear instead of being blanked out.
 */
export async function replaceShipmentRecord(
  id: string,
  shipment: Shipment
): Promise<void> {
  const docRef = doc(db, "shipments", id);
  await setDoc(docRef, {
    ...encodeShipment({ ...shipment, id }),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Real-time listener for live updates on a specific shipment document.
 * Returns an unsubscribe function to remove the listener.
 */
export function listenToShipmentRecord(
  id: string,
  callback: (shipment: Shipment | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const docRef = doc(db, "shipments", id);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(decodeShipment(snapshot.data()));
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error(`Firestore subscription error on shipment ${id}:`, error);
      if (onError) onError(error);
    }
  );
}

/**
 * Retrieves a list of recent shipments ordered by creation date descending.
 */
export async function listShipments(limitCount: number = 50): Promise<Shipment[]> {
  const q = query(
    shipmentsCollection,
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => decodeShipment(docSnap.data()));
}

/**
 * Real-time listener for the shipments collection, newest first.
 * Returns an unsubscribe function to remove the listener.
 */
export function listenToShipments(
  limitCount: number,
  callback: (shipments: Shipment[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    shipmentsCollection,
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((docSnap) => decodeShipment(docSnap.data())));
    },
    (error) => {
      console.error("Firestore subscription error on shipments:", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Aggregate counters for the operations dashboard.
 */
export interface ShipmentCounts {
  total: number;
  inTransit: number;
  onHold: number;
  delivered: number;
}

/**
 * Counts shipments across the statuses the dashboard reports on.
 */
export async function getShipmentCounts(): Promise<ShipmentCounts> {
  const [total, inTransit, onHold, delivered] = await Promise.all([
    getCountFromServer(shipmentsCollection),
    getCountFromServer(
      query(shipmentsCollection, where("status", "==", "in_transit"))
    ),
    getCountFromServer(
      query(shipmentsCollection, where("isPaused", "==", true))
    ),
    getCountFromServer(
      query(shipmentsCollection, where("status", "==", "delivered"))
    ),
  ]);

  return {
    total: total.data().count,
    inTransit: inTransit.data().count,
    onHold: onHold.data().count,
    delivered: delivered.data().count,
  };
}

/**
 * Mode breakdown for shipments created inside the current calendar month.
 */
export interface MonthlyModeBreakdown {
  ocean: number;
  air: number;
  ground: number; // road and rail
  total: number;
}

/**
 * Counts this month's shipments per mode.
 */
export async function getMonthlyModeBreakdown(): Promise<MonthlyModeBreakdown> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const q = query(
    shipmentsCollection,
    where("createdAt", ">=", monthStart.toISOString())
  );
  const snapshot = await getDocs(q);

  const breakdown: MonthlyModeBreakdown = {
    ocean: 0,
    air: 0,
    ground: 0,
    total: 0,
  };

  for (const docSnap of snapshot.docs) {
    const shipment = docSnap.data() as Shipment;
    breakdown.total += 1;

    if (shipment.mode === "ocean") breakdown.ocean += 1;
    else if (shipment.mode === "air") breakdown.air += 1;
    else breakdown.ground += 1; // road and rail
  }

  return breakdown;
}

/**
 * Counts the registered platform accounts.
 */
export async function getPlatformUserCount(): Promise<number> {
  const snapshot = await getCountFromServer(collection(db, "users"));
  return snapshot.data().count;
}

/**
 * Creates a new client/platform user in Firestore without password requirements.
 */
export async function createPlatformUserRecord(
  userData: Omit<PlatformUser, "id" | "createdAt">
): Promise<PlatformUser> {
  const userRef = doc(collection(db, "users"));
  const newUser: PlatformUser = {
    ...userData,
    id: userRef.id,
    connectionStatus: userData.connectionStatus || "pending",
    emailUpdatesEnabled: userData.emailUpdatesEnabled ?? true,
    linkedShipmentIds: userData.linkedShipmentIds || [],
    status: userData.status || "active",
    createdAt: new Date().toISOString(),
  };

  await setDoc(userRef, newUser);
  return newUser;
}

/**
 * Updates specific fields of an existing platform user.
 */
export async function updatePlatformUserRecord(
  id: string,
  updates: Partial<PlatformUser>
): Promise<void> {
  const userRef = doc(db, "users", id);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Fetches a single platform user record by ID.
 */
export async function getPlatformUserRecord(id: string): Promise<PlatformUser | null> {
  const userRef = doc(db, "users", id);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data() as PlatformUser;
}

/**
 * Real-time listener for a single platform user document.
 */
export function listenToPlatformUserRecord(
  id: string,
  callback: (user: PlatformUser | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const userRef = doc(db, "users", id);
  return onSnapshot(
    userRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as PlatformUser);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error(`Firestore subscription error on user ${id}:`, error);
      if (onError) onError(error);
    }
  );
}

/**
 * Deletes a platform user record from Firestore.
 */
export async function deletePlatformUserRecord(id: string): Promise<void> {
  const userRef = doc(db, "users", id);
  await deleteDoc(userRef);
}

/**
 * Retrieves a list of platform users, newest first.
 */
export async function listPlatformUsers(limitCount: number = 100): Promise<PlatformUser[]> {
  const usersCollection = collection(db, "users");
  const q = query(usersCollection, orderBy("createdAt", "desc"), limit(limitCount));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => docSnap.data() as PlatformUser);
}

/**
 * Real-time listener for the platform users collection.
 */
export function listenToPlatformUsers(
  callback: (users: PlatformUser[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const usersCollection = collection(db, "users");
  const q = query(usersCollection, orderBy("createdAt", "desc"), limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((docSnap) => docSnap.data() as PlatformUser));
    },
    (error) => {
      console.error("Firestore subscription error on users:", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Links a shipment tracking ID to a user, and updates the shipment's linkedUserIds.
 */
export async function linkShipmentToUser(userId: string, shipmentId: string): Promise<void> {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    linkedShipmentIds: arrayUnion(shipmentId),
  });

  try {
    const shipmentRef = doc(db, "shipments", shipmentId);
    const snap = await getDoc(shipmentRef);
    if (snap.exists()) {
      await updateDoc(shipmentRef, {
        linkedUserIds: arrayUnion(userId),
      });
    }
  } catch (err) {
    console.warn("Could not sync linkedUserIds on shipment document:", err);
  }
}

/**
 * Unlinks a shipment tracking ID from a user, and updates the shipment's linkedUserIds.
 */
export async function unlinkShipmentFromUser(userId: string, shipmentId: string): Promise<void> {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    linkedShipmentIds: arrayRemove(shipmentId),
  });

  try {
    const shipmentRef = doc(db, "shipments", shipmentId);
    const snap = await getDoc(shipmentRef);
    if (snap.exists()) {
      await updateDoc(shipmentRef, {
        linkedUserIds: arrayRemove(userId),
      });
    }
  } catch (err) {
    console.warn("Could not remove linkedUserIds on shipment document:", err);
  }
}

/**
 * Deletes a shipment from Firestore and cascades removal across all linked users.
 */
export async function deleteShipmentRecord(shipmentId: string): Promise<void> {
  // 1. Cascade wipe: Remove this shipment ID from every user who has it linked
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    const updatePromises: Promise<any>[] = [];

    for (const userDoc of usersSnap.docs) {
      const uData = userDoc.data() as PlatformUser;
      if (uData.linkedShipmentIds && uData.linkedShipmentIds.includes(shipmentId)) {
        updatePromises.push(
          updateDoc(doc(db, "users", userDoc.id), {
            linkedShipmentIds: arrayRemove(shipmentId),
          })
        );
      }
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
  } catch (err) {
    console.warn("Error cascading shipment unlink across users:", err);
  }

  // 2. Delete the shipment document itself
  const shipmentRef = doc(db, "shipments", shipmentId);
  await deleteDoc(shipmentRef);
}

/**
 * Marks a user as connected (verified active) when they visit their tracking link.
 */
export async function markUserConnected(userId: string): Promise<void> {
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const data = snap.data() as PlatformUser;
    await updateDoc(userRef, {
      connectionStatus: "connected",
      firstConnectedAt: data.firstConnectedAt || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    });
  }
}
