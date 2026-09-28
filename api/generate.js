import Anthropic from "@anthropic-ai/sdk";

/**
 * 자연어를 PlantUML 코드로 옮긴다.
 *
 * 브라우저에서 모델을 직접 부르지 않는 까닭은 API 키 때문이다. 키를 프런트에 두면
 * 주소만 아는 사람이 우리 계정으로 모델을 쓴다. 그래서 이 함수가 키를 쥐고 대신 부른다.
 * 키는 Vercel 프로젝트의 Environment Variables 에 `ANTHROPIC_API_KEY` 로 둔다.
 *
 * 키가 없으면 503 을 돌려주고 편집기는 그대로 돈다. 이 기능 하나 때문에 앱 전체가
 * 멈추지 않게 하려는 뜻이다.
 */

const SYSTEM = `당신은 PlantUML 코드를 쓰는 도구입니다.

규칙:
- PlantUML 코드만 출력합니다. 설명, 인사, 코드펜스(\`\`\`)를 붙이지 않습니다.
- @startuml 로 시작해 @enduml 로 끝냅니다.
- 요청에 다이어그램 종류가 없으면 내용에 가장 맞는 것을 고릅니다.
- 한국어 요청에는 한국어 라벨을, 영어 요청에는 영어 라벨을 씁니다.
- 지어낸 세부사항을 채우지 않습니다. 요청에 없는 단계나 참여자를 늘리지 않습니다.`;

const MAX_PROMPT = 2000;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST 로만 받습니다." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: "AI 초안 기능이 아직 설정되지 않았습니다.",
    });
  }

  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  if (!prompt) {
    return res.status(400).json({ error: "무엇을 그릴지 적어 주세요." });
  }
  if (prompt.length > MAX_PROMPT) {
    return res.status(400).json({
      error: `요청이 너무 깁니다. ${MAX_PROMPT}자 아래로 줄여 주세요.`,
    });
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 8000,
      output_config: { effort: "medium" },
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });

    if (response.stop_reason === "refusal") {
      return res.status(422).json({
        error: "이 요청은 처리할 수 없습니다. 다르게 적어 주세요.",
      });
    }

    const uml = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!uml.includes("@startuml")) {
      return res.status(502).json({
        error: "PlantUML 코드를 만들지 못했습니다. 다시 시도해 주세요.",
      });
    }

    return res.status(200).json({ uml });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("[generate] API 키가 올바르지 않습니다");
      return res.status(503).json({ error: "AI 초안 기능을 쓸 수 없습니다." });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({
        error: "요청이 몰리고 있습니다. 잠시 뒤 다시 시도해 주세요.",
      });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`[generate] API 오류 ${error.status}:`, error.message);
      return res.status(502).json({ error: "초안을 만들지 못했습니다." });
    }
    console.error("[generate] 알 수 없는 오류:", error);
    return res.status(500).json({ error: "초안을 만들지 못했습니다." });
  }
}
