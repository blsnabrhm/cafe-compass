import { GoogleGenAI } from '@google/genai';
import { Zone, ZoneId, MenuItem } from './types';

// Per-persona API key resolver to avoid cross-persona rate limits
export function getApiKeyForPersona(persona: 'maya' | 'leo' | 'sam'): string | undefined {
    switch (persona) {
        case 'maya':
            return process.env.GEMINI_API_KEY_MAYA || process.env.GEMINI_API_KEY;
        case 'leo':
            return process.env.GEMINI_API_KEY_LEO || process.env.GEMINI_API_KEY;
        case 'sam':
            return process.env.GEMINI_API_KEY_SAM || process.env.GEMINI_API_KEY;
        default:
            return process.env.GEMINI_API_KEY;
    }
}

/**
 * Tenacity-style exponential backoff retry executor.
 * Strictly adheres to intervals: 4s, 8s, 16s, 32s, 64s (max 5 tries)
 * Catches HTTP 429 (Too Many Requests), HTTP 503 (Service Unavailable),
 * and transient quota/rate limits.
 */
export async function executeWithRetry<T>(
    actionName: string,
    persona: 'maya' | 'leo' | 'sam',
    fn: (apiKey: string) => Promise<T>,
    fallbackFn: () => T
): Promise<T> {
    const apiKey = getApiKeyForPersona(persona);
    if (!apiKey) {
        console.warn(`[Gemini:${persona}] No API key configured for persona '${persona}'. Using realistic domain fallback.`);
        return fallbackFn();
    }

    // Exact intervals requested: 4s, 8s, 16s, 32s, 64s
    const retryGapsMs = [4000, 8000, 16000, 32000, 64000];
    const maxRetries = 5;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn(apiKey);
        } catch (err: any) {
            const errMsg = err?.message || String(err);
            const status = err?.status || err?.statusCode || (err?.response && err.response.status);
            const isRateLimit = status === 429 || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Too Many Requests');
            const isServiceUnavailable = status === 503 || errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('Service Unavailable');
            const isTransient = isRateLimit || isServiceUnavailable;

            if (isTransient && attempt < maxRetries) {
                const delayMs = retryGapsMs[attempt];
                console.warn(
                    `[Gemini:${persona} Retry] ${actionName} failed with ${status || 'transient error'} (${errMsg.slice(0, 80)}...). ` +
                    `Waiting ${delayMs / 1000}s (Retry ${attempt + 1}/${maxRetries} with exponential backoff)...`
                );
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                continue;
            }

            console.error(`[Gemini:${persona}] ${actionName} failed permanently after attempt ${attempt + 1}: ${errMsg}`);
            break;
        }
    }

    console.warn(`[Gemini:${persona}] Reverting to graceful fallback for ${actionName}.`);
    return fallbackFn();
}

/**
 * CUSTOMER VIBE & SEATING NAVIGATOR (Persona: Maya)
 * Recommends optimal sanctuary zone and a real culinary pairing strictly from in-stock menu items.
 */
export interface SeatRecommendationResult {
    recommendedZoneId: ZoneId;
    zoneName: string;
    reasoning: string;
    projectedDecibels: number;
    outletProximity: string;
    pairingMenuItemId: string;
    pairingDrink: string;
    pairingDescription: string;
    estimatedQueueWaitMin: number;
}

