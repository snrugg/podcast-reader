# Kokoro Podcast Player

A browser-based TTS podcast player powered by [Kokoro-82M](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX), running entirely locally — no API keys, no cloud.

## Usage

1. Serve the file from a local web server (required for ES modules and WebGPU):
   ```
   python3 -m http.server 8080
   ```
2. Open `http://localhost:8080/kokoro-podcast-player.html` in Chrome or Edge
3. Click **Load Model** (downloads ~150MB of weights, cached after first load)
4. **Drag and drop a `.md` script file** onto the page to load your podcast script
5. Click ⚡ on any section to generate audio, or use **⚡ Generate All** to queue everything

Generated audio can be downloaded as **WAV** or **MP4** from the player bar.

---

## Script Format

Scripts must be written in a specific Markdown format. Use the prompt below to generate one with any LLM.

### LLM Prompt

```
Write a podcast script on the topic: [YOUR TOPIC HERE]

Format the output as Markdown using this exact structure:

---

# [Episode Title]

## [One-line tagline or subtitle describing the episode]

---

**[INTRO — brief description of any music/atmosphere]**

**HOST:** [Opening monologue — welcome the listener, introduce the topic, preview what will be covered.]

---

## ACT ONE: [Section Title]

**HOST:** [Spoken content for this section. Write in a natural, conversational podcast voice — not bullet points. Use full paragraphs. Aim for 200–400 words per section.]

**[beat]**

[Continue HOST paragraphs as needed. Use **[beat]** or **[transition beat]** on its own line to mark natural pauses between paragraphs within a section.]

---

## ACT TWO: [Section Title]

**HOST:** [Content...]

---

[Continue with as many ACT sections as needed. Typical episodes have 5–8 acts.]

---

**[OUTRO]**

**HOST:** [Closing thoughts. Summarize key takeaways, invite listener engagement, sign off.]

---

*Script length: approximately [X] minutes at podcast reading pace.*
*Sources: [list any sources or note if fictional/illustrative]*

---

Rules to follow:
- Every section of spoken content must be preceded by **HOST:** on the same line
- Stage directions (music cues, beats, pauses) go on their own line wrapped in **[brackets]** — the player strips these before generating audio
- Separate every section with a line containing only ---
- Do NOT include code blocks, tables, or bullet lists — this is spoken audio only
- Do NOT include multiple speakers or dialogue — single host only
- Each ACT heading should be descriptive enough to serve as a chapter title
- Aim for 150–300 words per ACT section for natural pacing (~1–2 minutes of audio each)
```

### What the player strips before TTS

The parser removes the following automatically so they are not spoken aloud:

| Element | Example |
|---|---|
| Section headings | `## ACT ONE: The Rise of Qwen` |
| Stage directions | `**[INTRO — upbeat music fades]**` |
| HOST labels | `**HOST:**` |
| Code blocks | ` ```...``` ` |
| Metadata lines | `*Script length: approximately 25 minutes*` |

### What populates the page header

| Markdown | Page element |
|---|---|
| `# Episode Title` | Main heading |
| `## Tagline subtitle` | Subtitle |
