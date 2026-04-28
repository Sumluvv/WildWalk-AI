import { renderNarrationPreview } from "../narration/templateNarration.js";

const DEFAULT_MODEL = process.env.LLM_MODEL || "gpt-4o-mini";
const DEFAULT_BASE_URL = process.env.LLM_BASE_URL || "https://api.openai.com/v1";

function buildPrompt(packet) {
  return [
    "你是徒步生存游戏旁白，请根据结构化数据输出 2-4 句中文旁白。",
    "要求：",
    "1) 只叙事，不篡改数值；",
    "2) 语言简洁有画面感；",
    "3) 若有聊天冲突/背刺，点到为止，不做攻击性表达。",
    "",
    "结构化输入：",
    JSON.stringify(packet || {}, null, 2)
  ].join("\n");
}

export async function generateNarration(packet = {}) {
  const templateNarration = renderNarrationPreview(packet);
  const apiKey = process.env.LLM_API_KEY;
  const enableRealAi = process.env.ENABLE_REAL_AI === "true";

  if (!enableRealAi || !apiKey) {
    return {
      narration: templateNarration,
      source: "template-fallback",
      model: null
    };
  }

  try {
    const response = await fetch(`${DEFAULT_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.6,
        messages: [
          { role: "system", content: "你是严谨的多人徒步叙事旁白。" },
          { role: "user", content: buildPrompt(packet) }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status}`);
    }

    const data = await response.json();
    const narration = data?.choices?.[0]?.message?.content?.trim();
    if (!narration) throw new Error("LLM empty content");

    return {
      narration,
      source: "real-ai",
      model: data?.model || DEFAULT_MODEL
    };
  } catch {
    return {
      narration: templateNarration,
      source: "template-fallback",
      model: null
    };
  }
}
