export interface CursorPosition {
  lineNumber: number;
  column: number;
}

export type SupportedLanguage = 'javascript' | 'python';

export interface ExecutionResult {
  output: string;
  error?: string;
  executionTime?: number;
}

export interface Participant {
  id: string;
  name: string;
  cursorPosition?: CursorPosition;
}

export interface Session {
  id: string;
  code: string;
  language: string;
  participants: Participant[];
}

export interface SessionState {
  id: string;
  code: string;
  language: string;
  participants: Participant[];
}