export async function getMayaSeatRecommendation(
    intention: string,
    zones: Zone[],
    availableMenuItems: MenuItem[],
    groupSize: number = 1
): Promise<SeatRecommendationResult> {
    return executeWithRetry<SeatRecommendationResult>(
        'MayaSeatRecommendation',
        'maya',
        async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `You are the Café Sanctuary Matchmaker for café patrons.
Available Café Zones:
${zones.map((z) => `- ${z.id} (${z.name} - ${z.description}): Current ${z.decibels}dB (Target ${z.targetDecibels}dB), ${z.occupancyPercent}% occupancy (${z.currentPatrons}/${z.maxPatrons} seated). Features: ${z.features?.join(', ')}`).join('\n')}

Live In-Stock Menu Items (MUST PICK STRICTLY FROM THIS LIST):
${availableMenuItems.map((m) => `- [ID: ${m.id}] ${m.name} (${m.category}, ${m.price}): ${m.description} | Notes: ${m.sensoryNotes}`).join('\n')}

Guest Intention: "${intention}"
Party Size: ${groupSize} ${groupSize === 1 ? 'person' : 'people'}

Instructions:
1. Select the best zone matching their intention and accommodating a group size of ${groupSize}. (Quiet Nook for solitary deep focus; Sunroom or Garden for small groups and creative conversations; Espresso bar for quick energetic visits).
2. Select ONE in-stock item from the Live In-Stock Menu list above that pairs best with their activity and sensory needs.
3. Return a STRICT JSON object in this exact schema without markdown backticks:
{
  "recommendedZoneId": "zone-a" | "zone-b" | "zone-c" | "zone-d",
  "zoneName": string,
  "reasoning": string,
  "projectedDecibels": number,
  "outletProximity": string,
  "pairingMenuItemId": string,
  "pairingDrink": string,
  "pairingDescription": string,
  "estimatedQueueWaitMin": number
}`;

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: prompt,
            });

            const text = response.text?.trim() || '';
            const cleanJson = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
            const parsed = JSON.parse(cleanJson);

            // Verify pairingMenuItemId is valid
            const matchedItem = availableMenuItems.find((m) => m.id === parsed.pairingMenuItemId);
            if (!matchedItem && availableMenuItems.length > 0) {
                parsed.pairingMenuItemId = availableMenuItems[0].id;
                parsed.pairingDrink = availableMenuItems[0].name;
                parsed.pairingDescription = availableMenuItems[0].sensoryNotes;
            }
            return parsed;
        },
        // Realistic domain fallback grounded in actual available menu
        () => {
            const isGroup = groupSize >= 3;
            const isDeepFocus = /code|study|work|sprint|focus|deep|quiet|read/i.test(intention);
            const isSocial = /chat|friend|social|meet|people|team|discussion|catchup/i.test(intention) || isGroup;
            const isSun = /sun|patio|light|outdoor|fresh|garden/i.test(intention);

            // Helper to find available item by keyword or fallback to first available
            const findItem = (regex: RegExp) =>
                availableMenuItems.find((m) => regex.test(m.name) || regex.test(m.category) || regex.test(m.description)) ||
                availableMenuItems[0];

            if (isSun) {
                const item = findItem(/gesha|pourover|tea|matcha|croissant/i);
                return {
                    recommendedZoneId: 'zone-c',
                    zoneName: 'Zone C — Sunroom Solarium',
                    reasoning: `Flooded with natural 1,280 lux daylight and low acoustic friction, perfectly configured for ${groupSize > 1 ? `a party of ${groupSize}` : 'creative headspace'}.`,
                    projectedDecibels: 44,
                    outletProximity: 'Floor pillar charging modules available at Tables 7–10',
                    pairingMenuItemId: item?.id || 'menu-ethiopian-pourover',
                    pairingDrink: item?.name || 'Single-Origin Ethiopian Gesha (V60)',
                    pairingDescription: item?.sensoryNotes || 'Delicate floral jasmine notes, zero bitterness, high focus retention',
                    estimatedQueueWaitMin: 3,
                };
            }

            if (isSocial) {
                const item = findItem(/flat white|cortado|tartine|burrata/i);
                return {
                    recommendedZoneId: isGroup ? 'zone-c' : 'zone-b',
                    zoneName: isGroup ? 'Zone C — Sunroom Solarium' : 'Zone B — Central Espresso Bar',
                    reasoning: isGroup
                        ? `Spacious modular table grouping in Zone C comfortably hosts your party of ${groupSize} with soft natural acoustics.`
                        : 'Vibrant communal atmosphere with high ambient energy, perfect for social interactions and casual banter.',
                    projectedDecibels: isGroup ? 48 : 64,
                    outletProximity: isGroup ? 'Perimeter bench sockets' : 'Bar rail rapid charging strips',
                    pairingMenuItemId: item?.id || 'menu-flat-white',
                    pairingDrink: item?.name || 'Velvet Oat Flat White',
                    pairingDescription: item?.sensoryNotes || 'Velvety microfoam with toasted hazelnut notes',
                    estimatedQueueWaitMin: 4,
                };
            }

            // Default deep focus: Zone A
            const item = findItem(/cold brew|nitro|cortado|bun|croissant/i);
            return {
                recommendedZoneId: 'zone-a',
                zoneName: 'Zone A — Quiet Work Nook',
                reasoning: 'Calculated 38–48 dB steady acoustic floor with sound-draping baffles and zero phone chatter.',
                projectedDecibels: 42,
                outletProximity: 'Dedicated dual-plug outlet at each booth (100W PD)',
                pairingMenuItemId: item?.id || 'menu-nitro-coldbrew',
                pairingDrink: item?.name || 'Nitrogen-Infused Cold Brew',
                pairingDescription: item?.sensoryNotes || 'Deep dark cocoa, smooth finish, clean sustained energy',
                estimatedQueueWaitMin: 2,
            };
        }
    );
}

/**
 * OPEN TABLE COMMUNITY CONVERSATION (Persona: Leo)
 * Natural, warm, human conversation bridges without robotic tropes.
 */
export interface IcebreakerSparkResult {
    headline: string;
    sparkPrompt: string;
    commonThemes: string[];
    suggestedFirstQuestion: string;
}

