/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  deleteDoc, 
  writeBatch,
  disableNetwork,
  terminate
} from 'firebase/firestore';
import { Student, NotificationLog, SchoolApplicationTemplate, MaterialItem, MasterChecklistItem } from '../types';
import config from '../../firebase-applet-config.json';

// Safe Initialize Firebase
let firebaseApp: any;
let firestoreDb: any = null;

try {
  const firebaseConfig = (config || {}) as Record<string, string>;
  firebaseApp = initializeApp({
    apiKey: firebaseConfig.apiKey || '',
    authDomain: firebaseConfig.authDomain || '',
    projectId: firebaseConfig.projectId || '',
    storageBucket: firebaseConfig.storageBucket || '',
    messagingSenderId: firebaseConfig.messagingSenderId || '',
    appId: firebaseConfig.appId || ''
  });
  firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || '(default)');
} catch (e) {
  console.warn('[Firebase Init Warning]', e);
}

export const db = firestoreDb;

const TODAY_KEY = new Date().toISOString().split('T')[0];
let cloudQuotaExceeded = (() => {
  try {
    const savedQuotaDate = localStorage.getItem('advisor_quota_exceeded_date');
    if (savedQuotaDate) {
      if (savedQuotaDate === TODAY_KEY) {
        return true;
      } else {
        localStorage.removeItem('advisor_quota_exceeded_flag');
        localStorage.removeItem('advisor_quota_exceeded_date');
      }
    }
    const flag = localStorage.getItem('advisor_quota_exceeded_flag');
    if (flag === 'true') {
      return true;
    }
  } catch (e) {}
  return false;
})();

if (cloudQuotaExceeded && db) {
  try {
    disableNetwork(db).catch(() => {});
    terminate(db).catch(() => {});
  } catch (e) {}
  console.warn('[Firestore Quota Limit] Marked quota exceeded. Operating in offline local mode.');
}

export function getIsQuotaExceeded(): boolean {
  return cloudQuotaExceeded || !db;
}

function markQuotaExceeded() {
  if (!cloudQuotaExceeded) {
    cloudQuotaExceeded = true;
    try {
      localStorage.setItem('advisor_quota_exceeded_flag', 'true');
      localStorage.setItem('advisor_quota_exceeded_date', TODAY_KEY);
    } catch (e) {}
    if (db) {
      try {
        disableNetwork(db).catch(() => {});
        terminate(db).catch(() => {});
      } catch (e) {}
    }
    console.warn('[Firestore Quota Limit] Quota limit reached. Automatically operating in offline local mode.');
  }
}

/**
 * Recursively removes undefined properties or converts undefined values to null for Firestore compatibility.
 */
function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (data instanceof Date) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    const val = (data as Record<string, any>)[key];
    if (val !== undefined) {
      cleaned[key] = sanitizeForFirestore(val);
    }
  }
  return cleaned as T;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const code = error && typeof error === 'object' && 'code' in error ? String((error as any).code) : '';
  if (
    code.includes('resource-exhausted') || 
    code.includes('quota') || 
    errMsg.includes('resource-exhausted') || 
    errMsg.includes('Quota limit exceeded') || 
    errMsg.includes('quota') ||
    errMsg.includes('Free daily write units per project')
  ) {
    markQuotaExceeded();
    return;
  }
  if (cloudQuotaExceeded || errMsg.includes('client is offline') || code.includes('failed-precondition') || code.includes('unavailable')) {
    return;
  }
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

/**
 * Save a single student to Firestore
 */
