# The Qwen Revolution: From Alibaba's Lab to Your Laptop

## A Podcast Script on Qwen 3.5, Local Coding Agents, and the Open-Weight Future

---

**[INTRO — upbeat music fades]**

**HOST:** Welcome back to another episode. Today we're going deep on what might be the most important open-weight model family in the world right now — the Qwen series from Alibaba Cloud. We're going to trace how it got here, why Qwen 3.5 specifically is causing so much excitement, and then we're going to get practical. We'll talk about running it locally with Ollama — including some nasty bugs you need to know about — how to wire it into Claude Code and the Pi coding agent, and finally, who else is competing for that "best local model on your Mac" crown. Sound good? Let's get into it.

---

## ACT ONE: The Rise of Qwen

**HOST:** So the story starts in April 2023. Alibaba launches something called Tongyi Qianwen — which roughly translates to "understanding a thousand questions" — under an internal beta. It was initially a proprietary chatbot, and honestly, at that point, the Western AI world wasn't paying much attention. China had its own AI race happening, but models like ChatGPT and Claude were dominating the conversation.

By September 2023, Alibaba opens Tongyi Qianwen to the public after getting regulatory clearance from Beijing. Then in December 2023, they do something that changes the trajectory of the whole project: they start releasing model weights. The 72 billion parameter and 1.8 billion parameter versions go up for download. The architecture was based on Meta's LLaMA design — decoder-only transformers with RMSNorm, SwiGLU activations, and rotary positional embeddings.

Now, calling Qwen "open source" is a bit generous. The training code was never released, and the training data was never documented. The Linux Foundation's Model Openness Framework would not consider these truly open-source. But the weights were out there, and the community ran with them.

**[beat]**

Then came Qwen 1.5 in early 2024 — a refinement pass. The models got better at instruction following, the fine-tuning community started adapting them for all sorts of tasks, and the first Mixture-of-Experts variant appeared as Qwen 1.5 MoE.

June 2024 brought Qwen 2. This was the generation where things started to get serious. Grouped Query Attention for better key-value cache efficiency. Better long-context handling. Both dense and sparse model variants. By this point, benchmarking platforms were ranking the 72B instruct variant right behind GPT-4o and Claude 3.5 Sonnet, and ahead of every other Chinese model.

**HOST:** September 2024: Qwen 2.5 drops, and this is where the model family really branches out. New sizes — 3B, 14B, 32B — plus specialized variants. Qwen 2.5 Math with tool-integrated reasoning. Qwen 2.5 VL with dynamic-resolution vision transformers. Qwen 2.5 Coder, which became a darling of the local coding community. Qwen 2.5 Omni that could handle text, images, video, and audio in one model. This is when the Western developer community really started paying attention. The 2.5 Coder models, in particular, were punching well above their weight class for code generation.

November 2024 brought QwQ-32B-Preview — Alibaba's answer to OpenAI's o1. A reasoning-focused model that could do step-by-step chain-of-thought, released under Apache 2.0 though, again, only the weights.

**[transition beat]**

April 28, 2025: Qwen 3 arrives. This is the generation that made the wider AI community sit up and take real notice. Dense models from 0.6B up to 32B parameters. MoE models at 30B with 3B active and 235B with 22B active. All licensed under Apache 2.0. Trained on 36 trillion tokens across 119 languages. And here's the key innovation: a unified "thinking mode" and "non-thinking mode" in the same model. You could toggle between deep chain-of-thought reasoning and fast, direct responses without switching models. The four-stage training pipeline — long chain-of-thought cold start, reasoning-based reinforcement learning, thinking mode fusion, and general RL — became a template that others would follow.

Then over the fall of 2025: Qwen 3 Max, Qwen 3 Next with its ultra-sparse architecture, Qwen 3 Omni with multimodal generation, and Qwen 3 Max Thinking in January 2026. Each iteration pushing the boundaries further.

Which brings us to the main event.

---

## ACT TWO: Qwen 3.5 — The Full Family

**HOST:** February 16, 2026. The Qwen team drops Qwen 3.5, and it's immediately clear this isn't just another incremental update. This is a generational leap.

The flagship model is the 397B-A17B — 397 billion total parameters with only 17 billion active per forward pass, thanks to the Mixture-of-Experts architecture. But what makes Qwen 3.5 architecturally distinctive is something called the Gated DeltaNet hybrid attention mechanism.

