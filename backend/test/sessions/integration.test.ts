import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestServer, waitForConnect, waitForEvent, TestContext } from '../testServer.js';

interface SessionState {
  id: string;
  code: string;
  language: string;
  participants: Array<{ id: string; name: string }>;
}

async function createAndJoinSession(
  ctx: TestContext,
  interviewerName = 'Interviewer',
  candidateName = 'Candidate'
): Promise<{ interviewer: ReturnType<TestContext['createClient']>; candidate: ReturnType<TestContext['createClient']>; sessionId: string }> {
  const interviewer = ctx.createClient();
  const candidate = ctx.createClient();

  await Promise.all([waitForConnect(interviewer), waitForConnect(candidate)]);

  // Set up listener BEFORE emitting
  const interviewerJoinedPromise = waitForEvent<SessionState>(interviewer, 'session:joined');

  const createResponse = await new Promise<{ sessionId: string }>((resolve) => {
    interviewer.emit('session:create', interviewerName, resolve);
  });

  await interviewerJoinedPromise;

  // Set up listener for candidate BEFORE joining
  const candidateJoinedPromise = waitForEvent<SessionState>(candidate, 'session:joined');

  await new Promise<{ success: boolean }>((resolve) => {
    candidate.emit('session:join', { sessionId: createResponse.sessionId, userName: candidateName }, resolve);
  });

  await candidateJoinedPromise;

  return { interviewer, candidate, sessionId: createResponse.sessionId };
}

