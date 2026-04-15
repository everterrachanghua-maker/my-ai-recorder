"use client";
import { useState, useEffect } from 'react';

export default function RecorderPage() {
  const [reportContent, setReportContent] = useState(''); // 儲存報告書內容
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

  // 1. 即時錄音發送
  const toggleListen = () => {
    if (!reportContent) { alert("請先在下方貼入『服務建議書』內容！"); return; }
    if (isListening) { recognition.stop(); } 
    else { setTranscript('正在聽...'); setAnalysis(''); recognition.start(); setIsListening(true); }
  };

  // 2. 錄音檔上傳分析
  const handleAudioUpload = async (e) => {
    if (!reportContent) { alert("請先貼入『服務建議書』內容！"); return; }
    const file = e.target.files[0];
    if (!file) return;
    
    setLoading(true);
    setTranscript(`正在處理音訊檔案...`);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('report', reportContent); // 把報告書也傳過去

    try {
      const res = await fetch('/api/process', { method: 'POST', body: formData });
      const data = await res.json();
      setAnalysis(data.analysis);
      setTranscript("（音訊檔案分析完成）");
    } catch (err) {
      setAnalysis("音訊處理失敗，請確認檔案格式。");
    }
    setLoading(false);
  };

  // 3. 傳送文字給 AI
  const sendToAI = async (text) => {
    setLoading(true);
    const res = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, report: reportContent }) // 傳送提問與報告
    });
    const data = await res.json();
    setAnalysis(data.analysis);
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: 'auto', fontFamily: 'sans-serif', backgroundColor: '#fff', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>🎤 AI 答辯幕僚系統</h1>
      
      {/* 步驟一：報告書準備 */}
      <div style={{ background: '#fff9db', padding: '20px', borderRadius: '15px', marginBottom: '20px', border: '2px dashed #fcc419' }}>
        <h3 style={{ marginTop: 0 }}>📍 第一步：貼入「服務建議書」內容</h3>
        <textarea 
          placeholder="請將你的服務建議書或報告重點直接貼在這裡... (AI 會根據這段內容來回答問題)"
          style={{ width: '100%', height: '150px', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
          value={reportContent}
          onChange={(e) => setReportContent(e.target.value)}
        />
        <p style={{ fontSize: '12px', color: '#666' }}>💡 提示：貼入的內容越詳細，AI 的建議會越精準。</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* 左側：輸入提問 */}
        <div>
          <div style={{ background: '#e7f5ff', padding: '20px', borderRadius: '15px', marginBottom: '20px' }}>
            <h4>🎙️ 方法 A：現場錄音</h4>
            <button onClick={toggleListen} style={{ padding: '15px', width: '100%', background: isListening ? '#fa5252' : '#228be6', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'pointer' }}>
              {isListening ? '🛑 停止聆聽' : '開始錄製評審提問'}
            </button>
          </div>

          <div style={{ background: '#f4fce3', padding: '20px', borderRadius: '15px' }}>
            <h4>📁 方法 B：上傳錄音檔</h4>
            <input type="file" accept="audio/*" onChange={handleAudioUpload} />
          </div>
        </div>

        {/* 右側：結果顯示 */}
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '15px', border: '1px solid #dee2e6' }}>
          <h4>💡 AI 幕僚建議 (參考建議書分析)</h4>
          <p style={{ color: '#666', fontSize: '14px' }}><b>提問逐字稿：</b> {transcript || "尚未開始..."}</p>
          <hr />
          <div style={{ whiteSpace: 'pre-wrap', color: '#0b7285', fontWeight: '500', lineHeight: '1.6' }}>
            {loading ? "AI 幕僚正在翻閱建議書..." : analysis || "等待分析中..."}
          </div>
        </div>
      </div>
    </div>
  );
}
