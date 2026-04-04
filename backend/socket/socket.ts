import { Server as SocketIOServer } from 'socket.io';
import type { Alert, LogEntry } from '../types';

type SocketGlobals = typeof globalThis & {
  __meowcareSocketIO?: SocketIOServer | null;
  __meowcareSocketHooksRegistered?: boolean;
};

const socketGlobals = globalThis as SocketGlobals;

let io: SocketIOServer | null = socketGlobals.__meowcareSocketIO ?? null;
let shutdownHooksRegistered = socketGlobals.__meowcareSocketHooksRegistered ?? false;

const closeSocketServer = () => {
  if (!io) {
    return;
  }

  io.close();
  io = null;
  socketGlobals.__meowcareSocketIO = null;
};

const registerShutdownHooks = () => {
  if (shutdownHooksRegistered) {
    return;
  }

  shutdownHooksRegistered = true;
  socketGlobals.__meowcareSocketHooksRegistered = true;

  // Ensure watch-mode restarts release the socket port before the next boot.
  process.on('SIGINT', closeSocketServer);
  process.on('SIGTERM', closeSocketServer);
  process.on('beforeExit', closeSocketServer);
};

export const initializeSocketServer = (port = Number(process.env.SOCKET_PORT ?? 3001)) => {
  registerShutdownHooks();

  if (io) {
    return io;
  }

  // Socket.io runs on its own lightweight port for the hackathon demo.
  io = new SocketIOServer({
    cors: {
      origin: '*'
    }
  });

  io.on('connection', (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  io.listen(port);
  socketGlobals.__meowcareSocketIO = io;
  console.log(`[socket] listening on http://localhost:${port}`);

  return io;
};

export const emitAlert = (alert: Alert) => {
  io?.emit('alert:new', alert);
};

export const emitDoseUpdate = (logEntry: LogEntry) => {
  io?.emit('dose:update', logEntry);
};

export const emitSosTriggered = (alert: Alert) => {
  io?.emit('sos:triggered', alert);
};
