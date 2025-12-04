import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import type { OnMount, OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { SupportedLanguage, CursorPosition } from '../../types/index';

interface CodeEditorProps {
  code: string;
  language: SupportedLanguage;
  onChange: (code: string) => void;
  onCursorMove: (position: CursorPosition) => void;
  remoteCursors: Map<string, { position: CursorPosition; userName: string }>;
  readOnly?: boolean;
}

const LANGUAGE_MAP: Record<SupportedLanguage, string> = {
  javascript: 'javascript',
  python: 'python',
};

export function CodeEditor({
  code,
  language,
  onChange,
  onCursorMove,
  remoteCursors,
  readOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const isRemoteChangeRef = useRef(false);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    // Track cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      if (!isRemoteChangeRef.current) {
        onCursorMove({
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      }
    });
  };

  const handleChange: OnChange = (value) => {
    if (value !== undefined && !isRemoteChangeRef.current) {
      onChange(value);
    }
  };

  // Update remote cursors as decorations
  useEffect(() => {
    if (!editorRef.current) return;

    const decorations: editor.IModelDeltaDecoration[] = [];
    let colorIndex = 0;

    remoteCursors.forEach(({ position, userName }) => {
      colorIndex++;

      decorations.push({
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column + 1,
        },
        options: {
          className: `remote-cursor-${colorIndex}`,
          beforeContentClassName: `remote-cursor-marker`,
          hoverMessage: { value: userName },
          stickiness: 1,
        },
      });
    });

    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      decorations
    );
  }, [remoteCursors]);

  // Handle remote code updates
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== code) {
        isRemoteChangeRef.current = true;
        const position = editorRef.current.getPosition();
        editorRef.current.setValue(code);
        if (position) {
          editorRef.current.setPosition(position);
        }
        isRemoteChangeRef.current = false;
      }
    }
  }, [code]);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Editor
        height="100%"
        language={LANGUAGE_MAP[language]}
        value={code}
        theme="vs-dark"
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          readOnly,
          wordWrap: 'on',
        }}
      />
    </div>
  );
}
