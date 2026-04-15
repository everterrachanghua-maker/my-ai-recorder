"use client";
import { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, updateDoc, arrayUnion, query, orderBy, addDoc, deleteDoc } from "firebase/firestore";
import { Mic, MicOff, Upload, FileText, Clock, ChevronLeft, Loader2, Trash2, MessageSquare, FileCheck } from 'lucide-react';

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

export default function MultiFileAIAssistant() {
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

  // 處理多檔案上傳
  const handleMultiReportUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setLoading(true);
    const formData = new FormData();
    files.forEach(file => formData.append('file', file)); // 多個檔案都用同一個 key 'file'
    formData.append('type', 'report');

    try {
      const res = await fetch('/api/process', { method: 'POST', body: formData });
      const data = await res.json();
      
      const projectRef = doc(db, "projects", currentProjectId);
      await updateDoc(projectRef, { 
        reportContent: data.extractedText,
        fileList: data.fileNames // 儲存檔案名稱清單
      });
      alert(`成功讀取 ${data.fileNames.length} 個檔案！`);
    } catch (err) {
      alert("讀取失敗，請檢查檔案格式");
    } finally {
      setLoading(false);
    }
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

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setCurrentTranscript("分析錄音檔中...");
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

  if (!currentProjectId) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '40px' }}>
        <div style={{ maxWidth: '800px', margin: 'auto' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px' }}>📁 專案列表</h1>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
            <input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="新專案名稱..." style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
            <button onClick={async () => { if(newProjectName){ await addDoc(collection(db, "projects"), { name: newProjectName, reportContent: '', fileList: [], history: [], createdAt: Date.now() }); setNewProjectName(''); } }} style={{ background: '#2563eb', color: 'white', padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>新增專案</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {projects.map(p => (
              <div key={p.id} onClick={() => setCurrentProjectId(p.id)} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', cursor: 'pointer', border: '1px solid #eee', position: 'relative' }}>
                <h3 style={{ margin: '0 0 8px 0' }}>{p.name}</h3>
                <button onClick={async (e) => { e.stopPropagation(); if(confirm("確定刪除？")) await deleteDoc(doc(db, "projects", p.id)); }} style={{ position: 'absolute', top: '20px', right: '20px', color: '#ef4444', background: 'none', border: 'none' }}><Trash2 size={18} /></button>
                <div style={{ fontSize: '12px', color: '#888' }}>{p.fileList?.length || 0} 個檔案 | {p.history?.length || 0} 筆紀錄</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* 左欄：設定與上傳 */}
      <div style={{ width: '380px', backgroundColor: 'white', borderRight: '1px solid #eee', padding: '24px', position: 'sticky', top: 0, height: '100vh' }}>
        <button onClick={() => {setCurrentProjectId(null); setAnalysis(''); setCurrentTranscript('');}} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', marginBottom: '20px' }}><ChevronLeft /> 返回清單</button>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '30px' }}>{currentProject.name}</h2>
        
        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>1. 上傳建議書 (可多選 PDF/Word)</label>
          <div style={{ border: '2px dashed #2563eb', borderRadius: '12px', padding: '20px', textAlign: 'center', position: 'relative', backgroundColor: '#f0f7ff' }}>
            <Upload color="#2563eb" size={30} />
            <p style={{ fontSize: '14px', margin: '10px 0' }}>點擊或拖曳檔案上傳</p>
            <input type="file" multiple accept=".pdf,.docx" onChange={handleMultiReportUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
          </div>
          
          {/* 顯示已上傳檔案清單 */}
          {currentProject.fileList?.length > 0 && (
            <div style={{ marginTop: '15px', background: '#f8f9fa', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>已讀取檔案：</div>
              {currentProject.fileList.map((name, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#444' }}><FileCheck size={14} color="green" /> {name}</div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 'auto' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px' }}>2. 評審提問</label>
          <button onClick={() => { if(isListening){recognition.stop()}else{setAnalysis(''); setCurrentTranscript(''); recognition.start(); setIsListening(true)} }} style={{ width: '100%', padding: '15px', background: isListening ? '#ef4444' : '#2563eb', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '10px' }}>
            {isListening ? <MicOff /> : <Mic />} {isListening ? "正在聆聽..." : "現場錄音提問"}
          </button>
          <div style={{ marginTop: '10px', textAlign: 'center', position: 'relative' }}>
            <button style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ddd', backgroundColor: 'white' }}>上傳錄音檔</button>
            <input type="file" accept="audio/*" onChange={handleAudioUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
          </div>
        </div>
      </div>

      {/* 右欄：分析結果 */}
      <div style={{ flex: 1, padding: '40px' }}>
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MessageSquare size={20} /> 提問逐字稿</h4>
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #eee', minHeight: '60px', fontSize: '18px' }}>
            {currentTranscript || "等待提問中..."}
          </div>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={20} /> AI 回答建議 {loading && <Loader2 className="animate-spin" />}</h4>
          <div style={{ background: '#eff6ff', padding: '25px', borderRadius: '12px', border: '1px solid #bfdbfe', fontSize: '17px', color: '#1e40af', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
            {analysis || "請上傳檔案並開始提問。"}
          </div>
        </div>

        <hr />
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={20} /> 歷史問答</h4>
        {currentProject.history?.slice().reverse().map((h, i) => (
          <div key={i} style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '15px' }}>
            <div style={{ fontSize: '12px', color: '#999' }}>{h.time}</div>
            <div style={{ fontWeight: 'bold', margin: '8px 0' }}>問：{h.q}</div>
            <div style={{ fontSize: '14px', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>{h.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
