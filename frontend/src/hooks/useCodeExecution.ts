import { useState, useCallback, useEffect } from 'react';
import {
  executeCode,
  initializePyodide,
  initializeQuickJS,
  isRuntimeReady,
} from '../services/wasmExecutor';
import type { ExecutionResult, SupportedLanguage } from '../types/index';

interface UseCodeExecutionReturn {
  execute: (code: string, language: SupportedLanguage) => Promise<void>;
  result: ExecutionResult | null;
  isExecuting: boolean;
  isRuntimeLoading: boolean;
  runtimeStatus: Record<SupportedLanguage, boolean>;
}

export function useCodeExecution(): UseCodeExecutionReturn {
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isRuntimeLoading, setIsRuntimeLoading] = useState(true);
  const [runtimeStatus, setRuntimeStatus] = useState<Record<SupportedLanguage, boolean>>({
    javascript: false,
    python: false,
  });

  // Initialize runtimes on mount
  useEffect(() => {
    let mounted = true;

    const initRuntimes = async () => {
      setIsRuntimeLoading(true);
      console.log('Starting runtime initialization...');

      // Initialize QuickJS first (it's faster)
      try {
        console.log('Initializing QuickJS...');
        await initializeQuickJS();
        if (mounted) {
          console.log('QuickJS initialized successfully');
          setRuntimeStatus((prev) => ({ ...prev, javascript: true }));
        }
      } catch (error) {
        console.error('Failed to initialize QuickJS:', error);
      }

      // Initialize Pyodide (takes longer)
      try {
        console.log('Initializing Pyodide...');
        await initializePyodide();
        if (mounted) {
          console.log('Pyodide initialized successfully');
          setRuntimeStatus((prev) => ({ ...prev, python: true }));
        }
      } catch (error) {
        console.error('Failed to initialize Pyodide:', error);
      }

      if (mounted) {
        setIsRuntimeLoading(false);
        console.log('Runtime initialization complete');
      }
    };

    initRuntimes();

    return () => {
      mounted = false;
    };
  }, []);

  const execute = useCallback(async (code: string, language: SupportedLanguage) => {
    if (!isRuntimeReady(language)) {
      setResult({
        output: '',
        error: `${language} runtime is not ready yet. Please wait...`,
      });
      return;
    }

    setIsExecuting(true);
    setResult(null);

    try {
      const executionResult = await executeCode(code, language);
      setResult(executionResult);
    } catch (error) {
      setResult({
        output: '',
        error: error instanceof Error ? error.message : 'Execution failed',
      });
    } finally {
      setIsExecuting(false);
    }
  }, []);

  return {
    execute,
    result,
    isExecuting,
    isRuntimeLoading,
    runtimeStatus,
  };
}
