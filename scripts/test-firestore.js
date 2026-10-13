/**
 * scripts/test-firestore.js
 * Connectivity Verification Script for Google Cloud Firestore (default)
 * 
 * Usage:
 *   node scripts/test-firestore.js [optional-project-id]
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

async function testConnection() {
    console.log('\n======================================================');
    console.log(' Café Compass — Firestore (default) Connectivity Test');
    console.log('======================================================\n');

    // 1. Look for service-account.json or environment variables
    const localSaPath = path.resolve(__dirname, '..', 'service-account.json');
    const envSaPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const projectIdArg = process.argv[2] || process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;

    let credential = null;
    let detectedProjectId = projectIdArg;

    if (fs.existsSync(localSaPath)) {
        console.log(`[AUTH] Found local service account file: ${localSaPath}`);
        const saData = JSON.parse(fs.readFileSync(localSaPath, 'utf8'));
        detectedProjectId = detectedProjectId || saData.project_id;
        credential = admin.credential.cert(saData);
    } else if (envSaPath && fs.existsSync(envSaPath)) {
        console.log(`[AUTH] Found GOOGLE_APPLICATION_CREDENTIALS: ${envSaPath}`);
        const saData = JSON.parse(fs.readFileSync(envSaPath, 'utf8'));
        detectedProjectId = detectedProjectId || saData.project_id;
        credential = admin.credential.cert(saData);
    } else {
        console.log('[AUTH] No service-account.json file detected.');
        console.log('[AUTH] Attempting Google Application Default Credentials (ADC)...');
        try {
            credential = admin.credential.applicationDefault();
        } catch (e) {
            console.error('\n❌ Authentication Configuration Missing!');
            console.error('Please either:');
            console.error('  1. Place your service-account.json file in the root of the project, OR');
            console.error('  2. Run: gcloud auth application-default login\n');
            process.exit(1);
        }
    }

    try {
        if (!admin.apps.length) {
            admin.initializeApp({
                credential,
                projectId: detectedProjectId || undefined,
            });
        }

        const db = admin.firestore();
        console.log(`[CONNECT] Connecting to Firestore instance...`);
        if (detectedProjectId) {
            console.log(`[PROJECT] Project ID: ${detectedProjectId}`);
        }

        // 2. Perform a test write and read
        const testRef = db.collection('_cafe_connectivity_test').doc('ping');
        const testPayload = {
            status: 'online',
            testTime: new Date().toISOString(),
            client: 'CafeCompass-LocalTester',
        };

        console.log('[WRITE] Writing test heartbeat document...');
        await testRef.set(testPayload);

        console.log('[READ] Reading back test document...');
        const doc = await testRef.get();

        if (doc.exists && doc.data().status === 'online') {
            console.log('\n======================================================');
            console.log(' ✅ SUCCESS: Firestore (default) connection verified!');
            console.log(' Timestamp:', doc.data().testTime);
            console.log(' Your local environment has full read/write access.');
            console.log('======================================================\n');

            // Clean up test document
            await testRef.delete();
            process.exit(0);
        } else {
            console.error('❌ Document was written but read verification failed.');
            process.exit(1);
        }
    } catch (error) {
        console.error('\n❌ Connection Failed:');
        console.error('Error Code:', error.code || 'UNKNOWN');
        console.error('Message:', error.message);

        if (error.code === 7 || error.message.includes('PERMISSION_DENIED')) {
            console.error('\nTip: Your Service Account or Google Account needs the "Cloud Datastore User" (roles/datastore.user) IAM role.');
        } else if (error.message.includes('Project')) {
            console.error('\nTip: Specify your Project ID: node scripts/test-firestore.js your-gcp-project-id');
        }
        process.exit(1);
    }
}

testConnection();