Here's what that means in plain English. Standard transformer attention scales quadratically — double your context window and you quadruple the compute. Qwen 3.5 alternates between two types of attention in a 3-to-1 ratio. Three blocks of linear attention using Gated Delta Networks — which combine Mamba 2's gated decay with a delta rule for updating hidden states — followed by one block of traditional full softmax attention. The linear blocks maintain constant memory complexity for efficient long-context processing, while the full attention blocks preserve the precision needed for complex reasoning.

The practical result? A million-token context window at reasonable compute costs. Native 256K context across the open-weight models. And dramatically faster inference — benchmarks showed Qwen 3.5 Plus delivering responses six times faster than Claude Sonnet 4.6 while maintaining competitive quality.

**HOST:** Two weeks after the flagship, on February 24, the medium series ships. Four models: Qwen 3.5 Flash, the 35B-A3B, the 122B-A10B, and the 27B. And this is where the story gets really exciting for local deployment.

The 35B-A3B is the standout. Thirty-five billion total parameters, but only 3 billion active per token. That means it runs comfortably on a single RTX 5090, a 32GB Mac, or even a 24GB GPU at Q4 quantization. And despite its compact active footprint, it outperforms the previous generation's 235B model. It matches GPT-5 mini on SWE-bench Verified at 72.4. It has native tool calling trained across a million reinforcement learning environments. The 1M token context window means you can feed it entire codebases without chunking.

The 122B-A10B scored 72.2 on BFCL-V4 for tool use, outperforming GPT-5 mini by a thirty percent margin. And on instruction following — IFBench — the flagship Qwen 3.5 hit 76.5, beating both GPT-5.2 and Claude Opus 4.6.

**HOST:** Then on March 2, the small series completes the lineup. Four models: 0.8B, 2B, 4B, and 9B. All natively multimodal — text, images, and video from the same weights, no adapter bolted on. All sharing the Gated DeltaNet hybrid architecture with 262K native context and multi-token prediction. All Apache 2.0.

The 9B model is the jaw-dropper. It beats the previous-generation 80B model on GPQA Diamond. It outperforms GPT-5 Nano on MMMU-Pro by thirteen points. It matches models that are three to thirteen times its size across multiple benchmarks. And it runs on a single consumer GPU. Six and a half gigabytes via Ollama.

The training approach is what makes this work. These aren't distilled versions of a bigger model crammed into a smaller architecture. They use strong-to-weak knowledge distillation from the 397B and medium-series teachers, combined with scaled reinforcement learning across large simulated environments, and a DeepStack Vision Transformer that captures temporal dynamics in video through 3D convolutional patch embeddings. The result is "more intelligence, less compute" — which isn't just a marketing slogan this time.

---

## ACT THREE: Ollama — The Bugs, The Fixes, The Workarounds

**HOST:** Alright, so you've heard the pitch. Qwen 3.5 is incredible on paper. Now let's talk about what happens when you try to actually run it locally through Ollama. Because there have been... issues.

Ollama has become the go-to runtime for local LLMs — it handles model downloads, quantization, GPU detection, and serves an API, all from a simple command line. But Qwen 3.5 introduced a novel architecture — the Gated DeltaNet hybrid — and Ollama's support has been, let's say, an evolving situation.

**HOST:** Let's start with the most critical problem: tool calling. If you're running Qwen 3.5 as a coding agent, tool calling is the entire point — it's how the model reads files, executes commands, edits code. And on launch, tool calling was completely broken.

A detailed bug report on GitHub — issue 14493 — identified six concrete mismatches between what Ollama sends to the model and what the model was trained on. The most devastating: when an assistant message has thinking content plus tool calls but no text content — which is the standard "think then call a tool" pattern — the renderer never emits a closing think tag. The tool call gets rendered inside an unclosed think block, which corrupts every subsequent turn. Ollama version 0.17.3 fixed the parser side, but the renderer side remained broken for multi-turn prompts.

There were also problems with the generation prompt after tool call turns. When the last message is an assistant message with tool calls, the renderer treated it as a prefill — an incomplete turn to be continued — and never emitted the proper end-of-turn tokens. This broke the entire tool call round-trip loop. And the Coder pipeline had zero thinking support at all.

