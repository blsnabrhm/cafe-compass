export type ZoneId = 'zone-a' | 'zone-b' | 'zone-c' | 'zone-d';

export type ZoneStatus = 'calm' | 'moderate' | 'loud';

export type MenuCategory = 'Coffee' | 'Tea' | 'Pastries' | 'Light Bites';

export interface MenuItem {
    id: string;
    name: string;
    category: MenuCategory;
    price: string;
    description: string;
    imageUrl: string;
    available: boolean;
    tags: string[];
    sensoryNotes: string;
}

export interface CafeOrder {
    id: string;
    customerName: string;
    zoneId: ZoneId;
    zoneName: string;
    drinkName: string;
    description: string;
    status: 'queued' | 'preparing' | 'ready' | 'completed';
    timestamp: string;
    waitMin: number;
    groupSize?: number;
    itemIds?: string[];
    isGroupReservation?: boolean;
    notes?: string;
}

export interface StreamPayload {
    zones: Zone[];
    pods: OpenTablePod[];
    metrics: ShiftMetrics;
    alerts: StaffAlert[];
    feedback: FeedbackTap[];
    orders: CafeOrder[];
    menu: MenuItem[];
}

export interface Zone {
    id: ZoneId;
    name: string;
    sector: string;
    description: string;
    imageUrl: string;
    features: string[];
    decibels: number;
    targetDecibels: number;
    occupancyPercent: number;
    currentPatrons: number;
    maxPatrons: number;
    speakerVolume: number; // 0 - 100%
    speakerLabel: string;
    tempCelsius: number;
    metricExtra: string; // e.g. "620 ppm CO2" or "1,280 lx"
    status: ZoneStatus;
    highlightNote: string;
}

export type PatronPersona = 'maya' | 'leo' | 'sam' | 'anonymous';

export type PatronMode = 'focus' | 'open_table' | 'casual';

export interface PatronSession {
    id: string;
    sessionId: string;
    persona: PatronPersona;
    nickname: string;
    intention?: string;
    mode: PatronMode;
    zoneId?: ZoneId;
    tableNumber?: number;
    interestTags: string[];
    stealthShield: boolean;
    assignedOrder?: {
        drinkName: string;
        description: string;
        queueTimeMin: number;
    };
    activeIcebreaker?: string;
    joinedAt: string;
}

export interface PodParticipant {
    nickname: string;
    avatar: string;
    role: string;
    tags: string[];
}

export interface OpenTablePod {
    id: string;
    tableNumber: number;
    zoneId: ZoneId;
    title: string;
    participantCount: number;
    maxParticipants: number;
    interestTags: string[];
    geminiIcebreaker: string;
    participants: PodParticipant[];
    status: 'active' | 'full';
}

export interface FeedbackTap {
    id: string;
    title: string;
    detail: string;
    badge: string;
    badgeType: 'secondary' | 'error' | 'primary' | 'tertiary';
    icon: string;
    timestamp: string;
    zoneId: ZoneId;
}

export type StaffAlertType = 'atmospheric_drift' | 'queue_surge' | 'community_spark';

export interface StaffAlert {
    id: string;
    type: StaffAlertType;
    priority: 'high' | 'medium' | 'info';
    title: string;
    headline: string;
    description: string;
    zoneId: ZoneId;
    widgetIcon: string;
    widgetText: string;
    widgetTag: string;
    primaryActionLabel: string;
    actionCode: 'dampen_music' | 'heat_group_2' | 'send_sample' | 'custom';
    status: 'pending' | 'applied' | 'acknowledged' | 'dismissed';
    timestamp: string;
}

export interface ShiftMetrics {
    crowdNoiseDb: number;
    queueForecastOrders: number;
    avgTurnaroundMin: number;
    sentimentPercent: number;
    tapsRecorded: number;
    activeSeatedCount: number;
    focusCount: number;
    openCount: number;
    casualCount: number;
    capacityPercent: number;
}
