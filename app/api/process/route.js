import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const REPORT_CONTENT = `
[請在此貼入你的報告內容]
`;

export async function POST(req) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    let analysis = "";
    let transcript = "";

    const contentType = req.headers.get('content-type') || '';

    // 情況 A：處理檔案上傳
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      const bytes = await file.arrayBuffer();
      const base64Data = Buffer.from(bytes).toString('base64');

      const prompt = `你是一位答辯幕僚。請先聽這段音訊，將其轉為逐字稿，然後根據這份報告內容：${REPORT_CONTENT}。進行分類並給出回答建議。`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType: file.type } }
      ]);
      analysis = result.response.text();
      transcript = "（已從檔案中自動辨識內容並分析）";
    } 
    // 情況 B：處理即時文字傳送
    else {
      const { text } = await req.json();
      const prompt = `你是一位專業答辯幕僚。參考報告內容：${REPORT_CONTENT}。評審問了：${text}。請：1.分類問題 2.根據報告給出回答建議。`;
      const result = await model.generateContent(prompt);
      analysis = result.response.text();
      transcript = text;
    }

    return NextResponse.json({ analysis, text: transcript });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