export async function dbSaveStudent(student: Student): Promise<void> {
  if (cloudQuotaExceeded || !db) return;
  const path = `students/${student.id}`;
  try {
    const studentRef = doc(db, 'students', student.id);
    const cleanData = sanitizeForFirestore(student);
    await setDoc(studentRef, cleanData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a student from Firestore
 */
export async function dbDeleteStudent(studentId: string): Promise<void> {
  if (cloudQuotaExceeded || !db) return;
  const path = `students/${studentId}`;
  try {
    const studentRef = doc(db, 'students', studentId);
    await deleteDoc(studentRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Load all students from Firestore
 */
export async function dbLoadStudents(): Promise<Student[]> {
  if (cloudQuotaExceeded || !db) return [];
  const path = 'students';
  try {
    const querySnapshot = await getDocs(collection(db, 'students'));
    const students: Student[] = [];
    querySnapshot.forEach((docSnap) => {
      students.push(docSnap.data() as Student);
    });
    return students;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Save custom templates and options to settings collection
 */
export async function dbSaveSystemSettings(settings: {
  globalTemplates: MaterialItem[];
  schoolTemplates: MaterialItem[];
  roundOptions: string[];
  applicationTemplates: SchoolApplicationTemplate[];
  masterChecklist?: MasterChecklistItem[];
  lastSaveTime?: string;
  lastBackupTime?: string;
  lastSyncedTime?: string;
}): Promise<void> {
  if (cloudQuotaExceeded || !db) return;
  const path = 'settings/system';
  try {
    const settingsRef = doc(db, 'settings', 'system');
    const cleanData = sanitizeForFirestore({
      id: 'system',
      ...settings
    });
    await setDoc(settingsRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Load system settings from Firestore
 */
export async function dbLoadSystemSettings(): Promise<{
  globalTemplates: MaterialItem[];
  schoolTemplates: MaterialItem[];
  roundOptions: string[];
  applicationTemplates: SchoolApplicationTemplate[];
  masterChecklist?: MasterChecklistItem[];
  lastSaveTime?: string;
  lastBackupTime?: string;
  lastSyncedTime?: string;
} | null> {
  if (cloudQuotaExceeded || !db) return null;
  const path = 'settings/system';
  try {
    const docRef = doc(db, 'settings', 'system');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        globalTemplates: data.globalTemplates || [],
        schoolTemplates: data.schoolTemplates || [],
        roundOptions: data.roundOptions || [],
        applicationTemplates: data.applicationTemplates || [],
        masterChecklist: data.masterChecklist || [],
        lastSaveTime: data.lastSaveTime,
        lastBackupTime: data.lastBackupTime,
        lastSyncedTime: data.lastSyncedTime,
      };
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Save a notification to Firestore
 */
export async function dbSaveNotification(notification: NotificationLog): Promise<void> {
  if (cloudQuotaExceeded || !db) return;
  const path = `notifications/${notification.id}`;
  try {
    const notifRef = doc(db, 'notifications', notification.id);
    const cleanData = sanitizeForFirestore(notification);
    await setDoc(notifRef, cleanData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Load all notifications from Firestore
 */
export async function dbLoadNotifications(): Promise<NotificationLog[]> {
  if (cloudQuotaExceeded || !db) return [];
  const path = 'notifications';
  try {
    const querySnapshot = await getDocs(collection(db, 'notifications'));
    const notifications: NotificationLog[] = [];
    querySnapshot.forEach((docSnap) => {
      notifications.push(docSnap.data() as NotificationLog);
    });
    // Sort notifications by timestamp descending
    return notifications.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Save multiple students in batch (useful for seeding/migration)
 */
export async function dbSaveStudentsBatch(studentsList: Student[]): Promise<void> {
  if (cloudQuotaExceeded || !db) return;
  const path = 'students';
  try {
    const batch = writeBatch(db);
    studentsList.forEach((student) => {
      const ref = doc(db, 'students', student.id);
      const cleanData = sanitizeForFirestore(student);
      batch.set(ref, cleanData);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Save multiple notifications in batch
 */
export async function dbSaveNotificationsBatch(notifsList: NotificationLog[]): Promise<void> {
  if (cloudQuotaExceeded || !db) return;
  const path = 'notifications';
  try {
    const batch = writeBatch(db);
    notifsList.forEach((notif) => {
      const ref = doc(db, 'notifications', notif.id);
      const cleanData = sanitizeForFirestore(notif);
      batch.set(ref, cleanData);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
