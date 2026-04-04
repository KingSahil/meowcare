import { cors } from '@elysiajs/cors';
import { openapi } from '@elysiajs/openapi';
import { Elysia } from 'elysia';
import { aiRoutes } from './routes/ai';
import { burnoutRoutes } from './routes/burnout';
import { callReminderRoutes } from './routes/callReminder';
import { reminderRoutes } from './routes/reminder';
import { sosRoutes } from './routes/sos';
import { statusRoutes } from './routes/status';
import { voiceRoutes } from './routes/voice';
import { getDataMode, getRuntimeNote } from './db/supabase';
import { initializeSocketServer } from './socket/socket';

const port = Number(process.env.PORT ?? 4000);
const socketPort = Number(process.env.SOCKET_PORT ?? 4001);
const isVercelRuntime = process.env.VERCEL === '1';
const shouldStartSocketServer = process.env.VERCEL !== '1' && process.env.DISABLE_SOCKET_SERVER !== '1';

if (shouldStartSocketServer) {
  initializeSocketServer(socketPort);
}

const app = new Elysia()
  .use(
    cors({
      origin: true
    })
  )
  .use(
    openapi({
      path: '/swagger',
      provider: 'swagger-ui',
      documentation: {
        info: {
          title: 'Remote Care Companion API',
          version: '1.0.0',
          description:
            'Hackathon demo backend for reminders, dose tracking, SOS alerts, and burnout checks.'
        },
        tags: [
          { name: 'Health', description: 'Basic service health and runtime mode' },
          { name: 'AI', description: 'OCR and reminder parsing endpoints backed by ai-module' },
          { name: 'Reminders', description: 'Reminder creation and listing' },
          { name: 'Status', description: 'Medicine dose status updates' },
          { name: 'Alerts', description: 'SOS and alert-triggering endpoints' },
          { name: 'Wellbeing', description: 'Burnout assessment endpoint' },
          {
            name: 'Calls',
            description: 'Outbound medicine confirmation calls via Twilio and Deepgram'
          }
        ]
      }
    })
  )
  .get(
    '/',
    () => ({
      success: true,
      message: 'Remote Care Companion backend is running',
      data: {
        httpPort: port,
        socketPort,
        mode: getDataMode(),
        note: getRuntimeNote(),
        socketServerEnabled: shouldStartSocketServer
      }
    }),
    {
      detail: {
        summary: 'Health check',
        description: 'Returns server status, ports, and whether the app is using Supabase or mock mode.',
        tags: ['Health']
      }
    }
  )
  .use(aiRoutes)
  .use(callReminderRoutes)
  .use(reminderRoutes)
  .use(statusRoutes)
  .use(sosRoutes)
  .use(burnoutRoutes)
  .use(voiceRoutes)
  .onError(({ code, error, set }) => {
    const message = error instanceof Error ? error.message : 'Request failed';

    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        success: false,
        message
      };
    }

    set.status = 500;
    return {
      success: false,
      message
    };
  })
;

if (!isVercelRuntime) {
  app.listen(port);
  console.log(`[server] Remote Care Companion API running at http://localhost:${port}`);
  console.log(`[server] Data mode: ${getDataMode()} | ${getRuntimeNote()}`);
}

export type App = typeof app;
export default app.fetch;
