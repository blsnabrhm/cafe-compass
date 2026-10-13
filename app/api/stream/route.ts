import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            // Send initial data payload
            const sendSnapshot = () => {
                try {
                    const payload = {
                        zones: db.getZones(),
                        metrics: db.getMetrics(),
                        alerts: db.getAlerts(),
                        feedback: db.getFeedback().slice(0, 5),
                        pods: db.getPods(),
                        orders: db.getOrders(),
                        menu: db.getMenuItems(),
                        timestamp: new Date().toISOString(),
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
                } catch (err) {
                    console.error('SSE enqueue error:', err);
                }
            };

            sendSnapshot();

            // Subscribe to db updates
            const unsubscribe = db.subscribe(() => {
                sendSnapshot();
            });

            // Keepalive / periodic heartbeat tick every 3 seconds
            const interval = setInterval(() => {
                db.tickSimulation();
            }, 3000);

            req.signal.addEventListener('abort', () => {
                clearInterval(interval);
                unsubscribe();
                try {
                    controller.close();
                } catch { }
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
        },
    });
}