describe('Session Integration Tests', () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestServer();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('Session Creation', () => {
    it('should create a session and return session ID', async () => {
      const client = ctx.createClient();
      await waitForConnect(client);

      const response = await new Promise<{ sessionId: string }>((resolve) => {
        client.emit('session:create', 'TestUser', resolve);
      });

      expect(response.sessionId).toBeDefined();
      expect(response.sessionId.length).toBe(10);
    });

    it('should emit session:joined after creating a session', async () => {
      const client = ctx.createClient();
      await waitForConnect(client);

      // Set up listener BEFORE emitting
      const sessionJoinedPromise = waitForEvent<SessionState>(client, 'session:joined');

      client.emit('session:create', 'Interviewer', () => {});

      const sessionState = await sessionJoinedPromise;

      expect(sessionState.id).toBeDefined();
      expect(sessionState.code).toBe('// Start coding here...\n');
      expect(sessionState.language).toBe('javascript');
      expect(sessionState.participants).toHaveLength(1);
      expect(sessionState.participants[0].name).toBe('Interviewer');
    });
  });

  describe('Session Joining', () => {
    it('should allow a second user to join an existing session', async () => {
      const interviewer = ctx.createClient();
      const candidate = ctx.createClient();

      await Promise.all([waitForConnect(interviewer), waitForConnect(candidate)]);

      // Interviewer creates session
      const createResponse = await new Promise<{ sessionId: string }>((resolve) => {
        interviewer.emit('session:create', 'Interviewer', resolve);
      });

      // Candidate joins session
      const joinResponse = await new Promise<{ success: boolean; error?: string }>((resolve) => {
        candidate.emit('session:join', { sessionId: createResponse.sessionId, userName: 'Candidate' }, resolve);
      });

      expect(joinResponse.success).toBe(true);
    });

    it('should receive session state when joining', async () => {
      const interviewer = ctx.createClient();
      const candidate = ctx.createClient();

      await Promise.all([waitForConnect(interviewer), waitForConnect(candidate)]);

      // Interviewer creates session - set up listener before emit
      const interviewerJoinedPromise = waitForEvent<SessionState>(interviewer, 'session:joined');
      const createResponse = await new Promise<{ sessionId: string }>((resolve) => {
        interviewer.emit('session:create', 'Interviewer', resolve);
      });
      await interviewerJoinedPromise;

      // Candidate joins - set up listener before emit
      const candidateJoinedPromise = waitForEvent<SessionState>(candidate, 'session:joined');
      candidate.emit('session:join', { sessionId: createResponse.sessionId, userName: 'Candidate' }, () => {});

      const sessionState = await candidateJoinedPromise;

      expect(sessionState.id).toBe(createResponse.sessionId);
      expect(sessionState.participants).toHaveLength(2);
    });

    it('should fail when joining a non-existent session', async () => {
      const client = ctx.createClient();
      await waitForConnect(client);

      const response = await new Promise<{ success: boolean; error?: string }>((resolve) => {
        client.emit('session:join', { sessionId: 'nonexistent', userName: 'User' }, resolve);
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Session not found');
    });

    it('should notify existing participants when a new user joins', async () => {
      const interviewer = ctx.createClient();
      const candidate = ctx.createClient();

      await Promise.all([waitForConnect(interviewer), waitForConnect(candidate)]);

      // Interviewer creates session - set up listener before emit
      const interviewerJoinedPromise = waitForEvent<SessionState>(interviewer, 'session:joined');
      const createResponse = await new Promise<{ sessionId: string }>((resolve) => {
        interviewer.emit('session:create', 'Interviewer', resolve);
      });
      await interviewerJoinedPromise;

      // Set up listener for user:joined BEFORE candidate joins
      const userJoinedPromise = waitForEvent<{ id: string; name: string }>(interviewer, 'user:joined');

      // Candidate joins
      candidate.emit('session:join', { sessionId: createResponse.sessionId, userName: 'Candidate' }, () => {});

      const joinedUser = await userJoinedPromise;

      expect(joinedUser.name).toBe('Candidate');
    });
  });

  describe('Real-time Code Sync', () => {
    it('should broadcast code changes to other participants', async () => {
      const { interviewer, candidate } = await createAndJoinSession(ctx);

      // Set up listener for code changes BEFORE sending
      const codeChangePromise = waitForEvent<{ code: string; userId: string }>(candidate, 'code:change');

      // Interviewer sends code change
      interviewer.emit('code:change', { code: 'console.log("Hello World");' });

      const codeChange = await codeChangePromise;

      expect(codeChange.code).toBe('console.log("Hello World");');
    });

    it('should not echo code changes back to the sender', async () => {
      const { interviewer, candidate } = await createAndJoinSession(ctx);

      // Track if interviewer receives their own change
      let receivedOwnChange = false;
      interviewer.on('code:change', () => {
        receivedOwnChange = true;
      });

      // Wait for candidate to receive
      const candidateReceivedPromise = waitForEvent(candidate, 'code:change');

      interviewer.emit('code:change', { code: 'test code' });

      await candidateReceivedPromise;

      // Small delay to ensure no late echo
      await new Promise((r) => setTimeout(r, 100));

      expect(receivedOwnChange).toBe(false);
    });
  });

  describe('Language Change Sync', () => {
    it('should broadcast language changes to other participants', async () => {
      const { interviewer, candidate } = await createAndJoinSession(ctx);

      // Set up listener BEFORE sending
      const langChangePromise = waitForEvent<{ language: string; userId: string }>(candidate, 'language:change');

      // Interviewer changes language
      interviewer.emit('language:change', { language: 'python' });

      const langChange = await langChangePromise;

      expect(langChange.language).toBe('python');
    });
  });

  describe('Cursor Position Sync', () => {
    it('should broadcast cursor movements to other participants', async () => {
      const { interviewer, candidate } = await createAndJoinSession(ctx);

      // Set up listener BEFORE sending
      const cursorMovePromise = waitForEvent<{
        userId: string;
        position: { lineNumber: number; column: number };
        userName: string;
      }>(candidate, 'cursor:move');

      // Interviewer moves cursor
      interviewer.emit('cursor:move', { position: { lineNumber: 5, column: 10 } });

      const cursorMove = await cursorMovePromise;

      expect(cursorMove.position.lineNumber).toBe(5);
      expect(cursorMove.position.column).toBe(10);
      expect(cursorMove.userName).toBe('Interviewer');
    });
  });

  describe('User Disconnect', () => {
    it('should notify other participants when a user disconnects', async () => {
      const { interviewer, candidate } = await createAndJoinSession(ctx);

      // Set up listener BEFORE disconnecting
      const userLeftPromise = waitForEvent<{ id: string; name: string }>(interviewer, 'user:left');

      // Candidate disconnects
      candidate.disconnect();

      const leftUser = await userLeftPromise;

      expect(leftUser.name).toBe('Candidate');
    });
  });

  describe('Session State Persistence', () => {
    it('should persist code changes for new joiners', async () => {
      const interviewer = ctx.createClient();
      const candidate = ctx.createClient();

      await Promise.all([waitForConnect(interviewer), waitForConnect(candidate)]);

      // Interviewer creates session
      const interviewerJoinedPromise = waitForEvent<SessionState>(interviewer, 'session:joined');
      const createResponse = await new Promise<{ sessionId: string }>((resolve) => {
        interviewer.emit('session:create', 'Interviewer', resolve);
      });
      await interviewerJoinedPromise;

      // Update code before candidate joins
      interviewer.emit('code:change', { code: 'function hello() { return "world"; }' });

      // Small delay to ensure code is saved
      await new Promise((r) => setTimeout(r, 50));

      // Candidate joins and should receive updated code
      const candidateJoinedPromise = waitForEvent<SessionState>(candidate, 'session:joined');

      candidate.emit('session:join', { sessionId: createResponse.sessionId, userName: 'Candidate' }, () => {});

      const sessionState = await candidateJoinedPromise;

      expect(sessionState.code).toBe('function hello() { return "world"; }');
    });

    it('should persist language changes for new joiners', async () => {
      const interviewer = ctx.createClient();
      const candidate = ctx.createClient();

      await Promise.all([waitForConnect(interviewer), waitForConnect(candidate)]);

      // Interviewer creates session
      const interviewerJoinedPromise = waitForEvent<SessionState>(interviewer, 'session:joined');
      const createResponse = await new Promise<{ sessionId: string }>((resolve) => {
        interviewer.emit('session:create', 'Interviewer', resolve);
      });
      await interviewerJoinedPromise;

      // Change language before candidate joins
      interviewer.emit('language:change', { language: 'python' });

      // Small delay to ensure language is saved
      await new Promise((r) => setTimeout(r, 50));

      // Candidate joins and should see python
      const candidateJoinedPromise = waitForEvent<SessionState>(candidate, 'session:joined');

      candidate.emit('session:join', { sessionId: createResponse.sessionId, userName: 'Candidate' }, () => {});

      const sessionState = await candidateJoinedPromise;

      expect(sessionState.language).toBe('python');
    });
  });
});
