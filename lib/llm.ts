import { anthropic } from "@ai-sdk/anthropic";

// claude-sonnet-4-5 per the build plan. Update here to upgrade.
export const MODEL_ID = "claude-sonnet-4-5";

export function getModel() {
  return anthropic(MODEL_ID);
}
