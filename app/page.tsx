'use client';

import React from 'react';
import Link from 'next/link';

export default function OverviewPage() {
    return (
        <div className="flex flex-col w-full">
            {/* Minimalist Ambient Hero */}
            <section className="relative w-full overflow-hidden px-4 md:px-8 pt-12 pb-20">
                {/* Soft Ambient Glow */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
                    <div className="absolute -top-32 left-1/4 w-[500px] h-[300px] bg-primary/10 blur-[140px] rounded-full" />
                    <div className="absolute top-10 right-1/4 w-[450px] h-[300px] bg-tertiary/10 blur-[150px] rounded-full" />
                </div>

                <div className="relative max-w-5xl mx-auto flex flex-col items-center text-center">
                    {/* Subtle Acoustic Status Indicator */}
                    <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-surface-container-high/60 backdrop-blur-md mb-8 border border-white/5">
                        <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
                        <span className="font-headline text-[12px] font-semibold tracking-wider uppercase text-on-surface-variant">
                            Live Space Telemetry • All 4 Sanctuaries Active
                        </span>
                    </div>

                    {/* Architectural, Serene Headline */}
                    <h1 className="font-headline text-[38px] sm:text-[50px] lg:text-[60px] font-bold text-on-surface tracking-tight leading-[1.15] mb-6">
                        Spaces designed for focus.{' '}
                        <span className="bg-gradient-to-r from-primary via-tertiary to-secondary bg-clip-text text-transparent">
                            Gatherings shaped with intention.
                        </span>
                    </h1>

                    <p className="text-[16px] md:text-[18px] text-on-surface-variant max-w-2xl mb-10 leading-relaxed font-normal">
                        A mindful third-place café featuring calibrated acoustic sanctuaries for deep solitary work,
                        a 100% voluntary communal table, and an artisanal coffee bar.
                    </p>

                    {/* Clean Action Navigation */}
                    <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
                        <Link
                            href="/vibe"
                            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-primary-container text-on-primary-container font-headline text-[13px] font-semibold shadow-md hover:brightness-110 transition-all"
                        >
                            <span className="material-symbols-outlined text-[18px]">chair</span>
                            <span>Find Your Sanctuary</span>
                        </Link>

                        <Link
                            href="/open-table"
                            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-surface-container-high text-on-surface font-headline text-[13px] font-semibold hover:bg-surface-container-highest transition-all border border-white/5"
                        >
                            <span className="material-symbols-outlined text-[18px] text-tertiary">diversity_1</span>
                            <span>Communal Table</span>
                        </Link>

                        <Link
                            href="/staff"
                            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-surface-container-low/70 text-on-surface-variant hover:text-on-surface font-headline text-[13px] font-medium transition-all border border-white/5"
                        >
                            <span className="material-symbols-outlined text-[18px] text-secondary">tune</span>
                            <span>Barista Console</span>
                        </Link>
                    </div>

                    {/* Atmospheric Live Metric Strip */}
                    <div className="w-full rounded-2xl bg-surface-container-low/50 backdrop-blur-xl p-4 shadow-lg border border-white/5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                            <div className="p-4 rounded-xl bg-surface-container/40 border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] text-outline-variant uppercase font-bold tracking-wider font-headline">
                                        Quiet Nook
                                    </span>
                                    <span className="material-symbols-outlined text-primary text-[16px]">volume_down</span>
                                </div>
                                <div className="font-headline text-[22px] font-bold text-on-surface">38.4 dB</div>
                                <p className="text-[12px] text-on-surface-variant mt-1">Calm whispers & library quiet</p>
                            </div>

                            <div className="p-4 rounded-xl bg-surface-container/40 border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] text-outline-variant uppercase font-bold tracking-wider font-headline">
                                        Communal Lounge
                                    </span>
                                    <span className="material-symbols-outlined text-secondary text-[16px]">handshake</span>
                                </div>
                                <div className="font-headline text-[22px] font-bold text-on-surface">3 Tables Active</div>
                                <p className="text-[12px] text-on-surface-variant mt-1">Voluntary shared seating</p>
                            </div>

                            <div className="p-4 rounded-xl bg-surface-container/40 border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] text-outline-variant uppercase font-bold tracking-wider font-headline">
                                        Espresso Bar
                                    </span>
                                    <span className="material-symbols-outlined text-tertiary text-[16px]">timelapse</span>
                                </div>
                                <div className="font-headline text-[22px] font-bold text-on-surface">3m Wait</div>
                                <p className="text-[12px] text-on-surface-variant mt-1">Handcrafted pour-overs & matcha</p>
                            </div>

                            <div className="p-4 rounded-xl bg-surface-container/40 border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] text-outline-variant uppercase font-bold tracking-wider font-headline">
                                        Spatial Harmony
                                    </span>
                                    <span className="material-symbols-outlined text-secondary text-[16px]">waves</span>
                                </div>
                                <div className="font-headline text-[22px] font-bold text-on-surface">98% Balance</div>
                                <p className="text-[12px] text-on-surface-variant mt-1">Acoustic equilibrium active</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Three Spatial Sanctuaries Section */}
            <section className="w-full px-4 md:px-8 py-16 border-t border-white/5">
                <div className="max-w-6xl mx-auto flex flex-col gap-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <div className="text-[11px] text-primary uppercase font-bold tracking-widest font-headline mb-2">
                                Three Balanced Spaces
                            </div>
                            <h2 className="font-headline text-[26px] md:text-[32px] font-bold text-on-surface tracking-tight">
                                Tailored to how you experience the café
                            </h2>
                        </div>
                        <p className="text-[14px] text-on-surface-variant max-w-md">
                            Whether you seek deep uninterrupted focus, organic conversation with neighbors, or artisanal refreshment.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Space 1: Focus Sanctuary */}
                        <div className="rounded-2xl bg-surface-container/60 backdrop-blur-xl p-6 border border-white/5 flex flex-col justify-between gap-6 hover:bg-surface-container/80 transition-all">
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                                    <span className="material-symbols-outlined text-[20px]">chair</span>
                                </div>
                                <h3 className="font-headline text-[18px] font-bold text-on-surface mb-2">
                                    Quiet Sanctuaries
                                </h3>
                                <p className="text-[13px] text-on-surface-variant leading-relaxed">
                                    Calibrated sound absorption, natural diffused lighting, and direct power outlets.
                                    Lock your seat with group size awareness and optional beverage pre-orders.
                                </p>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[12px] text-secondary font-medium">38 dB Sound Floor</span>
                                <Link
                                    href="/vibe"
                                    className="text-primary font-headline text-[12px] font-semibold hover:underline inline-flex items-center gap-1"
                                >
                                    Select Seat →
                                </Link>
                            </div>
                        </div>

                        {/* Space 2: Communal Lounge */}
                        <div className="rounded-2xl bg-surface-container/60 backdrop-blur-xl p-6 border border-white/5 flex flex-col justify-between gap-6 hover:bg-surface-container/80 transition-all">
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary mb-4">
                                    <span className="material-symbols-outlined text-[20px]">diversity_1</span>
                                </div>
                                <h3 className="font-headline text-[18px] font-bold text-on-surface mb-2">
                                    Communal Tables
                                </h3>
                                <p className="text-[13px] text-on-surface-variant leading-relaxed">
                                    100% opt-in shared tables organized around passions—from specialty origins to architecture.
                                    Host your own table or join active pods anytime.
                                </p>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[12px] text-tertiary font-medium">Zero-Intrusion Shield</span>
                                <Link
                                    href="/open-table"
                                    className="text-tertiary font-headline text-[12px] font-semibold hover:underline inline-flex items-center gap-1"
                                >
                                    Browse Tables →
                                </Link>
                            </div>
                        </div>

                        {/* Space 3: Barista Operations */}
                        <div className="rounded-2xl bg-surface-container/60 backdrop-blur-xl p-6 border border-white/5 flex flex-col justify-between gap-6 hover:bg-surface-container/80 transition-all">
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary mb-4">
                                    <span className="material-symbols-outlined text-[20px]">local_cafe</span>
                                </div>
                                <h3 className="font-headline text-[18px] font-bold text-on-surface mb-2">
                                    Artisan Bar & Kitchen
                                </h3>
                                <p className="text-[13px] text-on-surface-variant leading-relaxed">
                                    Ethically sourced single origins and fresh bakery offerings. Staff utilize a live
                                    3-pane ergonomic console with real-time stock toggling and queue pacing.
                                </p>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[12px] text-outline-variant font-mono">Real-Time Stock</span>
                                <Link
                                    href="/staff/menu"
                                    className="text-secondary font-headline text-[12px] font-semibold hover:underline inline-flex items-center gap-1"
                                >
                                    View Menu →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Privacy & Philosophy Section */}
            <section className="w-full px-4 md:px-8 py-14 bg-surface-container-lowest/30 border-t border-white/5">
                <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-6">
                    <span className="text-[11px] text-outline uppercase font-bold tracking-widest font-headline">
                        Hospitality Philosophy
                    </span>
                    <h3 className="font-headline text-[24px] md:text-[28px] font-bold text-on-surface max-w-xl">
                        Thoughtful physical constraints. Never surveillance.
                    </h3>
                    <p className="text-[14px] text-on-surface-variant leading-relaxed max-w-2xl">
                        Acoustic monitors measure decibel volume only—never audio recording or voice transcription.
                        Solo guests choosing focus mode are mathematically invisible to social table seekers.
                        Your autonomy in the space is always respected.
                    </p>

                    <div className="flex items-center gap-6 pt-4 text-[12px] text-outline-variant font-medium">
                        <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-secondary text-[16px]">verified</span>
                            Decibel Pressure Only
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-secondary text-[16px]">visibility_off</span>
                            Focus Cloaking
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-secondary text-[16px]">battery_charging_full</span>
                            Fast Charging Outlets
                        </span>
                    </div>
                </div>
            </section>
        </div>
    );
}