**HOST:** Beyond tool calling, there were other pain points. The Go runner's sampler had zero implementation of penalty sampling. The repeat penalty, presence penalty, and frequency penalty parameters were accepted by the API without error and silently discarded. The model card explicitly recommends a presence penalty of 1.5 to prevent repetition loops during thinking — and Ollama was just... ignoring it. The result? Models would sometimes get stuck in infinite chain-of-thought loops that never resolved into a final answer.

There were also GPU/CPU split crashes. If the model didn't fully fit in VRAM and had to split layers across GPU and CPU, Ollama would crash entirely — not just slow down, crash. And some users reported that Qwen 3.5 models pulled from HuggingFace in GGUF format wouldn't load at all, just returning 500 Internal Server Errors with empty logs.

And speed. Some users found Ollama was delivering 15 to 20 tokens per second on the 35B-A3B model where plain llama.cpp on the same hardware was hitting 100 tokens per second. A five-times speed penalty is hard to swallow.

**[beat]**

**HOST:** So what's the current state and what should you do about it?

First and most importantly: update Ollama. The current stable release as of this recording is 0.17.7, from March 5, 2026. The key fixes rolled out across several versions. Version 0.17.3 fixed tool call parsing during thinking mode. Version 0.17.4 added support for the Gated DeltaNet architecture itself — without this, Qwen 3.5 won't even load. Version 0.17.5 fixed the GPU/CPU split crash and added the missing presence penalty handling. Version 0.17.6 fixed remaining tool call parsing issues. If you're on anything older than 0.17.7, update before you do anything else.

Second: if you need rock-solid tool calling right now and Ollama is still giving you trouble, consider using llama.cpp directly via llama-server. The Jinja flag is critical — without it, tool calling doesn't work. The community has converged on a specific llama-server configuration for Qwen 3.5 on Apple Silicon that disables thinking mode for agent use — because thinking mode plus tool calling is where most of the remaining issues live.

Third: consider the Unsloth GGUF quantizations. They released updated quantizations on March 5 with an improved algorithm and new importance matrix data, specifically improving chat, coding, long context, and tool calling. Their chat template fixes also improved tool calling reliability.

Fourth: if you're still seeing the model print tool calls as text instead of executing them — which was reported as recently as last week — the workaround is to make sure you're on Ollama 0.17.5 or newer and that you're using the official Ollama library models, not third-party GGUF files. The official models have the correct renderer and parser tags baked in.

---

## ACT FOUR: Claude Code — Your Local Coding Agent

**HOST:** Now let's talk about something beautiful: running Claude Code — Anthropic's agentic coding tool — but powered by a local Qwen 3.5 model. No API keys. No cloud. No surprise bills. Just your machine.

In January 2026, Ollama added support for the Anthropic Messages API. That's the key that unlocked this. Claude Code thinks it's talking to Anthropic's servers, but it's actually talking to a quantized open-weight model on localhost.

The setup is straightforward. You need Ollama installed and a model pulled. For most people, the recommended starting point is the 35B-A3B model:

```
ollama pull qwen3.5:35b-a3b
```

Then you set three environment variables:

```
export ANTHROPIC_AUTH_TOKEN=ollama
export ANTHROPIC_API_KEY=""
export ANTHROPIC_BASE_URL=http://localhost:11434
```

Then launch Claude Code pointing at your model:

```
claude --model qwen3.5:35b-a3b
```

If you want it permanent, add those variables to your shell profile or, better yet, create a settings file at `~/.claude/settings.json` that maps all the model slots — Opus, Sonnet, Haiku, subagent — to your local model.

**HOST:** For Apple Silicon users who want even better performance, there's an alternative path using llama-server directly instead of Ollama. The advantage is you get fine-grained control over context size, KV cache quantization, flash attention, and threading. A popular configuration runs llama-server on port 8131 with the Unsloth Q4_K_M quantization, 128K context, Q8 KV cache, flash attention enabled, and thinking mode disabled. You point ANTHROPIC_BASE_URL at localhost:8131 and Claude Code connects the same way.

The 35B-A3B at Q4 quantization needs about 20 gigabytes. On a 32GB Mac, that leaves headroom for the KV cache and OS. On 64GB, you're comfortable. On 24GB VRAM with an NVIDIA card, it fits.

