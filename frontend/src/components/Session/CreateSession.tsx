import { useState } from 'react';

interface CreateSessionProps {
  onCreateSession: (userName: string) => Promise<void>;
  isConnected: boolean;
}

export function CreateSession({ onCreateSession, isConnected }: CreateSessionProps) {
  const [userName, setUserName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    setIsCreating(true);
    await onCreateSession(userName.trim());
    setIsCreating(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '24px' }}>
      <h2 style={{ marginBottom: '16px', color: '#fff' }}>Create Interview Session</h2>
      <div style={{ display: 'flex', gap: '12px' }}>
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
            flex: 1,
          }}
        />
        <button
          type="submit"
          disabled={!isConnected || isCreating || !userName.trim()}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#0e639c',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: isConnected && userName.trim() ? 'pointer' : 'not-allowed',
            opacity: isConnected && userName.trim() ? 1 : 0.6,
          }}
        >
          {isCreating ? 'Creating...' : 'Create Session'}
        </button>
      </div>
    </form>
  );
}
