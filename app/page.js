"use client";
import { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, arrayUnion, query, orderBy } from "firebase/firestore";

// Firebase 配置 (會從環境變數讀取)
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

export default function FirebaseProjectManager() {
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [recognition, setRecognition] = useState(null);

  // 1. 即時監聽雲端資料庫
  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(projs);
    });

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
    return () => unsubscribe();
  }, []);

  const currentProject = projects.find(p => p.id === currentProjectId);

  // 2. 雲端新增專案
  const createProject = async () => {
    if (!newProjectName) return;
    await addDoc(collection(db, "projects"), {
      name: newProjectName,
      reportContent: '',
      history: [],
      createdAt: Date.now()
    });
    setNewProjectName('');
  };

  // 3. 雲端更新報告內容
  const updateReport = async (val) => {
    const projectRef = doc(db, "projects", currentProjectId);
    await updateDoc(projectRef, { reportContent: val });
  };

  // 4. 儲存 AI 建議到雲端歷史紀錄
  const saveToHistory = async (q, a) => {
    const projectRef = doc(db, "projects", currentProjectId);
    await updateDoc(projectRef, {
      history: arrayUnion({ q, a, time: new Date().toLocaleString() })
    });
  };

  const sendToAI = async (text) => {
    if (!currentProject.reportContent) { alert("請先貼入報告內容！"); return; }
    setLoading(true);
    const res = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, report: currentProject.reportContent })
    });
    const data = await res.json();
    setAnalysis(data.analysis);
    await saveToHistory(text, data.analysis);
    setLoading(false);
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentProject.reportContent) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('report', currentProject.reportContent);
    const res = await fetch('/api/process', { method: 'POST', body: formData });
    const data = await res.json();
    setAnalysis(data.analysis);
    await saveToHistory(`上傳檔案: ${file.name}`, data.analysis);
    setLoading(false);
  };

  if (!currentProjectId) {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: 'auto', fontFamily: 'sans-serif' }}>
        <h1>☁️ 雲端 AI 答辯管理系統</h1>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
          <input placeholder="新專案名稱..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} style={{ flex: 1, padding: '10px' }} />
          <button onClick={createProject} style={{ padding: '10px', background: '#228be6', color: 'white', border: 'none' }}>建立專案</button>
        </div>
        {projects.map(p => (
          <div key={p.id} onClick={() => setCurrentProjectId(p.id)} style={{ padding: '15px', border: '1px solid #ddd', marginBottom: '10px', cursor: 'pointer', borderRadius: '8px' }}>
            <strong>{p.name}</strong>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <button onClick={() => setCurrentProjectId(null)}>← 回到清單</button>
      <h2>專案：{currentProject.name}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <textarea style={{ width: '100%', height: '200px' }} value={currentProject.reportContent} onChange={(e) => updateReport(e.target.value)} placeholder="在此貼入報告內容..." />
          <button onClick={() => isListening ? recognition.stop() : recognition.start() || setIsListening(true)} style={{ width: '100%', padding: '20px', background: isListening ? 'red' : 'blue', color: 'white', marginTop: '10px' }}>
            {isListening ? '🛑 停止錄音' : '🎙️ 開始錄製評審提問'}
          </button>
          <input type="file" onChange={handleAudioUpload} style={{ marginTop: '10px' }} />
        </div>
        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px' }}>
          <h4>💡 AI 分析</h4>
          <div style={{ whiteSpace: 'pre-wrap' }}>{loading ? "分析中..." : analysis}</div>
          <hr />
          <h4>📜 歷史提問記錄</h4>
          {currentProject.history?.slice().reverse().map((h, i) => (
            <div key={i} style={{ fontSize: '12px', borderBottom: '1px solid #eee', padding: '5px' }}>
              <strong>{h.q}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
