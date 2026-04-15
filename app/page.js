"use client";
import { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps } from "firebase/app";
import { 
  getFirestore, collection, onSnapshot, doc, updateDoc, 
  arrayUnion, query, orderBy, addDoc, deleteDoc 
} from "firebase/firestore";
import { 
  Mic, MicOff, Upload, FileText, Clock, ChevronLeft, 
  Loader2, Trash2, MessageSquare, FileCheck, Plus, Play 
} from 'lucide-react';

// --- Firebase 初始化 ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export default function RealTimeDefenseAssistant() {
  // 專案管理狀態
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  
  // UI 狀態
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState(''); // 即時跳動的文字
  const [analysis, setAnalysis] = useState(''); // AI 串流回覆的文字
  const [loading, setLoading] = useState(false);
  
  const recognitionRef = useRef(null);
  const currentProject = projects.find(p => p.id === currentProjectId);

  // 1. 初始化：監聽 Firebase 與設定語音辨識
  useEffect(() => {
    const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'zh-TW';
      rec.continuous = true;
      rec.interimResults = true; // 開啟即時辨識顯示

      rec.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const finalResult = event.results[i][0].transcript;
            setCurrentTranscript(finalResult);
            handleStreamAI(finalResult); // 偵測到講完一句，自動送出 AI 分析
          } else {
            interimTranscript += event.results[i][0].transcript;
            setCurrentTranscript(interimTranscript); // 即時更新畫面文字
          }
        }
      };
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }
    return () => unsubscribe();
  }, [currentProjectId]);

  // 2. AI 串流分析邏輯 (核心功能)
  const handleStreamAI = async (text) => {
    if (!currentProject?.reportContent) {
      alert("請先上傳建議書內容！");
      return;
    }
    setLoading(true);
    setAnalysis(""); // 清空舊內容，準備接收串流

    const formData = new FormData();
    formData.append('text', text);
    formData.append('report', currentProject.reportContent);
    formData.append('type', 'audio');

    const response = await fetch('/api/process', { method: 'POST', body: formData });
    if (!response.ok) { setLoading(false); return; }

    // 讀取 Vercel 傳回的串流
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      accumulatedResponse += chunk;
      setAnalysis(prev => prev + chunk); // 即時更新分析框 (打字機效果)
    }

    // 分析結束，存入 Firebase 歷史紀錄
    await updateDoc(doc(db, "projects", currentProjectId), {
      history: arrayUnion({ q: text, a: accumulatedResponse, time: new Date().toLocaleString() })
    });
    setLoading(false);
  };

  // 3. 上傳 PDF/Word 報告
  const handleReportUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setLoading(true);
    const formData = new FormData();
    files.forEach(f => formData.append('file', f));
    formData.append('type', 'report');

    const res = await fetch('/api/process', { method: 'POST', body: formData });
    const data = await res.json();
    await updateDoc(doc(db, "projects", currentProjectId), { 
      reportContent: data.extractedText,
      fileList: data.fileNames || files.map(f => f.name)
    });
    setLoading(false);
    alert("建議書內容讀取完成！");
  };

  // 4. 專案管理功能
  const createProject = async () => {
    if (!newProjectName) return;
    await addDoc(collection(db, "projects"), { 
      name: newProjectName, reportContent: '', history: [], fileList: [], createdAt: Date.now() 
    });
    setNewProjectName('');
  };

  const deleteProject = async (e, id) => {
    e.stopPropagation();
    if (confirm("確定刪除此專案與所有紀錄？")) {
      await deleteDoc(doc(db, "projects", id));
    }
  };

  // --- UI 渲染：首頁 (專案列表) ---
  if (!currentProjectId) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '60px 20px' }}>
        <div style={{ maxWidth: '900px', margin: 'auto' }}>
          <h1 style={{ textAlign: 'center', fontSize: '32px', fontWeight: '800', marginBottom: '40px', color: '#111827' }}>☁️ AI 答辯指揮中心</h1>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '40px', background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <input 
              value={newProjectName} 
              onChange={(e) => setNewProjectName(e.target.value)} 
              placeholder="輸入新計畫名稱..." 
              style={{ flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '16px' }} 
            />
            <button onClick={createProject} style={{ background: '#2563eb', color: 'white', padding: '0 30px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
              <Plus size={20} style={{ display: 'inline', marginRight: '4px' }} /> 建立專案
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {projects.map(p => (
              <div key={p.id} onClick={() => setCurrentProjectId(p.id)} style={{ backgroundColor: 'white', padding: '28px', borderRadius: '20px', cursor: 'pointer', border: '1px solid #e5e7eb', position: 'relative', transition: 'all 0.2s' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '20px' }}>{p.name}</h3>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>{p.fileList?.length || 0} 個檔案 | {p.history?.length || 0} 筆紀錄</p>
                <button onClick={(e) => deleteProject(e, p.id)} style={{ position: 'absolute', top: '20px', right: '20px', color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- UI 渲染：專案內部工作區 ---
  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f9fafb' }}>
      {/* 左欄：操作面板 */}
      <div style={{ width: '400px', backgroundColor: 'white', borderRight: '1px solid #e5e7eb', padding: '30px', display: 'flex', flexDirection: 'column' }}>
        <button onClick={() => {setCurrentProjectId(null); setAnalysis(''); setCurrentTranscript('');}} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6b7280', marginBottom: '30px' }}>
          <ChevronLeft size={20} /> 返回專案清單
        </button>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', marginBottom: '40px' }}>{currentProject.name}</h2>

        <div style={{ marginBottom: '40px' }}>
          <label style={{ fontWeight: '700', fontSize: '14px', display: 'block', marginBottom: '12px', color: '#374151' }}>步驟 1：更新建議書 (多選 PDF/Word)</label>
          <div style={{ border: '2px dashed #2563eb', borderRadius: '16px', padding: '30px', textAlign: 'center', position: 'relative', backgroundColor: '#f0f7ff' }}>
            <Upload color="#2563eb" size={32} style={{ marginBottom: '10px' }} />
            <p style={{ fontSize: '14px', color: '#2563eb', fontWeight: '600' }}>點擊上傳檔案</p>
            <input type="file" multiple accept=".pdf,.docx" onChange={handleReportUpload} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
          </div>
          {currentProject.fileList?.length > 0 && (
            <div style={{ marginTop: '12px', fontSize: '12px', color: '#059669', background: '#ecfdf5', padding: '10px', borderRadius: '8px' }}>
              <FileCheck size={14} style={{ display: 'inline', marginRight: '4px' }} /> 已讀取 {currentProject.fileList.length} 份文件
            </div>
          )}
        </div>

        <div style={{ marginTop: 'auto' }}>
          <label style={{ fontWeight: '700', fontSize: '14px', display: 'block', marginBottom: '12px', color: '#374151' }}>步驟 2：現場錄音或上傳</label>
          <button 
            onClick={() => { if(isListening){recognitionRef.current.stop()}else{setAnalysis(''); setCurrentTranscript(''); recognitionRef.current.start(); setIsListening(true)} }}
            style={{ width: '100%', padding: '20px', borderRadius: '16px', border: 'none', backgroundColor: isListening ? '#ef4444' : '#2563eb', color: 'white', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)' }}
          >
            {isListening ? <MicOff /> : <Mic />} {isListening ? "正在聆聽提問..." : "開啟現場錄音"}
          </button>
        </div>
      </div>

      {/* 右欄：即時分析顯示區 */}
      <div style={{ flex: 1, padding: '50px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {/* 即時逐字稿框 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '16px' }}><MessageSquare size={20} /> 評審即時提問 (逐字稿)</h3>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', border: '2px solid #2563eb', fontSize: '22px', fontWeight: '500', color: isListening ? '#111827' : '#9ca3af', minHeight: '100px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            {currentTranscript || "等待語音輸入中..."}
          </div>
        </div>

        {/* AI 串流分析框 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '16px' }}><FileText size={20} /> AI 幕僚即時建議 {loading && <Loader2 className="animate-spin" size={18} />}</h3>
          <div style={{ backgroundColor: '#0f172a', padding: '40px', borderRadius: '24px', color: '#f8fafc', fontSize: '19px', lineHeight: '1.8', whiteSpace: 'pre-wrap', borderLeft: '8px solid #3b82f6', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            {analysis || "AI 將在這裡即時生成回答建議..."}
          </div>
        </div>

        {/* 歷史紀錄 */}
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '15px', marginBottom: '20px' }}><Clock size={18} /> 此專案歷史問答記錄</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {currentProject.history?.slice().reverse().map((h, i) => (
              <div key={i} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px' }}>{h.time}</div>
                <div style={{ fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>問：{h.q}</div>
                <div style={{ color: '#4b5563', fontSize: '14px', lineHeight: '1.6', background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>{h.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
