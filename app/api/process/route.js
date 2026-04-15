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

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      reportText = formData.get('report');
      const file = formData.get('file');
      const bytes = await file.arrayBuffer();
      audioData = { inlineData: { data: Buffer.from(bytes).toString('base64'), mimeType: file.type } };
    } else {
      const body = await req.json();
      reportText = body.report;
      questionText = body.text;
    }

    const systemPrompt = `你是一位專業的答辯幕僚。參考報告內容：${reportText}。請根據問題提供：1.問題分類 2.回答重點建議。`;

    let result;
    if (audioData) {
      result = await model.generateContent([systemPrompt, audioData]);
    } else {
      result = await model.generateContent(`${systemPrompt}\n\n評審問了：${questionText}`);
    }

    return NextResponse.json({ analysis: result.response.text() });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
