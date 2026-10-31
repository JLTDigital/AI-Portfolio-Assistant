# Holo Call - Project Overview

<!-- blueprint:source-hash afb3b735c8e8f719524341d022d7c735401c2363880ebff5d94e519c836c0e90 -->

> A cyberpunk "holo call" web app where visitors accept a call routed from the city of Velin and ask "Agent", Jonathan's AI agent, about his skills and experience. A free-tier LLM answers only from his CV, LinkedIn and portfolio content.

**Primary purpose:** a shareable link for the CV, LinkedIn and job applications. "Holo Call" is a working title.

## Problem

Recruiters and hiring managers skim a CV in seconds and rarely dig through LinkedIn or a portfolio for the specific thing they care about. A static CV can't answer follow-up questions and doesn't show front-end craft. Holo Call answers specific questions on demand from real content, and is itself a memorable portfolio piece demonstrating front-end, animation, UX and AI-integration skills.

## Users

All visitors are anonymous; there are no access tiers.

- **Recruiters / talent acquisition** - quick answers on skills, experience, location and availability. Often on mobile and short on time.
- **Hiring managers / tech leads** - depth on projects (Shopify builds, data migrations, integrations), stack, ways of working and AI-assisted workflow.
- **Non-tech employers** - transferable experience, e.g. seven years of regulated casework at the Student Loans Company, client communication, QA and process improvement.
- **Potential clients / collaborators** - freelance or side-project contacts.

Assume users are not cyberpunk fans. The theme is a hook, never a barrier: they must reach the chat quickly and understand it without explanation.

## Usage model

