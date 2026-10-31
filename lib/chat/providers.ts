import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { openrouter } from "@openrouter/ai-sdk-provider";

const GOOGLE_MODEL = "gemini-3.5-flash-lite";
const GROQ_MODEL = "openai/gpt-oss-120b";
const OPENROUTER_MODEL = "nvidia/nemotron-3.5-super-vl:free";

// Each probe needs the key but generates nothing, so it spends no tokens. Keys
// stay in headers, because URLs can end up in error messages.
export const PROVIDERS = [
  {
    name: "google",
    keyVariable: "GOOGLE_GENERATIVE_AI_API_KEY",
    model: () => google(GOOGLE_MODEL),
    probe: (key: string) => ({
      url: "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1",
      headers: { "x-goog-api-key": key },
    }),
  },
  {
    name: "groq",
    keyVariable: "GROQ_API_KEY",
    model: () => groq(GROQ_MODEL),
    probe: (key: string) => ({
      url: "https://api.groq.com/openai/v1/models",
      headers: { Authorization: `Bearer ${key}` },
    }),
  },
  {
    name: "openrouter",
    keyVariable: "OPENROUTER_API_KEY",
    model: () => openrouter(OPENROUTER_MODEL),
    // The public /models list would succeed with a bad key.
    probe: (key: string) => ({
      url: "https://openrouter.ai/api/v1/key",
      headers: { Authorization: `Bearer ${key}` },
    }),
  },
];
