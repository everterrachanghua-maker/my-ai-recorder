import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const REPORT_CONTENT = `[貼入你的報告內容]`;

export async function POST(req) {
  try {
    const { text } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `你是幕僚，參考報告：${REPORT_CONTENT}。評審問：${text}。請分類並給建議。`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text();
    return NextResponse.json({ analysis });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
