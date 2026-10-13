import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';
import { MenuItem, CafeOrder, OpenTablePod, Zone } from './types';

let firestoreInstance: admin.firestore.Firestore | null = null;

export function getFirestore(): admin.firestore.Firestore {
    if (firestoreInstance) {
        return firestoreInstance;
    }

    if (!admin.apps.length) {
        const localSaPath = path.resolve(process.cwd(), 'service-account.json');
        const envSaPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;

        let credential = null;

        if (fs.existsSync(localSaPath)) {
            try {
                const saData = JSON.parse(fs.readFileSync(localSaPath, 'utf8'));
                credential = admin.credential.cert(saData);
            } catch (err) {
                console.warn('[FIRESTORE] Failed parsing local service-account.json:', err);
            }
        } else if (envSaPath && fs.existsSync(envSaPath)) {
            try {
                const saData = JSON.parse(fs.readFileSync(envSaPath, 'utf8'));
                credential = admin.credential.cert(saData);
            } catch (err) {
                console.warn('[FIRESTORE] Failed parsing GOOGLE_APPLICATION_CREDENTIALS:', err);
            }
        }

        if (!credential) {
            // Use Application Default Credentials (ADC) - works locally via 'gcloud auth' and in Cloud Run automatically
            try {
                credential = admin.credential.applicationDefault();
            } catch (err) {
                console.warn('[FIRESTORE] ADC initialization fallback:', err);
            }
        }

        admin.initializeApp({
            credential: credential || undefined,
            projectId: projectId || undefined,
        });
    }

    firestoreInstance = admin.firestore();
    // Configure settings for serverless environments
    try {
        firestoreInstance.settings({ ignoreUndefinedProperties: true });
    } catch { }

    return firestoreInstance;
}

// Typed collection accessors
export const collections = {
    menu: () => getFirestore().collection('menu'),
    orders: () => getFirestore().collection('orders'),
    pods: () => getFirestore().collection('pods'),
    zones: () => getFirestore().collection('zones'),
};
