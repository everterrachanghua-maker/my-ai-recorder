import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const contentType = req.headers.get('content-type') || '';
    
    let reportText = "";
    let questionText = "";
    let audioData = null;

    // A. 處理檔案上傳 (FormData)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      reportText = formData.get('report') || "未提供建議書內容";
      const file = formData.get('file');
      const bytes = await file.arrayBuffer();
      audioData = { inlineData: { data: Buffer.from(bytes).toString('base64'), mimeType: file.type } };
    } 
    // B. 處理文字傳送 (JSON)
    else {
      const body = await req.json();
      reportText = body.report || "未提供建議書內容";
      questionText = body.text;
    }

    const systemPrompt = `
      你是一位專業的答辯幕僚。你的任務是協助報告者回答評審的問題。
      
      【參考之服務建議書內容】：
      ${reportText}

      請根據上述建議書的內容與數據，針對評審的問題提供回答建議。
      請務必包含：
      1. 【問題分類】：(技術細節/預算/可行性/未來性)
      2. 【核心回覆】：一兩句話總結報告書中的立場。
      3. 【回答重點】：列出 2-3 個支持點，並指出這些點在建議書中的對應章節或數據。
      口氣要專業、冷靜。
    `;

    let result;
    if (audioData) {
      result = await model.generateContent([systemPrompt, audioData]);
    } else {
      result = await model.generateContent(`${systemPrompt}\n\n評審問了：${questionText}`);
    }

    const analysis = result.response.text();
    return NextResponse.json({ analysis });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
