import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from 'mammoth';

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const formData = await req.formData();
    const type = formData.get('type');

    if (type === 'report') {
      // --- 處理多個報告書上傳 ---
      const files = formData.getAll('file'); // 取得所有檔案
      let combinedText = "";
      let fileNames = [];

      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        let text = "";

        if (file.type === "application/pdf") {
          const pdf = (await import('pdf-parse/lib/pdf-parse.js')).default;
          const data = await pdf(buffer);
          text = data.text;
        } else if (file.type.includes("word") || file.name.endsWith(".docx")) {
          const result = await mammoth.extractRawText({ buffer });
          text = result.value;
        }
        
        combinedText += `\n--- 檔案名稱: ${file.name} ---\n${text}\n`;
        fileNames.push(file.name);
      }

      return NextResponse.json({ extractedText: combinedText, fileNames });

    } else {
      // --- 處理錄音與分析 (保持不變) ---
      const reportText = formData.get('report') || "";
      const questionText = formData.get('text');
      const file = formData.get('file');
      
      let prompt = `你是一位專業答辯幕僚。參考建議書內容：${reportText}。`;
      
      if (file) {
        const bytes = await file.arrayBuffer();
        const audioData = { inlineData: { data: Buffer.from(bytes).toString('base64'), mimeType: file.type } };
        const audioPrompt = `${prompt}\n請先將這段音訊轉為完整的「逐字稿」，然後再根據建議書內容提供「回答建議」。請用以下格式：\n【逐字稿】：...\n【回答建議】：...`;
        const result = await model.generateContent([audioPrompt, audioData]);
        const fullText = result.response.text();
        const parts = fullText.split('【回答建議】：');
        return NextResponse.json({ 
          transcript: parts[0].replace('【逐字稿】：', '').trim(), 
          analysis: parts[1] || fullText 
        });
      } else {
        const result = await model.generateContent(`${prompt}\n評審問了：${questionText}\n請提供回答要點。`);
        return NextResponse.json({ analysis: result.response.text(), transcript: questionText });
      }
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
