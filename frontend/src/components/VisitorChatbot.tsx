import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ArrowRight, MessageCircle, RotateCcw, Send, ShieldCheck, X } from 'lucide-react';
import { sendVisitorChat } from '../api';

type VisitorChatbotProps = {
  onNavigate: (path: string) => void;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  links?: Array<{ title: string; url: string; type: string }>;
};

const SUGGESTED_QUESTIONS = [
  'Which Digi Pass pathways are available?',
  'Can I hire graduates from Kenya or Uganda?',
  'How do partners or donors collaborate with Konexio Africa?',
  'Where can I view annual impact reports?',
];

const INITIAL_WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hello! Ask me about Digi Pass programmes, training hubs, consented public alumni profiles, impact reports, or how to partner with Konexio Africa.',
  links: [
    { title: 'Explore Programmes', url: '/programmes', type: 'page' },
    { title: 'Browse Alumni Talent', url: '/alumni', type: 'page' },
  ],
};

const VisitorChatbot = ({ onNavigate }: VisitorChatbotProps) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME]);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, loading]);

  const submitQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setAiNotice(null);

    try {
      const historyPayload = nextMessages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await sendVisitorChat(trimmed, historyPayload);
      if (!res.ai_available && res.unavailable_reason) {
        setAiNotice(res.unavailable_reason);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: res.reply,
          links: res.suggested_links,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content:
            err instanceof Error
              ? err.message
              : 'Sorry, the assistant could not respond right now. You can browse Programmes or Contact our team directly.',
          links: [{ title: 'Contact Team', url: '/contact', type: 'page' }],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submitQuestion(input);
  };

  return (
    <div className="chatbot-root">
      {open ? (
        <section
          className="chatbot-panel"
          role="dialog"
          aria-label="Konexio Africa Visitor Assistant"
        >
          <header className="chatbot-header">
            <div>
              <strong style={{ fontSize: '0.96rem', display: 'block' }}>
                Konexio Africa Assistant
              </strong>
              <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                Public Digi Pass &amp; Talent Guide
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="chatbot-icon-btn"
                title="Reset conversation"
                aria-label="Reset conversation"
                onClick={() => {
                  setMessages([INITIAL_WELCOME]);
                  setAiNotice(null);
                }}
              >
                <RotateCcw size={15} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="chatbot-icon-btn"
                title="Close assistant"
                aria-label="Close assistant"
                onClick={() => setOpen(false)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="chatbot-privacy-bar">
            <ShieldCheck size={14} aria-hidden="true" />
            <span>Grounded only in public Konexio Africa pages &amp; consented alumni.</span>
          </div>

          {aiNotice ? (
            <div className="alert-box alert-info" style={{ margin: '8px 12px 0', fontSize: '0.78rem', padding: '8px 10px' }}>
              {aiNotice}
            </div>
          ) : null}

          <div className="chatbot-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chatbot-bubble ${msg.role === 'user' ? 'chatbot-bubble-user' : 'chatbot-bubble-bot'}`}
              >
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                {msg.links && msg.links.length > 0 ? (
                  <div className="chatbot-link-list">
                    {msg.links.map((link) => (
                      <button
                        key={`${msg.id}-${link.url}-${link.title}`}
                        type="button"
                        className="chatbot-link-btn"
                        onClick={() => {
                          setOpen(false);
                          onNavigate(link.url);
                        }}
                      >
                        <span>{link.title}</span>
                        <ArrowRight size={13} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {messages.length === 1 ? (
              <div className="chatbot-suggestions">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="ai-prompt-chip"
                    onClick={() => void submitQuestion(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            ) : null}

            {loading ? (
              <div className="chatbot-bubble chatbot-bubble-bot" aria-live="polite">
                <span className="chatbot-typing">Thinking...</span>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="chatbot-input-row">
            <input
              type="text"
              className="input-control"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about programmes, hubs, or alumni..."
              maxLength={600}
              aria-label="Ask the visitor assistant"
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <Send size={15} aria-hidden="true" />
            </button>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className="chatbot-launcher"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={open ? 'Close Konexio assistant' : 'Open Konexio assistant'}
      >
        <MessageCircle size={19} aria-hidden="true" />
        <span>Ask Assistant</span>
      </button>
    </div>
  );
};

export default VisitorChatbot;