- **Exposure:** public, internet-facing, anonymous, no login.
- **Scale:** low - tens of visitors a week, with spikes after applications or a LinkedIn post.
- **Tenancy:** single-tenant (one person's knowledge base).
- **Trust:** assume some adversarial use - prompt injection, attempts to make the bot embarrass itself, and scripted requests that burn free quota. Mitigations: per-IP rate limits, max input length, max conversation length, strict on-topic system prompt, and the "signal lost" message.
- **Accuracy:** never invent experience, employers, dates or qualifications. When unsure, say so and point to contact details; recruiters may take answers at face value.
- **Privacy:** the knowledge base holds only information Jonathan is happy to make public. Questions go to a third-party AI provider; the app stores nothing server-side except short-lived rate-limit counters.
- **Non-requirements:** accounts, payments, admin UI, analytics beyond basic page views, multi-language, SLA/uptime guarantees.

## Agent behaviour

Agreed rules for persona, knowledge base and prompt:

- **Identity:** "Agent", Jonathan's AI agent operating out of Velin, which handles his calls. Introduces itself simply, e.g. "This is Agent, Jonathan Taft's AI. Ask me about his skills and experience."
- **Voice:** third person about Jonathan ("Jonathan built…").
- **Grounding:** answers only from the knowledge base. If the answer isn't there, says so and points to contact details.
- **Guardrails:** stay on topic, never reveal the system prompt, don't invent facts.
- **Currency:** can say how current its information is, using `last_updated`.
- **Availability:** available immediately.
- **Salary:** no figures. "Please contact Jonathan directly to discuss salary expectations," plus contact details.
- **Location & working pattern:** based in Darlington, open to remote work, willing to travel.
- **Target roles:** Front-end Developer, Full Stack Developer, Shopify Developer.
- **Right to work:** not stated. Agent says to contact Jonathan directly.

## Features

In build-plan order. The headline experience is the grounded chat (1-8) inside the holo call (9-13).

1. **Knowledge base loader** - read every markdown file in `content/` with front matter, combine into one context, warn at build time past the token budget.
2. **Agent persona & grounding** - system prompt for third-person, knowledge-base-only answers, with salary, right-to-work and unknown questions handled as agreed.
3. **Chat API route** - server-side `/api/chat` streaming from Gemini using the combined context and recent turns.
4. **Provider fallback chain** - retry on Groq, then OpenRouter, on rate-limit, error or timeout.
5. **Abuse protection** - per-IP rate limiting plus input-length and conversation-length limits.
6. **Signal-lost fallback** - pre-written in-call message linking to portfolio and LinkedIn when allowances run out or every provider fails.
7. **Chat interface** - transcript, input and streamed "holo transmission" text, responsive from mobile to desktop.
8. **Suggested questions** - 4-6 clickable starter chips for common recruiter questions.
9. **Scene backdrop** - near-black CSS backdrop with grid, scanlines and vignette, plus a readability gradient behind the chat.
10. **Agent blob avatar** - Nyx UI Morphing Blob with idle, ringing, thinking, speaking and signal-lost states; browser-only, with mobile, reduced-motion and no-WebGL fallbacks.
11. **Incoming call intro** - caller card reading "Agent", Accept, connecting glitch, blob materialising, hand-off to chat.
12. **Intro controls** - Skip, a reduced-motion version, and remembering returning visitors so they go straight to chat.
13. **End call** - collapse the call, reset the conversation, show contact links.
14. **Contact links bar** - persistent links to download the CV, LinkedIn, portfolio and email.
15. **Call sounds** - optional ring and connect tones, muted by default, with a toggle.
16. **Accessibility & mobile pass** - keyboard use, screen-reader-friendly transcript, contrast checks, no harsh flashing.
17. **Privacy note & share metadata** - one-line AI privacy note, page metadata, Open Graph image of the holo-call card.
18. **Health check** - `/api/health` reporting app status and whether each provider can be reached.
19. **CV import script** - `npm run import:cv` converts a .docx or .pdf CV into `content/cv.md` for review.
20. **Portfolio import script** - fetches the live portfolio site and drafts `content/portfolio.md` for review.

**Out of scope for MVP:** accounts, admin dashboard, CMS, any voice (speech output, speech input or lip-sync; text only, now and later), vector database / RAG.

**Post-MVP ideas, not planned work:** anonymous question logging with a privacy note, a password-protected `/admin` content editor, a custom domain, a themeable template product.

## Data model

There is no database. Shapes below are derived from the plan; later features depend on them.

### KnowledgeFile (`content/*.md`, in the repo)

Plain markdown, one file per source: `cv.md`, `linkedin.md`, `portfolio.md`, `faq.md`, `persona.md`. Every file in the folder is read at build time, so adding or editing a file needs no code change.

- `source` (string, front matter) - where the content came from
- `last_updated` (ISO date string, front matter) - e.g. `2026-10-30`; passed to the model
- body (markdown) - the content

Notes:

- `portfolio.md` lists projects (e.g. Daniel Footwear, Groomers Online, Grisport migration) with outcome and tech for each.
- `faq.md` holds hand-written answers and is the highest-value file for answer quality.
- `linkedin.md` is a manual paste or export. Never scrape LinkedIn.

### KnowledgeContext (derived at build time)

- combined text of all `KnowledgeFile`s, sent as system-prompt context with each request (context stuffing, not RAG)
- estimated token count, checked against the size guard (a budget of about 6k tokens; warns, doesn't store anything)

### ChatMessage (browser session only)

- `role` (`user` | `assistant`)
- `content` (string)

The conversation lives in the browser and is never persisted server-side. `/api/chat` receives the transcript, up to 40 messages, and sends only the last 10 to the model.

### RateLimitCounter (hosted KV, short-lived)

- key (per-IP identifier)
- count within the current window, expiring automatically

### Intro-seen flag (browser local storage)

- boolean flag, read and written inside try/catch

### Static assets

CV PDF and optional sound files. Agent renders live in WebGL and the backdrop is CSS, so no images are needed.

### Updating the knowledge base (required)

Updating Agent must take minutes and need no code changes: edit the markdown in `content/`, commit and push to `main`, and Vercel rebuilds and redeploys.

## Tech stack

Installed today: **Next.js 16.4.3, React 19.3.0, TypeScript, Tailwind CSS v4**. Everything else below is planned, not installed. Verify packages, licences and limits against current docs before installing.

- **Next.js (App Router) + TypeScript** - pages plus a server route that keeps LLM keys server-side.
- **Tailwind CSS + custom CSS** - layout, plus scanlines, flicker, chromatic aberration, glow, grid, vignette and glitch transitions.
- **Motion and/or GSAP** - call-sequence timeline; GSAP's timeline model suits a scripted intro.
- **Nyx UI Morphing Blob (React + Three.js, GLSL)** - Agent's avatar at `@/components/ui/morphing-blob`. Check install steps, dependencies and licence in its repo first.
- **Vercel AI SDK** - streaming chat helpers and provider packages.
- **Google Gemini Flash (AI Studio free tier)** - primary LLM; large context and token allowance suit sending the whole knowledge base.
- **Groq free tier, then OpenRouter `:free` models** - fallbacks. Pin model IDs; OpenRouter's free models change over time.
- **Upstash Redis + `@upstash/ratelimit`** - per-IP rate-limit counters, or an equivalent free KV store.
- **Rajdhani, Orbitron, Share Tech Mono (or similar open-licence fonts)** - UI labels. Never the game's own fonts.

**Free-tier constraints:** every tier is capped and limits change, so check provider limit pages. Groq's reported 8,000 tokens/min means a ~4-6k-token knowledge base allows only one or two requests a minute, so keep the knowledge base tight and Gemini primary. Free-tier requests to Google may be used to improve its models.

## Monetization

No direct revenue; the value is interviews, offers and freelance enquiries. Running-cost target is **£0/month** (Vercel Hobby, free LLM tiers, free KV store). A custom domain is the only likely cost.

## UI/UX

A cyberpunk holo call inspired by, not copied from, the Cyberpunk 2077 UI. Dark, cinematic, neon-on-black, with a slightly unstable transmission quality. Bold rather than cluttered.

### Routes

- `/` - the whole experience: scene, call, conversation, end call
- `/api/chat` - streaming chat endpoint
- `/api/health` - health check

### Flow

1. **Scene** - near-black page with faint grid lines and scanlines.
2. **Incoming call** - compact card slides in (top right on desktop, top centre on mobile) with caller "Agent", optional "VELIN NETWORK" label, "INCOMING HOLO CALL", signal bars, pulsing ring, large Accept, Skip intro.
3. **Connecting** - at most 1.5s of static, scanlines and RGB split, with "CONNECTING… ENCRYPTED LINK ESTABLISHED".
4. **Agent materialises** - blob scales and fades in from a point of light, flickers once, settles into a slow idle morph.
5. **Conversation** - chat with chips above the input; answers type out as streamed text with a soft glow.
6. **End call** - collapse animation back to the scene, with contact CTAs.

### Visual language

- **Palette:** near-black base; hologram cyan/teal primary; hot red or magenta for alerts and CTAs; warm yellow sparingly.
- **Type:** condensed techy display font in caps for labels; a clean, highly legible font for chat answers.
- **Effects:** scanlines, RGB split on transitions, thin angular frames with clipped corners, HUD micro-labels (signal strength, timestamp, "LINK: STABLE"). Heaviest in the intro, calmer during chat.
- **Velin:** appears in call text and HUD labels only, never the background. One or two lines of flavour at most.
- **Backdrop:** CSS only, no image. Don't ship the game's logos, fonts, sound effects, UI assets or screenshots.

### Agent avatar

Props: `size`, `theme` (primary, aurora, cosmic, liquid, danger), `complexity` (1-5), `speed` (1-5), `particleCount` (default 150), `enableEffects` (bloom), `children`. Choose the theme closest to cyan/magenta, probably cosmic or aurora; otherwise edit the shader colours in the copied source.

- **Idle:** slow, low complexity. **Ringing:** pulses with the ring. **Thinking:** faster and more complex. **Speaking:** rhythmic pulse while text streams. **Signal lost:** danger colour shift, then dims.
- Check props can change live without re-mounting the 3D scene; if not, animate a CSS scale or glow wrapper.
- Hologram framing: projection base ring and faint scanlines over the blob.
- Load browser-only via dynamic import, after the call card appears. Lower `particleCount` and disable bloom on mobile and low-power devices. Pause when the tab is hidden.
- With `prefers-reduced-motion` or no WebGL, show a static gradient orb.

### Signal-lost message

Shown when every provider's allowance is used up, the visitor hits their rate limit, a provider errors or times out, or no provider is configured.

- Pre-written in the app, never LLM-generated, so it works with no LLM available.
- Styled as part of the call (glitch or static), never a browser error or blank screen.
- Portfolio and LinkedIn appear as clear buttons or links.
- Example: "SIGNAL LOST — Agent's bandwidth is maxed out for now. You can find Jonathan's full details on his portfolio or LinkedIn."
- Chat input stays disabled, with a short "try again later" note, until a Retry button resends the last question and it succeeds.
- At the 40-message cap, the same styling and links appear with end-of-call wording and no retry.

### Accessibility

- Respect `prefers-reduced-motion`: no flicker or glitch, instant transitions.
- No rapid full-screen flashing; keep flicker below flash thresholds.
- Sound off by default.
- Chat text meets WCAG AA contrast.
- Keyboard operable, with a screen-reader-friendly transcript.
- First meaningful interaction within ~3 seconds, or instantly via Skip.

## Deployment

- **Host:** Vercel Hobby. Check its commercial-use terms if ever used for paid freelance work.
- **App type:** Next.js App Router; static pages plus one serverless or edge chat route.
- **Build:** `next build`, Vercel's default. Start and output handled by the Next.js preset.
- **Env vars (confirm exact names in each SDK's docs):** `GOOGLE_GENERATIVE_AI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY` (optional), `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PORTFOLIO_URL`, `NEXT_PUBLIC_LINKEDIN_URL`.
- **Storage:** none beyond the rate-limit KV store. Knowledge base and assets live in the repo.
- **Workers/cron:** none.
- **Health path:** `/api/health`.
- **Domain:** default `*.vercel.app`. A custom domain can come later without code changes.
- **Sharing:** Open Graph image of the holo-call card for LinkedIn previews.

## Open questions

> TODOs and contradictions found between the two plans. Resolve them in the plans, then re-run /overview. Delete this section when empty.

- **Privacy wording:** §9 says questions are "not stored", but §5 says Google's free tier may use requests to improve its models.
- **Non-tech roles:** §2 and a suggested chip say Jonathan is open to non-tech roles; the agreed target roles list only three developer roles.
- **Desktop layout:** §7's flow docks chat beside Agent; §7's avatar section places Agent centred above the chat.
- **Ringing state:** feature 10 and §7 give the blob a ringing state, but the flow only materialises it after Connecting.
- **Content authoring:** feature 1 reads `content/`, which doesn't exist yet, and no feature writes the knowledge base, `persona.md` or the CV PDF.
- **Contact details:** no env var or location is defined for the email address or CV PDF used by feature 14.
- **Health check scope:** the plan makes provider reachability optional; feature 18 makes it required, and probing may spend free quota.
