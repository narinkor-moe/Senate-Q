import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  onSnapshot,
  setDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: Must pass databaseId when specified in firebaseConfig
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

// Test Firestore connection on boot as required by guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore: Client appears to be offline or initial connection check failed.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export interface SharedCalendarData {
  customHolidays?: Record<string, string>;
  specialMeetings?: Record<string, string>;
  sessionClosingDate?: string;
  updatedAt?: string;
}

const CALENDAR_DOC_PATH = 'calendar_config';
const CALENDAR_DOC_ID = 'global';

/**
 * Subscribes to real-time calendar configuration changes across all devices.
 */
export function subscribeSharedCalendar(
  onData: (data: SharedCalendarData, exists: boolean) => void,
  onError?: (err: unknown) => void
) {
  const docRef = doc(db, CALENDAR_DOC_PATH, CALENDAR_DOC_ID);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SharedCalendarData;
        onData(data, true);
      } else {
        onData({}, false);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `${CALENDAR_DOC_PATH}/${CALENDAR_DOC_ID}`);
      if (onError) onError(error);
    }
  );
}

/**
 * Saves calendar configuration to Cloud Firestore so all devices get identical data.
 */
export async function saveSharedCalendarToCloud(data: Partial<SharedCalendarData>) {
  const docRef = doc(db, CALENDAR_DOC_PATH, CALENDAR_DOC_ID);
  const payload: SharedCalendarData = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CALENDAR_DOC_PATH}/${CALENDAR_DOC_ID}`);
    throw error;
  }
}
