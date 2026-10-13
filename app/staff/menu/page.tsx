'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MenuItem } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';

export default function StaffMenuPage() {
    const { toast } = useToast();
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // Modal state for adding a menu item
    const [showAddModal, setShowAddModal] = useState(false);
    const [submittingItem, setSubmittingItem] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemCategory, setNewItemCategory] = useState<'Coffee' | 'Tea' | 'Pastries' | 'Light Bites'>('Coffee');
    const [newItemPrice, setNewItemPrice] = useState('$5.50');
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemSensory, setNewItemSensory] = useState('');
    const [newItemTags, setNewItemTags] = useState('Specialty, House Favorite');
    const [newItemImage, setNewItemImage] = useState(
        'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80'
    );

    // Sample images presets
    const presetImages = [
        { label: 'Pour Over', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80' },
        { label: 'Espresso / Latte', url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80' },
        { label: 'Matcha / Tea', url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80' },
        { label: 'Croissant / Bakery', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80' },
        { label: 'Toast / Light Bite', url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80' },
    ];

    // Fetch initial menu items
    const fetchMenu = async () => {
        try {
            const res = await fetch('/api/menu');
            const data = await res.json();
            if (data.success && data.menu) {
                setMenu(data.menu);
            }
        } catch (err) {
            console.error('Failed to load menu:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMenu();
    }, []);

    // Listen to real-time updates via SSE
    useEffect(() => {
        let es: EventSource | null = null;
        try {
            es = new EventSource('/api/stream');
            es.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.menu && Array.isArray(data.menu)) {
                        setMenu(data.menu);
                    }
                } catch { }
            };
        } catch { }

        return () => {
            es?.close();
        };
    }, []);

    const toggleAvailability = async (item: MenuItem) => {
        setTogglingId(item.id);
        const nextState = !item.available;

        // Optimistic update
        setMenu((prev) =>
            prev.map((m) => (m.id === item.id ? { ...m, available: nextState } : m))
        );

        try {
            const res = await fetch('/api/menu', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: item.id, available: nextState }),
            });
            const data = await res.json();

            if (data.success) {
                toast(
                    nextState
                        ? `✓ ${item.name} is now IN STOCK`
                        : `⚠ 86'd: ${item.name} marked OUT OF STOCK`,
                    nextState ? 'primary' : 'outline'
                );
            } else {
                // Revert if failed
                setMenu((prev) =>
                    prev.map((m) => (m.id === item.id ? { ...m, available: !nextState } : m))
                );
                toast(data.error || 'Failed to update stock status', 'error');
            }
        } catch {
            setMenu((prev) =>
                prev.map((m) => (m.id === item.id ? { ...m, available: !nextState } : m))
            );
            toast('Network error updating inventory', 'error');
        } finally {
            setTogglingId(null);
        }
    };

    const handleDeleteItem = async (itemId: string, itemName: string) => {
        if (!confirm(`Are you sure you want to remove "${itemName}" from the database?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/menu?id=${itemId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setMenu((prev) => prev.filter((i) => i.id !== itemId));
                toast(`Removed ${itemName} from menu`, 'outline');
            } else {
                toast('Failed to delete item', 'error');
            }
        } catch {
            toast('Network error deleting item', 'error');
        }
    };

    const handleCreateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim()) {
            toast('Item name is required', 'error');
            return;
        }

        setSubmittingItem(true);
        const tags = newItemTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);

        const newItemPayload = {
            name: newItemName.trim(),
            category: newItemCategory,
            price: newItemPrice.trim() || '$5.00',
            description: newItemDesc.trim() || 'Handcrafted specialty selection.',
            sensoryNotes: newItemSensory.trim() || 'Delicate tasting notes, balanced finish.',
            tags: tags.length > 0 ? tags : ['Specialty'],
            imageUrl: newItemImage,
            available: true,
        };

        try {
            const res = await fetch('/api/menu', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItemPayload),
            });
            const data = await res.json();

            if (data.success && data.item) {
                setMenu((prev) => [...prev, data.item]);
                toast(`Added "${data.item.name}" to menu database!`, 'primary');
                setShowAddModal(false);
                // Reset form
                setNewItemName('');
                setNewItemDesc('');
                setNewItemSensory('');
                setNewItemPrice('$5.50');
            } else {
                toast(data.error || 'Failed to add item', 'error');
            }
        } catch {
            toast('Network error saving menu item', 'error');
        } finally {
            setSubmittingItem(false);
        }
    };

    const categories = ['All', 'Coffee', 'Tea', 'Pastries', 'Light Bites'];

    const filteredMenu = menu.filter((item) => {
        const matchesCategory =
            selectedCategory === 'All' || item.category === selectedCategory;
        const matchesSearch =
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const inStockCount = menu.filter((m) => m.available).length;
    const outOfStockCount = menu.length - inStockCount;

    return (
        <div className="min-h-screen bg-[#07090E] text-slate-100 p-4 md:p-8 selection:bg-amber-500/30">
            {/* Header & Breadcrumb */}
            <header className="max-w-7xl mx-auto mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
                    <div>
                        <div className="flex items-center gap-3 text-xs tracking-widest text-slate-400 uppercase font-mono mb-1">
                            <Link
                                href="/staff"
                                className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
                            >
                                <span>←</span> Staff Console
                            </Link>
                            <span>/</span>
                            <span className="text-slate-300">Culinary Inventory & 86 Management</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-light tracking-tight text-white flex items-center gap-3">
                            <span>Bar & Kitchen Stock Inventory</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                Live AI Grounding
                            </span>
                        </h1>
                        <p className="text-slate-400 text-sm mt-1 max-w-2xl font-light">
                            Items toggled to <strong className="text-amber-400 font-medium">86 (Out of Stock)</strong> are immediately removed from patron AI drink pairing recommendations and mobile ordering in real time.
                        </p>
                    </div>

                    {/* Action Bar & Stock KPI Pills */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowAddModal(true)}
                            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-medium text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all"
                        >
                            <span className="text-base font-bold">+</span>
                            <span>Add Menu Item</span>
                        </button>

                        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-2 text-center min-w-[80px]">
                            <div className="text-[10px] text-slate-400 font-mono">Total Menu</div>
                            <div className="text-lg font-light text-white">{menu.length}</div>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 text-center min-w-[80px]">
                            <div className="text-[10px] text-emerald-400 font-mono">In Stock</div>
                            <div className="text-lg font-light text-emerald-300">{inStockCount}</div>
                        </div>
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2 text-center min-w-[80px]">
                            <div className="text-[10px] text-rose-400 font-mono">86&apos;d (Out)</div>
                            <div className="text-lg font-light text-rose-300">{outOfStockCount}</div>
                        </div>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mt-6">
                    {/* Category Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all shrink-0 ${selectedCategory === cat
                                        ? 'bg-amber-400 text-slate-950 font-semibold shadow-lg shadow-amber-500/20'
                                        : 'bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.06]'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative min-w-[280px]">
                        <input
                            type="text"
                            placeholder="Search by title, notes, or tags..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 transition-colors"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Menu Items Grid */}
            <main className="max-w-7xl mx-auto">
                {loading ? (
                    <div className="text-center py-24 text-slate-500 font-mono text-sm animate-pulse">
                        Synchronizing menu state from storage...
                    </div>
                ) : filteredMenu.length === 0 ? (
                    <div className="text-center py-20 bg-white/[0.02] border border-white/[0.05] rounded-2xl p-8">
                        <div className="text-4xl mb-3">☕</div>
                        <div className="text-slate-300 font-light text-base">No culinary items found</div>
                        <div className="text-slate-500 text-xs mt-1">
                            Try adjusting your category filter or click &quot;Add Menu Item&quot; above to create one.
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredMenu.map((item) => (
                            <div
                                key={item.id}
                                className={`group rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${item.available
                                        ? 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.16] shadow-sm'
                                        : 'bg-rose-950/10 border-rose-500/20 opacity-80'
                                    }`}
                            >
                                <div>
                                    {/* Image with Stock Ribbon */}
                                    <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                                        <img
                                            src={item.imageUrl}
                                            alt={item.name}
                                            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${!item.available ? 'grayscale contrast-125' : ''
                                                }`}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#07090E] via-transparent to-black/30" />

                                        {/* Status Badge */}
                                        <div className="absolute top-3 right-3 flex items-center gap-2">
                                            {item.available ? (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium tracking-wider uppercase bg-emerald-500/80 backdrop-blur-md text-emerald-950 border border-emerald-400/40">
                                                    ● In Stock
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-rose-500 text-white shadow-lg">
                                                    86&apos;d / Out
                                                </span>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => handleDeleteItem(item.id, item.name)}
                                                title="Delete item from database"
                                                className="w-6 h-6 rounded-full bg-black/60 hover:bg-rose-600/80 text-white/70 hover:text-white flex items-center justify-center text-xs backdrop-blur-md transition-colors"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        {/* Category Badge */}
                                        <div className="absolute top-3 left-3">
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase bg-black/60 backdrop-blur-md text-slate-300 border border-white/10">
                                                {item.category}
                                            </span>
                                        </div>

                                        {/* Price overlay */}
                                        <div className="absolute bottom-3 right-3 text-sm font-mono font-medium text-amber-300 bg-black/60 px-2 py-0.5 rounded backdrop-blur-md border border-amber-400/20">
                                            {item.price}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <h2 className="text-base font-medium text-white group-hover:text-amber-300 transition-colors">
                                            {item.name}
                                        </h2>
                                        <p className="text-xs text-slate-400 font-light mt-1.5 leading-relaxed line-clamp-2">
                                            {item.description}
                                        </p>

                                        {/* Sensory notes */}
                                        <div className="mt-3 flex items-start gap-1.5 text-[11px] text-amber-300/80 bg-amber-400/[0.04] p-2 rounded-lg border border-amber-400/10">
                                            <span className="shrink-0 text-amber-400 font-serif">✧</span>
                                            <span className="font-light italic line-clamp-1">
                                                {item.sensoryNotes}
                                            </span>
                                        </div>

                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {item.tags.map((t) => (
                                                <span
                                                    key={t}
                                                    className="text-[10px] px-2 py-0.5 rounded bg-white/[0.03] text-slate-400 font-mono"
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Stock Action Button */}
                                <div className="p-5 pt-0">
                                    <button
                                        onClick={() => toggleAvailability(item)}
                                        disabled={togglingId === item.id}
                                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-mono tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 ${item.available
                                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40'
                                                : 'bg-emerald-500 text-emerald-950 font-bold hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
                                            }`}
                                    >
                                        {togglingId === item.id ? (
                                            <span className="animate-spin">⟳</span>
                                        ) : item.available ? (
                                            <>
                                                <span>✕</span>
                                                <span>86 This Item (Out of Stock)</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>✓</span>
                                                <span>Restore to In Stock</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Add Menu Item Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
                    <form
                        onSubmit={handleCreateItem}
                        className="bg-[#0E121A] border border-white/10 rounded-2xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden animate-fadeIn text-slate-200"
                    >
                        <div className="p-5 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-semibold text-white">
                                    Add New Culinary / Bar Item
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Inserts into the active menu database and synchronizes with AI recommendations.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-5 flex flex-col gap-4 max-h-[72vh] overflow-y-auto">
                            {/* Name & Category */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs text-slate-400 font-mono">Item Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        placeholder="e.g. Cardamom Honey Cortado"
                                        className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400/60"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs text-slate-400 font-mono">Category</label>
                                    <select
                                        value={newItemCategory}
                                        onChange={(e) => setNewItemCategory(e.target.value as any)}
                                        className="h-10 px-3 rounded-xl bg-[#141A24] border border-white/10 text-xs text-white focus:outline-none"
                                    >
                                        <option value="Coffee">Coffee</option>
                                        <option value="Tea">Tea</option>
                                        <option value="Pastries">Pastries</option>
                                        <option value="Light Bites">Light Bites</option>
                                    </select>
                                </div>
                            </div>

                            {/* Price & Tags */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs text-slate-400 font-mono">Price</label>
                                    <input
                                        type="text"
                                        required
                                        value={newItemPrice}
                                        onChange={(e) => setNewItemPrice(e.target.value)}
                                        placeholder="$5.75"
                                        className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs text-slate-400 font-mono">Tags (comma-separated)</label>
                                    <input
                                        type="text"
                                        value={newItemTags}
                                        onChange={(e) => setNewItemTags(e.target.value)}
                                        placeholder="Espresso, Seasonal, Warm"
                                        className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-slate-400 font-mono">Description</label>
                                <textarea
                                    rows={2}
                                    value={newItemDesc}
                                    onChange={(e) => setNewItemDesc(e.target.value)}
                                    placeholder="Handcrafted double shot espresso cut with steamed whole milk and warm ground spices."
                                    className="p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none resize-none"
                                />
                            </div>

                            {/* Sensory Notes */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs text-slate-400 font-mono">
                                    Sensory Tasting Notes (Used for AI Pairing)
                                </label>
                                <input
                                    type="text"
                                    value={newItemSensory}
                                    onChange={(e) => setNewItemSensory(e.target.value)}
                                    placeholder="e.g. Warm spices, velvety cocoa, toasted hazelnut"
                                    className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none"
                                />
                            </div>

                            {/* Image Selection */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-slate-400 font-mono">Item Photography</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {presetImages.map((preset) => (
                                        <button
                                            key={preset.label}
                                            type="button"
                                            onClick={() => setNewItemImage(preset.url)}
                                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all ${newItemImage === preset.url
                                                    ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                                                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="url"
                                    value={newItemImage}
                                    onChange={(e) => setNewItemImage(e.target.value)}
                                    placeholder="Custom image URL..."
                                    className="h-9 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-300 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-white/10 flex items-center justify-end gap-3 bg-black/40">
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white font-mono"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submittingItem}
                                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-medium text-xs font-mono shadow-lg shadow-amber-500/20 disabled:opacity-50"
                            >
                                {submittingItem ? 'Adding to DB...' : 'Save to Menu Database'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
