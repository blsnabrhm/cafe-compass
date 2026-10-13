import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MenuItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const menu = db.getMenuItems();
        return NextResponse.json({
            success: true,
            menu,
            categories: ['Coffee', 'Tea', 'Pastries', 'Light Bites'],
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to fetch menu' },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, available } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Item ID is required' },
                { status: 400 }
            );
        }

        const updated = db.toggleMenuItemAvailability(id, available);
        if (!updated) {
            return NextResponse.json(
                { success: false, error: 'Item not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            item: updated,
            message: `Updated ${updated.name} to ${updated.available ? 'In Stock' : 'Out of Stock (86\'d)'}`,
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to update menu item' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const item: MenuItem = {
            id: body.id || `menu-${Date.now()}`,
            name: body.name || 'Artisanal Selection',
            category: body.category || 'Coffee',
            price: body.price || '$5.00',
            description: body.description || 'Crafted with premium specialty ingredients.',
            imageUrl:
                body.imageUrl ||
                'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
            available: body.available !== undefined ? body.available : true,
            tags: Array.isArray(body.tags) ? body.tags : ['Specialty'],
            sensoryNotes: body.sensoryNotes || 'Balanced and harmonious notes',
        };

        const added = db.addMenuItem(item);
        return NextResponse.json({
            success: true,
            item: added,
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to add menu item' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ success: false, error: 'id parameter required' }, { status: 400 });
        }
        const deleted = db.deleteMenuItem(id);
        return NextResponse.json({ success: deleted });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to delete menu item' },
            { status: 500 }
        );
    }
}
