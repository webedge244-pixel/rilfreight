import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  where,
  limit,
  orderBy,
  Firestore,
  CollectionReference,
  DocumentData,
  Unsubscribe,
} from "firebase/firestore";
import type { Shipment } from "@/shared/types";

// Firebase configuration for RILFREIGHT (project: webedge-96a41)
const firebaseConfig = {
  apiKey: "AIzaSyAdDYNMoUrTtBxhn_Box-rZNbUm55_ntZU",
  authDomain: "webedge-96a41.firebaseapp.com",
  projectId: "webedge-96a41",
  storageBucket: "webedge-96a41.firebasestorage.app",
  messagingSenderId: "972563936686",
  appId: "1:972563936686:web:def67f16178f34864ac43f",
  measurementId: "G-B7CSVWKR4V",
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
 * Creates or overwrites a shipment record in Firestore.
 * If shipment.id is provided, it uses it as the document ID; otherwise generates an auto-id.
 */
export async function createShipmentRecord(shipment: Shipment): Promise<string> {
  const docRef = shipment.id
    ? doc(db, "shipments", shipment.id)
    : doc(shipmentsCollection);
  
  const finalShipment: Shipment = {
    ...shipment,
    id: docRef.id,
    createdAt: shipment.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(docRef, finalShipment);
  return docRef.id;
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
  return snapshot.data() as Shipment;
}

/**
 * Fetches a single shipment record by its public tracking code (e.g. "RIL-8492-3019-US").
 */
export async function getShipmentByTrackingCode(
  trackingCode: string
): Promise<Shipment | null> {
  const q = query(
    shipmentsCollection,
    where("trackingCode", "==", trackingCode),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  return snapshot.docs[0].data() as Shipment;
}

/**
 * Updates specific fields of an existing shipment record in Firestore.
 */
export async function updateShipmentRecord(
  id: string,
  updates: Partial<Shipment>
): Promise<void> {
  const docRef = doc(db, "shipments", id);
  await updateDoc(docRef, {
    ...updates,
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
        callback(snapshot.data() as Shipment);
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
  return snapshot.docs.map((docSnap) => docSnap.data() as Shipment);
}
