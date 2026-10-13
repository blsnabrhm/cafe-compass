import {
    Zone,
    ZoneId,
    OpenTablePod,
    FeedbackTap,
    StaffAlert,
    ShiftMetrics,
    PatronSession,
    CafeOrder,
    MenuItem,
    StreamPayload,
} from './types';
import { collections } from './firestore';

// In-memory persistent reactive store with live SSE integration
class CafeStore {
    private zones: Map<ZoneId, Zone>;
    private pods: Map<string, OpenTablePod>;
    private menu: Map<string, MenuItem>;
    private feedback: FeedbackTap[];
    private alerts: Map<string, StaffAlert>;
    private sessions: Map<string, PatronSession>;
    private orders: Map<string, CafeOrder>;
    private metrics: ShiftMetrics;
    private listeners: Set<() => void>;
    private firestoreUnsubscribers: (() => void)[] = [];

    constructor() {
        this.listeners = new Set();
        this.zones = new Map();
        this.pods = new Map();
        this.menu = new Map();
        this.alerts = new Map();
        this.sessions = new Map();
        this.orders = new Map();
        this.feedback = [];

        this.metrics = {
            crowdNoiseDb: 54,
            queueForecastOrders: 8,
            avgTurnaroundMin: 3.8,
            sentimentPercent: 94,
            tapsRecorded: 142,
            activeSeatedCount: 48,
            focusCount: 28,
            openCount: 12,
            casualCount: 8,
            capacityPercent: 74,
        };

        this.initSeedData();
        this.initFirestoreSync();
    }

    private initFirestoreSync() {
        try {
            // 1. Menu Real-time Listener
            const unsubMenu = collections.menu().onSnapshot(
                (snapshot) => {
                    if (!snapshot.empty) {
                        snapshot.docs.forEach((doc) => {
                            const data = doc.data() as MenuItem;
                            this.menu.set(data.id, data);
                        });
                        this.notify();
                    }
                },
                (err) => console.warn('[FIRESTORE] Menu listener warning:', err.message)
            );
            this.firestoreUnsubscribers.push(unsubMenu);

            // 2. Orders Real-time Listener
            const unsubOrders = collections.orders().onSnapshot(
                (snapshot) => {
                    if (!snapshot.empty) {
                        snapshot.docs.forEach((doc) => {
                            const data = doc.data() as CafeOrder;
                            this.orders.set(data.id, data);
                        });
                        this.notify();
                    }
                },
                (err) => console.warn('[FIRESTORE] Orders listener warning:', err.message)
            );
            this.firestoreUnsubscribers.push(unsubOrders);

            // 3. Pods Real-time Listener
            const unsubPods = collections.pods().onSnapshot(
                (snapshot) => {
                    if (!snapshot.empty) {
                        snapshot.docs.forEach((doc) => {
                            const data = doc.data() as OpenTablePod;
                            this.pods.set(data.id, data);
                        });
                        this.notify();
                    }
                },
                (err) => console.warn('[FIRESTORE] Pods listener warning:', err.message)
            );
            this.firestoreUnsubscribers.push(unsubPods);

            // 4. Zones Metadata Listener (preserves live simulated decibels & occupancy)
            const unsubZones = collections.zones().onSnapshot(
                (snapshot) => {
                    if (!snapshot.empty) {
                        snapshot.docs.forEach((doc) => {
                            const data = doc.data() as Zone;
                            const current = this.zones.get(data.id as ZoneId);
                            this.zones.set(data.id as ZoneId, {
                                ...data,
                                decibels: current ? current.decibels : data.decibels || 50,
                                occupancyPercent: current ? current.occupancyPercent : data.occupancyPercent || 70,
                                currentPatrons: current ? current.currentPatrons : data.currentPatrons || 10,
                            });
                        });
                        this.notify();
                    }
                },
                (err) => console.warn('[FIRESTORE] Zones listener warning:', err.message)
            );
            this.firestoreUnsubscribers.push(unsubZones);
        } catch (err: any) {
            console.warn('[FIRESTORE] Sync init warning:', err?.message || err);
        }
    }

