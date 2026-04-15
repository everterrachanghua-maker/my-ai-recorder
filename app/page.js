"use client";
import { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, arrayUnion, query, orderBy } from "firebase/firestore";
import { Mic, Upload, FileText, CheckCircle, Clock, ChevronLeft, Loader2 } from 'lucide-react';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function AestheticAIAssistant() {
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'zh-TW';
      rec.onresult = (e) => sendToAI(e.results[0][0].transcript);
      rec.onend = () => setIsListening(false);
      setRecognition(rec);
    }
    return () => unsubscribe();
  }, []);

  const currentProject = projects.find(p => p.id === currentProjectId);

  // 上傳 PDF/Word 報告
  const handleReportUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'report');

    const res = await fetch('/api/process', { method: 'POST', body: formData });
    const data = await res.json();
    const projectRef = doc(db, "projects", currentProjectId);
    await updateDoc(projectRef, { reportContent: data.extractedText });
    setLoading(false);
    alert("服務建議書內容已成功讀取！");
  };

  const sendToAI = async (text) => {
    setLoading(true);
    const res = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, report: currentProject.reportContent, type: 'audio' })
    });
    const data = await res.json();
    setAnalysis(data.analysis);
    const projectRef = doc(db, "projects", currentProjectId);
    await updateDoc(projectRef, { history: arrayUnion({ q: text, a: data.analysis, time: new Date().toLocaleString() }) });
    setLoading(false);
  };

  const createProject = async () => {
    if (!newProjectName) return;
    await addDoc(collection(db, "projects"), { name: newProjectName, reportContent: '', history: [], createdAt: Date.now() });
    setNewProjectName('');
  };

  if (!currentProjectId) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '40px' }}>
        <div style={{ maxWidth: '800px', margin: 'auto' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '24px' }}>📁 專案控制中心</h1>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            <input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="輸入新計畫名稱..." style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
            <button onClick={createProject} style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>建立新專案</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {projects.map(p => (
              <div key={p.id} onClick={() => setCurrentProjectId(p.id)} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'transform 0.2s' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>{p.name}</h3>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>包含 {p.history?.length || 0} 筆紀錄</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* 左側操作區 */}
      <div style={{ width: '400px', backgroundColor: 'white', borderRight: '1px solid #e5e7eb', padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <button onClick={() => setCurrentProjectId(null)} style={{ display: 'flex', alignItems: 'center', color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '24px' }}>
          <ChevronLeft size={20} /> 返回清單
        </button>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>{currentProject.name}</h2>

        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>1. 上傳服務建議書 (PDF/Word)</label>
          <div style={{ border: '2px dashed #d1d5db', borderRadius: '8px', padding: '20px', textAlign: 'center', position: 'relative' }}>
            <Upload size={24} color="#9ca3af" style={{ marginBottom: '8px' }} />
            <p style={{ fontSize: '13px', color: '#6b7280' }}>{currentProject.reportContent ? "✅ 已讀取建議書" : "點選上傳檔案"}</p>
            <input type="file" accept=".pdf,.doc,.docx" onChange={handleReportUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
          </div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <button 
            onClick={() => { if(isListening){recognition.stop()}else{setAnalysis(''); recognition.start(); setIsListening(true)} }}
            style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: isListening ? '#ef4444' : '#2563eb', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            {isListening ? "正在聆聽提問..." : "開始錄製評審提問"}
          </button>
        </div>
      </div>

      {/* 右側分析區 */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', minHeight: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText color="#2563eb" /> AI 幕僚回答建議
            </h3>
            {loading && <Loader2 className="animate-spin" color="#2563eb" />}
          </div>

          <div style={{ backgroundColor: '#eff6ff', padding: '24px', borderRadius: '12px', border: '1px solid #bfdbfe', color: '#1e40af', lineHeight: '1.8', whiteSpace: 'pre-wrap', marginBottom: '40px' }}>
            {analysis || "等待評審提問中，建議書內容會作為分析基準。"}
          </div>

          <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#374151', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} /> 此專案歷史問答
          </h4>
          {currentProject.history?.slice().reverse().map((h, i) => (
            <div key={i} style={{ padding: '16px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontWeight: 'bold', color: '#111827', marginBottom: '40px' }}>問：{h.q}</div>
              <div style={{ fontSize: '14px', color: '#4b5563' }}>{h.a.substring(0, 150)}...</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
