import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CafeOrder } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({
        success: true,
        orders: db.getOrders(),
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { customerName, zoneId, zoneName, drinkName, description, waitMin, groupSize } = body;

        if (!customerName || !zoneId || !drinkName) {
            return NextResponse.json(
                { success: false, error: 'customerName, zoneId, and drinkName are required' },
                { status: 400 }
            );
        }

        const newOrder = db.addOrder({
            customerName,
            zoneId,
            zoneName: zoneName || 'Zone A',
            drinkName,
            description: description || 'Artisan pairing with sanctuary seat',
            waitMin: waitMin || 3,
            groupSize: groupSize ? Number(groupSize) : 1,
        });

        return NextResponse.json({
            success: true,
            order: newOrder,
            message: `Seat reserved in ${zoneName || zoneId} and order #${newOrder.id} sent to Espresso Bar!`,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create order';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { orderId, status } = body;

        if (!orderId || !status) {
            return NextResponse.json(
                { success: false, error: 'orderId and status are required' },
                { status: 400 }
            );
        }

        const updated = db.updateOrderStatus(orderId, status as CafeOrder['status']);
        if (!updated) {
            return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            order: updated,
            message: `Order ${orderId} marked as ${status}`,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update order';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