**HOST:** Let's talk about what works and what doesn't.

What works surprisingly well: scaffolding new features, generating boilerplate, writing tests, fixing bugs with clear error messages, implementing well-defined features, and iterating on code with feedback loops. The multi-file editing, the ability to read your project structure, run commands, and act on the results — it all functions.

What's weaker compared to the full Anthropic API: massive architectural decisions spanning twenty-plus files, highly nuanced refactoring of complex legacy code, and tasks that need the absolute largest context windows. The quality gap is real but shrinking fast.

Some practical use cases people are running locally right now: spinning up new projects with proper structure and configuration, writing comprehensive test suites, debugging with stack traces pasted in, documentation generation, code review, and refactoring within bounded scope. One developer described it as "having a competent junior developer who never sleeps and works for free."

---

## ACT FIVE: The Pi Coding Agent

**HOST:** Now let's talk about Pi. Not the number, not the Raspberry Pi — though there is a Raspberry Pi connection — but the Pi coding agent built by Mario Zechner, which lives inside a broader toolkit called pi-mono.

Pi describes itself as "a minimal terminal coding harness," and that minimalism is the whole philosophy. Where Claude Code gives you a curated, opinionated experience, Pi gives you a blank canvas and says: if you want the agent to do something it doesn't do yet, ask the agent to extend itself.

Pi is a collection of layered TypeScript packages. pi-ai handles LLM communication across providers — OpenAI, Anthropic, Google, Ollama, whatever. pi-agent-core adds the agent loop with tool calling and state management. pi-coding-agent is the full interactive CLI with built-in tools — read, write, edit, bash, grep, find, ls — plus session persistence and extensibility. And pi-tui provides a terminal UI library.

**HOST:** The connection to Qwen 3.5 and local models is through Pi's model registry, which reads from a models.json file. You can point it at your local Ollama instance running Qwen 3.5 with a few lines of configuration — set the base URL to localhost:11434, set the API format to OpenAI completions compatible, and list your model IDs. Models defined there show up alongside Pi's built-in catalog, and you can swap between local and cloud models on the fly.

What makes Pi interesting for local LLM users specifically is its session tree architecture. Sessions are trees, not linear histories. You can branch off to fix a broken tool or investigate a side quest, then rewind back to an earlier point and continue. Pi summarizes what happened on the other branch. This matters enormously for local models because context windows are more precious — you're typically running at 64K or 128K, not the millions you'd get from a cloud API. Branching lets you explore without burning your whole context budget.

Pi also has a self-extension philosophy that pairs well with coding-capable models like Qwen 3.5. Extensions can register tools, render custom TUI components, and persist state. The agent can write its own extensions, hot-reload them, test them, and iterate — all within a session. Armin Ronacher, the creator of Flask, wrote about using Pi almost exclusively as his coding agent, praising this "malleable like clay" design where the agent extends itself rather than relying on a marketplace of plugins.

**HOST:** The broader ecosystem matters here too. Pi is the engine underneath OpenClaw, which is a multi-channel AI assistant that runs agents across WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Google Chat, Microsoft Teams, and more, with shared memory and persistent sessions. Raspberry Pi even published an official guide for running OpenClaw on their hardware — the wedding photo booth example has been making the rounds. PicoClaw is a slimmed-down variant designed for minimal hardware like the Pi Zero.

For getting Qwen 3.5 working in Pi specifically: install Pi via npm, configure your models.json to point at your local Ollama or llama-server instance, make sure you're using a model with reliable tool calling — the 35B-A3B or 27B at Q4 are the community-vetted choices — and then just start talking to it.

There's also oh-my-pi, a fork by can1357 that adds hash-anchored edits, LSP integration, a browser tool with stealth plugins, Python execution, subagents, and role-based model selection. It lets you assign different models to different roles — a small fast model for exploration, a slow powerful model for complex reasoning, and a planning model for architecture. This maps perfectly to the Qwen 3.5 family: use the 9B for quick exploration, the 35B-A3B for main coding, and maybe a cloud model as a fallback for the hardest tasks.

---

## ACT SIX: The Competition on Apple Silicon

**HOST:** Alright, final act. You've decided to run a local coding agent. You have an Apple Silicon Mac. Who's competing with Qwen 3.5 for that slot?

