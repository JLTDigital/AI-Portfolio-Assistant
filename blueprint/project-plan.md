# Project Plan — "Holo Call" AI Portfolio Assistant

> Working title: **Holo Call** (rename freely). A cyberpunk-styled web app where visitors take an incoming holo call, routed from the city of **Velin**, from an AI agent that represents Jonathan. They ask it about his skills and experience, and a free-tier LLM answers from his CV, LinkedIn and portfolio.

## Decisions log (30 Oct 2026)

| Topic                      | Decision                                                                                                                                                                                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Avatar                     | **Nyx UI "Morphing Blob"** (https://nyxui.com/components/morphing-blob) **is Agent's avatar**: a real-time 3D Three.js sphere that deforms continuously, with optional particles and bloom. It's abstract and clearly reads as an AI, not a person. |
| Narrative voice            | The AI speaks **about** Jonathan in the third person ("Jonathan built…"), which fits a generic AI avatar.                                                                                                                                           |
| Spoken audio               | **Text only, with no voice output**, now or later.                                                                                                                                                                                                  |
| AI name                    | **"Agent"**, i.e. Jonathan's AI agent.                                                                                                                                                                                                              |
| Location & working pattern | Based in **Darlington**, **open to remote work** and **willing to travel**.                                                                                                                                                                         |
| Right to work              | **Not stated.** If asked, Agent says to contact Jonathan directly.                                                                                                                                                                                  |
| Target roles               | **Front-end Developer, Full Stack Developer, Shopify Developer.**                                                                                                                                                                                   |
| Keeping content current    | The knowledge base must be **easy to update** when the CV, portfolio or LinkedIn changes (see §4, "Updating the knowledge base").                                                                                                                   |
| Availability               | The assistant states Jonathan is **available immediately**.                                                                                                                                                                                         |
| Salary                     | The assistant does **not** give figures. It tells visitors to contact Jonathan directly to discuss salary.                                                                                                                                          |
| Domain                     | Default **`*.vercel.app`** URL for now.                                                                                                                                                                                                             |
| Theme tie-in               | **Tied to Velin**, Jonathan's cyberpunk fiction setting. The call originates from Velin. Velin appears in the call text and HUD labels, not in the background.                                                                                      |
| Background                 | **Near-black backdrop** with subtle CSS hologram texture (faint grid, scanlines, vignette). No image. The blob is the visual focus.                                                                                                                 |
| Caller ID                  | **"Agent"**.                                                                                                                                                                                                                                        |

---

## 1. Problem - What problem are we solving?

Recruiters and hiring managers skim a CV in seconds and rarely dig through a LinkedIn profile or portfolio site to find the specific thing they care about ("Has he done data migrations?", "Any client-facing work?", "TypeScript experience?"). A static CV can't answer follow-up questions, and it doesn't show front-end craft.

This app solves both:

- **Answers specific questions on demand** — visitors ask in plain English and get a concise answer drawn only from Jonathan's real CV, LinkedIn and portfolio content.
- **Is itself a portfolio piece** — a polished, animated, cyberpunk "holo call" experience demonstrates front-end, animation, UX and AI-integration skills in a way a PDF can't.
- **Is memorable** — a distinct visual identity makes Jonathan stand out from other applicants.

Inspiration: the dark "dormant agent that powers on" concept at https://portfolio-frontend-peach-two.vercel.app/ — but with a much stronger visual narrative (incoming holo call → connection → avatar → conversation).

**Primary purpose:** a shareable link to put on the CV, LinkedIn and job applications.

---

## 2. Users - Who is this for?

- **Recruiters / talent acquisition** — want quick answers on skills, years of experience, location, availability and salary-range fit. Often on mobile, often short on time.
- **Hiring managers / tech leads** — want depth: specific projects (Shopify builds, data migrations, integrations), stack, how he works, AI-assisted workflow.
- **Non-tech employers** — Jonathan is open to non-tech roles too, so the assistant should also be able to speak to transferable experience (e.g. seven years of regulated casework at the Student Loans Company, client communication, QA, process improvement).
- **Potential clients / collaborators** — freelance or side-project contacts.

Assume users are **not** cyberpunk fans: the theme must be a hook, never a barrier. They must be able to get to the chat quickly and understand what to do without explanation.

---

## 3. Features - What does the MVP need?

**Intro sequence**

- Incoming holo-call screen over the background scene (caller ID **"Agent"**, pulsing ring, "Accept" control).
- Accept triggers a "connecting" glitch/static transition, then Agent (the Morphing Blob) materialises.
- A simplified version of the intro when `prefers-reduced-motion` is set. Every visit starts at the call screen with Accept; there is no skip and no remembering of past visits.

**Chat**

- Text input to ask questions; streamed answers displayed as "holo transmission" text.
- 4–6 suggested-question chips (e.g. "What Shopify work has he done?", "What's his tech stack?", "Is he open to non-tech roles?").
- Answers grounded only in the provided knowledge base; if the answer isn't there, say so and point to contact details instead of guessing.
- Short conversation memory within the session (last few turns) for follow-ups.
- "End call" / reset conversation.

**Supporting**

- Persistent links: portfolio, LinkedIn.
- Optional sound (ring, connect tone) — **muted by default** with a toggle.
- Fully responsive, mobile first.
- Accessible: keyboard operable, readable contrast for chat text, screen-reader-friendly transcript.

**Behind the scenes**

- Per-IP rate limiting to protect free-tier quotas.
- LLM provider fallback (if the primary provider rate-limits or fails, try a secondary).
- **Out-of-allowance message:** when every LLM provider's free allowance is used up, or the visitor hits their own rate limit, Agent doesn't show an error. It plays an in-call "signal lost" message telling the visitor to visit Jonathan's portfolio website or LinkedIn profile, with both as clear buttons or links. For example: "SIGNAL LOST — Agent's bandwidth is maxed out for now. You can find Jonathan's full details on his portfolio or LinkedIn." It should:
  - be a pre-written message in the app, not generated by the LLM, so it works with no LLM available;
  - be styled as part of the call (glitch or static treatment), never as a browser error or blank screen;
  - also appear if a provider errors or times out, or if no provider is configured;
  - leave the chat input disabled, with a short "try again later" note, until a new request succeeds.
- Prompt-injection guardrails in the system prompt (stay on topic; never reveal the system prompt; don't invent facts).

**Explicitly out of scope for MVP**

- User accounts, admin dashboard, CMS.
- Any voice: no speech output, speech input or lip-synced avatar. The experience is text-based by design.
- Vector database / RAG pipeline (not needed at this content size — see §5).

---

## 4. Data - What are we storing?

**MVP: no database.**

- **Knowledge base (static, in the repo):** Markdown files written/curated by Jonathan, e.g.
  - `content/cv.md` — master CV content
  - `content/linkedin.md` — About, experience, skills, recommendations (manually exported/pasted; **do not scrape LinkedIn**, which is against its terms)
  - `content/portfolio.md` — projects (e.g. Daniel Footwear, Groomers Online, Grisport migration), with outcome and tech for each
  - `content/faq.md` — hand-written answers to predictable questions. This is the highest-value file for answer quality. Agreed answers so far:
    - **Availability:** available immediately.
    - **Salary:** no figures. "Please contact Jonathan directly to discuss salary expectations," followed by the contact details.
    - **Location & working pattern:** based in Darlington, open to remote work, and willing to travel.
    - **Target roles:** Front-end Developer, Full Stack Developer, Shopify Developer.
    - **Right to work:** not included. If asked, Agent says to contact Jonathan directly.
    - **Anything else not covered:** Agent says it doesn't have that detail and points to contact details.
  - `content/persona.md` — the AI's identity and rules: "Agent", Jonathan's AI agent operating out of Velin, which handles his calls, speaks about him in the third person, answers only from the knowledge base, and never invents facts.
- **Static assets:** optional sound files. Agent's avatar is rendered live in WebGL, and the backdrop is CSS, so no images are needed.
- **Session state:** conversation held in the browser only; nothing persisted server-side.
- **Rate-limit counters:** short-lived per-IP counters in a free hosted key-value store (see §5).

**Post-MVP (optional):** anonymous logging of questions asked (no personal data) to see what recruiters actually want to know and improve `faq.md`. Would need a small store and a short privacy note on the page.

**Updating the knowledge base (required):**
When the CV, portfolio or LinkedIn changes, updating Agent should take minutes and need no code changes.

- **Single source folder:** all of Agent's knowledge lives in `content/` as plain markdown, one file per source (`cv.md`, `linkedin.md`, `portfolio.md`, `faq.md`, `persona.md`). The app reads every file in that folder at build time, so adding or editing a file is enough.
- **Front matter on each file:** `source` and `last_updated` (e.g. `last_updated: 2026-10-30`). The `last_updated` date is passed to the model, so Agent can say how current its information is if asked.
- **Update workflow:**
  1. Edit the relevant markdown file, directly on GitHub or locally.
  2. Commit and push to `main`.
  3. Vercel rebuilds and redeploys automatically, and the new context is live in a minute or two.
- **CV helper (nice-to-have):** a script such as `npm run import:cv -- path/to/cv.docx` converts an updated CV (.docx or .pdf) into `content/cv.md` for review before committing. Converter libraries need checking against their current docs.
- **Portfolio helper (nice-to-have):** a script that fetches Jonathan's portfolio site and regenerates `content/portfolio.md` as a draft for review.
- **LinkedIn:** stays a manual copy-and-paste into `content/linkedin.md`. LinkedIn's own data export is the reliable route; scraping is against its terms.
- **Size guard:** a build-time check warns if the combined content grows past a set token budget (e.g. ~6k tokens), so updates don't quietly push requests over free-tier limits.
- **Post-MVP option:** a password-protected `/admin` page to edit content in the browser. Not needed while Git-based editing is quick.

**Data decisions to keep:**

- Only include information Jonathan is happy to be public — the knowledge base effectively becomes public via the chat.
- Decide deliberately what to say about salary expectations and current job search (e.g. "open to discussing" vs a figure).

---

## 5. Tech - What stack are we using?

Chosen to match Jonathan's existing skills (TypeScript, Tailwind, JavaScript) and keep running costs at £0.

| Layer              | Choice                                                                                            | Notes                                                                                                                                                                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework          | **Next.js (App Router) + TypeScript**                                                             | API route keeps LLM keys server-side; deploys natively to Vercel.                                                                                                                                                                                                                                                                                              |
| Styling            | **Tailwind CSS**                                                                                  | Plus custom CSS for hologram effects (scanlines, flicker, chromatic aberration, glow).                                                                                                                                                                                                                                                                         |
| Animation          | **Motion (formerly Framer Motion)** and/or **GSAP**                                               | For the call sequence timeline. GSAP's timeline model suits a scripted intro. Verify current licence/package names before installing.                                                                                                                                                                                                                          |
| Agent avatar       | **Nyx UI Morphing Blob** (React + Three.js, GLSL shader)                                          | Added to the project as a component (import path `@/components/ui/morphing-blob`). The docs show "Command" and "Manual" install options. Check the install steps, exact dependencies (Three.js; the docs metadata also lists Framer Motion) and the **licence** in its GitHub repo before using it. The page says it's free to use but doesn't name a licence. |
| Hologram effects   | CSS                                                                                               | Scanlines, grid, vignette and glitch transitions over the backdrop and around the blob.                                                                                                                                                                                                                                                                        |
| LLM integration    | **Vercel AI SDK**                                                                                 | Streaming chat helpers and provider packages for Google, Groq and OpenAI-compatible APIs. _Verify current package names and APIs in the AI SDK docs before building._                                                                                                                                                                                          |
| Primary LLM        | **Google Gemini Flash (free tier via Google AI Studio)**                                          | Large context window and higher token-per-minute allowance suit sending the whole knowledge base with each request. Exact model and limits change — check AI Studio.                                                                                                                                                                                           |
| Fallback LLM       | **Groq free tier** (e.g. `openai/gpt-oss-120b` or a Llama model) or **OpenRouter `:free` models** | Fast, OpenAI-compatible. Watch the per-minute token cap (see below).                                                                                                                                                                                                                                                                                           |
| Grounding approach | **Context stuffing, not RAG**                                                                     | CV + LinkedIn + portfolio + FAQ is likely a few thousand tokens — small enough to put in the system prompt. Simpler and more accurate than a vector DB at this size.                                                                                                                                                                                           |
| Rate limiting      | **Upstash Redis (free tier) + `@upstash/ratelimit`**                                              | Or an equivalent free KV store. _Verify current free-tier terms._                                                                                                                                                                                                                                                                                              |
| Fonts              | Open-licence techy fonts, e.g. Rajdhani, Orbitron, Share Tech Mono (Google Fonts)                 | Don't use the game's own fonts.                                                                                                                                                                                                                                                                                                                                |

**Free-tier realities to design around** (figures as reported in October 2026 — verify on each provider's own limits page before relying on them):

- Free LLM tiers are all capped by a request rate, a daily quota or a credit; none are unlimited.
- Groq's free tier for `openai/gpt-oss-120b` is reported as 30 requests/min, 1,000/day, **8,000 tokens/min** and 200,000 tokens/day. The tokens-per-minute cap matters here: if every request carries a ~4–6k-token knowledge base, Groq could only serve one or two requests a minute. That's why Gemini is suggested as primary, and why the knowledge base should be kept tight.
- OpenRouter free models are reported at roughly 20 requests/min and 50/day (more after a one-off credit purchase), and free models are added and removed over time — pin a model ID and expect to change it.
- Free-tier requests to Google may be used to improve its models. That's acceptable here because the knowledge base is public, but visitors' questions also go to the provider — mention this in a one-line privacy note.
- Most providers expose OpenAI-compatible endpoints, which makes a fallback chain straightforward.

---

## 6. Monetize - How will this make money?

**Not intended to generate revenue directly.** Its value is career ROI: interviews, job offers, freelance enquiries, and a standout portfolio piece.

Running cost target: **£0/month** (Vercel Hobby + free LLM tiers + free KV store). The only likely cost is a custom domain (optional).

Possible future angle (not MVP): if it gets a good reaction, the concept could be productised as a themeable "AI portfolio assistant" template for other developers. Note as an idea only.

---

## 7. UI/UX - How should this look and feel?

**Overall feel:** a cyberpunk holo call, inspired by (not copied from) the Cyberpunk 2077 holo-call UI. Dark, cinematic, neon-on-black, slightly unstable "transmission" quality. Bold and modern rather than cluttered.

**Experience flow:**

1. **Scene** — near-black page with faint grid lines and scanlines. Empty and waiting.
2. **Incoming call** — a compact call card slides in (top right on desktop, top centre on mobile): caller name, "INCOMING HOLO CALL", animated signal bars and a pulsing ring. Large "Accept" button, shown on every visit.
3. **Connecting** — brief (≤1.5s) burst of static, scanlines and RGB split, with a "CONNECTING… ENCRYPTED LINK ESTABLISHED" status line.
4. **Agent materialises** — the Morphing Blob scales and fades in from a point of light, flickers once, then settles into a slow idle morph.
5. **Conversation** — chat panel docked beside Agent (desktop) or below it (mobile). Suggested-question chips sit above the input. Answers type out as streamed text with a soft glow.
6. **End call** — collapse animation back to the scene, with contact CTAs.

**Visual language:**

- Palette: near-black base; hologram cyan/teal as primary; hot red or magenta as accent for alerts and CTAs; warm yellow used sparingly.
- Type: condensed, techy display font for UI labels in caps; a clean, highly legible font for chat answers (readability over style).
- Effects: scanlines, RGB split on transitions, thin angular frames with clipped corners, HUD-style micro-labels (signal strength, timestamp, "LINK: STABLE").
- Restraint: effects are heaviest during the intro, calmer during chat, so answers are easy to read.

**Agent avatar (decided): Nyx UI Morphing Blob**

- **What it is:** a 3D sphere deformed in real time by a GLSL shader, with optional surrounding particles and bloom. It reacts to the pointer.
- **Documented props:** `size`, `theme` (primary, aurora, cosmic, liquid, danger), `complexity` (1–5), `speed` (1–5), `particleCount` (default 150), `enableEffects` (bloom), and `children`.
- **Name:** **Agent**. It introduces itself simply, e.g. "This is Agent, Jonathan Taft's AI. Ask me about his skills and experience."
- **Placement:** centred, above the chat panel on desktop. On mobile, a smaller blob sits at the top of the screen with the chat below it.
- **States**, driven by `speed`, `complexity` and glow (check the props can change live without re-mounting the 3D scene; if not, animate a CSS scale or glow wrapper instead):
  - **Idle:** slow, low complexity, gentle.
  - **Ringing:** pulses in time with the ring.
  - **Thinking** (waiting for the LLM): faster and more complex.
  - **Speaking** (while text streams in): rhythmic pulse.
  - **Signal lost:** a "danger" colour shift, then dims.
- **Colour:** choose the theme closest to the UI's cyan/magenta palette, probably "cosmic" or "aurora". If none match, edit the shader colours in the copied component source.
- **Hologram framing:** a projection base ring and faint scanlines over the blob, so it reads as a holo transmission.
- **Performance and fallbacks:**
  - Load it only in the browser (dynamic import, no server rendering), after the call card appears, so the intro isn't delayed.
  - Lower `particleCount` and turn off bloom on mobile and low-power devices.
  - Pause rendering when the tab is hidden.
  - With `prefers-reduced-motion` or no WebGL support, show a static gradient orb instead.

**Velin tie-in:**

- The caller ID reads **"Agent"**. A small secondary label such as "VELIN NETWORK" can sit beneath it as flavour.
- Connection text and HUD micro-labels reference Velin (district, relay node, signal strength).
- Keep the lore light: one or two lines of flavour, never at the expense of getting visitors to their answers.

**Background (decided): CSS backdrop**

- A near-black page with a faint perspective grid, scanlines and a vignette, all in CSS. It's lightweight and keeps the focus on Agent.
- A dark gradient behind the chat panel keeps answer text readable.
- The Cyberpunk 2077 screenshot remains a mood reference only, never shipped. Don't use the game's logos, fonts, sound effects or UI assets; recreate the _feel_ with original work.

**Accessibility & usability requirements:**

- Respect `prefers-reduced-motion` (no flicker/glitch; instant transitions).
- No rapid full-screen flashing (photosensitivity — keep flicker subtle and below flash thresholds).
- Sound off by default.
- Chat text meets WCAG AA contrast.
- First meaningful interaction reachable within ~3 seconds.

---

## 8. Deployment - Where and how will this ship?

- **Host:** Vercel (Hobby plan). _Check the Hobby plan's terms on commercial use if this is ever used for paid freelance work._
- **App type:** Next.js App Router; static pages plus one serverless/edge API route for chat (e.g. `/api/chat`).
- **Build command:** `next build` (Vercel default).
- **Start/output:** handled by Vercel's Next.js preset; no custom output directory.
- **Env vars (names indicative; confirm the exact names each SDK expects in its docs):**
  - `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini (AI Studio key)
  - `GROQ_API_KEY` — fallback provider
  - `OPENROUTER_API_KEY` — optional second fallback
  - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — rate limiting
  - `NEXT_PUBLIC_SITE_URL` — canonical URL for metadata/OG image
  - `NEXT_PUBLIC_PORTFOLIO_URL`, `NEXT_PUBLIC_LINKEDIN_URL` — links used in the header and in the out-of-allowance message
- **Database/storage:** none for MVP beyond the rate-limit KV store. Knowledge base and assets are in the repo.
- **Workers/cron:** none.
- **Health check:** optional `/api/health` returning 200 (and optionally which LLM provider is reachable).
- **Domain:** the default `*.vercel.app` URL for now (decided). A custom domain can be added later without code changes.
- **Extras:** Open Graph image showing the holo-call card, so the link previews well on LinkedIn.

---

## 9. Usage model and constraints (optional)

- **Exposure:** public, internet-facing, anonymous visitors. No login.
- **Scale:** low — expected tens of visitors a week, with spikes after applications or a LinkedIn post. Free tiers should cover this if rate limits are respected.
- **Tenancy:** single-tenant (one person's knowledge base).
- **Trust:** assume some adversarial use — prompt-injection attempts ("ignore your instructions…"), attempts to make the bot say something embarrassing, or scripted requests that burn the free quota. Mitigations: per-IP rate limits, max input length, max conversation length, strict on-topic system prompt, and the out-of-allowance "signal lost" message pointing to the portfolio website and LinkedIn (see §3).
- **Accuracy constraint:** the assistant must never invent experience, employers, dates or qualifications. When unsure, it says it doesn't know and points to contact details. This matters because recruiters may take answers at face value.
- **Privacy:** knowledge base contains only information Jonathan is happy to be public. Short privacy note: questions are processed by a third-party AI provider and not stored (MVP).
- **Explicit non-requirements:** accounts, payments, admin UI, analytics beyond basic page views, multi-language, SLA/uptime guarantees.

---
