import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// --- 這裡貼入你的報告全文或核心重點 ---
const REPORT_CONTENT = `
(例如) 計畫名稱：智慧溫室監測系統
核心技術：使用 LoRa 無線傳輸與 AI 影像辨識病蟲害。
預算規劃：設備費 30 萬、研發費 20 萬，總計 50 萬。
預期效益：降低農藥使用量 30%，提升產量 15%。
`;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    你是一位專業且冷靜的答辯幕僚。請參考下方的報告內容來回答評審。
    
    【報告內容】：
    ${REPORT_CONTENT}

    【評審提問】：
    "${text}"

    請依照下列格式給出專業建議：
    【問題分類】：(請判斷屬於：技術細節 / 預算經費 / 商業邏輯 / 未來發展)
    【核心建議】：(請用一句話總結回答的態度)
    【回答重點】：
    1. [重點一]
    2. [重點二]
    3. [重點三]
    【參考報告】：(請指出報告中哪些數據或內容可以支持這個回答)
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const analysis = response.text();

    return NextResponse.json({ analysis });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
