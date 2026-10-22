'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [task, setTask] = useState('');
  const [traces, setTraces] = useState([]);
  const [context, setContext] = useState('');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('angvey-context');
    if (saved) setContext(saved);
  }, []);

  const saveContext = (newCtx) => {
    setContext(newCtx);
    localStorage.setItem('angvey-context', newCtx);
  };

  const runAgent = () => {
    if (!task.trim()) return;
    const newLog = { id: Date.now(), task, steps: [], status: 'running' };
    setLogs((prev) => [newLog, ...prev]);

    // Simulate reliable agent steps with tracing
    const steps = [
      { step: 'Parse task', detail: `Understood: ${task}` },
      { step: 'Load context', detail: context ? `Loaded prior context (${context.length} chars)` : 'No prior context' },
      { step: 'Plan', detail: 'Break into sub-tasks, check for silent failure points' },
      { step: 'Execute (simulated)', detail: 'Would call tools / LLM with checkpoints' },
      { step: 'Persist & Trace', detail: 'Saved full trace + updated context' },
    ];

    setTraces(steps);
    const updatedContext = context + `\n[${new Date().toISOString()}] Task: ${task} | Status: traced & completed`;
    saveContext(updatedContext);

    setLogs((prev) =>
      prev.map((l) =>
        l.id === newLog.id ? { ...l, steps, status: 'completed' } : l
      )
    );
    setTask('');
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>AngveyCore</h1>
      <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
        Reliable Agent Trace & Context Hub — attacking silent failures and context loss.
      </p>

      <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: 12, marginBottom: '2rem' }}>
        <h2>Run a Traced Task</h2>
        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="Describe a task for the agent (e.g., Summarize latest agent frameworks and flag reliability risks)..."
          style={{ width: '100%', minHeight: 80, padding: 12, borderRadius: 8, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', marginBottom: 12 }}
        />
        <button
          onClick={runAgent}
          style={{ background: '#3b82f6', color: 'white', padding: '10px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
        >
          Execute with Trace
        </button>
      </div>

      {traces.length > 0 && (
        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: 12, marginBottom: '2rem' }}>
          <h2>Latest Trace</h2>
          <ol style={{ paddingLeft: 20 }}>
            {traces.map((t, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                <strong>{t.step}</strong>: {t.detail}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: 12 }}>
        <h2>Persistent Context Memory</h2>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#0f172a', padding: 12, borderRadius: 8, fontSize: 14 }}>
          {context || 'No context yet. Run a task to start building memory.'}
        </pre>
        <button
          onClick={() => saveContext('')}
          style={{ marginTop: 12, background: '#ef4444', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Clear Context
        </button>
      </div>

      <footer style={{ marginTop: '3rem', color: '#64748b', fontSize: 14 }}>
        Inspired by trending OSS: LangGraph (durable graphs), CrewAI, OpenClaw, Mastra. 
        Built to solve real pain: agents that fail silently and forget everything.
      </footer>
    </div>
  );
}
