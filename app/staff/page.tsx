'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zone, ZoneId, StaffAlert, ShiftMetrics, FeedbackTap, CafeOrder, MenuItem } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';

export default function StaffPage() {
    const { toast } = useToast();
    const [unlocked, setUnlocked] = useState(true);
    const [pinInput, setPinInput] = useState('');
    const [currentTime, setCurrentTime] = useState('14:42:08 PST');
    const [orderFilter, setOrderFilter] = useState<'all' | 'queued' | 'preparing' | 'ready'>('all');
    const [soundPreset, setSoundPreset] = useState<string>('Lo-Fi Focus');

    // Live state
    const [zones, setZones] = useState<Zone[]>([]);
    const [alerts, setAlerts] = useState<StaffAlert[]>([]);
    const [feedback, setFeedback] = useState<FeedbackTap[]>([]);
    const [orders, setOrders] = useState<CafeOrder[]>([]);
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [metrics, setMetrics] = useState<ShiftMetrics>({
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
    });

    // Clock ticker
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(
                now.toLocaleTimeString('en-US', {
                    timeZone: 'America/Los_Angeles',
                    hour12: false,
                }) + ' PST'
            );
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Initial load for orders and menu
    useEffect(() => {
        fetch('/api/order')
            .then((res) => res.json())
            .then((data) => {
                if (data.success && data.orders) setOrders(data.orders);
            })
            .catch(() => { });

        fetch('/api/menu')
            .then((res) => res.json())
            .then((data) => {
                if (data.success && data.menu) setMenu(data.menu);
            })
            .catch(() => { });
    }, []);

    // Real-time SSE stream
    useEffect(() => {
        let eventSource: EventSource | null = null;
        try {
            eventSource = new EventSource('/api/stream');
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.zones) setZones(data.zones);
                    if (data.metrics) setMetrics(data.metrics);
                    if (data.alerts) setAlerts(data.alerts);
                    if (data.feedback) setFeedback(data.feedback);
                    if (data.orders) setOrders(data.orders);
                    if (data.menu) setMenu(data.menu);
                } catch { }
            };
        } catch { }

        return () => {
            eventSource?.close();
        };
    }, []);

    const handleOrderStatusChange = async (orderId: string, status: CafeOrder['status']) => {
        try {
            const res = await fetch('/api/order', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, status }),
            });
            const data = await res.json();
            if (data.success) {
                toast(`Order #${orderId} marked as ${status.toUpperCase()}`, 'secondary');
                setOrders((prev) =>
                    prev.map((o) =>
                        o.id === orderId ? { ...o, status, waitMin: status === 'ready' ? 0 : o.waitMin } : o
                    )
                );
            }
        } catch {
            toast('Failed to update order status', 'error');
        }
    };

    const handleAction = async (action: string, alertId?: string, zoneId?: ZoneId, targetVol?: number) => {
        try {
            const res = await fetch('/api/staff/action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, alertId, zoneId, targetVol }),
            });
            const data = await res.json();
            if (data.success) {
                toast(data.message || 'Action executed successfully', 'secondary');
            }
        } catch {
            toast('Action triggered in local store', 'secondary');
        }
    };

    const handleAddFeedback = async (title: string, badge: string, icon: string, zoneId: ZoneId) => {
        try {
            await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    detail: `Logged by Shift Lead on duty (${zoneId})`,
                    badge,
                    icon,
                    zoneId,
                }),
            });
            toast(`Patron signal recorded: "${title}"`, 'primary');
        } catch { }
    };

    const filteredOrders = orders.filter((o) => {
        if (orderFilter === 'all') return true;
        return o.status === orderFilter;
    });

    const inStockCount = menu.filter((m) => m.available).length;
    const outOfStockCount = menu.length - inStockCount;

    if (!unlocked) {
        return (
            <div className="w-full max-w-md mx-auto my-24 p-8 rounded-2xl bg-surface-container/80 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-secondary/15 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[32px]">shield_lock</span>
                </div>
                <div>
                    <h2 className="font-headline text-[22px] font-bold text-on-surface">Staff Console Locked</h2>
                    <p className="text-[13px] text-on-surface-variant mt-1">
                        Enter your Shift Lead PIN to access acoustic controls, order queue &amp; menu inventory.
                    </p>
                </div>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (pinInput === '4421' || pinInput.length >= 4) {
                            setUnlocked(true);
                            toast('Shift Console Unlocked. Welcome back.', 'secondary');
                        } else {
                            toast('Invalid PIN. Use default: 4421', 'error');
                        }
                    }}
                    className="w-full flex flex-col gap-4"
                >
                    <input
                        type="password"
                        maxLength={6}
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        placeholder="Enter PIN (Default: 4421)"
                        className="w-full h-12 text-center font-mono text-[20px] tracking-widest rounded-xl bg-surface-container-low text-on-surface border border-white/10 focus:outline-none focus:ring-2 focus:ring-secondary"
                    />
                    <button
                        type="submit"
                        className="w-full h-12 rounded-xl bg-secondary-container text-on-secondary-container font-headline text-[14px] font-semibold hover:brightness-110 shadow-lg transition-all"
                    >
                        Unlock Console
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-6 py-5 flex flex-col gap-6">
            {/* Top Operational Header Bar */}
            <header className="rounded-2xl bg-surface-container-low/80 backdrop-blur-xl p-4 border border-white/5 shadow-md flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary font-mono font-bold text-sm border border-secondary/20">
                        OP
                    </div>
                    <div className="leading-tight">
                        <div className="font-headline text-[14px] font-bold text-on-surface flex items-center gap-2">
                            <span>Floor Operations Console</span>
                            <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary font-headline text-[10px] font-bold">
                                Live Tri-Pane Mesh
                            </span>
                        </div>
                        <div className="text-[11px] text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Telemetry Synchronized • 4 Zones Active</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Link to Menu Inventory Manager */}
                    <Link
                        href="/staff/menu"
                        className="px-3.5 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-white/10 text-on-surface text-xs font-mono font-medium transition-colors flex items-center gap-2 group"
                    >
                        <span className="text-amber-400 group-hover:scale-110 transition-transform">☕</span>
                        <span>Manage Culinary Menu</span>
                        {outOfStockCount > 0 ? (
                            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] border border-rose-500/30">
                                {outOfStockCount} 86&apos;d
                            </span>
                        ) : (
                            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                                All In Stock
                            </span>
                        )}
                    </Link>

                    {/* Clock & Lock */}
                    <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-xl border border-white/5 text-[12px] font-mono text-on-surface">
                        <span className="font-semibold text-secondary">{currentTime}</span>
                        <button
                            type="button"
                            onClick={() => setUnlocked(false)}
                            className="text-outline hover:text-on-surface transition-colors ml-1 p-0.5"
                            title="Lock Console"
                        >
                            <span className="material-symbols-outlined text-[16px]">lock</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Ergonomic 3-Pane Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ============================================================ */}
                {/* PANE 1 (LEFT, col-span-3): Sticky Acoustic & Zone Controls   */}
                {/* ============================================================ */}
                <aside className="lg:col-span-3 lg:sticky lg:top-20 space-y-4">
                    <div className="rounded-2xl bg-surface-container/70 backdrop-blur-2xl p-5 border border-white/5 shadow-xl flex flex-col gap-4">
                        <div className="flex items-center justify-between pb-2 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-secondary text-[20px]">graphic_eq</span>
                                <h2 className="font-headline text-[15px] font-bold text-on-surface">
                                    Acoustic Soundscapes
                                </h2>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-semibold">
                                4 Nodes
                            </span>
                        </div>

                        {/* Soundscape Presets */}
                        <div>
                            <div className="text-[11px] text-on-surface-variant font-mono uppercase tracking-wider mb-2">
                                Soundscape Preset
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                                {['Lo-Fi Focus', 'Binaural Chill', 'Communal Warmth'].map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => {
                                            setSoundPreset(preset);
                                            toast(`Atmospheric stream switched to: ${preset}`, 'secondary');
                                        }}
                                        className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all text-center leading-tight ${soundPreset === preset
                                                ? 'bg-secondary-container text-on-secondary-container font-bold shadow'
                                                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                                            }`}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Zone Sliders List */}
                        <div className="space-y-3.5 pt-1">
                            {zones.map((zone) => {
                                const isOver = zone.decibels > zone.targetDecibels;
                                return (
                                    <div
                                        key={zone.id}
                                        className="p-3.5 rounded-xl bg-surface-container-low/70 border border-white/5 flex flex-col gap-2.5 transition-all hover:border-white/10"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-headline text-[13px] font-bold text-on-surface flex items-center gap-1.5">
                                                    <span>{zone.name.split('—')[0]}</span>
                                                    <span className="text-[11px] text-on-surface-variant font-normal">
                                                        ({zone.currentPatrons}/{zone.maxPatrons})
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-outline font-mono">
                                                    Target: {zone.targetDecibels} dB
                                                </div>
                                            </div>
                                            <div
                                                className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${isOver
                                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                                                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                    }`}
                                            >
                                                {zone.decibels} dB
                                            </div>
                                        </div>

                                        {/* Slider */}
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between text-[10px] text-on-surface-variant font-mono">
                                                <span>Volume</span>
                                                <span className="text-on-surface font-semibold">{zone.speakerVolume}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={0}
                                                max={100}
                                                value={zone.speakerVolume}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    handleAction('slider_update', undefined, zone.id, val);
                                                }}
                                                className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-secondary"
                                            />
                                        </div>

                                        {/* Quick Volume Adjustments */}
                                        <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const nextVol = Math.max(0, zone.speakerVolume - 10);
                                                    handleAction('slider_update', undefined, zone.id, nextVol);
                                                    toast(`${zone.name} volume lowered by 10%`, 'secondary');
                                                }}
                                                className="flex-1 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-[10px] font-mono text-on-surface transition-colors"
                                            >
                                                -10% Dampen
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const nextVol = Math.min(100, zone.speakerVolume + 10);
                                                    handleAction('slider_update', undefined, zone.id, nextVol);
                                                    toast(`${zone.name} volume boosted by 10%`, 'secondary');
                                                }}
                                                className="flex-1 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-[10px] font-mono text-on-surface transition-colors"
                                            >
                                                +10% Boost
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                {/* ============================================================ */}
                {/* PANE 2 (CENTER, col-span-6): Live Operations & Order Queue   */}
                {/* ============================================================ */}
                <main className="lg:col-span-6 space-y-5">
                    {/* Shift KPI Tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-xl bg-surface-container/70 backdrop-blur-xl border border-white/5">
                            <div className="text-[10px] text-outline font-mono uppercase tracking-wider">Crowd Noise</div>
                            <div className="text-xl font-bold font-headline text-on-surface mt-0.5">{metrics.crowdNoiseDb} dB</div>
                            <div className="text-[10px] text-secondary mt-1">Target &lt; 58 dB</div>
                        </div>
                        <div className="p-3.5 rounded-xl bg-surface-container/70 backdrop-blur-xl border border-white/5">
                            <div className="text-[10px] text-outline font-mono uppercase tracking-wider">Queue Surge</div>
                            <div className="text-xl font-bold font-headline text-on-surface mt-0.5">{metrics.queueForecastOrders} Tickets</div>
                            <div className="text-[10px] text-tertiary mt-1">~{metrics.avgTurnaroundMin} min prep</div>
                        </div>
                        <div className="p-3.5 rounded-xl bg-surface-container/70 backdrop-blur-xl border border-white/5">
                            <div className="text-[10px] text-outline font-mono uppercase tracking-wider">Sentiment</div>
                            <div className="text-xl font-bold font-headline text-on-surface mt-0.5">{metrics.sentimentPercent}%</div>
                            <div className="text-[10px] text-primary mt-1">{metrics.tapsRecorded} taps today</div>
                        </div>
                        <div className="p-3.5 rounded-xl bg-surface-container/70 backdrop-blur-xl border border-white/5">
                            <div className="text-[10px] text-outline font-mono uppercase tracking-wider">Seated Patrons</div>
                            <div className="text-xl font-bold font-headline text-on-surface mt-0.5">{metrics.activeSeatedCount} Guests</div>
                            <div className="text-[10px] text-on-surface-variant mt-1">{metrics.capacityPercent}% Occupied</div>
                        </div>
                    </div>

                    {/* High-Priority Group Arrival Banner (if any alerts are group-based) */}
                    {alerts.filter((a) => a.priority === 'high' && a.status !== 'dismissed').map((alert) => (
                        <div
                            key={alert.id}
                            className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-xl shadow-lg flex items-start justify-between gap-4"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 shrink-0 mt-0.5">
                                    <span className="material-symbols-outlined text-[20px]">groups</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                                            {alert.headline}
                                        </span>
                                        <span className="text-[11px] text-slate-400 font-mono">{alert.timestamp}</span>
                                    </div>
                                    <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                                        {alert.description}
                                    </p>
                                    <div className="text-[11px] text-amber-300 font-mono mt-2 flex items-center gap-1.5">
                                        <span>📍 {alert.widgetText}</span>
                                        <span>•</span>
                                        <span className="text-slate-400">{alert.widgetTag}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="shrink-0 flex flex-col gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleAction(alert.actionCode, alert.id)}
                                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs transition-colors"
                                >
                                    {alert.primaryActionLabel}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAction('dismiss', alert.id)}
                                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-[11px] transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Central Espresso Bar Live Queue */}
                    <div className="rounded-2xl bg-surface-container/70 backdrop-blur-2xl p-5 border border-white/5 shadow-xl flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="font-headline text-[17px] font-bold text-on-surface">
                                        Live Bar Order Queue
                                    </h2>
                                    <span className="px-2 py-0.5 rounded-full bg-secondary/15 text-secondary text-[11px] font-mono font-semibold">
                                        {orders.filter((o) => o.status !== 'completed').length} Active
                                    </span>
                                </div>
                                <p className="text-[11px] text-on-surface-variant">
                                    Orders dispatched from Seating Navigator and Community Lounge.
                                </p>
                            </div>

                            {/* Simulation & Filter Controls */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        try {
                                            const names = ['Kai & Sarah', 'Studio Design Team', 'Marcus & Priya', 'Aria (Solo)'];
                                            const groupSizes = [1, 2, 4, 3];
                                            const idx = Math.floor(Math.random() * names.length);
                                            const randomName = names[idx];
                                            const randomGroup = groupSizes[idx];
                                            const sampleItems = menu.filter((m) => m.available);
                                            const picked = sampleItems.length > 0 ? sampleItems[Math.floor(Math.random() * sampleItems.length)] : null;

                                            await fetch('/api/order', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    customerName: randomName,
                                                    groupSize: randomGroup,
                                                    zoneId: randomGroup >= 3 ? 'zone-c' : 'zone-b',
                                                    zoneName: randomGroup >= 3 ? 'Zone C — Sunroom Solarium' : 'Zone B — Central Espresso Bar',
                                                    drinkName: picked?.name || 'Velvet Oat Flat White',
                                                    description: picked?.sensoryNotes || 'Crafted with specialty ingredients',
                                                    waitMin: 3,
                                                }),
                                            });
                                            toast(`Incoming ticket dispatched: ${randomName} (${randomGroup} guests)`, 'secondary');
                                        } catch { }
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-secondary text-[11px] font-mono font-semibold transition-colors flex items-center gap-1.5"
                                >
                                    <span>+ Simulate Patron Order</span>
                                </button>
                            </div>
                        </div>

                        {/* Order Filter Tabs */}
                        <div className="flex items-center gap-1.5">
                            {(['all', 'queued', 'preparing', 'ready'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setOrderFilter(tab)}
                                    className={`px-3 py-1 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${orderFilter === tab
                                            ? 'bg-secondary-container text-on-secondary-container font-bold'
                                            : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                                        }`}
                                >
                                    {tab} (
                                    {tab === 'all'
                                        ? orders.length
                                        : orders.filter((o) => o.status === tab).length}
                                    )
                                </button>
                            ))}
                        </div>

                        {/* Order Cards Grid */}
                        {filteredOrders.length === 0 ? (
                            <div className="py-12 text-center text-on-surface-variant text-xs font-mono">
                                No orders matching the &quot;{orderFilter}&quot; filter.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredOrders.map((ord) => {
                                    const isQueued = ord.status === 'queued';
                                    const isPrep = ord.status === 'preparing';
                                    const isReady = ord.status === 'ready';

                                    return (
                                        <div
                                            key={ord.id}
                                            className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${isQueued
                                                    ? 'bg-surface-container/90 border-tertiary/30 ring-1 ring-tertiary/20'
                                                    : isPrep
                                                        ? 'bg-surface-container-high/90 border-primary/30'
                                                        : 'bg-surface-container-low/50 border-white/5 opacity-80'
                                                }`}
                                        >
                                            <div>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="font-mono text-[11px] text-outline font-semibold">
                                                        #{ord.id}
                                                    </span>
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${isQueued
                                                                ? 'bg-tertiary-container/30 text-tertiary animate-pulse'
                                                                : isPrep
                                                                    ? 'bg-primary-container/30 text-primary'
                                                                    : 'bg-secondary-container/30 text-secondary'
                                                            }`}
                                                    >
                                                        {ord.status}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <div className="font-headline text-[14px] font-bold text-on-surface">
                                                        {ord.customerName}
                                                    </div>
                                                    {(ord.groupSize || 1) > 1 && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono font-semibold border border-amber-400/30">
                                                            👥 Party of {ord.groupSize}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-secondary font-medium mt-0.5">
                                                    📍 {ord.zoneName}
                                                </div>

                                                {/* Drink detail */}
                                                <div className="mt-2.5 p-2.5 rounded-lg bg-surface-container-lowest/80 border border-white/5">
                                                    <div className="font-headline text-[13px] font-semibold text-on-surface">
                                                        {ord.drinkName}
                                                    </div>
                                                    <div className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">
                                                        {ord.description}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status Progression Button */}
                                            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                                                <span className="text-outline font-mono">
                                                    {isReady ? 'Ready at Counter' : `~${ord.waitMin}m prep`}
                                                </span>

                                                <div className="flex items-center gap-2">
                                                    {isQueued && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOrderStatusChange(ord.id, 'preparing')}
                                                            className="px-2.5 py-1 rounded-lg bg-primary-container text-on-primary-container font-headline font-semibold hover:brightness-110 transition-all text-xs"
                                                        >
                                                            Start Brewing
                                                        </button>
                                                    )}
                                                    {isPrep && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOrderStatusChange(ord.id, 'ready')}
                                                            className="px-2.5 py-1 rounded-lg bg-secondary-container text-on-secondary-container font-headline font-semibold hover:brightness-110 transition-all text-xs"
                                                        >
                                                            Mark Ready
                                                        </button>
                                                    )}
                                                    {isReady && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOrderStatusChange(ord.id, 'completed')}
                                                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-on-surface font-headline font-semibold transition-all text-xs"
                                                        >
                                                            Mark Picked Up
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </main>

                {/* ============================================================ */}
                {/* PANE 3 (RIGHT, col-span-3): Sticky Directives & Signals     */}
                {/* ============================================================ */}
                <aside className="lg:col-span-3 lg:sticky lg:top-20 space-y-4">
                    {/* Gemini Autonomous Directives Card */}
                    <div className="rounded-2xl bg-surface-container/70 backdrop-blur-2xl p-5 border border-white/5 shadow-xl flex flex-col gap-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-tertiary text-[20px] animate-pulse">
                                    smart_toy
                                </span>
                                <h2 className="font-headline text-[15px] font-bold text-on-surface">
                                    Autonomous Directives
                                </h2>
                            </div>
                            <span className="text-[10px] text-outline font-mono">
                                Live AI
                            </span>
                        </div>

                        <div className="space-y-3">
                            {alerts
                                .filter((a) => a.priority !== 'high' || a.status === 'dismissed')
                                .slice(0, 3)
                                .map((alert) => {
                                    const isApplied = alert.status === 'applied' || alert.status === 'acknowledged';

                                    return (
                                        <div
                                            key={alert.id}
                                            className={`p-3.5 rounded-xl border transition-all ${isApplied
                                                    ? 'bg-surface-container-low/50 border-white/5 opacity-60'
                                                    : 'bg-surface-container-high/80 border-white/10'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                                                <span className="text-secondary font-bold uppercase">
                                                    {alert.headline}
                                                </span>
                                                <span className="text-outline">{alert.timestamp}</span>
                                            </div>
                                            <p className="text-[12px] text-on-surface leading-relaxed mt-1">
                                                {alert.description}
                                            </p>
                                            <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                                                {isApplied ? (
                                                    <span className="text-[11px] text-secondary font-mono flex items-center gap-1">
                                                        ✓ Directive applied
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAction(alert.actionCode, alert.id)}
                                                        className="w-full py-1.5 px-3 rounded-lg bg-primary-container hover:brightness-110 text-on-primary-container font-headline text-[11px] font-semibold transition-all text-center"
                                                    >
                                                        {alert.primaryActionLabel}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Patron Micro-Touchpoints Stream */}
                    <div className="rounded-2xl bg-surface-container/70 backdrop-blur-2xl p-5 border border-white/5 shadow-xl flex flex-col gap-3">
                        <div className="flex items-center justify-between pb-2 border-b border-white/5">
                            <div>
                                <h3 className="font-headline text-[14px] font-bold text-on-surface">
                                    Patron Touchpoints
                                </h3>
                                <p className="text-[10px] text-on-surface-variant">Live tap telemetry</p>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    handleAddFeedback('Quiet zone acoustic balance verified', 'Solo Focus', 'thumb_up', 'zone-a')
                                }
                                className="px-2 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-secondary text-[10px] font-mono transition-colors"
                            >
                                + Log Signal
                            </button>
                        </div>

                        <div className="space-y-2">
                            {feedback.slice(0, 4).map((item) => (
                                <div
                                    key={item.id}
                                    className="p-2.5 rounded-xl bg-surface-container-lowest/80 border border-white/5 flex items-center justify-between text-[11px]"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-secondary text-[16px]">
                                            {item.icon}
                                        </span>
                                        <div>
                                            <div className="font-medium text-on-surface line-clamp-1">{item.title}</div>
                                            <div className="text-[10px] text-outline font-mono">{item.detail}</div>
                                        </div>
                                    </div>
                                    <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary text-[9px] font-mono shrink-0">
                                        {item.badge}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Inventory Quick Card */}
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-medium text-white">Culinary Menu Inventory</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                {inStockCount} In Stock • {outOfStockCount} 86&apos;d
                            </div>
                        </div>
                        <Link
                            href="/staff/menu"
                            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs transition-colors font-mono"
                        >
                            Open Menu →
                        </Link>
                    </div>
                </aside>
            </div>
        </div>
    );
}
