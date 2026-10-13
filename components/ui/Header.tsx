'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Header() {
    const pathname = usePathname();
    const [telemetry, setTelemetry] = useState<{ zoneADb: number; seatingOpen: number }>({
        zoneADb: 42,
        seatingOpen: 78,
    });

    // Listen to SSE updates for live header status
    useEffect(() => {
        let eventSource: EventSource | null = null;
        try {
            eventSource = new EventSource('/api/stream');
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const zoneA = data.zones?.find((z: any) => z.id === 'zone-a');
                    const metrics = data.metrics;
                    if (zoneA) {
                        setTelemetry({
                            zoneADb: zoneA.decibels,
                            seatingOpen: 100 - (metrics?.capacityPercent || 74),
                        });
                    }
                } catch { }
            };
        } catch { }

        return () => {
            eventSource?.close();
        };
    }, []);

    const navLinks = [
        { href: '/', label: 'Overview', path: 'overview' },
        { href: '/vibe', label: 'Vibe & Seating', path: 'vibe' },
        { href: '/open-table', label: 'Open Table', path: 'open-table' },
        { href: '/staff', label: 'Staff Intelligence', path: 'staff' },
    ];

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f131d]/80 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] border-b border-white/5">
            {/* 4-color Google Aurora Accent Line */}
            <div className="h-0.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] opacity-80" />

            <div className="h-16 w-full px-4 md:px-8 flex items-center justify-between gap-4">
                {/* Brand & Nav */}
                <div className="flex items-center gap-6 flex-shrink-0">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary via-tertiary to-secondary p-0.5 shadow-md group-hover:scale-105 transition-transform">
                            <div className="h-full w-full bg-[#0f131d] rounded-[6px] flex items-center justify-center">
                                <span className="material-symbols-outlined text-[18px] text-primary">explore</span>
                            </div>
                        </div>
                        <span className="font-headline text-[18px] font-semibold text-on-surface tracking-tight">
                            Café Compass
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden xl:flex items-center gap-1">
                        {navLinks.map((link) => {
                            const isActive =
                                link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`px-3 py-1.5 font-headline text-[12px] font-medium rounded-lg transition-all ${isActive
                                        ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Live Telemetry and Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Real-time Zone Pills */}
                    <div className="hidden lg:flex items-center gap-3 px-3 py-1 rounded-full bg-surface-container-low/80 border border-white/5">
                        <div className="flex items-center gap-1.5">
                            <span
                                className={`h-2 w-2 rounded-full ${telemetry.zoneADb > 50 ? 'bg-tertiary' : 'bg-secondary'
                                    } shadow-[0_0_8px_rgba(52,168,83,0.6)]`}
                            />
                            <span className="text-[11px] text-on-surface-variant">
                                Zone A:{' '}
                                <strong
                                    className={`font-semibold ${telemetry.zoneADb > 50 ? 'text-tertiary' : 'text-secondary'
                                        }`}
                                >
                                    {telemetry.zoneADb}dB {telemetry.zoneADb <= 50 ? 'Quiet' : 'Active'}
                                </strong>
                            </span>
                        </div>
                        <span className="text-outline-variant text-[11px]">•</span>
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(251,188,5,0.6)]" />
                            <span className="text-[11px] text-on-surface-variant">
                                Seating:{' '}
                                <strong className="text-on-surface font-semibold">
                                    {telemetry.seatingOpen}% Open
                                </strong>
                            </span>
                        </div>
                    </div>

                    {/* Quick Search */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-lowest/80 border border-white/5 text-on-surface-variant text-[12px] w-40 lg:w-52">
                        <span className="material-symbols-outlined text-[16px] text-outline">search</span>
                        <span className="flex-1 truncate text-outline text-[12px]">Search café vibe, tables...</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high text-outline text-[10px] font-semibold">
                            ⌘K
                        </kbd>
                    </div>

                    {/* Quick simulation trigger */}
                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                await fetch('/api/sim/tick', { method: 'POST' });
                            } catch { }
                        }}
                        title="Advance Simulation Step"
                        className="p-2 rounded-full bg-surface-container-high/60 text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">sync</span>
                    </button>

                    {/* Persona Avatar */}
                    <div className="flex items-center gap-2 pl-1">
                        <img
                            alt="Profile"
                            className="w-8 h-8 rounded-full object-cover border border-white/10 shadow-sm"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEDgtBJRIjcJwpgHFeuJYKPa9YKIXvGQqkRPvtJjvo9qkBgk5MI1Xu65adKY58j7SvHAwEp1E6wf5vNz8GFLTXJiV4ChZyYqHvamBdRqgakG6NFxpeCw-cH0DekzwPfcQ31FM9GwY2swnc57X77at7o4u6nngtRgLXN03hPdoRXpDOtdy2uYK1wTM0dC97n2fvTZMTmqltRemt15s8M2IVMkC9WYZA6Q34j64d046GPJCq4W4PSlil"
                        />
                    </div>
                </div>
            </div>
        </header>
    );
}
