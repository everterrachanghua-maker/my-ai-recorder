import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// 填入你的 Google Gemini API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const REPORT_CONTENT = `
[在此處貼入你的報告重點，例如：本計畫是智慧農業，預算100萬...]
`;

export async function POST(req: Request) {
  try {
    const { text } = await req.json(); // 接收前端傳來的文字

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    你是一位專業的答辯幕僚。
    參考報告內容：${REPORT_CONTENT}
    
    評審剛才問了：${text}
    
    請提供：
    1. 問題分類（技術/商務/邏輯）
    2. 根據報告內容，給出 2-3 個回答重點建議。
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text();

    return NextResponse.json({ analysis });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
