export interface Session {
  id: string;
  code: string;
  language: string;
  createdAt: Date;
  participants: Map<string, Participant>;
}

export interface Participant {
  id: string;
  name: string;
  cursorPosition?: CursorPosition;
}

export interface CursorPosition {
  lineNumber: number;
  column: number;
}

export interface CodeChangeEvent {
  sessionId: string;
  userId: string;
  code: string;
  timestamp: number;
}

export interface LanguageChangeEvent {
  sessionId: string;
  userId: string;
  language: string;
}

export interface CursorMoveEvent {
  sessionId: string;
  userId: string;
  position: CursorPosition;
}

export interface JoinSessionPayload {
  sessionId: string;
  userName: string;
}

export interface SessionState {
  id: string;
  code: string;
  language: string;
  participants: Participant[];
}
