import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
    db.tickSimulation();
    return NextResponse.json({
        success: true,
        zones: db.getZones(),
        metrics: db.getMetrics(),
    });
}
