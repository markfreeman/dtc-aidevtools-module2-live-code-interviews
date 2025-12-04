import { loadPyodide } from 'pyodide';
import type { PyodideInterface } from 'pyodide';
import type { ExecutionResult, SupportedLanguage } from '../types/index';

let pyodide: PyodideInterface | null = null;
let jsReady = false;

const EXECUTION_TIMEOUT = 5000; // 5 seconds

export async function initializePyodide(): Promise<void> {
  if (!pyodide) {
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
    });
  }
}

export async function initializeQuickJS(): Promise<void> {
  // JavaScript execution uses sandboxed iframe, no initialization needed
  jsReady = true;
}

export async function executeCode(
  code: string,
  language: SupportedLanguage
): Promise<ExecutionResult> {
  const startTime = performance.now();

  try {
    let output: string;

    if (language === 'python') {
      output = await executePython(code);
    } else if (language === 'javascript') {
      output = await executeJavaScript(code);
    } else {
      return { output: '', error: `Unsupported language: ${language}` };
    }

    const executionTime = performance.now() - startTime;
    return { output, executionTime };
  } catch (error) {
    const executionTime = performance.now() - startTime;
    return {
      output: '',
      error: error instanceof Error ? error.message : String(error),
      executionTime,
    };
  }
}

async function executePython(code: string): Promise<string> {
  if (!pyodide) {
    await initializePyodide();
  }

  // Use Pyodide's built-in stdout/stderr capture
  pyodide!.setStdout({ batched: (msg: string) => { stdoutBuffer.push(msg); } });
  pyodide!.setStderr({ batched: (msg: string) => { stderrBuffer.push(msg); } });

  const stdoutBuffer: string[] = [];
  const stderrBuffer: string[] = [];

  try {
    await Promise.race([
      pyodide!.runPythonAsync(code),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout')), EXECUTION_TIMEOUT)
      ),
    ]);

    const stdout = stdoutBuffer.join('\n');
    const stderr = stderrBuffer.join('\n');

    return stderr ? `${stdout}\n${stderr}`.trim() : stdout;
  } catch (error) {
    const stdout = stdoutBuffer.join('\n');
    const stderr = stderrBuffer.join('\n');
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Include any output that was captured before the error
    if (stdout || stderr) {
      throw new Error(`${stdout}\n${stderr}\n${errorMsg}`.trim());
    }
    throw error;
  }
}

async function executeJavaScript(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox.add('allow-scripts');
    document.body.appendChild(iframe);

    const output: string[] = [];
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('Execution timeout'));
      }
    }, EXECUTION_TIMEOUT);

    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener('message', handleMessage);
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;

      const { type, data } = event.data;

      if (type === 'log') {
        output.push(data);
      } else if (type === 'error') {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error(data));
        }
      } else if (type === 'result') {
        if (!settled) {
          settled = true;
          cleanup();
          if (data !== undefined && output.length === 0) {
            output.push(String(data));
          }
          resolve(output.join('\n'));
        }
      }
    };

    window.addEventListener('message', handleMessage);

    const script = `
      <script>
        const output = [];
        const originalConsole = console;
        console = {
          log: (...args) => {
            const msg = args.map(a => {
              if (typeof a === 'object') return JSON.stringify(a);
              return String(a);
            }).join(' ');
            parent.postMessage({ type: 'log', data: msg }, '*');
          },
          error: (...args) => {
            const msg = args.map(a => String(a)).join(' ');
            parent.postMessage({ type: 'log', data: 'Error: ' + msg }, '*');
          },
          warn: (...args) => {
            const msg = args.map(a => String(a)).join(' ');
            parent.postMessage({ type: 'log', data: 'Warning: ' + msg }, '*');
          }
        };

        try {
          const result = eval(${JSON.stringify(code)});
          parent.postMessage({ type: 'result', data: result }, '*');
        } catch (e) {
          parent.postMessage({ type: 'error', data: e.message || String(e) }, '*');
        }
      <\/script>
    `;

    iframe.srcdoc = script;
  });
}

export function isRuntimeReady(language: SupportedLanguage): boolean {
  if (language === 'python') {
    return pyodide !== null;
  }
  if (language === 'javascript') {
    return jsReady;
  }
  return false;
}
