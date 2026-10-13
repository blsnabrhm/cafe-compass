import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ZoneId } from '@/lib/types';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, alertId, zoneId, targetDb, targetVol } = body;

        if (action === 'dampen_music') {
            db.updateZone('zone-a', {
                decibels: 49,
                speakerVolume: 32,
                status: 'calm',
                highlightNote: 'Dampened by -3dB • Lo-Fi acoustic stream engaged',
            });
            if (alertId) db.updateAlertStatus(alertId, 'applied');
            return NextResponse.json({
                success: true,
                message: 'Music dampened by -3dB in Zone A. Lo-Fi acoustic stream initiated.',
                zone: db.getZone('zone-a'),
            });
        }

        if (action === 'heat_group_2') {
            if (alertId) db.updateAlertStatus(alertId, 'acknowledged');
            return NextResponse.json({
                success: true,
                message: 'Portafilter Group #2 heating cycle started. Cold brew keg flagged.',
            });
        }

        if (action === 'send_sample') {
            if (alertId) db.updateAlertStatus(alertId, 'applied');
            return NextResponse.json({
                success: true,
                message: 'Complimentary Gesha sample flight dispatched to Table 4.',
            });
        }

        if (action === 'slider_update' && zoneId) {
            const updated = db.updateZone(zoneId as ZoneId, {
                speakerVolume: Number(targetVol) || 0,
                ...(targetDb ? { decibels: Number(targetDb) } : {}),
            });
            return NextResponse.json({ success: true, zone: updated });
        }

        if (action === 'dismiss' && alertId) {
            db.updateAlertStatus(alertId, 'dismissed');
            return NextResponse.json({ success: true, message: 'Alert dismissed.' });
        }

        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err?.message || 'Error' }, { status: 500 });
    }
}
