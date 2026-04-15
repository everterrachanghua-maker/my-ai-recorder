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

  // 刪除專案
  const handleDeleteProject = async (e, id) => {
    e.stopPropagation(); // 防止觸發進入專案
    if (confirm("確定要永久刪除此專案嗎？所有歷史紀錄將會消失。")) {
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
    setCurrentTranscript("音訊分析中，請稍候...");
    setAnalysis("");
    
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
    setAnalysis("");
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
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '32px', textAlign: 'center' }}>☁️ AI 答辯管理中心</h1>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="新專案名稱（例如：2024港口計畫）..." style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '16px' }} />
            <button onClick={async () => { if(newProjectName){ await addDoc(collection(db, "projects"), { name: newProjectName, reportContent: '', history: [], createdAt: Date.now() }); setNewProjectName(''); } }} style={{ backgroundColor: '#2563eb', color: 'white', padding: '12px 28px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>建立專案</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {projects.map(p => (
              <div key={p.id} onClick={() => setCurrentProjectId(p.id)} style={{ position: 'relative', backgroundColor: 'white', padding: '24px', borderRadius: '16px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', transition: 'all 0.2s', border: '1px solid #e5e7eb' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2563eb'} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}>
                <h3 style={{ margin: '0 0 12px 0', color: '#1f2937', paddingRight: '30px' }}>{p.name}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}><MessageSquare si
