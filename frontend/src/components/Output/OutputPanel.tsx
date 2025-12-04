import type { ExecutionResult } from '../../types/index';

interface OutputPanelProps {
  result: ExecutionResult | null;
  isExecuting: boolean;
}

export function OutputPanel({ result, isExecuting }: OutputPanelProps) {
  return (
    <div
      style={{
        height: '100%',
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        fontFamily: 'monospace',
        fontSize: '14px',
        padding: '12px',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          borderBottom: '1px solid #3c3c3c',
          paddingBottom: '8px',
          marginBottom: '12px',
          color: '#858585',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Output</span>
        {result?.executionTime !== undefined && (
          <span style={{ fontSize: '12px' }}>
            Executed in {result.executionTime.toFixed(2)}ms
          </span>
        )}
      </div>

      {isExecuting ? (
        <div style={{ color: '#858585' }}>Running...</div>
      ) : result ? (
        <>
          {result.error ? (
            <pre
              style={{
                color: '#f48771',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              Error: {result.error}
            </pre>
          ) : (
            <pre
              style={{
                color: '#d4d4d4',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {result.output || '(no output)'}
            </pre>
          )}
        </>
      ) : (
        <div style={{ color: '#858585' }}>
          Click "Run" to execute code
        </div>
      )}
    </div>
  );
}
