'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { logActivity } from '@/lib/activityLogger';

// ─── Quick prompts by role ────────────────────────────────────────────────────
const QUICK_PROMPTS_DEFAULT = [
  { label: '📦 Stock Status', text: 'Give me total stock count, value and all low stock alerts' },
  { label: '💰 Today Payments', text: 'Show today\'s payment and collection summary with details' },
  { label: '📁 Active Projects', text: 'List all in-progress projects with client and status' },
  { label: '⚠️ Outstanding Due', text: 'Which clients have outstanding payments due? Show amounts' },
  { label: '🏭 Manufacturing Status', text: 'Show manufacturing jobs completed today and pending QC items' },
  { label: '🏗️ Installation Updates', text: 'Show active site installations and their current status' },
];

const QUICK_PROMPTS_CEO = [
  { label: '📊 Full Dashboard', text: 'Give me complete business overview: revenue, expenses, profit, outstanding, active projects' },
  { label: '💹 Profit & Loss', text: 'Show profit and loss for each project with revenue vs expenses' },
  { label: '👥 Employee Hours', text: 'Show total active hours and work summary for each employee this week' },
  { label: '💰 Financial Summary', text: 'Show total invoiced, collected, outstanding, expenses and net profit' },
  { label: '✅ Supervisor Check', text: 'Which supervisors submitted attendance today and who has not?' },
  { label: '⚠️ Employee Errors', text: 'Show any errors or failed actions by employees this week' },
];

const PAGE_ROUTES = {
  'stock': '/purchase', 'purchase': '/purchase', 'material': '/purchase', 'inventory': '/purchase',
  'client': '/clients', 'lead': '/clients', 'crm': '/clients', 'sales': '/clients',
  'project': '/projects', 'contract': '/projects',
  'payment': '/payments', 'invoice': '/payments', 'finance': '/payments', 'accounts': '/payments',
  'employee': '/hr/employees', 'staff': '/hr/employees',
  'payroll': '/hr/payroll', 'salary': '/hr/payroll',
  'attendance': '/hr/attendance', 'leave': '/hr/leaves',
  'manufacturing': '/manufacturing', 'production': '/manufacturing', 'qc': '/manufacturing',
  'installation': '/installation', 'site': '/installation',
  'design': '/designing', '2d': '/designing', '3d': '/designing',
  'amc': '/amc', 'maintenance': '/amc',
  'supervisor': '/hr/supervisor-input',
  'analytics': '/analytics', 'report': '/analytics',
  'ceo': '/ceo', 'dashboard': '/',
  'legend-vision': '/legend-vision', 'vision': '/legend-vision',
  'top-up-nuera': '/top-up-nuera', 'topup': '/top-up-nuera', 'billing': '/top-up-nuera', 'recharge': '/top-up-nuera'
};

// ─── Markdown-like text renderer ─────────────────────────────────────────────
function RenderText({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.88)', lineHeight: '1.65' }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: '6px' }} />;

        // Heading lines (## or **heading**)
        if (line.startsWith('## ')) {
          return <div key={i} style={{ fontWeight: '800', fontSize: '13px', color: '#c4b5fd', marginTop: '8px', marginBottom: '3px', borderBottom: '1px solid rgba(167,139,250,0.2)', paddingBottom: '3px' }}>{line.replace('## ', '')}</div>;
        }
        if (line.startsWith('# ')) {
          return <div key={i} style={{ fontWeight: '900', fontSize: '14px', color: '#a78bfa', marginTop: '8px', marginBottom: '4px' }}>{line.replace('# ', '')}</div>;
        }

        // Bullet/list lines
        if (line.match(/^[-•*]\s/)) {
          const content = line.replace(/^[-•*]\s/, '');
          return (
            <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '3px', paddingLeft: '4px' }}>
              <span style={{ color: '#7c3aed', flexShrink: 0, marginTop: '2px' }}>▸</span>
              <span>{renderInline(content)}</span>
            </div>
          );
        }

        // Numbered list
        if (line.match(/^\d+\.\s/)) {
          const num = line.match(/^(\d+)\.\s/)[1];
          const content = line.replace(/^\d+\.\s/, '');
          return (
            <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '3px', paddingLeft: '4px' }}>
              <span style={{ color: '#0ea5e9', flexShrink: 0, fontWeight: '700', minWidth: '16px' }}>{num}.</span>
              <span>{renderInline(content)}</span>
            </div>
          );
        }

        // Horizontal rule
        if (line.match(/^---+/)) {
          return <div key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '8px 0' }} />;
        }

        // Normal line with inline formatting
        return <div key={i} style={{ marginBottom: '2px' }}>{renderInline(line)}</div>;
      })}
    </div>
  );
}

