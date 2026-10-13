import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, detail, badge, badgeType, icon, zoneId } = body;

        const tap = db.addFeedback({
            title: title || 'Quick touchpoint recorded',
            detail: detail || 'Patron feedback received',
            badge: badge || 'Guest',
            badgeType: badgeType || 'secondary',
            icon: icon || 'thumb_up',
            zoneId: zoneId || 'zone-a',
        });

        return NextResponse.json({ success: true, tap });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err?.message || 'Error' }, { status: 500 });
    }
}
