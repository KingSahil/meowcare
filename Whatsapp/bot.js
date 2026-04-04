import './env.js';
import { createServer } from 'node:http';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import QRCode from 'qrcode';
import { handleIncomingMessage } from './messageHandler.js';
import { createPatientState, createScheduler } from './scheduler.js';

const AUTH_DIR = process.env.WA_AUTH_DIR ?? '../auth';
const logger = pino({ level: process.env.LOG_LEVEL ?? 'silent' });
const QR_HTTP_PORT = Number.parseInt(process.env.WA_QR_HTTP_PORT ?? '4012', 10);

const patientState = createPatientState();
let latestQrPayload = null;
let qrUpdatedAt = null;
let qrServerStarted = false;
let connectionState = 'connecting';
let lastConnectedAt = null;

// Show only one QR per connection attempt to avoid terminal spam while
// WhatsApp keeps rotating fresh QR payloads in the background.
let hasDisplayedQRForCurrentAttempt = false;

function renderQrCode(qr) {
  qrcode.generate(qr, { small: true }, (renderedQr) => {
    // Normalize the generated block so PowerShell doesn't add odd trailing space
    // lines that can make the QR look stretched.
    const normalizedQr = renderedQr.replace(/\s+$/, '');
    process.stdout.write('[bot] Scan the QR code below to connect WhatsApp:\n');
    process.stdout.write(`${normalizedQr}\n`);
  });
}

function startQrHttpServer() {
  if (qrServerStarted) {
    return;
  }

  const server = createServer(async (req, res) => {
    const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (requestUrl.pathname === '/health') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(
        JSON.stringify({
          ok: true,
          connected: connectionState === 'open',
          connectionState,
          qrAvailable: Boolean(latestQrPayload),
          qrUpdatedAt,
          lastConnectedAt
        })
      );
      return;
    }

    if (requestUrl.pathname === '/qr') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(
        JSON.stringify({
          qrAvailable: Boolean(latestQrPayload),
          qrUpdatedAt
        })
      );
      return;
    }

    if (requestUrl.pathname === '/qr.png') {
      if (!latestQrPayload) {
        res.writeHead(404, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ message: 'QR is not available yet' }));
        return;
      }

      try {
        const buffer = await QRCode.toBuffer(latestQrPayload, {
          type: 'png',
          width: 420,
          margin: 1,
          errorCorrectionLevel: 'M'
        });

        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(buffer);
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error';
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ message: `Unable to render QR image: ${reason}` }));
      }

      return;
    }

    res.writeHead(404, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ message: 'Not found' }));
  });

  server.listen(QR_HTTP_PORT, () => {
    console.log(`[bot] QR image server running at http://localhost:${QR_HTTP_PORT}/qr.png`);
  });

  qrServerStarted = true;
}

async function startBot() {
  startQrHttpServer();

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    printQRInTerminal: false,
    browser: ['Remote Care Companion', 'Chrome', '1.0.0']
  });

  const scheduler = createScheduler({ sock, patientState });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, qr, lastDisconnect }) => {
    if (connection) {
      connectionState = connection;
    }

    if (qr) {
      latestQrPayload = qr;
      qrUpdatedAt = new Date().toISOString();
    }

    if (qr && !hasDisplayedQRForCurrentAttempt) {
      hasDisplayedQRForCurrentAttempt = true;
      renderQrCode(qr);
    }

    if (connection === 'open') {
      hasDisplayedQRForCurrentAttempt = false;
      latestQrPayload = null;
      lastConnectedAt = new Date().toISOString();
      console.log('[bot] WhatsApp bot is connected.');
      scheduler.start();
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      hasDisplayedQRForCurrentAttempt = false;
      scheduler.stop();
      console.log(`[bot] Connection closed. Reconnect: ${shouldReconnect}`);

      if (shouldReconnect) {
        await startBot();
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const message of messages) {
      if (!message?.message) {
        continue;
      }

      await handleIncomingMessage({
        sock,
        baileysMessage: message,
        patientState,
        markUserReplied: scheduler.markUserReplied,
        scheduleSnoozeReminder: scheduler.scheduleSnoozeReminder
      });
    }
  });
}

startBot().catch((error) => {
  console.error('[bot] Failed to start:', error);
  process.exit(1);
});
