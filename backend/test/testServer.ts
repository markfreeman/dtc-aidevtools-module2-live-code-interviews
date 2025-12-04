import express from 'express';
import { createServer, Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { setupSessionHandlers } from '../src/sessions/sessionHandlers.js';

export interface TestContext {
  httpServer: HttpServer;
  io: Server;
  port: number;
  createClient: () => ClientSocket;
  cleanup: () => Promise<void>;
}

export async function createTestServer(): Promise<TestContext> {
  const app = express();
  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    setupSessionHandlers(io, socket);
  });

  // Find an available port
  const port = await new Promise<number>((resolve) => {
    httpServer.listen(0, () => {
      const address = httpServer.address();
      if (address && typeof address === 'object') {
        resolve(address.port);
      }
    });
  });

  const clients: ClientSocket[] = [];

  const createClient = () => {
    const client = ioc(`http://localhost:${port}`, {
      transports: ['websocket'],
      forceNew: true,
    });
    clients.push(client);
    return client;
  };

  const cleanup = async () => {
    // Disconnect all clients
    for (const client of clients) {
      if (client.connected) {
        client.disconnect();
      }
    }

    // Close server
    await new Promise<void>((resolve) => {
      io.close(() => {
        httpServer.close(() => {
          resolve();
        });
      });
    });
  };

  return { httpServer, io, port, createClient, cleanup };
}

export function waitForEvent<T>(socket: ClientSocket, event: string, timeout = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeout);

    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

export function waitForConnect(socket: ClientSocket, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error('Timeout waiting for connection'));
    }, timeout);

    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
