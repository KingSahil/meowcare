import { Elysia, t } from 'elysia';
import {
  buildPrescriptionScanResult,
  buildReminderInsight,
  parseReminderText,
  scanPrescriptionImage
} from '../services/aiService';

export const aiRoutes = new Elysia({ prefix: '/api/ai' })
  .post(
    '/parse-reminder',
    async ({ body, set }) => {
      try {
        const parsed = await parseReminderText(body.text, (body.userContext as Record<string, unknown>) || {});

        return {
          success: true,
          message: 'Reminder text parsed successfully',
          data: {
            parsed,
            insight: buildReminderInsight(parsed)
          }
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to parse reminder text'
        };
      }
    },
    {
      body: t.Object({
        text: t.String({ minLength: 1 }),
        userContext: t.Optional(t.Any())
      }),
      detail: {
        summary: 'Parse medication reminder text',
        description: 'Uses the ai-module parser to convert free text into structured reminder output.',
        tags: ['AI', 'Reminders']
      }
    }
  )
  .post(
    '/scan-prescription',
    async ({ body, set }) => {
      try {
        const parsed = await scanPrescriptionImage(body.image, (body.userContext as Record<string, unknown>) || {});

        return {
          success: true,
          message: 'Prescription image processed successfully',
          data: {
            parsed,
            scan: buildPrescriptionScanResult(parsed)
          }
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to process prescription image'
        };
      }
    },
    {
      body: t.Object({
        image: t.String({ minLength: 1 }),
        userContext: t.Optional(t.Any())
      }),
      detail: {
        summary: 'Scan prescription image',
        description: 'Uses the ai-module OCR and reminder compiler to extract medication schedules from an image.',
        tags: ['AI', 'Reminders']
      }
    }
  );
