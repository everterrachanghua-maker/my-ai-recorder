"use client";
import { useState, useRef } from 'react';

export default function RecorderPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState({ text: '', analysis: '' });
  const [loading, setLoading] = useState(false);
  const mediaRecorderRef = useRef(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    const chunks = [];

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      sendToAI(blob);
    };

    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const sendToAI = async (blob) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');

    const res = await fetch('/api/process', { method: 'POST', body: formData });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: 'auto' }}>
      <h1>🎤 答辯即時助手</h1>
      <button 
        onMouseDown={startRecording} 
        onMouseUp={stopRecording}
        style={{ padding: '20px', fontSize: '20px', background: isRecording ? 'red' : 'blue', color: 'white', borderRadius: '10px', width: '100%' }}
      >
        {isRecording ? '正在聽評審提問 (放開結束)...' : '長按錄製評審提問'}
      </button>

      {loading && <p>AI 正在思考中...</p>}

      <div style={{ marginTop: '20px', borderTop: '1px solid #ccc' }}>
        <h3>逐字稿：</h3>
        <p style={{ background: '#f0f0f0', padding: '10px' }}>{result.text}</p>
        
        <h3>幕僚建議：</h3>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#eef', padding: '10px' }}>{result.analysis}</pre>
      </div>
    </div>
  );
}
