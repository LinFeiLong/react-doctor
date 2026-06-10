import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export default async function handler(request: NextRequest) {
  const openAiKey = process.env.OPENAI_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!openAiKey || !supabaseUrl || !supabaseServiceKey) {
    return new Response("missing server configuration", { status: 500 });
  }

  const { prompt } = await request.json();
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data } = await supabase.rpc("match_page_sections", {
    embedding: [0.1, 0.2, 0.3],
    match_count: 10,
    match_threshold: 0.78,
    min_content_length: 50,
  });

  return Response.json({ prompt, data });
}
