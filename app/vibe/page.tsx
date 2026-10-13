'use client';

import React, { useState, useEffect } from 'react';
import { Zone, ZoneId, MenuItem } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';

export default function VibeSeatingPage() {
    const { toast } = useToast();
    const [intention, setIntention] = useState('2 hours deep coding sprint, need absolute quiet and high-caffeine brew');
    const [groupSize, setGroupSize] = useState<number | '8+'>(1);
    const [selectedZoneId, setSelectedZoneId] = useState<ZoneId>('zone-a');
    const [loading, setLoading] = useState(false);
    const [zones, setZones] = useState<Zone[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [selectedCustomItem, setSelectedCustomItem] = useState<MenuItem | null>(null);
    const [showMenuPicker, setShowMenuPicker] = useState(false);
    const [menuFilterCategory, setMenuFilterCategory] = useState<string>('All');

    // Recommendation result state
    const [recommendation, setRecommendation] = useState<{
        recommendedZoneId: ZoneId;
        zoneName: string;
        reasoning: string;
        projectedDecibels: number;
        outletProximity: string;
        pairingDrink: string;
        pairingDescription: string;
        estimatedQueueWaitMin: number;
    }>({
        recommendedZoneId: 'zone-a',
        zoneName: 'Zone A — Quiet Work Nook',
        reasoning:
            'Calculated 38-42 dB steady sound floor with acoustic drape buffering and zero phone chatter. Acoustic shield dampens nearby coffee grinder frequencies.',
        projectedDecibels: 39,
        outletProximity: 'Dedicated dual-plug outlet at each booth (100W PD)',
        pairingDrink: 'Single-Origin Ethiopian Gesha (V60)',
        pairingDescription: 'Hand-poured filter brew with delicate notes of jasmine, bergamot, and ripe peach nectar.',
        estimatedQueueWaitMin: 2,
    });

    const [patronName, setPatronName] = useState('Solo Focus Guest');
    const [submittingOrder, setSubmittingOrder] = useState(false);
    const [confirmedOrder, setConfirmedOrder] = useState<{
        id: string;
        customerName: string;
        drinkName: string;
        waitMin: number;
        groupSize?: number;
    } | null>(null);

    // Fetch initial zones and menu
    useEffect(() => {
        let eventSource: EventSource | null = null;
        try {
            eventSource = new EventSource('/api/stream');
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.zones) setZones(data.zones);
                    if (data.menu) setMenuItems(data.menu);
                } catch { }
            };
        } catch { }

        // Fetch fallback for menu
        fetch('/api/menu')
            .then((r) => r.json())
            .then((d) => {
                if (d.menu) setMenuItems(d.menu);
            })
            .catch(() => { });

        return () => {
            eventSource?.close();
        };
    }, []);

    // Active zone for locking: either manually selected or AI-recommended
    const activeZone = zones.find((z) => z.id === selectedZoneId) || zones[0] || {
        id: recommendation.recommendedZoneId,
        name: recommendation.zoneName,
        sector: 'Sector 01',
        description: 'Quiet Work Nook',
        decibels: recommendation.projectedDecibels,
        targetDecibels: 48,
        occupancyPercent: 80,
        currentPatrons: 16,
        maxPatrons: 20,
        speakerVolume: 40,
        speakerLabel: 'Nook Audio',
        tempCelsius: 21.5,
        metricExtra: '620 ppm CO2',
        status: 'calm' as const,
        highlightNote: 'Steady sound floor',
    };

    // Selected beverage/food to order
    const currentDrinkName = selectedCustomItem ? selectedCustomItem.name : recommendation.pairingDrink;
    const currentDrinkDesc = selectedCustomItem
        ? `${selectedCustomItem.price} • ${selectedCustomItem.description}`
        : recommendation.pairingDescription;

    const handleLockSanctuary = async () => {
        setSubmittingOrder(true);
        const effectiveGroupNum = groupSize === '8+' ? 9 : (groupSize as number);

        try {
            const res = await fetch('/api/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerName: patronName.trim() || 'Guest Patron',
                    groupSize: effectiveGroupNum,
                    zoneId: activeZone.id,
                    zoneName: activeZone.name,
                    drinkName: currentDrinkName,
                    description: currentDrinkDesc,
                    waitMin: recommendation.estimatedQueueWaitMin,
                }),
            });
            const data = await res.json();
            if (data.success && data.order) {
                setConfirmedOrder({
                    id: data.order.id,
                    customerName: data.order.customerName,
                    drinkName: data.order.drinkName,
                    waitMin: data.order.waitMin,
                    groupSize: data.order.groupSize || effectiveGroupNum,
                });
                toast(
                    `Sanctuary reserved in ${activeZone.name}! ${groupSize === '8+'
                        ? 'Special 8+ gathering alert dispatched to shift lead.'
                        : (groupSize as number) > 1
                            ? `Party of ${groupSize} notified to floor lead.`
                            : ''
                    }`,
                    'secondary'
                );
            } else {
                toast('Error connecting to Bar queue', 'error');
            }
        } catch {
            toast('Failed to reach server. Please retry.', 'error');
        } finally {
            setSubmittingOrder(false);
        }
    };

    const handleSynthesize = async (overrideIntention?: string, overrideGroup?: number | '8+') => {
        const text = overrideIntention || intention;
        const currentGroup = overrideGroup !== undefined ? overrideGroup : groupSize;
        const groupNum = currentGroup === '8+' ? 9 : (currentGroup as number);

        setLoading(true);
        try {
            const res = await fetch('/api/recommendation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ intention: text, groupSize: groupNum }),
            });
            const data = await res.json();
            if (data.success && data.recommendation) {
                setRecommendation(data.recommendation);
                setSelectedZoneId(data.recommendation.recommendedZoneId);
                setSelectedCustomItem(null); // Reset custom selection to fresh recommendation
                toast(`Sanctuary matched: ${data.recommendation.zoneName}`, 'secondary');
            } else {
                toast('Applied heuristic spatial placement', 'outline');
            }
        } catch {
            toast('Applied heuristic spatial placement', 'outline');
        } finally {
            setLoading(false);
        }
    };

    const quickChips = [
        'Solo Deep Focus (3h, Silent)',
        'Casual 1:1 Creative Catchup',
        'Large Team Planning Sprint (6+ People)',
        'Casual Reading with Pastry',
        'Quick Espresso & Departure',
    ];

    const availableCategories = ['All', 'Coffee', 'Tea', 'Pastries', 'Light Bites'];
    const filteredMenuItems = menuItems.filter((item) => {
        if (!item.available) return false;
        if (menuFilterCategory === 'All') return true;
        return item.category === menuFilterCategory;
    });

    return (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 text-primary font-headline text-[12px] uppercase font-bold tracking-widest mb-1.5">
                        <span className="material-symbols-outlined text-[16px]">chair</span>
                        Mindful Seating & Spatial Placement
                    </div>
                    <h1 className="font-headline text-[28px] md:text-[34px] font-bold text-on-surface tracking-tight">
                        Acoustic Seating & Sensory Navigator
                    </h1>
                    <p className="text-[14px] text-on-surface-variant max-w-2xl mt-1">
                        Find your ideal seating sanctuary based on real-time ambient noise, group size, and power access.
                        Choose from chef pairings or select any handcrafted menu item.
                    </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-high/60 backdrop-blur-md border border-white/5 text-[12px] text-on-surface-variant">
                    <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
                    <span>Real-time Decibel Sensor Mesh Active</span>
                </div>
            </div>

            {/* Cognitive & Group Configuration Bar */}
            <div className="rounded-2xl bg-surface-container/70 backdrop-blur-2xl p-6 shadow-xl border border-white/5 flex flex-col gap-5">
                {/* Group Size Selector with 8+ option */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                    <div>
                        <label className="font-headline text-[13px] font-semibold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary text-[18px]">groups</span>
                            Party / Group Size
                        </label>
                        <p className="text-[11px] text-on-surface-variant">
                            Groups of 3+ notify shift leads for table prep. 8+ unlocks private cluster arrangements.
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
                        {([1, 2, 3, 4, 5, 6, 7, 8, '8+'] as const).map((size) => (
                            <button
                                key={size}
                                type="button"
                                onClick={() => {
                                    setGroupSize(size);
                                    if (size === '8+') {
                                        toast('8+ Gathering: notifying shift lead for dedicated cluster arrangement', 'tertiary');
                                    } else if ((size as number) >= 3) {
                                        toast(`Party of ${size}: prioritizing multi-seat cluster`, 'primary');
                                    }
                                }}
                                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center shrink-0 ${groupSize === size
                                    ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20 ring-2 ring-amber-400/30'
                                    : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-white/5'
                                    }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>

                {groupSize === '8+' && (
                    <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center gap-3 text-[12px] text-amber-200">
                        <span className="material-symbols-outlined text-amber-400 text-[20px]">meeting_room</span>
                        <span>
                            <strong>Large Gathering (8+ guests):</strong> Zone C Glass Solarium or Garden Terrace will be prioritized. Floor manager alert will be dispatched automatically upon locking sanctuary.
                        </span>
                    </div>
                )}

                {/* Intention Input Bar */}
                <div className="flex flex-col gap-2">
                    <label className="font-headline text-[13px] font-semibold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
                        What is your focus or seating intention today?
                    </label>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={intention}
                                onChange={(e) => setIntention(e.target.value)}
                                placeholder="e.g. 2 hours deep coding sprint, need silence and high caffeine..."
                                className="w-full h-12 px-4 rounded-xl bg-surface-container-low/90 text-on-surface text-[14px] placeholder-outline-variant focus:outline-none focus:ring-2 focus:ring-primary border border-white/5"
                            />
                        </div>
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleSynthesize()}
                            className="h-12 px-6 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-on-primary-container font-headline text-[13px] font-semibold shadow-lg hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2 flex-shrink-0"
                        >
                            {loading ? (
                                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                            ) : (
                                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                            )}
                            <span>{loading ? 'Synthesizing...' : 'Find Ideal Sanctuary'}</span>
                        </button>
                    </div>

                    {/* Quick Chips */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[12px] text-outline-variant font-medium mr-1">Quick prompts:</span>
                        {quickChips.map((chip) => (
                            <button
                                key={chip}
                                type="button"
                                onClick={() => {
                                    setIntention(chip);
                                    handleSynthesize(chip);
                                }}
                                className="px-3 py-1 rounded-lg bg-surface-container-high/80 hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface text-[12px] transition-colors border border-white/5"
                            >
                                {chip}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Grid: Recommended Match + Real-time Acoustic Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT: Recommended Seat & Live Pairing Card */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    <div className="rounded-2xl bg-gradient-to-b from-surface-container-high/80 to-surface-container/80 backdrop-blur-2xl p-6 shadow-2xl border border-primary/20 relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                        <div>
                            {/* Card Header & Manual Zone Override Dropdown */}
                            <div className="flex items-center justify-between pb-4 border-b border-white/5">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary font-headline text-[11px] font-bold uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                                    Sanctuary Match
                                </span>

                                {/* Manual Override Dropdown */}
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-outline-variant font-mono">Override:</span>
                                    <select
                                        value={selectedZoneId}
                                        onChange={(e) => {
                                            const newZoneId = e.target.value as ZoneId;
                                            setSelectedZoneId(newZoneId);
                                            toast(`Manually redirected to ${newZoneId.toUpperCase()}`, 'outline');
                                        }}
                                        className="bg-surface-container-lowest text-on-surface text-xs font-mono px-2 py-1 rounded-lg border border-white/10 focus:outline-none"
                                    >
                                        <option value="zone-a">Zone A (Nook)</option>
                                        <option value="zone-b">Zone B (Bar)</option>
                                        <option value="zone-c">Zone C (Solarium)</option>
                                        <option value="zone-d">Zone D (Terrace)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="py-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-headline text-[22px] font-bold text-on-surface">
                                        {activeZone.name}
                                    </h3>
                                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary">
                                        {activeZone.decibels} dB Live
                                    </span>
                                </div>
                                <p className="text-[13px] text-on-surface-variant mt-2 leading-relaxed">
                                    {selectedZoneId === recommendation.recommendedZoneId
                                        ? recommendation.reasoning
                                        : `Manual override selected. ${activeZone.description}. Room decibels currently at ${activeZone.decibels} dB.`}
                                </p>
                            </div>

                            {/* Specs Bento */}
                            <div className="grid grid-cols-2 gap-3 py-2">
                                <div className="p-3 rounded-xl bg-surface-container-lowest/80 border border-white/5">
                                    <div className="text-[11px] text-outline-variant flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px] text-primary">power</span>
                                        Power / Outlets
                                    </div>
                                    <div className="font-headline text-[12px] text-on-surface font-semibold mt-1">
                                        {recommendation.outletProximity}
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-surface-container-lowest/80 border border-white/5">
                                    <div className="text-[11px] text-outline-variant flex items-center gap-1">
                                        <span className="material-symbols-outlined text-tertiary">groups</span>
                                        Party Allocation
                                    </div>
                                    <div className="font-headline text-[12px] text-on-surface font-semibold mt-1">
                                        {groupSize} {groupSize === 1 ? 'Guest' : 'Guests'} Reserved
                                    </div>
                                </div>
                            </div>

                            {/* Live Drink / Food Selection Section */}
                            <div className="mt-4 p-4 rounded-xl bg-surface-container-lowest/90 border border-white/5 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-amber-400 font-headline uppercase font-bold tracking-wider flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">local_cafe</span>
                                        {selectedCustomItem ? 'Custom Selected Item' : 'Recommended Culinary Pairing'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setShowMenuPicker(true)}
                                        className="text-[11px] text-primary hover:underline font-headline font-semibold flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">restaurant_menu</span>
                                        <span>Change Item</span>
                                    </button>
                                </div>

                                <div className="flex items-center gap-4">
                                    {selectedCustomItem?.imageUrl ? (
                                        <img
                                            src={selectedCustomItem.imageUrl}
                                            alt={currentDrinkName}
                                            className="h-12 w-12 rounded-xl object-cover flex-shrink-0 border border-white/10"
                                        />
                                    ) : (
                                        <div className="h-12 w-12 rounded-xl bg-surface-container-high flex items-center justify-center text-amber-400 flex-shrink-0">
                                            <span className="material-symbols-outlined text-[24px]">coffee</span>
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="font-headline text-[14px] font-bold text-on-surface truncate">
                                            {currentDrinkName}
                                        </div>
                                        <div className="text-[11px] text-on-surface-variant truncate">
                                            {currentDrinkDesc}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order Confirmation / Lock In */}
                        <div className="pt-5 mt-5 border-t border-white/5 flex flex-col gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-headline font-semibold text-outline-variant uppercase tracking-wider">
                                    Patron / Party Lead Name
                                </label>
                                <input
                                    type="text"
                                    value={patronName}
                                    onChange={(e) => setPatronName(e.target.value)}
                                    placeholder="Enter your name or party handle..."
                                    className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface text-[13px] border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            {confirmedOrder ? (
                                <div className="p-3.5 rounded-xl bg-secondary/10 border border-secondary/30 flex flex-col gap-1.5 animate-fadeIn">
                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1.5 text-secondary font-headline text-[12px] font-bold">
                                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                            Order #{confirmedOrder.id} Transmitted to Bar
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full bg-secondary/20 text-secondary text-[10px] font-mono font-bold">
                                            ~{confirmedOrder.waitMin} min prep
                                        </span>
                                    </div>
                                    <div className="text-[12px] text-on-surface font-medium">
                                        Sanctuary Seat locked in {activeZone.name} for {confirmedOrder.customerName}
                                        {confirmedOrder.groupSize && confirmedOrder.groupSize > 1
                                            ? ` (${confirmedOrder.groupSize} guests)`
                                            : ''}.
                                    </div>
                                    <div className="text-[11px] text-outline-variant">
                                        Barista notified: {confirmedOrder.drinkName}. Zone occupancy updated in real-time.
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmedOrder(null)}
                                        className="mt-1 text-[11px] text-primary hover:underline text-left"
                                    >
                                        + Queue Another Order or Adjust Seat
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    disabled={submittingOrder}
                                    onClick={handleLockSanctuary}
                                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-container to-secondary-container text-on-primary-container font-headline text-[13px] font-semibold hover:brightness-110 shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {submittingOrder ? (
                                        <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-[18px]">verified</span>
                                    )}
                                    <span>
                                        {submittingOrder
                                            ? 'Transmitting to Bar...'
                                            : `Lock Sanctuary (${activeZone.name.split('—')[0].trim()}) & Order ${currentDrinkName.split(' ')[0]}`}
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Real-Time Zone Acoustic Radar */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    <div className="rounded-2xl bg-surface-container/70 backdrop-blur-2xl p-6 shadow-xl border border-white/5 flex flex-col gap-6">
                        <div className="flex items-center justify-between pb-4 border-b border-white/5">
                            <div>
                                <h2 className="font-headline text-[18px] font-bold text-on-surface">
                                    Live Acoustic Decibel Mesh
                                </h2>
                                <p className="text-[12px] text-on-surface-variant">
                                    Click any zone below to manually redirect your sanctuary placement.
                                </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-full bg-surface-container-highest text-[11px] font-mono text-outline font-semibold">
                                4 Zones Calibrated
                            </span>
                        </div>

                        {/* Zone Tiles Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {zones.map((zone) => {
                                const isSelected = zone.id === selectedZoneId;
                                const isAiRecommended = zone.id === recommendation.recommendedZoneId;

                                return (
                                    <div
                                        key={zone.id}
                                        onClick={() => {
                                            setSelectedZoneId(zone.id);
                                            toast(`Selected ${zone.name}`, 'primary');
                                        }}
                                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-4 ${isSelected
                                            ? 'bg-surface-container-high border-primary shadow-lg ring-1 ring-primary'
                                            : 'bg-surface-container-lowest/80 border-white/5 hover:bg-surface-container-high/60'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-headline text-[14px] font-bold text-on-surface">
                                                        {zone.name}
                                                    </span>
                                                    {isAiRecommended && (
                                                        <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-bold uppercase tracking-wider">
                                                            AI Pick
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-outline-variant mt-0.5">
                                                    {zone.description}
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="font-mono text-[16px] font-bold text-on-surface">
                                                    {zone.decibels} <span className="text-[10px] font-normal text-outline">dB</span>
                                                </div>
                                                <div
                                                    className={`text-[10px] font-semibold ${zone.status === 'calm'
                                                        ? 'text-secondary'
                                                        : zone.status === 'moderate'
                                                            ? 'text-tertiary'
                                                            : 'text-error'
                                                        }`}
                                                >
                                                    {zone.status.toUpperCase()}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-outline">
                                            <div className="flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[14px]">person</span>
                                                <span>
                                                    {zone.currentPatrons} / {zone.maxPatrons} Seated
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[14px]">thermostat</span>
                                                <span>{zone.tempCelsius}°C</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Menu Item Selection Modal */}
            {showMenuPicker && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-surface-container rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-white/10 overflow-hidden animate-fadeIn">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h3 className="font-headline text-[18px] font-bold text-on-surface">
                                    Select Food or Beverage Item
                                </h3>
                                <p className="text-[12px] text-on-surface-variant">
                                    Choose any in-stock item to pair with your sanctuary seat.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowMenuPicker(false)}
                                className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Category Filter Pills */}
                        <div className="flex items-center gap-2 p-4 border-b border-white/5 overflow-x-auto">
                            {availableCategories.map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setMenuFilterCategory(cat)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-headline font-semibold transition-colors flex-shrink-0 ${menuFilterCategory === cat
                                        ? 'bg-primary-container text-on-primary-container'
                                        : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Menu Item Grid */}
                        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filteredMenuItems.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        setSelectedCustomItem(item);
                                        setShowMenuPicker(false);
                                        toast(`Selected ${item.name}!`, 'tertiary');
                                    }}
                                    className={`p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high border transition-all cursor-pointer flex items-center gap-3 ${selectedCustomItem?.id === item.id
                                        ? 'border-primary ring-1 ring-primary'
                                        : 'border-white/5'
                                        }`}
                                >
                                    {item.imageUrl ? (
                                        <img
                                            src={item.imageUrl}
                                            alt={item.name}
                                            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-lg bg-surface-container-high flex items-center justify-center text-primary flex-shrink-0">
                                            <span className="material-symbols-outlined text-[20px]">coffee</span>
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <div className="font-headline text-[13px] font-bold text-on-surface truncate">
                                                {item.name}
                                            </div>
                                            <div className="text-[12px] font-mono font-semibold text-secondary ml-1">
                                                {item.price}
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">
                                            {item.description}
                                        </div>
                                        <div className="text-[10px] text-outline font-medium mt-1">
                                            {item.sensoryNotes}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-white/10 flex justify-between items-center text-xs text-outline-variant">
                            <span>{filteredMenuItems.length} in-stock items available</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedCustomItem(null); // Revert to AI recommendation
                                    setShowMenuPicker(false);
                                    toast('Reverted to AI recommended pairing', 'outline');
                                }}
                                className="text-primary hover:underline font-headline font-semibold"
                            >
                                Reset to Recommended Pairing
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