    private initSeedData() {
        const seedZones: Zone[] = [
            {
                id: 'zone-a',
                name: 'Zone A',
                sector: 'Sector 01',
                description: 'Quiet Work Nook',
                imageUrl: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1200&q=80',
                features: ['Acoustic fabric baffles', 'Dual 100W PD outlets at every booth', 'Zero-speaker sound floor', 'Ergonomic task seating'],
                decibels: 48,
                targetDecibels: 50,
                occupancyPercent: 80,
                currentPatrons: 16,
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
                decibels: 64,
                targetDecibels: 65,
                occupancyPercent: 85,
                currentPatrons: 17,
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
                decibels: 44,
                targetDecibels: 52,
                occupancyPercent: 60,
                currentPatrons: 9,
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
                decibels: 50,
                targetDecibels: 55,
                occupancyPercent: 50,
                currentPatrons: 8,
                maxPatrons: 16,
                speakerVolume: 0,
                speakerLabel: 'Outdoor Audio (Muted)',
                tempCelsius: 19.2,
                metricExtra: '8 km/h NW Breeze',
                status: 'calm',
                highlightNote: 'Breezy garden seating shaded by Japanese maples.',
            },
        ];

        seedZones.forEach((z) => this.zones.set(z.id, z));

        const seedMenu: MenuItem[] = [
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

        seedMenu.forEach((m) => this.menu.set(m.id, m));

        const seedOrders: CafeOrder[] = [
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
                status: 'preparing',
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

        seedOrders.forEach((o) => this.orders.set(o.id, o));

        const seedPods: OpenTablePod[] = [
            {
                id: 'pod-table-4',
                tableNumber: 4,
                zoneId: 'zone-b',
                title: 'Table 4: Specialty Coffee Craft & Creative Hobbies',
                participantCount: 3,
                maxParticipants: 4,
                interestTags: ['Specialty Coffee', 'Creative Writing', 'Design & Architecture'],
                geminiIcebreaker:
                    'What brew method are you currently enjoying at home, and what creative project has your focus today?',
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
                geminiIcebreaker:
                    'What book or soundtrack is keeping you company this morning?',
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

        seedPods.forEach((p) => this.pods.set(p.id, p));

        this.feedback = [
            {
                id: 'fb-1',
                title: '“Flat White was perfection!”',
                detail: 'Table 7 (Zone B) • Oat milk microfoam was velvety and smooth',
                badge: 'Barista #2',
                badgeType: 'primary',
                icon: 'thumb_up',
                timestamp: '1m ago',
                zoneId: 'zone-b',
            },
            {
                id: 'fb-2',
                title: '“Quiet sanctuary in Zone A”',
                detail: 'Table 3 (Zone A) • Minimal distractions and great natural focus',
                badge: 'Quiet Hours',
                badgeType: 'secondary',
                icon: 'volume_down',
                timestamp: '3m ago',
                zoneId: 'zone-a',
            },
        ];

        const seedAlerts: StaffAlert[] = [
            {
                id: 'alert-1',
                type: 'atmospheric_drift',
                priority: 'medium',
                title: 'Acoustic Drift Notice',
                headline: 'Zone A Volume Moderately Rising',
                description: 'Sound floor is approaching 50dB in Quiet Nook. Consider lowering ambient ceiling volume.',
                zoneId: 'zone-a',
                widgetIcon: 'volume_down',
                widgetText: 'Zone A at 48 dB (Target < 50 dB)',
                widgetTag: 'Staff Directives',
                primaryActionLabel: 'Dampen Music by -3 dB',
                actionCode: 'dampen_music',
                status: 'pending',
                timestamp: '2m ago',
            },
            {
                id: 'alert-2',
                type: 'community_spark',
                priority: 'info',
                title: 'Single-Origin Tasting',
                headline: 'Gesha Lot #4 Ready on Pour-Over Bar',
                description: 'Fresh batch of Ethiopian Gesha brewed on Kalita Wave. Offer complimentary tasting cups.',
                zoneId: 'zone-b',
                widgetIcon: 'wine_bar',
                widgetText: 'Gesha Lot #4 brewed on pour bar',
                widgetTag: 'Guest Hospitality',
                primaryActionLabel: 'Distribute Tasting Samples',
                actionCode: 'send_sample',
                status: 'pending',
                timestamp: '5m ago',
            },
        ];

        seedAlerts.forEach((a) => this.alerts.set(a.id, a));
    }

    // Subscribe to changes (for SSE broadcasts)
    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach((fn) => {
            try {
                fn();
            } catch (err) {
                console.error('Store listener error:', err);
            }
        });
    }

    // Menu Management
    public getMenuItems(): MenuItem[] {
        return Array.from(this.menu.values());
    }

    public getMenuItem(id: string): MenuItem | undefined {
        return this.menu.get(id);
    }

    public toggleMenuItemAvailability(id: string, available?: boolean): MenuItem | undefined {
        const item = this.menu.get(id);
        if (!item) return undefined;
        item.available = available !== undefined ? available : !item.available;
        this.menu.set(id, item);
        collections.menu().doc(id).update({ available: item.available }).catch((err) => {
            console.warn('[FIRESTORE] toggleMenuItemAvailability warning:', err.message);
        });
        this.notify();
        return item;
    }

    public addMenuItem(item: MenuItem): MenuItem {
        this.menu.set(item.id, item);
        collections.menu().doc(item.id).set(item).catch((err) => {
            console.warn('[FIRESTORE] addMenuItem warning:', err.message);
        });
        this.notify();
        return item;
    }

    public deleteMenuItem(id: string): boolean {
        const result = this.menu.delete(id);
        if (result) {
            collections.menu().doc(id).delete().catch((err) => {
                console.warn('[FIRESTORE] deleteMenuItem warning:', err.message);
            });
            this.notify();
        }
        return result;
    }

    // Orders & Barista Queue
    public getOrders(): CafeOrder[] {
        return Array.from(this.orders.values()).sort((a, b) => (a.status === 'queued' ? -1 : 1));
    }

    public addOrder(
        orderData: Omit<CafeOrder, 'id' | 'timestamp' | 'status'> & { status?: CafeOrder['status'] }
    ): CafeOrder {
        const orderId = `ord-${Date.now().toString().slice(-4)}`;
        const groupSize = orderData.groupSize && orderData.groupSize > 0 ? orderData.groupSize : 1;
        const isGroup = groupSize >= 3 || !!orderData.isGroupReservation;

        const newOrder: CafeOrder = {
            id: orderId,
            status: orderData.status || 'queued',
            timestamp: 'Just now',
            customerName: orderData.customerName || 'Café Patron',
            zoneId: orderData.zoneId,
            zoneName: orderData.zoneName,
            drinkName: orderData.drinkName,
            description: orderData.description,
            waitMin: orderData.waitMin || (groupSize > 2 ? 6 : 3),
            groupSize,
            itemIds: orderData.itemIds,
            isGroupReservation: isGroup,
            notes: orderData.notes,
        };

        this.orders.set(orderId, newOrder);
        collections.orders().doc(orderId).set(newOrder).catch((err) => {
            console.warn('[FIRESTORE] addOrder warning:', err.message);
        });

        // Dynamically increment patrons in the targeted zone
        const targetZone = this.zones.get(newOrder.zoneId);
        if (targetZone) {
            targetZone.currentPatrons = Math.min(targetZone.maxPatrons, targetZone.currentPatrons + groupSize);
            targetZone.occupancyPercent = Math.round((targetZone.currentPatrons / targetZone.maxPatrons) * 100);
            this.zones.set(newOrder.zoneId, targetZone);
        }

        // If it's a group reservation (3+ people), dispatch high-priority Staff Alert!
        if (isGroup) {
            const groupAlertId = `alert-group-${Date.now()}`;
            const groupAlert: StaffAlert = {
                id: groupAlertId,
                type: 'queue_surge',
                priority: 'high',
                title: `Upcoming Group Arrival (${groupSize} Guests)`,
                headline: `Group of ${groupSize} inbound for ${newOrder.zoneName}`,
                description: `${newOrder.customerName} placed order (${newOrder.drinkName}) for party of ${groupSize}. Consolidate tables in ${targetZone?.sector || 'main area'}.`,
                zoneId: newOrder.zoneId,
                widgetIcon: 'groups',
                widgetText: `Group of ${groupSize} incoming • Table arrangement required`,
                widgetTag: 'Floor Operations',
                primaryActionLabel: `Consolidate Tables for ${groupSize}`,
                actionCode: 'heat_group_2',
                status: 'pending',
                timestamp: 'Just now',
            };
            this.alerts.set(groupAlertId, groupAlert);
        }

        // Dynamically increment shift metrics
        this.metrics.queueForecastOrders += 1;
        this.metrics.activeSeatedCount += groupSize;
        if (newOrder.zoneId === 'zone-a') {
            this.metrics.focusCount += groupSize;
        } else if (newOrder.zoneId === 'zone-b') {
            this.metrics.casualCount += groupSize;
        } else {
            this.metrics.openCount += groupSize;
        }
        this.metrics.capacityPercent = Math.min(100, Math.round((this.metrics.activeSeatedCount / 71) * 100));

        this.notify();
        return newOrder;
    }

    public updateOrderStatus(orderId: string, status: CafeOrder['status']): CafeOrder | undefined {
        const order = this.orders.get(orderId);
        if (!order) return undefined;
        order.status = status;
        if (status === 'ready') {
            order.waitMin = 0;
            this.metrics.queueForecastOrders = Math.max(0, this.metrics.queueForecastOrders - 1);
        }
        this.orders.set(orderId, order);
        collections.orders().doc(orderId).update({
            status: order.status,
            waitMin: order.waitMin,
        }).catch((err) => {
            console.warn('[FIRESTORE] updateOrderStatus warning:', err.message);
        });
        this.notify();
        return order;
    }

    // Zone operations
    public getZones(): Zone[] {
        return Array.from(this.zones.values());
    }

    public getZone(id: ZoneId): Zone | undefined {
        return this.zones.get(id);
    }

    public updateZone(id: ZoneId, partial: Partial<Zone>): Zone | undefined {
        const current = this.zones.get(id);
        if (!current) return undefined;
        const updated = { ...current, ...partial };
        // Recalculate status
        if (updated.decibels > updated.targetDecibels + 5) {
            updated.status = 'loud';
        } else if (updated.decibels > updated.targetDecibels) {
            updated.status = 'moderate';
        } else {
            updated.status = 'calm';
        }
        this.zones.set(id, updated);
        this.notify();
        return updated;
    }

    // Pods (Open Table)
    public getPods(): OpenTablePod[] {
        return Array.from(this.pods.values());
    }

    public getPod(id: string): OpenTablePod | undefined {
        return this.pods.get(id);
    }

    public joinPod(
        podId: string,
        participant: { nickname: string; avatar: string; role: string; tags: string[] }
    ): OpenTablePod | undefined {
        const pod = this.pods.get(podId);
        if (!pod) return undefined;
        if (pod.participantCount >= pod.maxParticipants) return pod;

        // Check if participant already in pod
        const existing = pod.participants.find((p) => p.nickname.toLowerCase() === participant.nickname.toLowerCase());
        if (!existing) {
            pod.participants.push(participant);
            pod.participantCount = pod.participants.length;
            if (pod.participantCount >= pod.maxParticipants) {
                pod.status = 'full';
            }
            this.pods.set(podId, pod);
            collections.pods().doc(podId).set(pod).catch((err) => {
                console.warn('[FIRESTORE] joinPod warning:', err.message);
            });
            this.metrics.openCount += 1;
            this.metrics.activeSeatedCount += 1;
            this.notify();
        }
        return pod;
    }

    public leavePod(podId: string, participantNickname: string): OpenTablePod | undefined {
        const pod = this.pods.get(podId);
        if (!pod) return undefined;

        const initialLength = pod.participants.length;
        pod.participants = pod.participants.filter(
            (p) => p.nickname.toLowerCase() !== participantNickname.toLowerCase()
        );

        if (pod.participants.length < initialLength) {
            pod.participantCount = pod.participants.length;
            pod.status = 'active';
            this.pods.set(podId, pod);
            collections.pods().doc(podId).set(pod).catch((err) => {
                console.warn('[FIRESTORE] leavePod warning:', err.message);
            });
            this.metrics.openCount = Math.max(0, this.metrics.openCount - 1);
            this.metrics.activeSeatedCount = Math.max(0, this.metrics.activeSeatedCount - 1);
            this.notify();
        }
        return pod;
    }

    public createPod(data: {
        topic: string;
        tableNumber?: number;
        zoneId?: ZoneId;
        maxParticipants?: number;
        sparkPrompt?: string;
        interests?: string[];
        host: {
            nickname: string;
            role?: string;
            interests: string[];
            avatar?: string;
        };
    }): OpenTablePod {
        const id = `pod-${Date.now()}`;
        const tableNumber = data.tableNumber || (this.pods.size + 1);
        const tags = (data.interests && data.interests.length > 0) ? data.interests : data.host.interests;
        const newPod: OpenTablePod = {
            id,
            tableNumber,
            zoneId: data.zoneId || 'zone-c',
            title: `Table ${tableNumber}: ${data.topic}`,
            participantCount: 1,
            maxParticipants: data.maxParticipants || 4,
            status: 'active',
            interestTags: tags,
            geminiIcebreaker:
                data.sparkPrompt ||
                `Welcome to Table ${tableNumber}! What brings you to join today's discussion on ${tags.slice(0, 2).join(' & ')}?`,
            participants: [
                {
                    nickname: data.host.nickname || 'Table Host',
                    avatar:
                        data.host.avatar ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                    role: data.host.role || 'Table Host',
                    tags: data.host.interests,
                },
            ],
        };
        this.pods.set(id, newPod);
        collections.pods().doc(id).set(newPod).catch((err) => {
            console.warn('[FIRESTORE] createPod warning:', err.message);
        });
        this.metrics.openCount += 1;
        this.metrics.activeSeatedCount += 1;
        this.notify();
        return newPod;
    }

    // Feedback Stream
    public getFeedback(): FeedbackTap[] {
        return [...this.feedback];
    }

    public addFeedback(tap: Omit<FeedbackTap, 'id' | 'timestamp'>): FeedbackTap {
        const newTap: FeedbackTap = {
            ...tap,
            id: `fb-${Date.now()}`,
            timestamp: 'Just now',
        };
        this.feedback.unshift(newTap);
        if (this.feedback.length > 20) this.feedback.pop();
        this.metrics.tapsRecorded += 1;
        this.notify();
        return newTap;
    }

    // Staff Alerts
    public getAlerts(): StaffAlert[] {
        return Array.from(this.alerts.values());
    }

    public addAlert(alert: StaffAlert): StaffAlert {
        this.alerts.set(alert.id, alert);
        this.notify();
        return alert;
    }

    public updateAlertStatus(id: string, status: StaffAlert['status']): StaffAlert | undefined {
        const alert = this.alerts.get(id);
        if (!alert) return undefined;
        alert.status = status;
        this.alerts.set(id, alert);
        this.notify();
        return alert;
    }

    // Metrics
    public getMetrics(): ShiftMetrics {
        return { ...this.metrics };
    }

    public updateMetrics(partial: Partial<ShiftMetrics>): ShiftMetrics {
        this.metrics = { ...this.metrics, ...partial };
        this.notify();
        return this.metrics;
    }

    // Sessions
    public getSession(sessionId: string): PatronSession | undefined {
        return this.sessions.get(sessionId);
    }

    public saveSession(session: PatronSession): PatronSession {
        this.sessions.set(session.sessionId, session);
        this.notify();
        return session;
    }

    // SSE Stream Payload
    public getStreamPayload(): StreamPayload {
        return {
            zones: this.getZones(),
            pods: this.getPods(),
            metrics: this.getMetrics(),
            alerts: this.getAlerts(),
            feedback: this.getFeedback(),
            orders: this.getOrders(),
            menu: this.getMenuItems(),
        };
    }

    // Simulator Tick
    public tickSimulation() {
        const zoneA = this.zones.get('zone-a');
        if (zoneA) {
            const delta = (Math.random() - 0.5) * 2;
            const newDb = Math.round(Math.max(38, Math.min(62, zoneA.decibels + delta)));
            this.updateZone('zone-a', { decibels: newDb });
        }

        const queueFluctuation = Math.floor((Math.random() - 0.4) * 2);
        this.metrics.queueForecastOrders = Math.max(3, Math.min(15, this.metrics.queueForecastOrders + queueFluctuation));

        this.notify();
    }
}

// Unconditional global singleton for Next.js hot reload and serverless runtime persistence
const globalForCafe = globalThis as unknown as { cafeStore?: CafeStore };
if (!globalForCafe.cafeStore || typeof globalForCafe.cafeStore.getMenuItems !== 'function') {
    globalForCafe.cafeStore = new CafeStore();
}
export const db = globalForCafe.cafeStore;
