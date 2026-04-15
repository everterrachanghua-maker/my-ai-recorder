"use client";
import { useState, useEffect } from 'react';

export default function ProjectManager() {
  const [projects, setProjects] = useState([]); // 所有專案
  const [currentProjectId, setCurrentProjectId] = useState(null); // 目前選中的專案 ID
  const [newProjectName, setNewProjectName] = useState('');
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [recognition, setRecognition] = useState(null);

  // 1. 初始化：從瀏覽器讀取舊專案
  useEffect(() => {
    const savedProjects = localStorage.getItem('ai_projects');
    if (savedProjects) {
      const parsed = JSON.parse(savedProjects);
      setProjects(parsed);
    }

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
  }, []);

  // 2. 儲存專案到 LocalStorage
  useEffect(() => {
    if (projects.length > 0) {
      localStorage.setItem('ai_projects', JSON.stringify(projects));
    }
  }, [projects]);

  const currentProject = projects.find(p => p.id === currentProjectId);

  // 新增專案
  const createProject = () => {
    if (!newProjectName) return;
    const newProj = {
      id: Date.now(),
      name: newProjectName,
      reportContent: '',
      history: []
    };
    setProjects([...projects, newProj]);
    setCurrentProjectId(newProj.id);
    setNewProjectName('');
  };

  // 更新目前專案的報告內容
  const updateReport = (val) => {
    const updated = projects.map(p => 
      p.id === currentProjectId ? { ...p, reportContent: val } : p
    );
    setProjects(updated);
  };

  // 處理 AI 分析結果並存入歷史紀錄
  const saveToHistory = (q, a) => {
    const updated = projects.map(p => {
      if (p.id === currentProjectId) {
        return { 
          ...p, 
          history: [{ q, a, time: new Date().toLocaleString() }, ...p.history] 
        };
      }
      return p;
    });
    setProjects(updated);
  };

  const sendToAI = async (text) => {
    if (!currentProject.reportContent) { alert("請先輸入報告內容！"); return; }
    setLoading(true);
    const res = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, report: currentProject.reportContent })
    });
    const data = await res.json();
    setAnalysis(data.analysis);
    saveToHistory(text, data.analysis);
    setLoading(false);
  };

  // 處理檔案上傳分析
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
    saveToHistory(`檔案上傳: ${file.name}`, data.analysis);
    setLoading(false);
  };

  // 回到首頁（專案清單）
  if (!currentProjectId) {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: 'auto', fontFamily: 'sans-serif' }}>
        <h1>📁 我的答辯專案管理</h1>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
          <input 
            placeholder="輸入新專案名稱..." 
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            style={{ flex: 1, padding: '10px' }}
          />
          <button onClick={createProject} style={{ padding: '10px 20px', background: '#228be6', color: 'white', border: 'none', borderRadius: '5px' }}>建立專案</button>
        </div>
        <h3>既有專案：</h3>
        {projects.map(p => (
          <div 
            key={p.id} 
            onClick={() => setCurrentProjectId(p.id)}
            style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '10px', marginBottom: '10px', cursor: 'pointer', background: '#f8f9fa' }}
          >
            <strong>{p.name}</strong>
            <div style={{ fontSize: '12px', color: '#666' }}>最後更新：{p.history[0]?.time || '無紀錄'}</div>
          </div>
        ))}
      </div>
    );
  }

  // 專案內部介面
  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <button onClick={() => setCurrentProjectId(null)} style={{ marginBottom: '20px' }}>← 回到專案列表</button>
      <h2>專案：{currentProject.name}</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <section style={{ background: '#fff9db', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
            <h4>1. 服務建議書內容 (自動儲存)</h4>
            <textarea 
              style={{ width: '100%', height: '200px' }} 
              value={currentProject.reportContent}
              onChange={(e) => updateReport(e.target.value)}
              placeholder="貼入此專案的報告內容..."
            />
          </section>

          <section style={{ background: '#e7f5ff', padding: '15px', borderRadius: '10px' }}>
            <h4>2. 即時錄音或上傳</h4>
            <button 
              onClick={() => isListening ? recognition.stop() : recognition.start() || setIsListening(true)}
              style={{ width: '100%', padding: '15px', background: isListening ? 'red' : 'blue', color: 'white', border: 'none', borderRadius: '10px' }}
            >
              {isListening ? '🛑 停止錄音' : '🎙️ 開始錄製評審提問'}
            </button>
            <p>或上傳音訊檔：</p>
            <input type="file" accept="audio/*" onChange={handleAudioUpload} />
          </section>
        </div>

        <div>
          <section style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', border: '1px solid #dee2e6', minHeight: '400px' }}>
            <h4>💡 AI 幕僚最新建議</h4>
            <div style={{ whiteSpace: 'pre-wrap', color: '#0b7285' }}>
              {loading ? "AI 正在翻閱報告..." : analysis || "等待提問中..."}
            </div>
            <hr />
            <h4>📜 此專案歷史紀錄</h4>
            {currentProject.history.map((h, i) => (
              <div key={i} style={{ fontSize: '13px', borderBottom: '1px solid #eee', padding: '10px 0' }}>
                <div style={{ color: '#666' }}>{h.time}</div>
                <strong>問：{h.q}</strong>
                <div style={{ color: '#333' }}>答：{h.a.substring(0, 50)}...</div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
