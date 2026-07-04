# OpenCode Mod

This is a modded fork of [OpenCode](https://github.com/anomalyco/opencode) — the open source AI coding agent — bundled with extra free AI model providers built into the config.

## What's Added

Three additional providers pre-configured in `.opencode/opencode.jsonc` — all free, no paid keys needed:

| Provider | API Endpoint | Models |
|---|---|---|
| **Sixfinger** | `https://api.sixfinger.live/v1` | 30+ models (Claude Opus 4.8, GPT-5.5, DeepSeek V4, Gemini 3.5 Flash, GLM-5, Kimi K2.7, Qwen3, Llama 3.3 70B, etc.) |
| **Gratisfy** | `https://api.gratisfy.xyz/v1` | 20 provider gateways (OpenRouter, Cloudflare, Ollama, Google AI Studio, Mistral, Vercel AI, Cerebras, Cohere, Groq, NVIDIA NIM, Codestral, etc.) |
| **Pollinations** | `https://gen.pollinations.ai/v1` | 60+ models (GPT-5.5, GPT-5.4, DeepSeek V4, Qwen3, GLM-5, Kimi, Mistral 4, Grok 4.3, Gemini, Claude Opus 4.8, community models, Flux image gen, MidiJourney, etc.) |

## Features

### Chat Archive System
- **Auto-save**: Every chat is automatically saved whenever a message is sent
- **Hamburger menu**: Click the ☰ button in the top-left corner to browse saved chats
- **Keyboard navigation**: Use `j`/`k` to navigate, `Enter` to open, `Esc` to close
- Chats persist across sessions in `~/.local/share/opencode/chat-archive/`

## Setup

```bash
# Clone
git clone https://github.com/JustScriptzz/OpenCode_Mod.git
cd opencode-mod

# Install deps and build
bun install
bun run build

# Run the modded opencode
bun run dev

# Or install globally
bun link
opencode

# Add your API keys as env vars
# SIXFINGER_API_KEY=...
# GRATISFY_API_KEY=...
# POLLINATIONS_API_KEY=...
```

Config lives at `.opencode/opencode.jsonc`. Add the env vars above, and opencode will auto-discover all three providers and their models.

## Upstream

Built on [OpenCode](https://github.com/anomalyco/opencode) `dev` branch. See [CONTRIBUTING.md](./CONTRIBUTING.md) for upstream contribution guidelines.
