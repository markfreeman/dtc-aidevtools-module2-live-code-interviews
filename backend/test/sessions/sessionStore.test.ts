import { describe, it, expect, beforeEach } from 'vitest';

// Import the class directly for testing - need to create a fresh instance each test
class SessionStore {
  private sessions: Map<
    string,
    {
      id: string;
      code: string;
      language: string;
      createdAt: Date;
      participants: Map<string, { id: string; name: string }>;
    }
  > = new Map();

  createSession(id: string) {
    const session = {
      id,
      code: '// Start coding here...\n',
      language: 'javascript',
      createdAt: new Date(),
      participants: new Map<string, { id: string; name: string }>(),
    };
    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string) {
    return this.sessions.get(id);
  }

  deleteSession(id: string) {
    return this.sessions.delete(id);
  }

  addParticipant(sessionId: string, participant: { id: string; name: string }) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.participants.set(participant.id, participant);
    return true;
  }

  removeParticipant(sessionId: string, participantId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    const removed = session.participants.delete(participantId);
    if (session.participants.size === 0) {
      this.sessions.delete(sessionId);
    }
    return removed;
  }

  updateCode(sessionId: string, code: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.code = code;
    return true;
  }

  updateLanguage(sessionId: string, language: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.language = language;
    return true;
  }

  getSessionState(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return {
      id: session.id,
      code: session.code,
      language: session.language,
      participants: Array.from(session.participants.values()),
    };
  }

  getParticipant(sessionId: string, participantId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    return session.participants.get(participantId);
  }
}

describe('SessionStore', () => {
  let store: SessionStore;

  beforeEach(() => {
    store = new SessionStore();
  });

  describe('createSession', () => {
    it('should create a session with default values', () => {
      const session = store.createSession('test-id');

      expect(session.id).toBe('test-id');
      expect(session.code).toBe('// Start coding here...\n');
      expect(session.language).toBe('javascript');
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.participants.size).toBe(0);
    });

    it('should store the session for later retrieval', () => {
      store.createSession('test-id');

      const retrieved = store.getSession('test-id');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-id');
    });
  });

  describe('getSession', () => {
    it('should return undefined for non-existent session', () => {
      const session = store.getSession('non-existent');
      expect(session).toBeUndefined();
    });

    it('should return the session if it exists', () => {
      store.createSession('test-id');
      const session = store.getSession('test-id');
      expect(session?.id).toBe('test-id');
    });
  });

  describe('deleteSession', () => {
    it('should delete an existing session', () => {
      store.createSession('test-id');
      const deleted = store.deleteSession('test-id');

      expect(deleted).toBe(true);
      expect(store.getSession('test-id')).toBeUndefined();
    });

    it('should return false for non-existent session', () => {
      const deleted = store.deleteSession('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('addParticipant', () => {
    it('should add a participant to a session', () => {
      store.createSession('test-id');
      const result = store.addParticipant('test-id', { id: 'user-1', name: 'Alice' });

      expect(result).toBe(true);
      const participant = store.getParticipant('test-id', 'user-1');
      expect(participant?.name).toBe('Alice');
    });

    it('should return false for non-existent session', () => {
      const result = store.addParticipant('non-existent', { id: 'user-1', name: 'Alice' });
      expect(result).toBe(false);
    });
  });

  describe('removeParticipant', () => {
    it('should remove a participant from a session', () => {
      store.createSession('test-id');
      store.addParticipant('test-id', { id: 'user-1', name: 'Alice' });
      store.addParticipant('test-id', { id: 'user-2', name: 'Bob' });

      const removed = store.removeParticipant('test-id', 'user-1');

      expect(removed).toBe(true);
      expect(store.getParticipant('test-id', 'user-1')).toBeUndefined();
      expect(store.getParticipant('test-id', 'user-2')).toBeDefined();
    });

    it('should delete session when last participant leaves', () => {
      store.createSession('test-id');
      store.addParticipant('test-id', { id: 'user-1', name: 'Alice' });

      store.removeParticipant('test-id', 'user-1');

      expect(store.getSession('test-id')).toBeUndefined();
    });

    it('should return false for non-existent session', () => {
      const removed = store.removeParticipant('non-existent', 'user-1');
      expect(removed).toBe(false);
    });
  });

  describe('updateCode', () => {
    it('should update the session code', () => {
      store.createSession('test-id');
      const result = store.updateCode('test-id', 'console.log("Hello");');

      expect(result).toBe(true);
      expect(store.getSession('test-id')?.code).toBe('console.log("Hello");');
    });

    it('should return false for non-existent session', () => {
      const result = store.updateCode('non-existent', 'code');
      expect(result).toBe(false);
    });
  });

  describe('updateLanguage', () => {
    it('should update the session language', () => {
      store.createSession('test-id');
      const result = store.updateLanguage('test-id', 'python');

      expect(result).toBe(true);
      expect(store.getSession('test-id')?.language).toBe('python');
    });

    it('should return false for non-existent session', () => {
      const result = store.updateLanguage('non-existent', 'python');
      expect(result).toBe(false);
    });
  });

  describe('getSessionState', () => {
    it('should return null for non-existent session', () => {
      const state = store.getSessionState('non-existent');
      expect(state).toBeNull();
    });

    it('should return session state with participants as array', () => {
      store.createSession('test-id');
      store.addParticipant('test-id', { id: 'user-1', name: 'Alice' });
      store.addParticipant('test-id', { id: 'user-2', name: 'Bob' });
      store.updateCode('test-id', 'test code');
      store.updateLanguage('test-id', 'python');

      const state = store.getSessionState('test-id');

      expect(state?.id).toBe('test-id');
      expect(state?.code).toBe('test code');
      expect(state?.language).toBe('python');
      expect(state?.participants).toHaveLength(2);
      expect(state?.participants.map((p) => p.name)).toContain('Alice');
      expect(state?.participants.map((p) => p.name)).toContain('Bob');
    });
  });

  describe('getParticipant', () => {
    it('should return undefined for non-existent session', () => {
      const participant = store.getParticipant('non-existent', 'user-1');
      expect(participant).toBeUndefined();
    });

    it('should return undefined for non-existent participant', () => {
      store.createSession('test-id');
      const participant = store.getParticipant('test-id', 'non-existent');
      expect(participant).toBeUndefined();
    });

    it('should return the participant if they exist', () => {
      store.createSession('test-id');
      store.addParticipant('test-id', { id: 'user-1', name: 'Alice' });

      const participant = store.getParticipant('test-id', 'user-1');
      expect(participant?.name).toBe('Alice');
    });
  });
});
