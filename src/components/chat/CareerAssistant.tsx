import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, RotateCcw, ChevronDown, Compass, GraduationCap, BarChart3, Mic, MicOff, Send } from 'lucide-react';
import { toast } from 'sonner';
import { ChatMessage, ChatSession } from '../../types';
import { TRANSLATIONS, QUICK_ACTIONS, getLanguage } from '../../i18n';
import { getCareerAssistantResponse } from '../../services/gemini';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

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
  const [interim, setInterim] = useState('');
  const baseTextRef = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { listening, supported, start, stop } = useSpeechRecognition(
    (final) => {
      const combined = (baseTextRef.current + ' ' + final).trim();
      baseTextRef.current = combined;
      setInput(combined);
      setInterim('');
    },
    (i) => setInterim(i),
  );

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

    if (listening) stop();
    setInput('');
    baseTextRef.current = '';
    setInterim('');
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
      onSessionUpdate({
        ...session,
        messages: [...updatedMessages, { role: 'assistant', content: errorContent, timestamp: Date.now() }],
        lastUpdated: Date.now(),
      });
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

  const toggleMic = () => {
    if (!supported) {
      toast.error(
        getLanguage() === 'en'
          ? 'Speech recognition is not supported in this browser. Try Chrome or Edge.'
          : 'Njohja e zërit nuk mbështetet nga ky shfletues. Provoni Chrome ose Edge.',
      );
      return;
    }
    if (listening) stop();
    else { baseTextRef.current = input; start(); }
  };

  const displayValue = useMemo(
    () => (listening && interim ? `${baseTextRef.current} ${interim}`.trim() : input),
    [listening, interim, input],
  );

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={onToggle}
        aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
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
            className="fixed bottom-20 right-4 md:bottom-24 md:right-6 z-40 w-[calc(100vw-2rem)] md:w-[26rem] h-[75vh] md:h-[560px] brutalist-border bg-background flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border bg-foreground/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border-2 border-foreground rotate-45 flex items-center justify-center bg-foreground text-background font-bold">
                    <span className="text-xs -rotate-45">C</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">{TRANSLATIONS.chat.title}</p>
                    <p className="text-[10px] text-muted-foreground">{TRANSLATIONS.chat.subtitle}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={clearChat} className="p-1.5 border border-border hover:bg-foreground/10 transition-all" title={TRANSLATIONS.chat.newChat}>
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={onToggle} className="p-1.5 border border-border hover:bg-foreground/10 transition-all" aria-label="Minimize">
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
                  <div className={`max-w-[85%] p-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-primary/20 border border-primary/40 rounded-tr-sm'
                      : 'bg-card/60 border border-border rounded-tl-sm'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
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

            {/* Quick replies */}
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

            {/* Premium input card — mic + send nested in the corner */}
            <div className="p-3 border-t border-border">
              <div
                className="relative rounded-xl border transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary bg-background/60"
                style={{ borderColor: '#27272A' }}
              >
                <textarea
                  ref={inputRef}
                  value={displayValue}
                  onChange={e => { baseTextRef.current = e.target.value; setInput(e.target.value); }}
                  onKeyDown={handleKeyDown}
                  placeholder={listening
                    ? (getLanguage() === 'en' ? 'Listening... speak now.' : 'Duke dëgjuar... flisni tani.')
                    : TRANSLATIONS.chat.placeholder}
                  rows={2}
                  className="w-full bg-transparent px-3 py-3 pr-24 text-sm resize-none focus:outline-none placeholder:text-muted-foreground disabled:opacity-50"
                  disabled={isLoading}
                />
                <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleMic}
                    disabled={isLoading}
                    aria-label={listening ? 'Stop dictation' : 'Start dictation'}
                    title={supported
                      ? (listening ? 'Stop' : (getLanguage() === 'en' ? 'Voice input' : 'Diktim me zë'))
                      : (getLanguage() === 'en' ? 'Microphone not supported' : 'Mikrofoni nuk mbështetet')}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${
                      listening
                        ? 'bg-destructive/20 border-destructive text-destructive animate-pulse'
                        : supported
                        ? 'bg-accent/10 border-accent/40 text-accent hover:bg-accent/20'
                        : 'bg-muted/20 border-muted text-muted-foreground opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isLoading}
                    aria-label="Send"
                    className="w-9 h-9 rounded-lg flex items-center justify-center bg-foreground text-background hover:bg-foreground/85 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CareerAssistant;
