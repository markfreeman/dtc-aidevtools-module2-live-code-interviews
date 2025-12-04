import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '../services/socket';
import type { SessionState, Participant, CursorPosition } from '../types/index';

interface UseSocketReturn {
  isConnected: boolean;
  sessionState: SessionState | null;
  createSession: (userName: string) => Promise<string>;
  joinSession: (sessionId: string, userName: string) => Promise<boolean>;
  sendCodeChange: (code: string) => void;
  sendLanguageChange: (language: string) => void;
  sendCursorMove: (position: CursorPosition) => void;
  participants: Participant[];
  remoteCursors: Map<string, { position: CursorPosition; userName: string }>;
}

export function useSocket(): UseSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, { position: CursorPosition; userName: string }>>(new Map());
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const onSessionJoined = (state: SessionState) => {
      setSessionState(state);
      setParticipants(state.participants);
    };

    const onCodeChange = (data: { code: string; userId: string }) => {
      setSessionState((prev) =>
        prev ? { ...prev, code: data.code } : null
      );
    };

    const onLanguageChange = (data: { language: string; userId: string }) => {
      setSessionState((prev) =>
        prev ? { ...prev, language: data.language } : null
      );
    };

    const onUserJoined = (user: Participant) => {
      setParticipants((prev) => [...prev, user]);
    };

    const onUserLeft = (user: { id: string }) => {
      setParticipants((prev) => prev.filter((p) => p.id !== user.id));
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.delete(user.id);
        return next;
      });
    };

    const onCursorMove = (data: { userId: string; position: CursorPosition; userName: string }) => {
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.set(data.userId, { position: data.position, userName: data.userName });
        return next;
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('session:joined', onSessionJoined);
    socket.on('code:change', onCodeChange);
    socket.on('language:change', onLanguageChange);
    socket.on('user:joined', onUserJoined);
    socket.on('user:left', onUserLeft);
    socket.on('cursor:move', onCursorMove);

    connectSocket();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('session:joined', onSessionJoined);
      socket.off('code:change', onCodeChange);
      socket.off('language:change', onLanguageChange);
      socket.off('user:joined', onUserJoined);
      socket.off('user:left', onUserLeft);
      socket.off('cursor:move', onCursorMove);
      disconnectSocket();
    };
  }, []);

  const createSession = useCallback((userName: string): Promise<string> => {
    return new Promise((resolve) => {
      socketRef.current.emit('session:create', userName, (response: { sessionId: string }) => {
        resolve(response.sessionId);
      });
    });
  }, []);

  const joinSession = useCallback((sessionId: string, userName: string): Promise<boolean> => {
    return new Promise((resolve) => {
      socketRef.current.emit(
        'session:join',
        { sessionId, userName },
        (response: { success: boolean; error?: string }) => {
          resolve(response.success);
        }
      );
    });
  }, []);

  const sendCodeChange = useCallback((code: string) => {
    socketRef.current.emit('code:change', { code });
  }, []);

  const sendLanguageChange = useCallback((language: string) => {
    socketRef.current.emit('language:change', { language });
  }, []);

  const sendCursorMove = useCallback((position: CursorPosition) => {
    socketRef.current.emit('cursor:move', { position });
  }, []);

  return {
    isConnected,
    sessionState,
    createSession,
    joinSession,
    sendCodeChange,
    sendLanguageChange,
    sendCursorMove,
    participants,
    remoteCursors,
  };
}