function renderInline(text) {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|₹[\d,]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#e2e8f0', fontWeight: '700' }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} style={{ background: 'rgba(124,58,237,0.2)', padding: '1px 5px', borderRadius: '4px', fontSize: '11px', color: '#c4b5fd', fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
    }
    if (part.match(/^₹[\d,]+/)) {
      return <span key={i} style={{ color: '#4ade80', fontWeight: '700' }}>{part}</span>;
    }
    return part;
  });
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px 18px 18px 18px', maxWidth: '120px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)',
          animation: `nuera-bounce 1.2s ${i * 0.18}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

// ─── Action Card ─────────────────────────────────────────────────────────────
function ActionCard({ action, onAction }) {
  if (!action) return null;
  const icons = { navigate: '🧭', download_excel: '📊', download_pdf: '📄', open_form: '📝', logout: '🚪' };
  const colors = { navigate: '#0ea5e9', download_excel: '#22c55e', download_pdf: '#f59e0b', open_form: '#a78bfa', logout: '#ef4444' };
  const color = colors[action.action] || '#a78bfa';
  const icon = icons[action.action] || '⚡';

  return (
    <button
      onClick={() => onAction(action)}
      style={{
        marginTop: '8px',
        padding: '8px 14px',
        background: `rgba(${action.action === 'navigate' ? '14,165,233' : action.action === 'download_excel' ? '34,197,94' : '124,58,237'},0.12)`,
        border: `1px solid ${color}40`,
        borderRadius: '10px',
        color,
        fontSize: '12px',
        fontWeight: '700',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s',
        width: '100%',
        justifyContent: 'center',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}22`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}12`; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {icon} {action.label || 'Execute'}
    </button>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, onAction }) {
  const isUser = msg.role === 'user';

  // Clean action JSON from displayed text
  const cleanText = (msg.content || '').replace(/\{[\s\S]*?"action"[\s\S]*?\}/g, '').trim();
  const action = msg.action || null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: '9px',
      alignItems: 'flex-start',
      marginBottom: '16px',
      animation: 'nuera-msg-in 0.3s ease forwards',
    }}>
      {/* Avatar */}
      <div style={{
        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
        background: isUser ? 'linear-gradient(135deg, #d4af37, #b89528)' : 'linear-gradient(135deg, #7c3aed, #0ea5e9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: '700', color: '#fff',
        boxShadow: isUser ? '0 0 8px rgba(212,175,55,0.4)' : '0 0 10px rgba(124,58,237,0.5)',
        marginTop: '2px',
      }}>
        {isUser ? '👤' : '✦'}
      </div>

      {/* Bubble */}
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {!isUser && (
          <div style={{ fontSize: '9px', fontWeight: '800', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '3px', marginLeft: '4px' }}>
            ✦ Nuera
          </div>
        )}
        <div style={{
          padding: '11px 14px',
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background: isUser
            ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.08))'
            : 'rgba(255,255,255,0.055)',
          border: isUser
            ? '1px solid rgba(212,175,55,0.25)'
            : '1px solid rgba(255,255,255,0.07)',
          wordBreak: 'break-word',
        }}>
          {isUser
            ? <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.6' }}>{msg.content}</span>
            : <RenderText text={cleanText} />
          }
        </div>

        {/* Action card */}
        {!isUser && action && <ActionCard action={action} onAction={onAction} />}

        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', paddingLeft: '4px', marginTop: '2px' }}>
          {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NueraAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [user, setUser] = useState({ username: 'User', role: 'viewer', allowedPages: [] });
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => { setVoiceSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition)); }, []);

  useEffect(() => {
    try {
      const getCookie = (name) => {
        const val = `; ${document.cookie}`;
        const parts = val.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
      };
      const session = getCookie('legendin_session');
      if (session) {
        const data = JSON.parse(atob(session));
        if (data?.username) setUser({ username: data.username, role: data.role || 'viewer', allowedPages: data.allowedPages || [] });
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (user?.username && user.username !== 'User' && pathname && pathname !== '/login') {
      logActivity({
        username: user.username, user_role: user.role,
        action_type: 'navigate',
        module: pathname.split('/')[1] || 'dashboard',
        description: `Visited ${pathname}`
      });
    }
  }, [pathname, user]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open && messages.length === 0) {
      const isCEO = user.role === 'ceo' || user.role === 'admin';
      setMessages([{
        role: 'assistant',
        content: `Hello **${user.username}**! I'm **Nuera**, your intelligent AI assistant for LegendIn.\n\nI have live access to your real business data. Ask me anything:\n\n- 📊 Financial summaries, P&L per project\n- 👥 Employee hours, attendance, payroll\n- 📦 Stock levels, low stock alerts\n- 🏗️ Installation & manufacturing status\n${isCEO ? '- 🔍 Any employee\'s activity, errors & work history\n- 🧾 Download Excel/PDF reports' : '- 📁 Your project & task details'}\n\nWhat would you like to know?`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [open, user]);

  // ── Handle Excel/PDF download ──────────────────────────────────────────────
  const handleDownload = useCallback(async (action) => {
    setDownloading(true);
    try {
      logActivity({
        username: user.username, user_role: user.role,
        action_type: 'download', module: action.module || 'report',
        description: `Downloaded ${action.label || action.module} via Nuera`
      });

      const res = await fetch('/api/nuera-ai/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: action.module, format: action.action === 'download_pdf' ? 'pdf' : 'excel', username: user.username, userRole: user.role })
      });

      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ext = action.action === 'download_pdf' ? 'pdf' : 'csv';
      a.href = url;
      a.download = `${action.module || 'report'}_${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ **${action.label || 'Report'}** downloaded successfully!\n\nFile saved to your Downloads folder.`,
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Download failed: ${err.message}. Please try again.`,
        timestamp: new Date().toISOString()
      }]);
    }
    setDownloading(false);
  }, [user]);

  // ── Handle actions from AI response ───────────────────────────────────────
  const handleAction = useCallback((actionObj) => {
    if (!actionObj?.action) return;

    if (actionObj.action === 'navigate' && actionObj.path) {
      router.push(actionObj.path);
      setOpen(false);
    } else if (actionObj.action === 'logout') {
      document.cookie = 'legendin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/login';
    } else if (actionObj.action === 'open_form') {
      window.dispatchEvent(new CustomEvent('nuera-open-form', { detail: actionObj }));
      setOpen(false);
    } else if (actionObj.action === 'download_excel' || actionObj.action === 'download_pdf') {
      handleDownload(actionObj);
    }
  }, [router, handleDownload]);

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || loading) return;

    const userMsg = { role: 'user', content: text.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setShowQuickPrompts(false);

    const lower = text.toLowerCase();

    // Direct logout
    if (lower.match(/log.?out|sign.?out/)) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Logging you out now. Goodbye! 👋', timestamp: new Date().toISOString() }]);
      setLoading(false);
      setTimeout(() => {
        document.cookie = 'legendin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/login';
      }, 900);
      return;
    }

    // Direct navigation shortcut
    if (lower.match(/^(go to|take me to|open|navigate to)\s/)) {
      for (const [keyword, path] of Object.entries(PAGE_ROUTES)) {
        if (lower.includes(keyword)) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Navigating to **${keyword.charAt(0).toUpperCase() + keyword.slice(1)}** page now... ✨`,
            action: { action: 'navigate', path, label: `Open ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Page` },
            timestamp: new Date().toISOString()
          }]);
          setLoading(false);
          setTimeout(() => { router.push(path); setOpen(false); }, 700);
          return;
        }
      }
    }

    try {
      const res = await fetch('/api/nuera-ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          allowedPages: user.allowedPages,
          username: user.username,
          userRole: user.role,
          conversationHistory: messages.slice(-8)
        })
      });

      const data = await res.json();

      if (data.error && !data.reply) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ ${data.error}`,
          timestamp: new Date().toISOString()
        }]);
      } else {
        const aiMsg = {
          role: 'assistant',
          content: data.reply || 'No response received.',
          action: data.action || null,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMsg]);

        // Auto-navigate if action is navigate
        if (data.action?.action === 'navigate' && data.action?.path) {
          setTimeout(() => { router.push(data.action.path); setOpen(false); }, 1500);
        }
        // Auto-download if action is download
        if (data.action?.action === 'download_excel' || data.action?.action === 'download_pdf') {
          setTimeout(() => handleDownload(data.action), 500);
        }
      }

      // Log the Nuera query
      logActivity({
        username: user.username, user_role: user.role,
        action_type: 'query', module: 'nuera_ai',
        description: `Nuera query: ${text.slice(0, 80)}`
      });

    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Network error. Please check your connection and try again.',
        timestamp: new Date().toISOString()
      }]);
    }

    setLoading(false);
  }, [loading, messages, router, user, handleDownload]);

  // ── Voice input ──────────────────────────────────────────────────────────
  const startVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; setListening(false); return; }
    const recognition = new SR();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognitionRef.current = recognition;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognition.onerror = () => { setListening(false); recognitionRef.current = null; };
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      setInput(transcript);
      if (e.results[e.results.length - 1].isFinal) {
        recognition.stop();
        setTimeout(() => sendMessage(transcript), 300);
      }
    };
    recognition.start();
  }, [sendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const clearChat = () => {
    setMessages([]);
    setShowQuickPrompts(true);
    setTimeout(() => setMessages([{
      role: 'assistant',
      content: `Chat cleared. Hello again, **${user.username}**! What would you like to know?`,
      timestamp: new Date().toISOString()
    }]), 50);
  };

  if (pathname === '/login' || pathname?.startsWith('/print')) return null;

  const isCEO = user.role === 'ceo' || user.role === 'admin';
  const quickPrompts = isCEO ? QUICK_PROMPTS_CEO : QUICK_PROMPTS_DEFAULT;

  return (
    <>
      {/* ── FLOATING BUTTON ── */}
      <button
        id="nuera-assistant-btn"
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'fixed', bottom: '28px', right: '28px',
          width: '58px', height: '58px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #0ea5e9 100%)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', color: '#fff',
          boxShadow: '0 4px 24px rgba(124,58,237,0.55)',
          animation: 'nuera-assistant-pulse 2.5s ease-in-out infinite',
          zIndex: 1500,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        title="Open Nuera AI Assistant"
      >
        {open ? '✕' : '✦'}
      </button>

      {/* ── CHAT PANEL ── */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 3000,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
          padding: '20px',
          pointerEvents: 'none',
        }}>
          {/* Backdrop */}
          <div onClick={() => setOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', pointerEvents: 'all' }} />

          {/* Window */}
          <div style={{
            position: 'relative',
            width: '440px', height: '640px', maxHeight: '92vh',
            background: 'linear-gradient(160deg, #0c0c1a 0%, #140d2e 45%, #081525 100%)',
            borderRadius: '20px',
            border: '1px solid rgba(124,58,237,0.35)',
            boxShadow: '0 0 80px rgba(109,40,217,0.3), 0 30px 70px rgba(0,0,0,0.7)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            animation: 'nuera-slide-up 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
            pointerEvents: 'all',
          }}>

            {/* ── Header ── */}
            <div style={{
              padding: '14px 16px',
              background: 'linear-gradient(90deg, rgba(124,58,237,0.18), rgba(14,165,233,0.08))',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px', height: '40px',
                  background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)',
                  borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', boxShadow: '0 0 16px rgba(124,58,237,0.5)',
                  position: 'relative',
                }}>
                  ✦
                  <div style={{
                    position: 'absolute', top: '-2px', right: '-2px',
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: downloading ? '#f59e0b' : '#4ade80',
                    border: '2px solid #0c0c1a',
                    boxShadow: `0 0 6px ${downloading ? '#f59e0b' : '#4ade80'}`,
                    animation: downloading ? 'nuera-pulse-amber 0.8s ease-in-out infinite' : 'none',
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '900', color: '#fff', lineHeight: 1 }}>Nuera Assistant</div>
                  <div style={{ fontSize: '10px', color: downloading ? '#fbbf24' : '#4ade80', marginTop: '2px', fontWeight: '600' }}>
                    {downloading ? '⏬ Downloading...' : `● Live Data · ${isCEO ? 'CEO Mode' : user.role}`}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={clearChat} title="Clear chat" style={headerBtnStyle}>🗑</button>
                <button onClick={() => setOpen(false)} style={headerBtnStyle} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}>✕</button>
              </div>
            </div>

            {/* ── Messages ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', scrollBehavior: 'smooth' }}>
              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} onAction={handleAction} />
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#fff', flexShrink: 0 }}>✦</div>
                  <TypingIndicator />
                </div>
              )}

              {/* Quick prompts */}
              {showQuickPrompts && messages.length <= 1 && !loading && (
                <div style={{ marginTop: '4px' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                    {isCEO ? '🔑 CEO Quick Access' : '⚡ Quick Questions'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {quickPrompts.map((p, i) => (
                      <button key={i} onClick={() => sendMessage(p.text)} style={quickPromptStyle}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.3)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.72)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.22)'; }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Input ── */}
            <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)', flexShrink: 0 }}>
              {listening && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', marginBottom: '8px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '20px', fontSize: '12px', color: '#f87171' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', animation: 'nuera-pulse-red 0.8s ease-in-out infinite' }} />
                  🎙️ Listening... speak now
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your business..."
                  rows={1}
                  style={{
                    flex: 1, padding: '10px 14px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', color: '#fff', fontSize: '13px',
                    outline: 'none', resize: 'none', fontFamily: 'inherit',
                    lineHeight: '1.5', maxHeight: '90px', overflowY: 'auto',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                {voiceSupported && (
                  <button onClick={startVoice} title={listening ? 'Stop' : 'Voice input'} style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    background: listening ? 'rgba(239,68,68,0.25)' : 'rgba(124,58,237,0.18)',
                    border: `1px solid ${listening ? 'rgba(239,68,68,0.4)' : 'rgba(124,58,237,0.35)'}`,
                    color: listening ? '#f87171' : '#a78bfa', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                    animation: listening ? 'nuera-pulse-red 0.8s ease-in-out infinite' : 'none',
                    transition: 'all 0.2s',
                  }}>🎙️</button>
                )}
                <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} style={{
                  width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                  background: input.trim() && !loading ? 'linear-gradient(135deg, #7c3aed, #0ea5e9)' : 'rgba(255,255,255,0.07)',
                  border: 'none',
                  color: input.trim() && !loading ? '#fff' : 'rgba(255,255,255,0.25)',
                  cursor: input.trim() && !loading ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                  boxShadow: input.trim() && !loading ? '0 4px 14px rgba(124,58,237,0.4)' : 'none',
                  transition: 'all 0.2s',
                }}>
                  {loading
                    ? <div style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.25)', borderTopColor: '#fff', borderRadius: '50%', animation: 'nuera-spin 0.7s linear infinite' }} />
                    : '➤'}
                </button>
              </div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.18)', textAlign: 'center', marginTop: '7px' }}>
                ✦ Nuera AI · LegendIn ERP · Live Data · RBAC-Secured · Gemini 2.5
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes nuera-assistant-pulse {
          0%, 100% { box-shadow: 0 4px 24px rgba(124,58,237,0.55), 0 0 0 0 rgba(124,58,237,0.35); }
          50% { box-shadow: 0 4px 24px rgba(124,58,237,0.55), 0 0 0 10px rgba(124,58,237,0); }
        }
        @keyframes nuera-slide-up {
          from { opacity: 0; transform: translateY(28px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes nuera-msg-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes nuera-bounce {
          0%, 80%, 100% { transform: scale(0.55); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes nuera-spin { to { transform: rotate(360deg); } }
        @keyframes nuera-pulse-red {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
          50% { opacity: 0.7; box-shadow: 0 0 0 4px rgba(239,68,68,0); }
        }
        @keyframes nuera-pulse-amber {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </>
  );
}

const headerBtnStyle = {
  background: 'rgba(255,255,255,0.06)', border: 'none',
  color: 'rgba(255,255,255,0.55)', width: '28px', height: '28px',
  borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.2s',
};

const quickPromptStyle = {
  padding: '6px 11px',
  background: 'rgba(124,58,237,0.1)',
  border: '1px solid rgba(124,58,237,0.22)',
  borderRadius: '20px', color: 'rgba(255,255,255,0.72)',
  fontSize: '11px', cursor: 'pointer',
  transition: 'all 0.18s', whiteSpace: 'nowrap',
};
