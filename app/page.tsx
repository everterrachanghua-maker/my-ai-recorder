"use client";
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

export default function RecorderPage() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // 解決 TypeScript 在瀏覽器 API 的報錯
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'zh-TW';
      rec.continuous = false; // 聽完一段自動結束
      rec.interimResults = false;

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        sendToAI(text);
      };

      rec.onend = () => setIsListening(false);
      rec.onerror = () => setIsListening(false);
      setRecognition(rec);
    }
  }, []);

  const toggleListen = () => {
    if (isListening) {
      recognition?.stop();
    } else {
      setTranscript('正在聆聽評審提問...');
      setAnalysis('');
      recognition?.start();
      setIsListening(true);
    }
  };

  const sendToAI = async (text: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      setAnalysis(data.analysis || "AI 無法生成建議，請確認 API Key。");
    } catch (err) {
      setAnalysis("連線錯誤，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: 'auto', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#111827', fontSize: '28px' }}>🎤 答辯即時幕僚助手</h1>
        <p style={{ color: '#6b7280' }}>即時分類問題並從報告中搜尋最佳解答</p>
      </header>

      <main>
        <button 
          onClick={toggleListen}
          style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            padding: '25px', fontSize: '22px', width: '100%', borderRadius: '16px',
            background: isListening ? '#ef4444' : '#2563eb', color: 'white', 
            border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            transition: 'all 0.2s'
          }}
        >
          {isListening ? <MicOff size={28} /> : <Mic size={28} />}
          {isListening ? '點擊結束聆聽' : '開始錄製評審提問'}
        </button>

        <div style={{ marginTop: '30px', display: 'grid', gap: '20px' }}>
          <section style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0, color: '#374151', fontSize: '18px' }}>🎙️ 評審提問 (逐字稿)</h3>
            <p style={{ color: '#111827', lineHeight: '1.6', fontSize: '18px' }}>
              {transcript || "等待輸入中..."}
            </p>
          </section>

          <section style={{ background: '#eff6ff', padding: '20px', borderRadius: '12px', border: '1px solid #bfdbfe', minHeight: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#1e40af', fontSize: '18px' }}>💡 幕僚建議回答</h3>
              {loading && <Loader2 className="animate-spin" size={20} />}
            </div>
            <div style={{ color: '#1e3a8a', whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '17px' }}>
              {loading ? "正在根據報告內容分析最佳解答..." : analysis || "尚未收到提問分析。"}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
