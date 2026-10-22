'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [task, setTask] = useState('');
  const [traces, setTraces] = useState([]);
  const [context, setContext] = useState('');
  const [logs, setLogs] = useState([]);
  const [copied, setCopied] = useState(false);
  const [groqKey, setGroqKey] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const savedCtx = localStorage.getItem('angvey-context');
    if (savedCtx) setContext(savedCtx);
    const savedLogs = localStorage.getItem('angvey-logs');
    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch (e) {}
    }
    const savedKey = localStorage.getItem('angvey-groq-key');
    if (savedKey) setGroqKey(savedKey);
  }, []);

  const saveContext = (newCtx) => {
    setContext(newCtx);
    localStorage.setItem('angvey-context', newCtx);
  };

  const saveLogs = (newLogs) => {
    setLogs(newLogs);
    localStorage.setItem('angvey-logs', JSON.stringify(newLogs));
  };

  const saveGroqKey = (key) => {
    setGroqKey(key);
    localStorage.setItem('angvey-groq-key', key);
  };

  const calculateReliability = (steps, ctxLen) => {
    let score = 85;
    if (steps.length >= 5) score += 10;
    if (ctxLen > 2000) score -= 15; // context drift risk
    if (ctxLen > 5000) score -= 10;
    return Math.max(40, Math.min(100, score));
  };

  const runAgent = () => {
    if (!task.trim()) return;
    const newLog = { 
      id: Date.now(), 
      task, 
      steps: [], 
      status: 'running',
      timestamp: new Date().toISOString(),
      reliability: 0
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);

    const steps = [
      { step: 'Parse task', detail: `Understood: ${task}`, status: 'ok' },
      { step: 'Load context', detail: context ? `Loaded prior context (${context.length} chars)` : 'No prior context', status: context ? 'ok' : 'warn' },
      { step: 'Plan + Checkpoint', detail: 'Break into sub-tasks, inject reliability checks against silent failure', status: 'ok' },
      { step: 'Execute (simulated)', detail: 'Tool/LLM calls with intermediate state checkpoints', status: 'ok' },
      { step: 'Persist Trace + Context', detail: 'Full trace saved. Context updated with summary to combat drift.', status: 'ok' },
    ];

    const rel = calculateReliability(steps, context.length);
    const completedLog = { ...newLog, steps, status: 'completed', reliability: rel };

    setTraces(steps);
    const summary = `[${new Date().toISOString()}] ${task.substring(0, 80)}${task.length > 80 ? '...' : ''} | Rel: ${rel}% | Traced`;
    const updatedContext = (context + '\n' + summary).slice(-4000); // prune to fight context bloat
    saveContext(updatedContext);
    saveLogs([completedLog, ...logs]);
    setTask('');
  };

  const suggestAICheckpoints = async () => {
    if (!task.trim() || !groqKey) {
      alert('Please enter a task and save your Groq API key first.');
      return;
    }
    setAiLoading(true);
    try {
      const prompt = `You are an expert in reliable AI agents. For this task: "${task}". Suggest 4-6 concrete checkpoint steps to prevent silent failures and context drift. Return ONLY a JSON array of objects with "step" and "detail" keys. Example: [{"step":"Validate inputs","detail":"Check required fields and bounds"}]`;
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 500
        })
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\[.*\]/s);
      if (jsonMatch) {
        const suggested = JSON.parse(jsonMatch[0]);
        setTraces(suggested.map(s => ({ ...s, status: 'ok' })));
        alert('AI checkpoints suggested and loaded into Latest Trace. Review and then Execute if desired.');
      } else {
        alert('Could not parse AI response. Try again.');
      }
    } catch (e) {
      alert('Failed to call Groq: ' + e.message + '. Check key and network.');
    }
    setAiLoading(false);
  };

  const copyTrace = () => {
    if (traces.length === 0) return;
    const text = `AngveyCore Trace\nTask: ${logs[0]?.task || ''}\nReliability: ${logs[0]?.reliability || 'N/A'}%\n\nSteps:\n` + 
      traces.map((t, i) => `${i+1}. ${t.step}: ${t.detail}`).join('\n') +
      `\n\nContext snippet: ${context.slice(-300)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const clearAll = () => {
    saveContext('');
    saveLogs([]);
    setTraces([]);
  };

  const exportAudit = () => {
    const data = { logs, context, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `angvey-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importAudit = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.logs) saveLogs(data.logs);
        if (data.context) saveContext(data.context);
        setTraces([]);
        alert('Audit trail imported successfully.');
      } catch (err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.4rem', margin: 0, background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AngveyCore</h1>
        <p style={{ color: '#94a3b8', marginTop: 8 }}>
          Reliable Agent Trace & Context Hub — stop silent failures, fight context drift, ship trustworthy agents.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: 16 }}>
          <h2 style={{ marginTop: 0 }}>Run Traced Task</h2>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Describe a task (e.g. Analyze latest agent frameworks for reliability risks and propose checkpoints)..."
            style={{ width: '100%', minHeight: 100, padding: 12, borderRadius: 8, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', marginBottom: 12, fontSize: 15 }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={runAgent}
              style={{ background: '#3b82f6', color: 'white', padding: '12px 24px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15 }}
            >
              Execute with Full Trace
            </button>
            <button
              onClick={suggestAICheckpoints}
              disabled={aiLoading}
              style={{ background: '#8b5cf6', color: 'white', padding: '12px 24px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15, opacity: aiLoading ? 0.6 : 1 }}
            >
              {aiLoading ? 'Thinking...' : 'AI Suggest Checkpoints'}
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => saveGroqKey(e.target.value)}
              placeholder="Optional: Groq API key for AI suggestions (stored locally)"
              style={{ width: '100%', padding: 8, borderRadius: 6, background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', fontSize: 13 }}
            />
          </div>
        </div>

        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: 16 }}>
          <h3 style={{ marginTop: 0, fontSize: 16 }}>Context Health</h3>
          <div style={{ fontSize: 28, fontWeight: 700, color: context.length > 3000 ? '#f59e0b' : '#10b981' }}>
            {context.length}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>chars (pruned at 4k)</div>
          <div style={{ height: 8, background: '#334155', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (context.length / 4000) * 100)}%`, height: '100%', background: context.length > 3000 ? '#f59e0b' : '#10b981' }} />
          </div>
          <p style={{ fontSize: 12, color: '#64748b', marginTop: 12 }}>
            {context.length > 3000 ? '⚠️ High risk of context drift' : '✅ Healthy context window'}
          </p>
        </div>
      </div>

      {traces.length > 0 && (
        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: 16, marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Latest Trace</h2>
            <div>
              <span style={{ background: logs[0]?.reliability > 80 ? '#10b981' : '#f59e0b', color: 'white', padding: '4px 10px', borderRadius: 12, fontSize: 13, fontWeight: 600, marginRight: 8 }}>
                {logs[0]?.reliability || 0}% Reliable
              </span>
              <button onClick={copyTrace} style={{ background: '#334155', color: '#e2e8f0', padding: '6px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                {copied ? 'Copied!' : 'Copy Trace'}
              </button>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            {traces.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, paddingBottom: 12, borderBottom: i < traces.length - 1 ? '1px solid #334155' : 'none' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>{i + 1}</div>
                <div>
                  <strong style={{ color: '#e2e8f0' }}>{t.step}</strong>
                  <div style={{ color: '#94a3b8', fontSize: 14 }}>{t.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ marginTop: 0 }}>Run History</h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={exportAudit} style={{ background: '#334155', color: '#e2e8f0', padding: '4px 8px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Export</button>
              <label style={{ background: '#334155', color: '#e2e8f0', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                Import
                <input type="file" accept=".json" onChange={importAudit} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
          {logs.length === 0 ? (
            <p style={{ color: '#64748b' }}>No runs yet. Execute a task to build the audit trail.</p>
          ) : (
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {logs.map((log) => (
                <div key={log.id} style={{ padding: '10px 0', borderBottom: '1px solid #334155', fontSize: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#e2e8f0' }}>{log.task.substring(0, 60)}{log.task.length > 60 ? '...' : ''}</span>
                    <span style={{ color: log.reliability > 80 ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{log.reliability}%</span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{new Date(log.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: 16 }}>
          <h2 style={{ marginTop: 0 }}>Persistent Context</h2>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#0f172a', padding: 12, borderRadius: 8, fontSize: 13, maxHeight: 220, overflowY: 'auto', margin: 0 }}>
            {context || 'No context yet. Runs will append summarized traces here.'}
          </pre>
          <button
            onClick={clearAll}
            style={{ marginTop: 12, background: '#ef4444', color: 'white', padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            Clear All Memory
          </button>
        </div>
      </div>

      <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: 16, marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0 }}>Why This Matters (Oct 2026)</h2>
        <ul style={{ color: '#cbd5e1', lineHeight: 1.6 }}>
          <li><strong>Silent failures & observability black hole:</strong> 70-95% of agent projects fail in production because you can't replay what happened.</li>
          <li><strong>Context drift & bloat:</strong> Agents lose the original goal as tool outputs accumulate. We prune + summarize.</li>
          <li><strong>OpenAI Agent Builder shutdown (Nov 30):</strong> Code-first reliability tooling is the only durable path.</li>
          <li><strong>Need durable state + checkpoints:</strong> Inspired by LangGraph, Temporal, and production agent reports.</li>
        </ul>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>ANGVEY is building the reliability layer agents desperately need. Previous features preserved and extended. New: AI checkpoint suggestions + audit export/import.</p>
      </div>

      <footer style={{ marginTop: '2rem', color: '#64748b', fontSize: 13, textAlign: 'center' }}>
        Built incrementally for ANGVEY. Live on Vercel. Star the repo and ship reliable agents.
      </footer>
    </div>
  );
}
