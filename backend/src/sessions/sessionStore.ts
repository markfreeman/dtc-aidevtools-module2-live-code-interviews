import { Session, Participant, SessionState } from '../types/index.js';

class SessionStore {
  private sessions: Map<string, Session> = new Map();

  createSession(id: string): Session {
    const session: Session = {
      id,
      code: '// Start coding here...\n',
      language: 'javascript',
      createdAt: new Date(),
      participants: new Map(),
    };
    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  deleteSession(id: string): boolean {
    return this.sessions.delete(id);
  }

  addParticipant(sessionId: string, participant: Participant): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.participants.set(participant.id, participant);
    return true;
  }

  removeParticipant(sessionId: string, participantId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    const removed = session.participants.delete(participantId);

    // Clean up empty sessions
    if (session.participants.size === 0) {
      this.sessions.delete(sessionId);
    }

    return removed;
  }

  updateCode(sessionId: string, code: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.code = code;
    return true;
  }

  updateLanguage(sessionId: string, language: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.language = language;
    return true;
  }

  getSessionState(sessionId: string): SessionState | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      code: session.code,
      language: session.language,
      participants: Array.from(session.participants.values()),
    };
  }

  getParticipant(sessionId: string, participantId: string): Participant | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    return session.participants.get(participantId);
  }
}

export const sessionStore = new SessionStore();
