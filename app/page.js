"use client";
import { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, arrayUnion, query, orderBy } from "firebase/firestore";
import { Mic, MicOff, Upload, FileText, Clock, ChevronLeft, Loader2, Trash2, MessageSquare } from 'lucide-react';

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

export default function ProfessionalAIAssistant() {
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
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
      rec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        setCurrentTranscript(text);
        sendToAI(text);
      };
      rec.onend = () => setIsListening(false);
      setRecognition(rec);
    }
    return () => unsubscribe();
  }, []);

  const currentProject = projects.find(p => p.id === currentProjectId);

  const handleDeleteProject = async (e, id) => {
    e.stopPropagation();
    if (confirm("確定要永久刪除此專案嗎？")) {
      await deleteDoc(doc(db, "projects", id));
    }
  };

  const handleReportUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'report');
    const res = await fetch('/api/process', { method: 'POST', body: formData });
    const data = await res.json();
    await updateDoc(doc(db, "projects", currentProjectId), { reportContent: data.extractedText });
    setLoading(false);
    alert("建議書讀取完成！");
  };

  const handleAudioFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setCurrentTranscript("音訊分析中...");
    const formData = new FormData();
    formData.append('file', file);
    formData.append('report', currentProject.reportContent);
    formData.append('type', 'audio');
    const res = await fetch('/api/process', { method: 'POST', body: formData });
    const data = await res.json();
    setCurrentTranscript(data.transcript);
    setAnalysis(data.analysis);
    await updateDoc(doc(db, "projects", currentProjectId), {
      history: arrayUnion({ q: data.transcript, a: data.analysis, time: new Date().toLocaleString() })
    });
    setLoading(false);
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
    await updateDoc(doc(db, "projects", currentProjectId), {
      history: arrayUnion({ q: text, a: data.analysis, time: new Date().toLocaleString() })
    });
    setLoading(false);
  };

  if (!currentProjectId) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '40px' }}>
        <div style={{ maxWidth: '900px', margin: 'auto' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '32px', textAlign: 'center' }}>☁️ AI 答辯管理中心</h1>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', background: 'white', padding: '20px', borderRadius: '12px' }}>
            <input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="新專案名稱..." style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <button onClick={async () => { if(newProjectName){ await addDoc(collection(db, "projects"), { name: newProjectName, reportContent: '', history: [], createdAt: Date.now() }); setNewProjectName(''); } }} style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>建立專案</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {projects.map(p => (
              <div key={p.id} onClick={() => setCurrentProjectId(p.id)} style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', cursor: 'pointer', border: '1px solid #e5e7eb', position: 'relative' }}>
                <h3 style={{ margin: '0 0 10px 0' }}>{p.name}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#666' }}>{p.history?.length || 0} 筆紀錄</span>
                  <button onClick={(e) => handleDeleteProject(e, p.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <div style={{ width: '380px', backgroundColor: 'white', borderRight: '1px solid #e5e7eb', padding: '24px', height: '100vh', position: 'sticky', top: 0 }}>
        <button onClick={() => { setCurrentProjectId(null); setAnalysis(''); setCurrentTranscript(''); }} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '24px' }}><ChevronLeft size={20} /> 返回清單</button>
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '32px' }}>{currentProject.name}</h2>
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>1. 更新建議書 (PDF/Word)</label>
          <div style={{ border: '2px dashed #ddd', borderRadius: '12px', padding: '20px', textAlign: 'center', position: 'relative' }}>
            <Upload size={24} color="#2563eb" />
            <p style={{ fontSize: '13px' }}>{currentProject.reportContent ? "✅ 已有建議書" : "點擊上傳"}</p>
            <input type="file" accept=".pdf,.doc,.docx" onChange={handleReportUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>2. 提問分析</label>
          <button onClick={() => { if(isListening){recognition.stop()}else{setAnalysis(''); setCurrentTranscript(''); recognition.start(); setIsListening(true)} }} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', backgroundColor: isListening ? '#ef4444' : '#2563eb', color: 'white', cursor: 'pointer', marginBottom: '10px' }}>
            {isListening ? "正在聆聽..." : "開啟現場錄音"}
          </button>
          <div style={{ position: 'relative' }}>
            <button style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ddd', backgroundColor: 'white' }}>上傳錄音檔</button>
            <input type="file" accept="audio/*" onChange={handleAudioFileUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
          </div>
        </div>
      </div>
      <div style={{ flex: 1, padding: '40px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={20} /> 評審提問內容</h3>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #eee', minHeight: '60px' }}>{currentTranscript || "等待中..."}</div>
        </div>
        <div style={{ marginBottom: '40px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={20} /> AI 幕僚建議 {loading && <Loader2 className="animate-spin" size={20} />}</h3>
          <div style={{ backgroundColor: '#eff6ff', padding: '24px', borderRadius: '12px', border: '1px solid #bfdbfe', whiteSpace: 'pre-wrap' }}>{analysis || "請開始提問..."}</div>
        </div>
        <hr />
        <h3><Clock size={20} /> 歷史紀錄</h3>
        {currentProject.history?.slice().reverse().map((h, i) => (
          <div key={i} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#999' }}>{h.time}</div>
            <div style={{ fontWeight: 'bold', margin: '8px 0' }}>問：{h.q}</div>
            <div style={{ fontSize: '14px', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>{h.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
