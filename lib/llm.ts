import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";

const DEFAULTS: Record<string, string> = {
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-4o",
};

export function getModel() {
  const provider = process.env.LLM_PROVIDER ?? "anthropic";
  const modelId = process.env.LLM_MODEL ?? DEFAULTS[provider];

  if (!modelId) {
    throw new Error(`Unknown LLM_PROVIDER "${provider}". Use "anthropic" or "openai".`);
  }

  if (provider === "openai") {
    return openai(modelId);
  }

  return anthropic(modelId);
}