Apple Silicon is uniquely interesting for local LLMs because of unified memory. There's no separate VRAM — the entire RAM pool is available to the GPU. A 32GB Mac effectively has 32GB of "VRAM," which would cost significantly more on the NVIDIA side. And Apple's MLX framework, built from the ground up for unified memory, delivers 20 to 30 percent better performance than llama.cpp, with the gap widening on larger models.

**HOST:** At the 8 to 16GB tier — the base Mac Mini or MacBook Air — your options are limited but Qwen dominates. The Qwen 3.5 9B at Q4 fits in 6.6 gigabytes and beats models three to thirteen times its size. Its nearest competitor here is DeepSeek R1 Distill Qwen 8B for pure reasoning tasks, but for general coding agent work, the 9B is the pick. Phi-4-mini at 3.8B is the only option if you're on 8GB.

At the 24GB tier — Mac Mini M4 Pro — the 14B class opens up. Qwen 3 14B at Q4 is the top general pick, with DeepSeek R1 Distill 14B as a reasoning-focused alternative. But for coding agents specifically, you can start fitting the 35B-A3B here, though it's tight.

At 32GB — the sweet spot for most developers — the Qwen 3.5 35B-A3B is the daily driver. Only 3 billion active parameters means it's fast, but the 35 billion total means it's smart. The main challenger here is GLM-4.7 Flash from Zhipu AI, which won agentic coding challenges in independent testing and scored a 30.1 Intelligence Index. It handles planning, multi-step tool use, and multi-file code generation with strong consistency. Community consensus is Qwen 3.5 35B-A3B or GLM-4.7 Flash, depending on whether you prioritize breadth of capability or agentic reliability.

Devstral from Mistral is another serious contender — the 24B variant runs well on 32GB machines and has proven stable for agent tasks. Some production users prefer it for its reliability over flashier benchmarks.

**HOST:** At 48GB and beyond, you're in luxury territory. Qwen 3.5 122B-A10B fits and delivers frontier-adjacent performance. Qwen 3 32B dense runs beautifully at this tier too. And if you're on a Mac Studio with 192GB or the new M5 Max, you can run the full Qwen 3.5 397B-A17B locally — frontier-class AI on your desk, no cloud required.

A few practical notes from the community. LM Studio and llama-server tend to outperform Ollama for production agent work on Apple Silicon — multiple production users have noted better stability and performance. Raising the macOS GPU memory cap with `sudo sysctl iogpu.wired_limit_mb` is critical on 32GB machines. And KV cache Q8 quantization nearly doubles usable context on Apple Silicon.

The broader landscape also includes NVIDIA's Nemotron 3 Nano 30B for math-heavy workloads, Meta's Llama 4 Scout for the broadest general capability, and Cohere's Command R+ for RAG-heavy use cases. But for the specific intersection of coding agent capability, tool calling reliability, and Apple Silicon efficiency, Qwen 3.5 and GLM-4.7 Flash are the models to beat right now.

---

**[OUTRO]**

**HOST:** So where does this leave us? Three years ago, running a frontier-capable AI model locally was a fantasy. Two years ago, it was possible but painful. Today, you can pull a single command, wire it into Claude Code or Pi, and have a genuinely useful coding agent running entirely on your laptop for zero per-token cost.

Qwen 3.5 is arguably the model that made that real for most developers. The MoE architecture means you get frontier-class intelligence at a fraction of the compute. The Apache 2.0 license means you own your stack. And the Ollama bugs — while real and frustrating — are getting fixed at a pace that suggests the ecosystem is taking local deployment seriously.

Is it as good as Claude Opus 4.6 or GPT-5.2 on the hardest tasks? No. Not yet. But for the vast majority of day-to-day coding work — building features, fixing bugs, writing tests, scaffolding projects — it's shockingly competent. And it's free. And it's private. And it runs on a Mac Mini.

That's a different world than we lived in a year ago.

Thanks for listening. If you're running Qwen 3.5 locally, come tell us about your setup. We'll see you next time.

**[outro music]**

---

*Script length: approximately 25 minutes at podcast reading pace.*
*Sources: Qwen team releases, Ollama GitHub issues, community benchmarks, and developer guides as of March 2026.*
