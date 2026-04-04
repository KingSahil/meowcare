import { Elysia, t } from 'elysia';
import { handleVoiceQuery } from '../services/voiceService';

export const voiceRoutes = new Elysia({ prefix: '/api/voice' }).post(
  '/query',
  async ({ body, set }) => {
    try {
      const { userId, query, reminders } = body;

      const response = await handleVoiceQuery(
        { userId, query },
        reminders ?? []
      );

      if (!response.success) {
        set.status = 400;
      }

      return response;
    } catch (error) {
      set.status = 500;
      return {
        success: false,
        text: error instanceof Error ? error.message : 'Query processing failed',
        medicines: []
      };
    }
  },
  {
    body: t.Object({
      userId: t.String({ minLength: 1 }),
      query: t.String({ minLength: 1 }),
      reminders: t.Optional(
        t.Array(
          t.Object({
            medicine: t.String(),
            dosage: t.String(),
            time: t.String(),
            quantity: t.Number()
          })
        )
      )
    }),
    detail: {
      summary: 'Process voice query',
      description: 'Returns a natural-language response using available reminder data.',
      tags: ['Reminders', 'Voice']
    }
  }
);
