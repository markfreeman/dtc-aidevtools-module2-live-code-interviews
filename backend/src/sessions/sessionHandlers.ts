import { Server, Socket } from 'socket.io';
import { nanoid } from 'nanoid';
import { sessionStore } from './sessionStore.js';
import { JoinSessionPayload, CodeChangeEvent, LanguageChangeEvent, CursorMoveEvent } from '../types/index.js';

export function setupSessionHandlers(io: Server, socket: Socket) {
  // Track which session this socket is in
  let currentSessionId: string | null = null;
  let currentUserId: string | null = null;

  // Create a new session
  socket.on('session:create', (userName: string, callback: (response: { sessionId: string }) => void) => {
    const sessionId = nanoid(10);
    const session = sessionStore.createSession(sessionId);

    currentSessionId = sessionId;
    currentUserId = socket.id;

    sessionStore.addParticipant(sessionId, {
      id: socket.id,
      name: userName || 'Interviewer',
    });

    socket.join(sessionId);

    const state = sessionStore.getSessionState(sessionId);
    callback({ sessionId });
    socket.emit('session:joined', state);

    console.log(`Session created: ${sessionId} by ${userName}`);
  });

  // Join an existing session
  socket.on('session:join', (payload: JoinSessionPayload, callback: (response: { success: boolean; error?: string }) => void) => {
    const { sessionId, userName } = payload;
    const session = sessionStore.getSession(sessionId);

    if (!session) {
      callback({ success: false, error: 'Session not found' });
      return;
    }

    currentSessionId = sessionId;
    currentUserId = socket.id;

    sessionStore.addParticipant(sessionId, {
      id: socket.id,
      name: userName || 'Candidate',
    });

    socket.join(sessionId);

    const state = sessionStore.getSessionState(sessionId);
    callback({ success: true });
    socket.emit('session:joined', state);

    // Notify others
    socket.to(sessionId).emit('user:joined', {
      id: socket.id,
      name: userName || 'Candidate',
    });

    console.log(`User ${userName} joined session: ${sessionId}`);
  });

  // Handle code changes
  socket.on('code:change', (data: { code: string }) => {
    if (!currentSessionId) return;

    sessionStore.updateCode(currentSessionId, data.code);

    // Broadcast to others in the session
    socket.to(currentSessionId).emit('code:change', {
      code: data.code,
      userId: socket.id,
    });
  });

  // Handle language changes
  socket.on('language:change', (data: { language: string }) => {
    if (!currentSessionId) return;

    sessionStore.updateLanguage(currentSessionId, data.language);

    // Broadcast to others in the session
    socket.to(currentSessionId).emit('language:change', {
      language: data.language,
      userId: socket.id,
    });
  });

  // Handle cursor position updates
  socket.on('cursor:move', (data: { position: { lineNumber: number; column: number } }) => {
    if (!currentSessionId) return;

    // Broadcast cursor position to others
    socket.to(currentSessionId).emit('cursor:move', {
      userId: socket.id,
      position: data.position,
      userName: sessionStore.getParticipant(currentSessionId, socket.id)?.name,
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (currentSessionId && currentUserId) {
      const participant = sessionStore.getParticipant(currentSessionId, currentUserId);
      sessionStore.removeParticipant(currentSessionId, currentUserId);

      socket.to(currentSessionId).emit('user:left', {
        id: currentUserId,
        name: participant?.name,
      });

      console.log(`User disconnected from session: ${currentSessionId}`);
    }
  });
}
