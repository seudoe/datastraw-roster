/**
 * Groq AI Explanation Engine for RosterIQ
 * Delivers ultra-low-latency, grounded natural-language explanations of
 * roster conflicts and coverage deficits using Groq-hosted Llama models.
 * Automatically falls back to deterministic rule-engine templates when offline.
 */
import { env } from './env';

export interface ExplainResult {
  explanation: string;
  isAiGenerated: boolean;
  provider: 'Groq' | 'Rule Engine Fallback';
  model: string;
  cached?: boolean;
}

// In-memory LRU-like cache for explanation fingerprints
const explanationCache = new Map<string, string>();

/** Helper: Generate deterministic template explanation */
export function generateTemplateExplanation(conflict: any): string {
  const code = conflict.code || conflict.dominoType || 'GAP';
  const brand = conflict.brandCode || conflict.affectedBrandCode || 'Client Account';
  const date = conflict.date || 'the requested date';
  const msg = conflict.message || conflict.description || '';

  switch (code) {
    case 'COVERAGE_ZERO':
    case 'GAP_FORMED':
      return `Brand ${brand} has 0 working staff on ${date}. Mandatory client SLA is breached because no primary or secondary staff were rostered. Next step: Activate an available floater or assign an overtime shift.`;

    case 'CASCADE_GAP':
      return `Unavailability on ${date} triggered a multi-brand cascade failure on ${brand}. An agent with cross-brand ownership was removed without secondary coverage. Next step: Reallocate cross-trained floaters or trigger a minimal-disruption repair solve.`;

    case 'MAX_CONSECUTIVE_EXCEEDED':
      return `Labor compliance alert on ${date}: Scheduling this shift exceeds the rolling maximum of 6 consecutive working days without rest. Next step: Reschedule the shift to an alternate day or swap with an idle pod peer.`;

    case 'BACKUP_OVERLOAD':
      return `Floater overload on ${date}: Agent is assigned to more than 2 brands simultaneously, exceeding operational attention limits. Next step: Rebalance secondary coverage to another cross-trained team member.`;

    case 'WORKING_WHILE_ABSENT':
      return `Integrity conflict on ${date}: Agent has an approved leave request but is assigned a working shift. Next step: Remove the working shift or cancel the leave request.`;

    default:
      return msg
        ? `Operational conflict on ${date}: ${msg}. Next step: Review pod staffing and adjust shift allocation.`
        : `Coverage deficit on ${brand} (${date}). Next step: Assign qualified backup staff or acknowledge the operational exception.`;
  }
}

/**
 * Explains a roster conflict using Groq (Llama 3.3) with instant deterministic fallback.
 */
export async function explainConflictWithGroq(conflictData: any): Promise<ExplainResult> {
  const cacheKey = JSON.stringify({
    code: conflictData.code || conflictData.dominoType,
    date: conflictData.date,
    brand: conflictData.brandCode || conflictData.affectedBrandCode,
    employee: conflictData.employeeCode || conflictData.affectedEmployeeCode,
    msg: conflictData.message || conflictData.description,
  });

  // Check cache
  if (explanationCache.has(cacheKey)) {
    return {
      explanation: explanationCache.get(cacheKey)!,
      isAiGenerated: true,
      provider: 'Groq',
      model: env.EXPLAIN_MODEL || 'llama-3.3-70b-versatile',
      cached: true,
    };
  }

  const groqApiKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY;
  const modelName = env.EXPLAIN_MODEL || 'llama-3.3-70b-versatile';

  // If no Groq API key is provided, use deterministic template immediately
  if (!groqApiKey || groqApiKey.trim() === '') {
    return {
      explanation: generateTemplateExplanation(conflictData),
      isAiGenerated: false,
      provider: 'Rule Engine Fallback',
      model: 'deterministic-rules',
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second strict timeout

    const promptContext = {
      conflictCode: conflictData.code || conflictData.dominoType || 'COVERAGE_DEFICIT',
      severity: conflictData.severity || 'ERROR',
      date: conflictData.date,
      brandCode: conflictData.brandCode || conflictData.affectedBrandCode,
      employeeCode: conflictData.employeeCode || conflictData.affectedEmployeeCode,
      rawMessage: conflictData.message || conflictData.description,
      rootCause: conflictData.rootCause,
      governingConstraint: conflictData.governingConstraint,
      assignedStaffSummary: conflictData.assignedStaffSummary,
    };

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'system',
            content:
              'You are an operations scheduling analyst for RosterIQ. Given this structured conflict JSON, concisely explain WHY this coverage gap occurred in <=80 words based strictly on the provided JSON data. Never invent names, dates, or constraints. Suggest a concrete operational next step (e.g. activating a floater, swapping a shift, or logging an exception).',
          },
          {
            role: 'user',
            content: JSON.stringify(promptContext),
          },
        ],
        temperature: 0.2,
        max_tokens: 150,
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Groq AI] API error ${res.status}: Falling back to template.`);
      return {
        explanation: generateTemplateExplanation(conflictData),
        isAiGenerated: false,
        provider: 'Rule Engine Fallback',
        model: 'deterministic-rules',
      };
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();

    if (text) {
      // Cache result
      explanationCache.set(cacheKey, text);
      return {
        explanation: text,
        isAiGenerated: true,
        provider: 'Groq',
        model: modelName,
      };
    }
  } catch (error) {
    console.warn('[Groq AI] Request failed or timed out:', (error as Error).message);
  }

  // Graceful fallback
  return {
    explanation: generateTemplateExplanation(conflictData),
    isAiGenerated: false,
    provider: 'Rule Engine Fallback',
    model: 'deterministic-rules',
  };
}
