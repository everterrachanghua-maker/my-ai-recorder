import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const formData = await req.formData();
    const file = formData.get('file');
    const type = formData.get('type');

    if (type === 'report') {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      let extractedText = "";
      if (file.type === "application/pdf") {
        const data = await pdf(buffer);
        extractedText = data.text;
      } else {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      }
      return NextResponse.json({ extractedText });
    } else {
      const reportText = formData.get('report') || "";
      const questionText = formData.get('text'); // 即時錄音的文字
      
      let prompt = `你是一位專業答辯幕僚。參考建議書內容：${reportText}。`;
      let result;

      if (file) {
        // 處理上傳的錄音檔
        const bytes = await file.arrayBuffer();
        const audioData = { inlineData: { data: Buffer.from(bytes).toString('base64'), mimeType: file.type } };
        // 要求 AI 同時輸出逐字稿與分析
        const audioPrompt = `${prompt}\n請先將這段音訊轉為完整的「逐字稿」，然後再根據建議書內容提供「回答建議」。請用以下格式：
        【逐字稿】：...
        【回答建議】：...`;
        result = await model.generateContent([audioPrompt, audioData]);
        const fullText = result.response.text();
        
        // 拆分逐字稿與建議 (簡單處理)
        const parts = fullText.split('【回答建議】：');
        return NextResponse.json({ 
          transcript: parts[0].replace('【逐字稿】：', '').trim(), 
          analysis: parts[1] || fullText 
        });
      } else {
        // 處理即時錄音文字
        result = await model.generateContent(`${prompt}\n評審問了：${questionText}\n請依照建議書內容提供分類與回答要點。`);
        return NextResponse.json({ analysis: result.response.text(), transcript: questionText });
      }
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
