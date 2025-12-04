import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { CodeEditor } from './components/Editor/CodeEditor';
import { OutputPanel } from './components/Output/OutputPanel';
import { CreateSession } from './components/Session/CreateSession';
import { JoinSession } from './components/Session/JoinSession';
import { SocketProvider, useSocketContext } from './contexts/SocketContext';
import { useCodeExecution } from './hooks/useCodeExecution';
import type { SupportedLanguage } from './types/index';

function HomePage() {
  const navigate = useNavigate();
  const { isConnected, createSession, joinSession, sessionState } = useSocketContext();

  useEffect(() => {
    if (sessionState) {
      navigate(`/session/${sessionState.id}`);
    }
  }, [sessionState, navigate]);

  const handleCreateSession = async (userName: string) => {
    await createSession(userName);
    // Navigation will happen via the useEffect when sessionState updates
  };

  const handleJoinSession = async (sessionId: string, userName: string) => {
    const success = await joinSession(sessionId, userName);
    return success;
    // Navigation will happen via the useEffect when sessionState updates
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#1e1e1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          maxWidth: '500px',
          width: '100%',
          padding: '32px',
          backgroundColor: '#252526',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            marginBottom: '32px',
            color: '#fff',
            fontSize: '28px',
          }}
        >
          Live Coding Interview
        </h1>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#4ade80' : '#f87171',
            }}
          />
          <span style={{ color: '#858585', fontSize: '14px' }}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>

        <CreateSession onCreateSession={handleCreateSession} isConnected={isConnected} />

        <div
          style={{
            textAlign: 'center',
            color: '#858585',
            margin: '24px 0',
            fontSize: '14px',
          }}
        >
          — or —
        </div>

        <JoinSession onJoinSession={handleJoinSession} isConnected={isConnected} />
      </div>
    </div>
  );
}

function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const {
    isConnected,
    sessionState,
    joinSession,
    sendCodeChange,
    sendLanguageChange,
    sendCursorMove,
    participants,
    remoteCursors,
  } = useSocketContext();
  const { execute, result, isExecuting, isRuntimeLoading, runtimeStatus } = useCodeExecution();

  const [localCode, setLocalCode] = useState('// Start coding here...\n');
  const [localLanguage, setLocalLanguage] = useState<SupportedLanguage>('javascript');
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync local state with session state
  useEffect(() => {
    if (sessionState) {
      setLocalCode(sessionState.code);
      setLocalLanguage(sessionState.language as SupportedLanguage);
      setShowJoinForm(false);
    } else if (isConnected && sessionId) {
      // No session state but we have a session ID - need to join
      setShowJoinForm(true);
    }
  }, [sessionState, isConnected, sessionId]);

  const handleCodeChange = useCallback(
    (code: string) => {
      setLocalCode(code);
      sendCodeChange(code);
    },
    [sendCodeChange]
  );

  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const lang = e.target.value as SupportedLanguage;
      setLocalLanguage(lang);
      sendLanguageChange(lang);
    },
    [sendLanguageChange]
  );

  const handleRun = useCallback(() => {
    execute(localCode, localLanguage);
  }, [execute, localCode, localLanguage]);

  const handleCopyLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleJoinSession = async (sid: string, userName: string) => {
    const success = await joinSession(sid, userName);
    if (success) {
      setShowJoinForm(false);
    }
    return success;
  };

  if (showJoinForm) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#1e1e1e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <div
          style={{
            maxWidth: '500px',
            width: '100%',
            padding: '32px',
            backgroundColor: '#252526',
            borderRadius: '12px',
          }}
        >
          <h1 style={{ textAlign: 'center', marginBottom: '24px', color: '#fff' }}>
            Join Session
          </h1>
          <JoinSession
            onJoinSession={handleJoinSession}
            isConnected={isConnected}
            initialSessionId={sessionId}
          />
          <button
            onClick={() => navigate('/')}
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '12px',
              backgroundColor: 'transparent',
              color: '#858585',
              border: '1px solid #3c3c3c',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1e1e1e',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 20px',
          backgroundColor: '#252526',
          borderBottom: '1px solid #3c3c3c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>
            Live Coding Interview
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#4ade80' : '#f87171',
              }}
            />
            <span style={{ color: '#858585', fontSize: '12px' }}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Participants */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#858585', fontSize: '14px' }}>
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {participants.map((p, i) => (
                <div
                  key={p.id}
                  title={p.name}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][i % 4],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
          </div>

          {/* Copy Link Button */}
          <button
            onClick={handleCopyLink}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3c3c3c',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          padding: '8px 20px',
          backgroundColor: '#2d2d2d',
          borderBottom: '1px solid #3c3c3c',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <select
          value={localLanguage}
          onChange={handleLanguageChange}
          style={{
            padding: '8px 12px',
            backgroundColor: '#3c3c3c',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
        </select>

        <button
          onClick={handleRun}
          disabled={isExecuting || !runtimeStatus[localLanguage]}
          style={{
            padding: '8px 20px',
            backgroundColor: '#388a34',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: isExecuting || !runtimeStatus[localLanguage] ? 'not-allowed' : 'pointer',
            opacity: isExecuting || !runtimeStatus[localLanguage] ? 0.6 : 1,
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          {isExecuting ? 'Running...' : 'Run'}
        </button>

        {isRuntimeLoading && (
          <span style={{ color: '#858585', fontSize: '12px' }}>
            Loading {!runtimeStatus.javascript && 'JS'} {!runtimeStatus.python && 'Python'} runtime...
          </span>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Editor Panel */}
        <div style={{ flex: 2, borderRight: '1px solid #3c3c3c' }}>
          <CodeEditor
            code={localCode}
            language={localLanguage}
            onChange={handleCodeChange}
            onCursorMove={sendCursorMove}
            remoteCursors={remoteCursors}
          />
        </div>

        {/* Output Panel */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <OutputPanel result={result} isExecuting={isExecuting} />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/session/:sessionId" element={<SessionPage />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}

export default App;
