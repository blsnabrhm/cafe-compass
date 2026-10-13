'use client';

import React, { useState, useEffect } from 'react';
import { OpenTablePod } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';

export default function OpenTablePage() {
    const { toast } = useToast();
    const [optedIn, setOptedIn] = useState(true);
    const [nickname, setNickname] = useState('Visiting Guest');
    const [selectedTags, setSelectedTags] = useState<string[]>([
        'Specialty Coffee',
        'Creative Writing',
        'Design & Architecture',
    ]);
    const [customTagInput, setCustomTagInput] = useState('');
    const [pods, setPods] = useState<OpenTablePod[]>([]);
    const [loadingSpark, setLoadingSpark] = useState(false);

    // Create Pod Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTableTopic, setNewTableTopic] = useState('');
    const [newMaxSeats, setNewMaxSeats] = useState(4);
    const [newTableInterests, setNewTableInterests] = useState<string[]>([]);
    const [newCustomInterest, setNewCustomInterest] = useState('');
    const [submittingPod, setSubmittingPod] = useState(false);

    // Gemini icebreaker spark state
    const [icebreaker, setIcebreaker] = useState({
        headline: 'Coffee Extraction & Modern Creative Workflows',
        sparkPrompt:
            'A conversation bridge connecting light-roast tasting notes with creative writing routines and architectural spatial design.',
        commonThemes: ['Specialty Coffee', 'Creative Writing', 'Design & Architecture'],
        suggestedFirstQuestion:
            'What project or soundtrack is keeping you company this morning?',
    });

    const defaultInterestTags = [
        'Specialty Coffee',
        'Creative Writing',
        'Design & Architecture',
        'Startups & Tech',
        'Books & Literature',
        'Music & Vinyl',
        'Urban Photography',
        'Philosophy & Ethics',
    ];

    // Fetch initial pods and listen to SSE
    useEffect(() => {
        let eventSource: EventSource | null = null;
        try {
            eventSource = new EventSource('/api/stream');
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.pods) setPods(data.pods);
                } catch { }
            };
        } catch { }

        // Initial fetch fallback
        fetch('/api/open-table')
            .then((r) => r.json())
            .then((d) => {
                if (d.pods) setPods(d.pods);
            })
            .catch(() => { });

        return () => {
            eventSource?.close();
        };
    }, []);

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const handleAddCustomTag = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = customTagInput.trim();
        if (trimmed && !selectedTags.includes(trimmed)) {
            setSelectedTags((prev) => [...prev, trimmed]);
            setCustomTagInput('');
            toast(`Added interest: "${trimmed}"`, 'tertiary');
        }
    };

    const handleRegenerateSpark = async () => {
        setLoadingSpark(true);
        try {
            const res = await fetch('/api/open-table', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'spark',
                    tags: selectedTags,
                    stealth: !optedIn,
                }),
            });
            const data = await res.json();
            if (data.success && data.spark) {
                setIcebreaker(data.spark);
                toast('Generated fresh conversational icebreaker spark', 'tertiary');
            } else {
                toast('Using organic conversation bridge', 'outline');
            }
        } catch {
            toast('Applied organic conversation bridge', 'outline');
        } finally {
            setLoadingSpark(false);
        }
    };

    const handleJoinPod = async (podId: string) => {
        if (!optedIn) {
            toast('Please enable Open Table opt-in first (currently in Focus Cloaking mode).', 'error');
            return;
        }

        try {
            const res = await fetch('/api/open-table', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'join',
                    podId,
                    nickname: nickname.trim() || 'Visiting Guest',
                    tags: selectedTags,
                    role: 'Visiting Guest',
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast(`Joined Table Pod! Welcome, ${nickname.trim() || 'Guest'}.`, 'secondary');
            }
        } catch {
            toast('Joined Table Pod in local session', 'secondary');
        }
    };

    const handleLeavePod = async (podId: string) => {
        try {
            const res = await fetch('/api/open-table', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'leave',
                    podId,
                    nickname: nickname.trim() || 'Visiting Guest',
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast('Left Table Pod. Your seat has been released.', 'outline');
            }
        } catch {
            toast('Seat released from pod', 'outline');
        }
    };

    // Open Table Creation Modal with Owner's Interests pre-populated
    const openCreatePodModal = () => {
        setNewTableTopic('');
        setNewMaxSeats(4);
        // Prepopulate table interests with table owner's interests
        setNewTableInterests([...selectedTags]);
        setShowCreateModal(true);
    };

    const toggleNewTableInterest = (interest: string) => {
        setNewTableInterests((prev) =>
            prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
        );
    };

    const handleAddCustomInterestToTable = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newCustomInterest.trim();
        if (trimmed && !newTableInterests.includes(trimmed)) {
            setNewTableInterests((prev) => [...prev, trimmed]);
            setNewCustomInterest('');
        }
    };

    const handleCreatePod = async (e: React.FormEvent) => {
        e.preventDefault();
        const topic = newTableTopic.trim();
        if (!topic) {
            toast('Please specify a table topic or focus area', 'error');
            return;
        }

        setSubmittingPod(true);
        try {
            const res = await fetch('/api/open-table', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create',
                    topic,
                    maxParticipants: newMaxSeats,
                    hostNickname: nickname.trim() || 'Table Host',
                    role: 'Table Host',
                    interests: newTableInterests.length > 0 ? newTableInterests : selectedTags,
                }),
            });
            const data = await res.json();
            if (data.success && data.pod) {
                toast(`Created Table Pod "${topic}"! You are the host.`, 'secondary');
                setShowCreateModal(false);
            } else {
                toast('Error creating table pod', 'error');
            }
        } catch {
            toast('Failed to reach server. Please retry.', 'error');
        } finally {
            setSubmittingPod(false);
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 text-tertiary font-headline text-[12px] uppercase font-bold tracking-widest mb-1.5">
                        <span className="material-symbols-outlined text-[16px]">diversity_1</span>
                        Community Lounge • 100% Opt-In Serendipity
                    </div>
                    <h1 className="font-headline text-[28px] md:text-[34px] font-bold text-on-surface tracking-tight">
                        Open Table Pods
                    </h1>
                    <p className="text-[14px] text-on-surface-variant max-w-2xl mt-1">
                        Connect organically with fellow café patrons over shared interests and artisan brew.
                        Solo guests can remain completely invisible with Focus Cloaking.
                    </p>
                </div>

                {/* 100% Opt-In Toggle Switch */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-high/70 backdrop-blur-xl border border-white/5">
                    <div className="flex flex-col text-right">
                        <span className="font-headline text-[12px] font-semibold text-on-surface">
                            {optedIn ? 'Open Table Opted-In' : 'Focus Mode (Cloaked)'}
                        </span>
                        <span
                            className={`text-[10px] font-medium ${optedIn ? 'text-tertiary' : 'text-secondary'
                                }`}
                        >
                            {optedIn ? 'Public Pod Discovery Active' : 'Zero-Intrusion Shield On'}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const next = !optedIn;
                            setOptedIn(next);
                            toast(
                                next
                                    ? 'Opted into Open Table! You can now browse, host & join communal pods.'
                                    : 'Focus Cloaking engaged. You are completely invisible.',
                                next ? 'tertiary' : 'secondary'
                            );
                        }}
                        className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${optedIn ? 'bg-tertiary' : 'bg-surface-container-highest'
                            }`}
                    >
                        <div
                            className={`bg-surface w-4 h-4 rounded-full shadow-md transform transition-transform ${optedIn ? 'translate-x-6' : 'translate-x-0'
                                }`}
                        />
                    </button>
                </div>
            </div>

            {/* Privacy Notice Banner if Cloaked */}
            {!optedIn && (
                <div className="p-4 rounded-2xl bg-secondary-container/20 border border-secondary/30 flex items-center gap-3 text-on-surface">
                    <span className="material-symbols-outlined text-secondary text-[24px]">
                        verified_user
                    </span>
                    <div className="flex-1 text-[13px]">
                        <strong className="text-secondary font-semibold font-headline">
                            Focus Shield Active:
                        </strong>{' '}
                        Your seat, intention, and presence are mathematically invisible to other café guests.
                        Turn on Open Table opt-in above if you would like to join or host communal tables.
                    </div>
                </div>
            )}

            {/* Patron Profile & Natural Interest Selector */}
            <div className="rounded-2xl bg-surface-container/70 backdrop-blur-2xl p-6 shadow-xl border border-white/5 flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/5">
                    <div className="flex-1 max-w-md">
                        <label className="text-[11px] font-headline font-semibold text-outline-variant uppercase tracking-wider block mb-1">
                            Your Display Name or Handle
                        </label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="e.g. Alex, Maya, Quiet Reader..."
                            className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] border border-white/10 focus:outline-none focus:ring-1 focus:ring-tertiary"
                        />
                    </div>

                    <div className="flex items-center gap-2 text-[12px] text-outline-variant">
                        <span className="material-symbols-outlined text-[18px] text-secondary">
                            lock
                        </span>
                        <span>Zero tracking • Identity resets on departure</span>
                    </div>
                </div>

                {/* Natural Interests Section */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <label className="font-headline text-[13px] font-semibold text-on-surface flex items-center gap-2">
                            <span className="material-symbols-outlined text-tertiary text-[18px]">
                                tag
                            </span>
                            Your Conversation & Reading Passions
                        </label>
                        <span className="text-[11px] text-outline-variant">
                            {selectedTags.length} interests selected
                        </span>
                    </div>

                    {/* Pill Tags */}
                    <div className="flex flex-wrap gap-2">
                        {defaultInterestTags.map((tag) => {
                            const isSelected = selectedTags.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleTag(tag)}
                                    className={`px-3.5 py-1.5 rounded-xl text-[12px] font-headline font-medium transition-all flex items-center gap-1.5 ${isSelected
                                            ? 'bg-tertiary text-on-tertiary shadow-md scale-105'
                                            : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant border border-white/5'
                                        }`}
                                >
                                    <span>{tag}</span>
                                    {isSelected && (
                                        <span className="material-symbols-outlined text-[14px]">
                                            check
                                        </span>
                                    )}
                                </button>
                            );
                        })}

                        {/* Custom user tags */}
                        {selectedTags
                            .filter((t) => !defaultInterestTags.includes(t))
                            .map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleTag(tag)}
                                    className="px-3.5 py-1.5 rounded-xl text-[12px] font-headline font-medium bg-tertiary text-on-tertiary shadow-md scale-105 flex items-center gap-1.5"
                                >
                                    <span>{tag}</span>
                                    <span className="material-symbols-outlined text-[14px]">
                                        close
                                    </span>
                                </button>
                            ))}
                    </div>

                    {/* Custom Tag Input */}
                    <form
                        onSubmit={handleAddCustomTag}
                        className="flex items-center gap-2 mt-2 max-w-sm"
                    >
                        <input
                            type="text"
                            value={customTagInput}
                            onChange={(e) => setCustomTagInput(e.target.value)}
                            placeholder="Add your own niche passion..."
                            className="flex-1 h-9 px-3 rounded-xl bg-surface-container-lowest text-on-surface text-[12px] border border-white/10 focus:outline-none focus:ring-1 focus:ring-tertiary"
                        />
                        <button
                            type="submit"
                            className="h-9 px-3 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-headline text-[12px] font-medium border border-white/5 transition-colors"
                        >
                            + Add Tag
                        </button>
                    </form>
                </div>
            </div>

            {/* Conversation Spark Feature Card */}
            <div className="rounded-2xl bg-gradient-to-br from-surface-container-high/90 via-surface-container/90 to-surface-container-low/90 backdrop-blur-2xl p-6 md:p-8 shadow-2xl border border-tertiary/20 relative overflow-hidden flex flex-col justify-between gap-6">
                <div className="absolute top-0 right-0 w-48 h-48 bg-tertiary/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary/15 text-tertiary font-headline text-[11px] font-bold uppercase tracking-wider">
                            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                            Contextual Icebreaker Spark
                        </span>
                        <button
                            type="button"
                            disabled={loadingSpark}
                            onClick={handleRegenerateSpark}
                            className="flex items-center gap-1.5 text-tertiary hover:underline text-[12px] font-headline font-semibold"
                        >
                            <span
                                className={`material-symbols-outlined text-[16px] ${loadingSpark ? 'animate-spin' : ''
                                    }`}
                            >
                                sync
                            </span>
                            <span>Regenerate Spark</span>
                        </button>
                    </div>

                    <div>
                        <h3 className="font-headline text-[22px] md:text-[24px] font-bold text-on-surface">
                            {icebreaker.headline}
                        </h3>
                        <p className="text-[14px] text-on-surface-variant mt-2 leading-relaxed">
                            {icebreaker.sparkPrompt}
                        </p>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-container-lowest/80 border border-white/5 flex flex-col gap-2">
                        <div className="text-[11px] text-tertiary font-headline font-bold uppercase tracking-wider flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">chat_bubble</span>
                            Natural Conversation Starter:
                        </div>
                        <div className="text-[13px] text-on-surface font-medium italic">
                            &quot;{icebreaker.suggestedFirstQuestion}&quot;
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/5 text-[12px] text-outline-variant">
                    <div className="flex items-center gap-2">
                        <span>Shared Interests:</span>
                        {icebreaker.commonThemes.map((t) => (
                            <span
                                key={t}
                                className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface text-[11px]"
                            >
                                {t}
                            </span>
                        ))}
                    </div>
                    <span className="text-secondary font-medium">100% Voluntary • Polite Exit Guaranteed</span>
                </div>
            </div>

            {/* Active Communal Pods Grid Header with Create Table Button */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="font-headline text-[20px] font-bold text-on-surface">
                            Active Communal Pods
                        </h2>
                        <p className="text-[12px] text-on-surface-variant">
                            Open tables hosting voluntary conversations right now.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-[12px] text-outline font-mono">
                            {pods.length} Pods in Session
                        </span>

                        <button
                            type="button"
                            onClick={openCreatePodModal}
                            className="px-4 py-2.5 rounded-xl bg-primary-container text-on-primary-container font-headline text-[12px] font-semibold hover:brightness-110 shadow-md flex items-center gap-1.5 transition-all"
                        >
                            <span className="material-symbols-outlined text-[16px]">add_circle</span>
                            <span>+ Host Table Pod</span>
                        </button>
                    </div>
                </div>

                {/* Pod Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {pods.map((pod) => {
                        const isUserSeated = pod.participants.some(
                            (p) => p.nickname.toLowerCase() === nickname.trim().toLowerCase()
                        );

                        return (
                            <div
                                key={pod.id}
                                className="rounded-2xl bg-surface-container/70 backdrop-blur-2xl p-6 shadow-xl border border-white/5 flex flex-col justify-between gap-5"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="px-3 py-1 rounded-full bg-surface-container-high text-primary font-headline text-[11px] font-bold">
                                            Table #{pod.tableNumber}
                                        </span>
                                        <span className="text-[12px] text-secondary font-semibold font-mono">
                                            {pod.participantCount} / {pod.maxParticipants} Seated
                                        </span>
                                    </div>

                                    <h3 className="font-headline text-[18px] font-bold text-on-surface">
                                        {pod.title}
                                    </h3>

                                    <div className="flex flex-wrap gap-1.5 my-3">
                                        {pod.interestTags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="px-2 py-0.5 rounded-md bg-surface-container-lowest text-on-surface-variant text-[11px]"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Participants Avatars */}
                                    <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/5">
                                        <div className="text-[11px] text-outline uppercase font-bold tracking-wider">
                                            Seated Guests
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            {pod.participants.map((p, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-surface-container-low/80 border border-white/5"
                                                >
                                                    <img
                                                        alt={p.nickname}
                                                        src={p.avatar}
                                                        className="w-7 h-7 rounded-full object-cover"
                                                    />
                                                    <div className="text-[12px] leading-tight">
                                                        <div className="font-headline font-semibold text-on-surface">
                                                            {p.nickname}
                                                        </div>
                                                        <div className="text-[10px] text-outline-variant">{p.role}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-[12px] text-outline-variant">
                                        {isUserSeated
                                            ? 'You are seated at this pod'
                                            : pod.status === 'full'
                                                ? 'Pod at full capacity'
                                                : `${pod.maxParticipants - pod.participantCount} seat(s) available`}
                                    </span>

                                    {isUserSeated ? (
                                        <button
                                            type="button"
                                            onClick={() => handleLeavePod(pod.id)}
                                            className="px-4 py-2 rounded-xl font-headline text-[12px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                                        >
                                            Leave Table
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={pod.status === 'full'}
                                            onClick={() => handleJoinPod(pod.id)}
                                            className={`px-5 py-2.5 rounded-xl font-headline text-[12px] font-semibold transition-all ${pod.status === 'full'
                                                    ? 'bg-surface-container-high text-outline cursor-not-allowed'
                                                    : 'bg-primary-container text-on-primary-container hover:brightness-110 shadow-md'
                                                }`}
                                        >
                                            {pod.status === 'full' ? 'Table Full' : 'Join Table Pod'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Host / Create Table Pod Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <form
                        onSubmit={handleCreatePod}
                        className="bg-surface-container rounded-2xl max-w-lg w-full flex flex-col shadow-2xl border border-white/10 overflow-hidden animate-fadeIn"
                    >
                        <div className="p-5 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h3 className="font-headline text-[18px] font-bold text-on-surface">
                                    Host a New Table Pod
                                </h3>
                                <p className="text-[12px] text-on-surface-variant">
                                    Define the table topic and invite fellow patrons to join you.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
                            {/* Table Topic */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[12px] font-headline font-semibold text-on-surface">
                                    Table Discussion Topic / Theme
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newTableTopic}
                                    onChange={(e) => setNewTableTopic(e.target.value)}
                                    placeholder="e.g. Specialty Cold Brew Tasting & UI Design..."
                                    className="w-full h-11 px-3.5 rounded-xl bg-surface-container-lowest text-on-surface text-[13px] border border-white/10 focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            {/* Host Nickname & Seats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[12px] font-headline font-semibold text-on-surface">
                                        Host Name
                                    </label>
                                    <input
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface text-[13px] border border-white/10 focus:outline-none"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[12px] font-headline font-semibold text-on-surface">
                                        Max Seats
                                    </label>
                                    <select
                                        value={newMaxSeats}
                                        onChange={(e) => setNewMaxSeats(Number(e.target.value))}
                                        className="w-full h-10 px-3 rounded-xl bg-surface-container-lowest text-on-surface text-[13px] border border-white/10 focus:outline-none"
                                    >
                                        <option value={2}>2 Guests (Intimate 1:1)</option>
                                        <option value={3}>3 Guests</option>
                                        <option value={4}>4 Guests (Standard Pod)</option>
                                        <option value={6}>6 Guests (Large Pod)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Table Owner's Interests pre-populated */}
                            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                                <label className="text-[12px] font-headline font-semibold text-on-surface flex items-center justify-between">
                                    <span>Table Interest Tags (Derived from your passions)</span>
                                    <span className="text-[11px] text-tertiary">
                                        {newTableInterests.length} selected
                                    </span>
                                </label>
                                <p className="text-[11px] text-on-surface-variant">
                                    Fellow patrons will match with your table based on these tags.
                                </p>

                                <div className="flex flex-wrap gap-1.5">
                                    {defaultInterestTags.map((interest) => {
                                        const isSelected = newTableInterests.includes(interest);
                                        return (
                                            <button
                                                key={interest}
                                                type="button"
                                                onClick={() => toggleNewTableInterest(interest)}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-headline font-medium transition-all ${isSelected
                                                        ? 'bg-tertiary text-on-tertiary shadow-sm'
                                                        : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface border border-white/5'
                                                    }`}
                                            >
                                                {interest} {isSelected ? '✓' : '+'}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Custom Tag for this table */}
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="text"
                                        value={newCustomInterest}
                                        onChange={(e) => setNewCustomInterest(e.target.value)}
                                        placeholder="Add specific tag..."
                                        className="flex-1 h-8 px-2.5 rounded-lg bg-surface-container-lowest text-on-surface text-[11px] border border-white/10"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCustomInterestToTable}
                                        className="h-8 px-2.5 rounded-lg bg-surface-container-high text-on-surface text-[11px] font-headline font-medium"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-white/10 flex items-center justify-end gap-3 bg-surface-container-low">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 rounded-xl text-[12px] font-headline font-semibold text-on-surface-variant hover:text-on-surface"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submittingPod}
                                className="px-5 py-2 rounded-xl bg-primary-container text-on-primary-container font-headline text-[12px] font-semibold hover:brightness-110 shadow-md disabled:opacity-50"
                            >
                                {submittingPod ? 'Creating Pod...' : 'Create & Host Table'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
