import { useEffect, useRef, useState } from 'react';
import { getLanguage } from '../i18n';

/**
 * Shared Web Speech API hook used by both the mock-interview panel and the
 * 24/7 AI assistant chat. Auto-selects language based on the active UI
 * dictionary (Albanian sq-AL / English en-US) and exposes a small imperative
 * API so callers can wire it to their own compose UIs.
 */
export function useSpeechRecognition(
  onFinal: (transcript: string) => void,
  onInterim: (transcript: string) => void,
) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);

  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);
  useEffect(() => { onInterimRef.current = onInterim; }, [onInterim]);

  useEffect(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = getLanguage() === 'en' ? 'en-US' : 'sq-AL';
    rec.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t; else interim += t;
      }
      if (interim) onInterimRef.current(interim);
      if (final) onFinalRef.current(final);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch {} };
  }, []);

  const start = (langOverride?: string) => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.lang = langOverride || (getLanguage() === 'en' ? 'en-US' : 'sq-AL');
      rec.start();
      setListening(true);
    } catch { setListening(false); }
  };
  const stop = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try { rec.stop(); } catch {}
    setListening(false);
  };

  return { listening, supported, start, stop };
}
