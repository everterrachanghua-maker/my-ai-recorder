import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 這裡是你的報告內容 (之後可以換成更長的內容)
const REPORT_CONTENT = `
[請在此處貼入你的報告全文或重點摘要]
例如：本計畫是關於智慧農業監測，預算50萬，技術採用 LoRa 傳輸...
`;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    // 1. 語音轉文字 (Whisper)
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
    });

    const userText = transcription.text;

    // 2. 根據報告內容進行分類與解答建議
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: `你是一位答辯幕僚。參考報告內容：${REPORT_CONTENT}` },
        { role: "user", content: `評審剛才問了：${userText}。請提供：1.問題分類 2.回答要點建議。` }
      ],
    });

    return NextResponse.json({
      text: userText,
      analysis: completion.choices[0].message.content
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
