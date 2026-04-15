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

  // 處理即時錄音
  const toggleListen = () => {
    if (isListening) { recognition.stop(); } 
    else { setTranscript('正在聽...'); setAnalysis(''); recognition.start(); setIsListening(true); }
  };

  // 處理檔案上傳
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLoading(true);
    setTranscript(`正在處理檔案：${file.name}... (請注意：檔案上傳分析需較長時間)`);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        body: formData, // 改用 FormData 傳送檔案
      });
      const data = await res.json();
      setTranscript(data.text || "音訊轉換完成");
      setAnalysis(data.analysis);
    } catch (err) {
      setAnalysis("檔案處理失敗，可能是檔案太大。");
    }
    setLoading(false);
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
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>🎤 答辯即時助手</h1>
      
      {/* 錄音區塊 */}
      <div style={{ border: '2px solid #0070f3', padding: '20px', borderRadius: '15px', marginBottom: '20px' }}>
        <h3>方法 A：即時錄音 (適合現場)</h3>
        <button onClick={toggleListen} style={{ padding: '15px', width: '100%', background: isListening ? '#ff4d4d' : '#0070f3', color: 'white', border: 'none', borderRadius: '10px', fontSize: '18px', cursor: 'pointer' }}>
          {isListening ? '🛑 停止聆聽' : '🎙️ 開始錄音'}
        </button>
      </div>

      {/* 上傳區塊 */}
      <div style={{ border: '2px solid #28a745', padding: '20px', borderRadius: '15px', marginBottom: '20px' }}>
        <h3>方法 B：上傳錄音檔 (MP3/WAV/M4A)</h3>
        <input type="file" accept="audio/*" onChange={handleFileUpload} style={{ width: '100%' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '10px' }}>
          <h4>提問逐字稿：</h4>
          <p>{transcript || "等待輸入..."}</p>
        </div>
        <div style={{ background: '#eef6ff', padding: '15px', borderRadius: '10px' }}>
          <h4>💡 AI 幕僚分析建議：</h4>
          <div style={{ whiteSpace: 'pre-wrap' }}>{loading ? "AI 分析中..." : analysis || "等待分析..."}</div>
        </div>
      </div>
    </div>
  );
}
