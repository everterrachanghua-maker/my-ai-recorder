"use client";
import { useState, useEffect } from 'react';

export default function RecorderPage() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  // 設置瀏覽器語音辨識
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'zh-TW';
      rec.continuous = false;
      rec.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        sendToGemini(text);
      };
      rec.onend = () => setIsListening(false);
      setRecognition(rec);
    }
  }, []);

  const toggleListen = () => {
    if (isListening) {
      recognition.stop();
    } else {
      setTranscript('正在聆聽...');
      setAnalysis('');
      recognition.start();
      setIsListening(true);
    }
  };

  const sendToGemini = async (text) => {
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
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: 'auto' }}>
      <h1>🎤 答辯即時助手 (Gemini 版)</h1>
      <button 
        onClick={toggleListen}
        style={{ 
          padding: '20px', fontSize: '20px', width: '100%', borderRadius: '15px',
          background: isListening ? '#ff4d4d' : '#0070f3', color: 'white', border: 'none'
        }}
      >
        {isListening ? '🛑 停止聆聽' : '🎙️ 開始錄製評審提問'}
      </button>

      <div style={{ marginTop: '30px' }}>
        <h3 style={{ color: '#666' }}>評審提問內容：</h3>
        <div style={{ padding: '15px', background: '#f5f5f5', borderRadius: '10px' }}>
          {transcript || "尚未開始錄音..."}
        </div>

        <h3 style={{ color: '#666', marginTop: '20px' }}>💡 幕僚建議回答：</h3>
        <div style={{ padding: '15px', background: '#eef6ff', borderRadius: '10px', minHeight: '100px' }}>
          {loading ? "AI 思考中..." : analysis || "等待提問中..."}
        </div>
      </div>
    </div>
  );
}
