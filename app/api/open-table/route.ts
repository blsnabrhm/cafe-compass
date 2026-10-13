import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getLeoIcebreakerSpark } from '@/lib/gemini';

export async function GET() {
    const pods = db.getPods();
    return NextResponse.json({ success: true, pods });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, podId, nickname, tags, role, stealth } = body;

        // Strict stealth focus mode check: if user chose stealth mode, do not expose them on open pods
        if (stealth) {
            return NextResponse.json({
                success: true,
                message: 'Stealth Cloaking active. You remain completely invisible to open table pods.',
            });
        }

        if (action === 'join' && podId) {
            const participant = {
                nickname: nickname || 'Anonymous Explorer',
                avatar:
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
                role: role || 'Open Table Guest',
                tags: Array.isArray(tags) && tags.length > 0 ? tags : ['Specialty Coffee', 'Creative Exploration'],
            };

            const updatedPod = db.joinPod(podId, participant);
            return NextResponse.json({ success: true, pod: updatedPod });
        }

        if (action === 'leave' && podId) {
            const updatedPod = db.leavePod(podId, nickname || '');
            return NextResponse.json({
                success: true,
                pod: updatedPod,
                message: `Left pod ${podId}`,
            });
        }

        if (action === 'spark') {
            const userTags = Array.isArray(tags) && tags.length > 0 ? tags : ['Specialty Coffee', 'Design & Architecture', 'Writing'];
            const targetPod = (podId ? db.getPods().find((p) => p.id === podId) : null) || db.getPods()[0];
            const spark = await getLeoIcebreakerSpark(
                userTags,
                targetPod ? targetPod.participants : []
            );
            return NextResponse.json({ success: true, spark });
        }

        if (action === 'create') {
            const { topic, tableNumber, maxParticipants, hostNickname, role: hostRole, interests } = body;
            const newPod = db.createPod({
                topic: topic || 'Open Creative Gathering',
                tableNumber: tableNumber ? Number(tableNumber) : undefined,
                maxParticipants: maxParticipants ? Number(maxParticipants) : 4,
                interests: Array.isArray(interests) ? interests : [],
                host: {
                    nickname: hostNickname || nickname || 'Table Host',
                    role: hostRole || 'Table Host',
                    interests: Array.isArray(interests) && interests.length > 0 ? interests : ['Specialty Coffee'],
                },
            });
            return NextResponse.json({ success: true, pod: newPod });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Open Table API error:', error);
        return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 });
    }
}
