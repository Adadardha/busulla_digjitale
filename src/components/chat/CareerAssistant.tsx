import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, RotateCcw, ChevronDown, Compass, GraduationCap, BarChart3 } from 'lucide-react';
import { ChatMessage, ChatSession, QuickAction } from '../../types';
import { TRANSLATIONS, QUICK_ACTIONS } from '../../i18n';
import { getCareerAssistantResponse } from '../../services/gemini';

const QUICK_ACTION_ICONS: Record<string, React.ReactNode> = {
  career: <Compass className="w-4 h-4" />,
  university: <GraduationCap className="w-4 h-4" />,
  market: <BarChart3 className="w-4 h-4" />,
};

interface CareerAssistantProps {
  isOpen: boolean;
  onToggle: () => void;
  session: ChatSession;
  onSessionUpdate: (session: ChatSession) => void;
  careerContext?: string;
  weakAreas?: string[];
}

const CareerAssistant: React.FC<CareerAssistantProps> = ({
  isOpen, onToggle, session, onSessionUpdate, careerContext, weakAreas,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
    if (isOpen) setHasUnread(false);
  }, [isOpen]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    setInput('');
    setIsLoading(true);

    const userMessage: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
    const updatedMessages = [...session.messages, userMessage];
    onSessionUpdate({ ...session, messages: updatedMessages, lastUpdated: Date.now() });

    try {
      const response = await getCareerAssistantResponse(text, session.messages, {
        careerPath: careerContext,
        weakAreas,
      });

      const assistantMessage: ChatMessage = { role: 'assistant', content: response, timestamp: Date.now() };
      onSessionUpdate({ ...session, messages: [...updatedMessages, assistantMessage], lastUpdated: Date.now() });
      if (!isOpen) setHasUnread(true);
    } catch (error) {
      console.error('Chat error:', error);
      const errorStr = String(error).toLowerCase();
      let errorContent = TRANSLATIONS.chat.error;
      if (errorStr.includes('quota exceeded') || errorStr.includes('429')) {
        errorContent = TRANSLATIONS.chat.apiQuotaExceeded;
      }
      const errorMessage: ChatMessage = { role: 'assistant', content: errorContent, timestamp: Date.now() };
      onSessionUpdate({ ...session, messages: [...updatedMessages, errorMessage], lastUpdated: Date.now() });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    onSessionUpdate({ messages: [], context: { userPreferences: {} }, lastUpdated: Date.now() });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={onToggle}
        className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 md:w-16 md:h-16 brutalist-border bg-foreground text-background flex items-center justify-center font-bold text-xl ${
          hasUnread ? 'animate-pulse' : ''
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
        {hasUnread && !isOpen && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full" />
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-20 right-4 md:bottom-24 md:right-6 z-40 w-[calc(100vw-2rem)] md:w-96 h-[70vh] md:h-[500px] brutalist-border bg-background flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border bg-foreground/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border-2 border-foreground rotate-45 flex items-center justify-center bg-foreground text-background font-bold">
                    <span className="text-xs -rotate-45">B</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">{TRANSLATIONS.chat.title}</p>
                    <p className="text-[10px] text-muted-foreground">{TRANSLATIONS.chat.subtitle}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={clearChat} className="p-1.5 border border-border hover:bg-foreground/10 transition-all" title="Bisedë e re">
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={onToggle} className="p-1.5 border border-border hover:bg-foreground/10 transition-all">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
              {session.messages.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-4">{TRANSLATIONS.chat.welcome}</p>
                  <div className="space-y-2">
                    {QUICK_ACTIONS.map(action => (
                      <button
                        key={action.id}
                        onClick={() => sendMessage(action.prompt)}
                        className="w-full p-3 text-left text-xs border border-border hover:bg-foreground/10 transition-all flex items-center gap-2"
                      >
                        <span className="text-muted-foreground">{QUICK_ACTION_ICONS[action.icon] || <Compass className="w-4 h-4" />}</span>
                        <span className="font-medium">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {session.messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-3 ${
                    msg.role === 'user' ? 'bg-foreground text-background' : 'bg-foreground/10 border border-border'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-background/50' : 'text-muted-foreground'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-foreground/10 border border-border p-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies when chat has messages */}
            {session.messages.length > 0 && session.messages.length < 4 && (
              <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.id}
                    onClick={() => sendMessage(action.prompt)}
                    className="px-3 py-1 text-xs border border-border hover:bg-foreground/10 transition-all whitespace-nowrap flex items-center gap-1.5"
                  >
                    <span className="text-muted-foreground">{QUICK_ACTION_ICONS[action.icon] || <Compass className="w-3 h-3" />}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={TRANSLATIONS.chat.placeholder}
                  className="flex-1 bg-transparent border border-border p-3 text-sm focus:border-foreground outline-none"
                  disabled={isLoading}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  className="px-4 bg-foreground text-background font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-foreground/80 transition-all"
                >
                  {TRANSLATIONS.chat.send}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CareerAssistant;
