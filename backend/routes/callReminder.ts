import { Elysia, t } from 'elysia';
import {
  buildReminderTwiml,
  getReminderCallJob,
  handleTwilioRecording,
  listReminderCallJobs,
  scheduleReminderCall,
  triggerReminderCallNow
} from '../services/callReminderService';

const parseTwilioFormField = async (
  request: Request,
  fieldName: string
): Promise<string | null> => {
  const contentType = request.headers.get('content-type') ?? '';

  if (!contentType.includes('application/x-www-form-urlencoded')) {
    return null;
  }

  const rawBody = await request.text();
  const params = new URLSearchParams(rawBody);
  return params.get(fieldName);
};

export const callReminderRoutes = new Elysia({ prefix: '/api/call-reminder' })
  .post(
    '/schedule',
    async ({ body, set }) => {
      try {
        const job = scheduleReminderCall({
          userId: body.userId,
          phone: body.phone,
          medicine: body.medicine,
          dosage: body.dosage,
          scheduledAtIso: body.scheduledAt
        });

        set.status = 201;
        return {
          success: true,
          message: 'Call reminder scheduled',
          data: job
        };
      } catch (error) {
        set.status = 400;
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to schedule call reminder'
        };
      }
    },
    {
      body: t.Object({
        userId: t.String({ minLength: 1 }),
        phone: t.String({ minLength: 7 }),
        medicine: t.String({ minLength: 1 }),
        dosage: t.Optional(t.String({ minLength: 1 })),
        scheduledAt: t.String({ minLength: 10 })
      }),
      detail: {
        summary: 'Schedule outbound medicine confirmation call',
        description:
          'Schedules a future outbound call to ask if medicine was taken. Requires Twilio + Deepgram env setup.',
        tags: ['Calls']
      }
    }
  )
  .post(
    '/trigger-now',
    async ({ body, set }) => {
      try {
        const job = await triggerReminderCallNow(body);

        return {
          success: true,
          message: 'Call reminder triggered',
          data: job
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to trigger call reminder'
        };
      }
    },
    {
      body: t.Object({
        userId: t.String({ minLength: 1 }),
        phone: t.String({ minLength: 7 }),
        medicine: t.String({ minLength: 1 }),
        dosage: t.Optional(t.String({ minLength: 1 }))
      }),
      detail: {
        summary: 'Trigger medicine confirmation call immediately',
        description: 'Places an outbound call now and then waits for recorded spoken confirmation.',
        tags: ['Calls']
      }
    }
  )
  .get(
    '/jobs',
    () => ({
      success: true,
      data: listReminderCallJobs()
    }),
    {
      detail: {
        summary: 'List call reminder jobs',
        description: 'Returns all in-memory call reminder jobs and statuses.',
        tags: ['Calls']
      }
    }
  )
  .get(
    '/jobs/:jobId',
    ({ params, set }) => {
      const job = getReminderCallJob(params.jobId);

      if (!job) {
        set.status = 404;
        return {
          success: false,
          message: 'Call reminder job not found'
        };
      }

      return {
        success: true,
        data: job
      };
    },
    {
      params: t.Object({
        jobId: t.String({ minLength: 1 })
      }),
      detail: {
        summary: 'Get call reminder job by id',
        description: 'Fetches the status and transcript outcome for a single call reminder job.',
        tags: ['Calls']
      }
    }
  )
  .post(
    '/twilio/voice/:jobId',
    ({ params, set }) => {
      const twiml = buildReminderTwiml(params.jobId);
      set.headers['content-type'] = 'text/xml; charset=utf-8';
      return twiml;
    },
    {
      params: t.Object({
        jobId: t.String({ minLength: 1 })
      }),
      detail: {
        summary: 'Twilio voice webhook',
        description: 'Returns TwiML to ask medicine confirmation question and record spoken answer.',
        tags: ['Calls']
      }
    }
  )
  .post(
    '/twilio/recording/:jobId',
    async ({ params, request, set }) => {
      try {
        const recordingUrl = await parseTwilioFormField(request, 'RecordingUrl');

        if (!recordingUrl) {
          set.status = 400;
          return {
            success: false,
            message: 'Missing RecordingUrl in Twilio webhook body'
          };
        }

        const updated = await handleTwilioRecording(params.jobId, recordingUrl);

        return {
          success: true,
          message: 'Recording processed and status updated',
          data: updated
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to process Twilio recording'
        };
      }
    },
    {
      params: t.Object({
        jobId: t.String({ minLength: 1 })
      }),
      detail: {
        summary: 'Twilio recording callback',
        description: 'Downloads recording, transcribes with Deepgram, and updates medicine status.',
        tags: ['Calls']
      }
    }
  );
