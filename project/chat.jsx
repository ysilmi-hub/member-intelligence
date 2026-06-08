/* global React, window */
// ---------------------------------------------------------------------------
// Left panel — AI copilot chat (navy chrome)
// ---------------------------------------------------------------------------
const { useRef, useEffect } = React;

// Tiny inline-markdown renderer: **bold** and paragraphs only.
function RichText({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} className="md-b">{p.slice(2, -2)}</strong>
          : <React.Fragment key={i}>{p}</React.Fragment>
      )}
    </span>
  );
}

function AssistantMessage({ msg }) {
  return (
    <div className="msg msg-ai">
      <div className="ai-avatar" aria-hidden="true">
        <span className="ai-avatar-mark">✦</span>
      </div>
      <div className="ai-body">
        {msg.lead && <p className="ai-lead"><RichText text={msg.lead} /></p>}
        {msg.findings && msg.findings.length > 0 && (
          <div className="ai-block">
            <div className="ai-block-label">Key findings</div>
            <ul className="ai-findings">
              {msg.findings.map((f, i) => <li key={i}><RichText text={f} /></li>)}
            </ul>
          </div>
        )}
        {msg.recommendation && (
          <div className="ai-rec">
            <div className="ai-rec-title">{msg.recommendation.title}</div>
            <div className="ai-rec-body"><RichText text={msg.recommendation.body} /></div>
          </div>
        )}
        {msg.chips && msg.chips.length > 0 && (
          <div className="ai-chips">
            {msg.chips.map((c, i) => (
              <button key={i} className="chip chip-followup" onClick={() => window.__miAsk && window.__miAsk(c)}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserMessage({ text }) {
  return (
    <div className="msg msg-user">
      <div className="user-bubble">{text}</div>
    </div>
  );
}

function Typing() {
  return (
    <div className="msg msg-ai">
      <div className="ai-avatar" aria-hidden="true"><span className="ai-avatar-mark">✦</span></div>
      <div className="ai-body">
        <div className="typing"><span></span><span></span><span></span></div>
      </div>
    </div>
  );
}

function ChatPanel({ messages, busy, onAsk, draft, setDraft }) {
  const scroller = useRef(null);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages, busy]);

  const submit = (e) => {
    e && e.preventDefault();
    const v = draft.trim();
    if (!v || busy) return;
    onAsk(v);
    setDraft('');
  };

  const showSuggested = messages.length <= 1;

  return (
    <aside className="chat">
      <header className="chat-head">
        <div className="brand">
          <img className="brand-logo" src="logos/navy-federal-white.png" alt="Navy Federal Credit Union" />
          <span className="brand-divider" aria-hidden="true"></span>
          <div className="brand-text">
            <div className="brand-name">Member Intelligence</div>
            <div className="brand-sub">Member Compass</div>
          </div>
        </div>
      </header>

      <div className="chat-scroll" ref={scroller}>
        <div className="chat-messages">
          {messages.map((m, i) =>
            m.role === 'user'
              ? <UserMessage key={i} text={m.text} />
              : <AssistantMessage key={i} msg={m} />
          )}
          {busy && <Typing />}
        </div>

        {showSuggested && (
          <div className="suggested">
            <div className="suggested-label">Try asking</div>
            <div className="suggested-list">
              {window.SUGGESTED.map((s, i) => (
                <button key={i} className="chip chip-suggest" onClick={() => onAsk(s)} disabled={busy}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <form className="composer" onSubmit={submit}>
        <input
          className="composer-input"
          placeholder="Ask me anything"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
        />
        <button type="submit" className="composer-send" disabled={busy || !draft.trim()}>
          Ask <span className="send-arrow" aria-hidden="true">↗</span>
        </button>
      </form>
    </aside>
  );
}

window.ChatPanel = ChatPanel;
