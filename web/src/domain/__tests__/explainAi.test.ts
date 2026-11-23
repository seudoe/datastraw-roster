/**
 * Unit Tests for Groq AI Conflict Explainer & Fallback
 * Tests the template fallback generation and Groq LLM integration.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateTemplateExplanation,
  explainConflictWithGroq,
} from '@/server/groqExplain';

describe('Groq AI Conflict Explainer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateTemplateExplanation', () => {
    it('generates clear operational explanation for COVERAGE_ZERO', () => {
      const explanation = generateTemplateExplanation({
        code: 'COVERAGE_ZERO',
        brandCode: 'BR_01',
        date: '2026-12-05',
      });
      expect(explanation).toContain('Brand BR_01 has 0 working staff on 2026-12-05');
      expect(explanation).toContain('Next step:');
    });

    it('generates clear operational explanation for CASCADE_GAP', () => {
      const explanation = generateTemplateExplanation({
        code: 'CASCADE_GAP',
        affectedBrandCode: 'BR_04',
        date: '2026-12-10',
      });
      expect(explanation).toContain('cascade failure on BR_04');
      expect(explanation).toContain('Next step:');
    });

    it('generates labor compliance explanation for MAX_CONSECUTIVE_EXCEEDED', () => {
      const explanation = generateTemplateExplanation({
        code: 'MAX_CONSECUTIVE_EXCEEDED',
        date: '2026-12-15',
      });
      expect(explanation).toContain('Labor compliance alert');
      expect(explanation).toContain('6 consecutive working days');
    });

    it('generates attention limit explanation for BACKUP_OVERLOAD', () => {
      const explanation = generateTemplateExplanation({
        code: 'BACKUP_OVERLOAD',
        date: '2026-12-18',
      });
      expect(explanation).toContain('Floater overload');
      expect(explanation).toContain('more than 2 brands');
    });

    it('generates integrity conflict explanation for WORKING_WHILE_ABSENT', () => {
      const explanation = generateTemplateExplanation({
        code: 'WORKING_WHILE_ABSENT',
        date: '2026-12-20',
      });
      expect(explanation).toContain('Integrity conflict');
      expect(explanation).toContain('approved leave request');
    });

    it('falls back gracefully on unknown conflict codes with raw message', () => {
      const explanation = generateTemplateExplanation({
        code: 'UNKNOWN_CODE',
        date: '2026-12-22',
        message: 'Custom operational alert detected',
      });
      expect(explanation).toContain('Operational conflict on 2026-12-22');
      expect(explanation).toContain('Custom operational alert detected');
    });
  });

  describe('explainConflictWithGroq', () => {
    it('falls back to deterministic rules when GROQ_API_KEY is not configured', async () => {
      const result = await explainConflictWithGroq({
        code: 'COVERAGE_ZERO',
        brandCode: 'BR_02',
        date: '2026-12-01',
      });

      expect(result.isAiGenerated).toBe(false);
      expect(result.provider).toBe('Rule Engine Fallback');
      expect(result.model).toBe('deterministic-rules');
      expect(result.explanation).toContain('Brand BR_02 has 0 working staff');
    });

    it('uses Groq API when key is present and parses AI response', async () => {
      const originalFetch = globalThis.fetch;
      process.env.GROQ_API_KEY = 'gsk_mock_test_key_12345';

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  'On 2026-12-05, Brand BR_01 suffered zero coverage due to unscheduled sick leave. Recommended action: allocate floater EMP_05.',
              },
            },
          ],
        }),
      }) as any;

      try {
        const result = await explainConflictWithGroq({
          code: 'COVERAGE_ZERO',
          brandCode: 'BR_01',
          date: '2026-12-05',
          message: 'Zero staff available',
        });

        expect(result.isAiGenerated).toBe(true);
        expect(result.provider).toBe('Groq');
        expect(result.explanation).toContain('allocate floater EMP_05');
      } finally {
        globalThis.fetch = originalFetch;
        delete process.env.GROQ_API_KEY;
      }
    });

    it('gracefully falls back to template if Groq API returns HTTP 500 error', async () => {
      const originalFetch = globalThis.fetch;
      process.env.GROQ_API_KEY = 'gsk_mock_test_key_12345';

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      }) as any;

      try {
        const result = await explainConflictWithGroq({
          code: 'CASCADE_GAP',
          affectedBrandCode: 'BR_09',
          date: '2026-12-08',
        });

        expect(result.isAiGenerated).toBe(false);
        expect(result.provider).toBe('Rule Engine Fallback');
        expect(result.explanation).toContain('cascade failure on BR_09');
      } finally {
        globalThis.fetch = originalFetch;
        delete process.env.GROQ_API_KEY;
      }
    });
  });
});
