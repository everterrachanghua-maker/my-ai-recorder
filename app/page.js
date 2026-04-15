"use client";
import { useState, useEffect } from 'react';

export default function RecorderPage() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.lang = 'zh-TW';
        rec.onresult = (event) => {
          const text = event.results[0][0].transcript;
          setTranscript(text);
          sendToAI(text);
        };
        rec.onend = () => setIsListening(false);
        setRecognition(rec);
      }
    }
  }, []);

  const sendToAI = async (text) => {
    setLoading(true);
    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      setAnalysis(data.analysis || "AI 回傳錯誤");
    } catch (err) {
      setAnalysis("連線失敗");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', textAlign: 'center' }}>
      <h1>🎤 答辯助手</h1>
      <button 
        onClick={() => {
          if (isListening) { recognition.stop(); } 
          else { setTranscript('正在聽...'); setAnalysis(''); recognition.start(); setIsListening(true); }
        }}
        style={{ padding: '20px', width: '100%', borderRadius: '10px', background: isListening ? 'red' : 'blue', color: 'white' }}
      >
        {isListening ? '🛑 停止聆聽' : '🎙️ 開始錄音'}
      </button>
      <div style={{ textAlign: 'left', marginTop: '20px' }}>
        <h3>提問內容：</h3>
        <p style={{ background: '#f0f0f0', padding: '10px' }}>{transcript}</p>
        <h3>幕僚建議：</h3>
        <div style={{ whiteSpace: 'pre-wrap', background: '#eef', padding: '10px' }}>
          {loading ? "思考中..." : analysis}
        </div>
      </div>
    </div>
  );
}