export async function getLeoIcebreakerSpark(
    userTags: string[],
    existingParticipants: { nickname: string; tags: string[]; role?: string }[]
): Promise<IcebreakerSparkResult> {
    return executeWithRetry<IcebreakerSparkResult>(
        'LeoIcebreakerSpark',
        'leo',
        async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `You are a warm, thoughtful café host suggesting an easy, organic conversation starter for guests sharing an open table.
Guest Interests: ${userTags.join(', ')}
Table Peers:
${existingParticipants.map((p) => `- ${p.nickname} (${p.role || 'Guest'}): interested in ${p.tags.join(', ')}`).join('\n')}

Generate a warm, natural, human conversational starter. No robotic AI tropes or hashtags.
Return a STRICT JSON object in this exact schema without markdown backticks:
{
  "headline": string,
  "sparkPrompt": string,
  "commonThemes": string[],
  "suggestedFirstQuestion": string
}`;

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: prompt,
            });

            const text = response.text?.trim() || '';
            const cleanJson = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
            return JSON.parse(cleanJson);
        },
        // Graceful fallback
        () => {
            const themes = userTags.length > 0 ? userTags.slice(0, 3) : ['Coffee Craft', 'Creative Projects', 'Reading'];
            return {
                headline: 'Coffee Origins & Creative Rituals',
                sparkPrompt:
                    'An easy bridge connecting favorite morning brew rituals and whatever creative or personal project currently has your focus.',
                commonThemes: themes,
                suggestedFirstQuestion:
                    'What roast or brew style is in your cup today, and what project are you working through this morning?',
            };
        }
    );
}

/**
 * PERSONA 3: SAM (Staff / Barista Intelligence Console)
 * Uses GEMINI_API_KEY_SAM
 */
export interface FloorManagerInsight {
    statusLevel: 'optimal' | 'warning' | 'alert';
    headline: string;
    summary: string;
    recommendedZoneActions: {
        zoneId: ZoneId;
        action: string;
        decibelDelta: number;
        targetVolume: number;
    }[];
    predictedRushMinutes: number;
    baristaTip: string;
}

export async function getSamFloorIntelligence(
    zones: Zone[],
    recentFeedback: { title: string; detail: string }[],
    queueOrders: number
): Promise<FloorManagerInsight> {
    return executeWithRetry<FloorManagerInsight>(
        'SamFloorIntelligence',
        'sam',
        async (apiKey) => {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `You are the Café Floor Manager assisting the Head Barista and Shift Lead.
Zones status:
${zones.map((z) => `- ${z.name}: ${z.decibels}dB (Target ${z.targetDecibels}dB), Vol ${z.speakerVolume}%, Occupancy ${z.occupancyPercent}%`).join('\n')}

Recent Patron Tap Feedback:
${recentFeedback.map((f) => `- "${f.title}": ${f.detail}`).join('\n')}

Current Queue: ${queueOrders} pending drink tickets.

Provide real-time acoustic mitigation and barista proactive guidance.
Return a STRICT JSON object in this exact schema without markdown backticks:
{
  "statusLevel": "optimal" | "warning" | "alert",
  "headline": string,
  "summary": string,
  "recommendedZoneActions": [
    {
      "zoneId": "zone-a" | "zone-b" | "zone-c" | "zone-d",
      "action": string,
      "decibelDelta": number,
      "targetVolume": number
    }
  ],
  "predictedRushMinutes": number,
  "baristaTip": string
}`;

            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: prompt,
            });

            const text = response.text?.trim() || '';
            const cleanJson = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
            return JSON.parse(cleanJson);
        },
        // Fallback
        () => {
            const zoneA = zones.find((z) => z.id === 'zone-a');
            const isLoudZoneA = (zoneA?.decibels || 0) > (zoneA?.targetDecibels || 50);

            return {
                statusLevel: isLoudZoneA ? 'warning' : 'optimal',
                headline: isLoudZoneA
                    ? 'Atmospheric Drift: Elevated Decibels in Quiet Nook (Zone A)'
                    : 'Atmospheric Equilibrium Maintained',
                summary: isLoudZoneA
                    ? 'Elevated acoustic energy in Zone A. Suggest adjusting baffle volume by -3dB for optimal focus atmosphere.'
                    : 'All sectors operating within optimal acoustic and queue balance parameters.',
                recommendedZoneActions: [
                    {
                        zoneId: 'zone-a',
                        action: 'Dampen speaker volume and switch to gentle lofi stream',
                        decibelDelta: -3,
                        targetVolume: 32,
                    },
                ],
                predictedRushMinutes: 18,
                baristaTip: 'Pre-heat portafilter group #2 for cold brew rush crossing from tech park.',
            };
        }
    );
}

