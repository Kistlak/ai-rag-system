import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";

const DEFAULTS: Record<string, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
};

export function getModel() {
  const provider = (process.env.LLM_PROVIDER || "anthropic").trim().toLowerCase();

  if (!(provider in DEFAULTS)) {
    throw new Error(`Unknown LLM_PROVIDER "${provider}". Use "anthropic" or "openai".`);
  }

  const modelId = process.env.LLM_MODEL?.trim() || DEFAULTS[provider];

  if (provider === "openai") {
    return openai(modelId);
  }

  return anthropic(modelId);
}
