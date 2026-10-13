/**
 * scripts/seed-firestore.js
 * Database Seeding Script for Café Compass Firestore (default)
 * 
 * Fills Firestore collections:
 *   - menu (12 specialty food & beverage items)
 *   - zones (4 architectural café sectors with static features & photos)
 *   - pods (initial communal open tables)
 *   - orders (initial bar queue orders)
 * 
 * Note: Instantaneous data (like real-time fluctuating decibels) remains
 * managed dynamically by the simulation engine, as requested.
 * 
 * Usage:
 *   node scripts/seed-firestore.js [optional-project-id]
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// 1. Initial Data Models
const seedZones = [
    {
        id: 'zone-a',
        name: 'Zone A',
        sector: 'Sector 01',
        description: 'Quiet Work Nook',
        imageUrl: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80',
        features: ['Acoustic fabric baffles', 'Dual 100W PD outlets at every booth', 'Zero-speaker sound floor', 'Ergonomic task seating'],
        targetDecibels: 50,
        maxPatrons: 20,
        speakerVolume: 25,
        speakerLabel: 'Zone Speakers',
        tempCelsius: 21.5,
        metricExtra: '620 ppm CO2',
        status: 'calm',
        highlightNote: 'Optimal for deep focus, reading, and solitary work.',
    },
    {
        id: 'zone-b',
        name: 'Zone B',
        sector: 'Sector 02',
        description: 'Central Espresso Bar',
        imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
        features: ['La Marzocco KB90 3-Group', 'Direct barista dialogue', 'Communal bar rail', 'Upbeat ambient rhythm'],
        targetDecibels: 65,
        maxPatrons: 20,
        speakerVolume: 60,
        speakerLabel: 'Bar Speakers',
        tempCelsius: 22.8,
        metricExtra: '710 ppm CO2',
        status: 'moderate',
        highlightNote: 'Vibrant atmosphere with aroma of freshly extracted espresso.',
    },
    {
        id: 'zone-c',
        name: 'Zone C',
        sector: 'Sector 03',
        description: 'Sunroom Glass Solarium',
        imageUrl: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1200&q=80',
        features: ['Diffused 1,280 lx daylight', 'Botanical foliage & air purifying plants', 'Spacious group tables', 'Low-tempo ambient acoustics'],
        targetDecibels: 52,
        maxPatrons: 15,
        speakerVolume: 35,
        speakerLabel: 'Acoustic Solarium',
        tempCelsius: 24.1,
        metricExtra: '1,280 lx Sunlight',
        status: 'calm',
        highlightNote: 'Flooded with natural sunlight; perfect for collaborative brainstorming.',
    },
    {
        id: 'zone-d',
        name: 'Zone D',
        sector: 'Sector 04',
        description: 'Outdoor Garden Terrace',
        imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80',
        features: ['Fresh air circulation', 'Weather-protected canvas canopy', 'Pet-friendly patio', 'Gentle natural soundscape'],
        targetDecibels: 55,
        maxPatrons: 16,
        speakerVolume: 0,
        speakerLabel: 'Outdoor Audio (Muted)',
        tempCelsius: 19.2,
        metricExtra: '8 km/h NW Breeze',
        status: 'calm',
        highlightNote: 'Breezy garden seating shaded by Japanese maples.',
    },
];

const seedMenu = [
    // Coffee
    {
        id: 'menu-ethiopian-pourover',
        name: 'Single-Origin Ethiopian Gesha (V60)',
        category: 'Coffee',
        price: '$7.00',
        description: 'Hand-poured filter brew with delicate notes of jasmine, bergamot, and ripe peach nectar.',
        imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
        available: true,
        tags: ['Pour-over', 'Single Origin', 'Floral'],
        sensoryNotes: 'Delicate floral jasmine, high cognitive clarity',
    },
    {
        id: 'menu-flat-white',
        name: 'Velvet Oat Flat White',
        category: 'Coffee',
        price: '$5.50',
        description: 'Double ristretto of Colombia Huila folded into silky textured oat milk.',
        imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80',
        available: true,
        tags: ['Espresso', 'Oat Milk', 'Smooth'],
        sensoryNotes: 'Toasted hazelnut, velvety micro-foam, rich chocolate finish',
    },
    {
        id: 'menu-nitro-coldbrew',
        name: 'Nitrogen-Infused Cold Brew',
        category: 'Coffee',
        price: '$6.00',
        description: 'Steeped for 20 hours cold and poured from tap with a cascading creamy head.',
        imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80',
        available: true,
        tags: ['Cold Brew', 'Draft', 'High Caffeine'],
        sensoryNotes: 'Deep cocoa, low acidity, long clean finish',
    },
    {
        id: 'menu-cortado',
        name: 'Spanish Cortado 1:1',
        category: 'Coffee',
        price: '$4.75',
        description: 'Equal parts dense double espresso and warm textured milk in a Gibraltar glass.',
        imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
        available: true,
        tags: ['Classic', 'Espresso', 'Bold'],
        sensoryNotes: 'Caramelized brown sugar, balanced cocoa',
    },
    // Tea
    {
        id: 'menu-matcha-latte',
        name: 'Ceremonial Uji Matcha Latte',
        category: 'Tea',
        price: '$6.50',
        description: 'Stone-ground Kyoto matcha whisked fresh with warm oat milk and wildflower honey.',
        imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=800&q=80',
        available: true,
        tags: ['Kyoto Matcha', 'Antioxidant', 'L-Theanine'],
        sensoryNotes: 'Earthy umami sweetness, clean sustained calm focus',
    },
    {
        id: 'menu-hojicha-drip',
        name: 'Charcoal-Roasted Hojicha Tea',
        category: 'Tea',
        price: '$5.25',
        description: 'Slow-steeped roasted green tea leaves with a toasty aroma and low caffeine.',
        imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
        available: true,
        tags: ['Low Caffeine', 'Smoky', 'Calming'],
        sensoryNotes: 'Toasted grains, soothing woodsy warmth',
    },
    // Pastries
    {
        id: 'menu-almond-croissant',
        name: 'Double-Baked Almond Croissant',
        category: 'Pastries',
        price: '$5.75',
        description: 'Flaky laminated butter pastry filled with almond frangipane cream and toasted sliced almonds.',
        imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80',
        available: true,
        tags: ['Bakery', 'Almond', 'Flaky'],
        sensoryNotes: 'Crisp buttery crust, rich sweet almond filling',
    },
    {
        id: 'menu-cardamom-bun',
        name: 'Swedish Cardamom Knot',
        category: 'Pastries',
        price: '$5.00',
        description: 'Freshly ground green cardamom twist glazed with vanilla syrup and pearl sugar.',
        imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
        available: true,
        tags: ['Spiced', 'Nordic', 'Fresh Baked'],
        sensoryNotes: 'Fragrant crushed cardamom seeds, soft caramelized crumb',
    },
    {
        id: 'menu-pistachio-tart',
        name: 'Bronte Pistachio & Raspberry Tart',
        category: 'Pastries',
        price: '$6.50',
        description: 'Crisp sablée crust, Sicilian pistachio ganache, topped with fresh wild raspberries.',
        imageUrl: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=800&q=80',
        available: true,
        tags: ['Pistachio', 'Tart', 'Artisanal'],
        sensoryNotes: 'Nutty indulgence with bright berry acidity',
    },
    // Light Bites
    {
        id: 'menu-avocado-tartine',
        name: 'Sourdough Avocado Tartine',
        category: 'Light Bites',
        price: '$11.50',
        description: 'Grilled country sourdough, smashed Hass avocado, radish coins, microgreens, and lemon oil.',
        imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
        available: true,
        tags: ['Sourdough', 'Avocado', 'Savory'],
        sensoryNotes: 'Crisp toasted crumb, luscious creamy avocado, citrus lift',
    },
    {
        id: 'menu-burrata-toast',
        name: 'Truffled Burrata & Fig Toast',
        category: 'Light Bites',
        price: '$13.00',
        description: 'Warm Puglia burrata, roasted mission figs, hot wildflower honey, and white truffle essence.',
        imageUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=800&q=80',
        available: true,
        tags: ['Burrata', 'Gourmet', 'Truffle'],
        sensoryNotes: 'Creamy mozzarella stracciatella, sweet balsamic figs',
    },
    {
        id: 'menu-granola-bowl',
        name: 'Greek Yogurt Superfood Bowl',
        category: 'Light Bites',
        price: '$9.00',
        description: 'Strained Greek yogurt, house maple pecan granola, seasonal blueberries, and chia seeds.',
        imageUrl: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=800&q=80',
        available: true,
        tags: ['Healthy', 'High Protein', 'Granola'],
        sensoryNotes: 'Crunchy roasted nuts, velvety tart yogurt, fresh berries',
    },
];

const seedPods = [
    {
        id: 'pod-table-4',
        tableNumber: 4,
        zoneId: 'zone-b',
        title: 'Table 4: Specialty Coffee Craft & Creative Hobbies',
        participantCount: 3,
        maxParticipants: 4,
        interestTags: ['Specialty Coffee', 'Creative Writing', 'Design & Architecture'],
        geminiIcebreaker: 'What brew method are you currently enjoying at home, and what creative project has your focus today?',
        status: 'active',
        participants: [
            {
                nickname: 'David',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                role: 'Coffee Enthusiast',
                tags: ['Specialty Coffee', 'Design'],
            },
            {
                nickname: 'Maya',
                avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
                role: 'Product Designer',
                tags: ['Design & Architecture', 'Photography'],
            },
            {
                nickname: 'Alex',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
                role: 'Writer',
                tags: ['Creative Writing', 'Books & Literature'],
            },
        ],
    },
    {
        id: 'pod-table-9',
        tableNumber: 9,
        zoneId: 'zone-c',
        title: 'Table 9: Books, Startups & Sunday Reading',
        participantCount: 2,
        maxParticipants: 4,
        interestTags: ['Books & Literature', 'Startups & Tech', 'Music & Vinyl'],
        geminiIcebreaker: 'What book or soundtrack is keeping you company this morning?',
        status: 'active',
        participants: [
            {
                nickname: 'Elena',
                avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
                role: 'Architect',
                tags: ['Books & Literature', 'Design'],
            },
            {
                nickname: 'Chloe',
                avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
                role: 'Indie Builder',
                tags: ['Startups & Tech', 'Music & Vinyl'],
            },
        ],
    },
];

const seedOrders = [
    {
        id: 'ord-101',
        customerName: 'Guest (Hannah)',
        zoneId: 'zone-a',
        zoneName: 'Zone A — Quiet Work Nook',
        drinkName: 'Single-Origin Ethiopian Gesha (V60)',
        description: 'Delicate floral jasmine, high cognitive clarity',
        status: 'queued',
        timestamp: '3m ago',
        waitMin: 4,
        groupSize: 1,
    },
    {
        id: 'ord-102',
        customerName: 'Design Duo (Elena & Sam)',
        zoneId: 'zone-c',
        zoneName: 'Zone C — Sunroom Solarium',
        drinkName: 'Ceremonial Uji Matcha Latte',
        description: 'Earthy umami sweetness, clean sustained calm focus',
        status: 'brewing',
        timestamp: '5m ago',
        waitMin: 2,
        groupSize: 2,
    },
    {
        id: 'ord-103',
        customerName: 'Solitary Reader',
        zoneId: 'zone-a',
        zoneName: 'Zone A — Quiet Work Nook',
        drinkName: 'Nitrogen-Infused Cold Brew',
        description: 'Deep cocoa, low acidity, long clean finish',
        status: 'ready',
        timestamp: '8m ago',
        waitMin: 0,
        groupSize: 1,
    },
];

async function seedDatabase() {
    console.log('\n======================================================');
    console.log(' Café Compass — Seeding Firestore (default) Database');
    console.log('======================================================\n');

    const localSaPath = path.resolve(__dirname, '..', 'service-account.json');
    const envSaPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const projectIdArg = process.argv[2] || process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;

    let credential = null;
    let detectedProjectId = projectIdArg;

    if (fs.existsSync(localSaPath)) {
        console.log(`[AUTH] Using service account: ${localSaPath}`);
        const saData = JSON.parse(fs.readFileSync(localSaPath, 'utf8'));
        detectedProjectId = detectedProjectId || saData.project_id;
        credential = admin.credential.cert(saData);
    } else if (envSaPath && fs.existsSync(envSaPath)) {
        console.log(`[AUTH] Using GOOGLE_APPLICATION_CREDENTIALS: ${envSaPath}`);
        const saData = JSON.parse(fs.readFileSync(envSaPath, 'utf8'));
        detectedProjectId = detectedProjectId || saData.project_id;
        credential = admin.credential.cert(saData);
    } else {
        console.log('[AUTH] Using Application Default Credentials (ADC)...');
        try {
            credential = admin.credential.applicationDefault();
        } catch {
            console.error('\n❌ Authentication Configuration Missing!');
            console.error('Please place service-account.json in root or run: gcloud auth application-default login');
            process.exit(1);
        }
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential,
            projectId: detectedProjectId || undefined,
        });
    }

    const db = admin.firestore();
    const batch = db.batch();

    console.log(`[SEED] Preparing batch operations for Project: ${detectedProjectId || 'default'}...`);

    // 1. Seed Menu
    console.log(`  -> Seeding ${seedMenu.length} menu items into 'menu' collection...`);
    seedMenu.forEach((item) => {
        const ref = db.collection('menu').doc(item.id);
        batch.set(ref, item, { merge: true });
    });

    // 2. Seed Zones
    console.log(`  -> Seeding ${seedZones.length} zones into 'zones' collection...`);
    seedZones.forEach((zone) => {
        const ref = db.collection('zones').doc(zone.id);
        batch.set(ref, zone, { merge: true });
    });

    // 3. Seed Pods
    console.log(`  -> Seeding ${seedPods.length} pods into 'pods' collection...`);
    seedPods.forEach((pod) => {
        const ref = db.collection('pods').doc(pod.id);
        batch.set(ref, pod, { merge: true });
    });

    // 4. Seed Orders
    console.log(`  -> Seeding ${seedOrders.length} orders into 'orders' collection...`);
    seedOrders.forEach((order) => {
        const ref = db.collection('orders').doc(order.id);
        batch.set(ref, {
            ...order,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    });

    console.log('[COMMIT] Committing batch write to Firestore...');
    await batch.commit();

    console.log('\n======================================================');
    console.log(' ✅ SEED COMPLETE! Your Firestore DB is now populated:');
    console.log('    • menu:   12 items (Coffee, Tea, Pastries, Bites)');
    console.log('    • zones:  4 zones (Quiet Nook, Bar, Solarium, Terrace)');
    console.log('    • pods:   2 active communal table pods');
    console.log('    • orders: 3 initial orders in Bar Queue');
    console.log('======================================================\n');
}

seedDatabase().catch((err) => {
    console.error('\n❌ Seeding failed:', err.message);
    process.exit(1);
});
