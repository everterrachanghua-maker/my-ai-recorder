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
    const type = formData.get('type'); // 判斷是 report 還是 audio

    if (type === 'report') {
      // --- 處理報告書上傳 (PDF/Word) ---
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
      // --- 處理評審錄音與分析 ---
      const reportText = formData.get('report') || "";
      const questionText = formData.get('text'); // 如果是即時錄音傳過來的文字
      
      let prompt = `你是一位專業答辯幕僚。參考建議書內容：${reportText}。`;
      let result;

      if (file) {
        // 處理錄音檔
        const bytes = await file.arrayBuffer();
        const audioData = { inlineData: { data: Buffer.from(bytes).toString('base64'), mimeType: file.type } };
        result = await model.generateContent([prompt + "請聽這段音訊，轉為逐字稿並提供回答建議。", audioData]);
      } else {
        // 處理即時文字
        result = await model.generateContent(`${prompt}\n評審問了：${questionText}\n請分類並提供回答建議。`);
      }

      return NextResponse.json({ analysis: result.response.text() });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
