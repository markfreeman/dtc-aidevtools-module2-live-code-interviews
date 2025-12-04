import { useState } from 'react';

interface JoinSessionProps {
  onJoinSession: (sessionId: string, userName: string) => Promise<boolean>;
  isConnected: boolean;
  initialSessionId?: string;
}

export function JoinSession({ onJoinSession, isConnected, initialSessionId = '' }: JoinSessionProps) {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [userName, setUserName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId.trim() || !userName.trim()) return;

    setIsJoining(true);
    setError('');

    const success = await onJoinSession(sessionId.trim(), userName.trim());
    if (!success) {
      setError('Session not found. Please check the session ID.');
    }
    setIsJoining(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 style={{ marginBottom: '16px', color: '#fff' }}>Join Interview Session</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="text"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="Session ID"
          style={{
            padding: '12px 16px',
            fontSize: '16px',
            border: '1px solid #3c3c3c',
            borderRadius: '6px',
            backgroundColor: '#2d2d2d',
            color: '#fff',
          }}
        />
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Your name"
          style={{
            padding: '12px 16px',
            fontSize: '16px',
            border: '1px solid #3c3c3c',
            borderRadius: '6px',
            backgroundColor: '#2d2d2d',
            color: '#fff',
          }}
        />
        {error && (
          <div style={{ color: '#f48771', fontSize: '14px' }}>{error}</div>
        )}
        <button
          type="submit"
          disabled={!isConnected || isJoining || !sessionId.trim() || !userName.trim()}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#388a34',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: isConnected && sessionId.trim() && userName.trim() ? 'pointer' : 'not-allowed',
            opacity: isConnected && sessionId.trim() && userName.trim() ? 1 : 0.6,
          }}
        >
          {isJoining ? 'Joining...' : 'Join Session'}
        </button>
      </div>
    </form>
  );
}
