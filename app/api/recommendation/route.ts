import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getMayaSeatRecommendation } from '@/lib/gemini';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const intention = body.intention || '2 hours deep coding sprint';
        const groupSize = typeof body.groupSize === 'number' ? body.groupSize : 1;
        const zones = db.getZones();
        const availableMenuItems = db.getMenuItems().filter((item) => item.available);

        const recommendation = await getMayaSeatRecommendation(
            intention,
            zones,
            availableMenuItems,
            groupSize
        );

        // Ground with full DB item details
        const pairingItem =
            db.getMenuItem(recommendation.pairingMenuItemId) ||
            availableMenuItems.find((m) => m.name.toLowerCase() === recommendation.pairingDrink.toLowerCase()) ||
            availableMenuItems[0] ||
            null;

        return NextResponse.json({
            success: true,
            recommendation,
            pairingItem,
        });
    } catch (error: any) {
        console.error('Recommendation API error:', error);
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to generate recommendation' },
            { status: 500 }
        );
    }
}
