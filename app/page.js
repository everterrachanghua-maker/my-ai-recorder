"use client";
import { useState, useEffect } from 'react';

export default function RecorderPage() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
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
  }, []);

  const toggleListen = () => {
    if (isListening) { recognition.stop(); } 
    else { setTranscript('正在聆聽...'); setAnalysis(''); recognition.start(); setIsListening(true); }
  };

  const sendToAI = async (text) => {
    setLoading(true);
    const res = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    setAnalysis(data.analysis);
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h1>🎤 答辯助手</h1>
      <button onClick={toggleListen} style={{ padding: '20px', width: '100%', background: isListening ? 'red' : 'blue', color: 'white' }}>
        {isListening ? '🛑 停止' : '🎙️ 開始'}
      </button>
      <h3>提問：{transcript}</h3>
      <h3>建議：</h3>
      <div style={{ whiteSpace: 'pre-wrap' }}>{loading ? "分析中..." : analysis}</div>
    </div>
  );
}
