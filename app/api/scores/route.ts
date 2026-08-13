import { z } from "zod";
import { addScore, getScores } from "@/lib/score-store";

const scoreSchema = z.object({
  score: z.number().int().min(0).max(10_000_000)
});

export function GET() {
  return Response.json({ scores: getScores() });
}

export async function POST(request: Request) {
  const parsed = scoreSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: "invalid score" }, { status: 400 });
  }

  return Response.json({ score: addScore(parsed.data.score) }, { status: 201 });
}
