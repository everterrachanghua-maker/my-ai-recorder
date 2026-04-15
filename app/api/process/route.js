import { GoogleGenerativeAI } from "@google/generative-ai";
import { StreamingTextResponse, GoogleGenerativeAIStream } from "ai"; // 需要安裝 ai 套件
import mammoth from 'mammoth';

export const dynamic = 'force-dynamic';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req) {
  try {
    const formData = await req.formData();
    const type = formData.get('type');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    if (type === 'report') {
      // --- 檔案處理部分保持不變 (PDF/Word 提取文字) ---
      const files = formData.getAll('file');
      let combinedText = "";
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        if (file.type === "application/pdf") {
          const pdf = (await import('pdf-parse/lib/pdf-parse.js')).default;
          const data = await pdf(buffer);
          combinedText += data.text;
        } else {
          const result = await mammoth.extractRawText({ buffer });
          combinedText += result.value;
        }
      }
      return new Response(JSON.stringify({ extractedText: combinedText }), { status: 200 });
    } 

    // --- 核心：AI 串流分析邏輯 ---
    const reportText = formData.get('report') || "";
    const questionText = formData.get('text');
    const audioFile = formData.get('file');

    const systemPrompt = `你是一位專業答辯幕僚。請參考建議書內容：${reportText}。
    針對評審提問，請先給出【問題分類】，再給出【回答要點】。`;

    let result;
    if (audioFile) {
      const bytes = await audioFile.arrayBuffer();
      const audioData = { inlineData: { data: Buffer.from(bytes).toString('base64'), mimeType: audioFile.type } };
      result = await model.generateContentStream([systemPrompt, audioData]);
    } else {
      result = await model.generateContentStream(`${systemPrompt}\n評審問：${questionText}`);
    }

    // 將 Gemini 的串流轉換為 Vercel 支援的串流格式
    const stream = GoogleGenerativeAIStream(result);
    return new StreamingTextResponse(stream);

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
