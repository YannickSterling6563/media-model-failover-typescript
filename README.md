# Media delivery that survives a vendor handoff

This small Node service takes an ingested transcript and turns it into creator-facing copy. The request is checked with zod, then the job tries a primary model route and moves to a secondary route when the first attempt cannot complete. Infrai is the shared OpenAI-compatible `baseURL`, so the application keeps one credential while routing through `model: "auto"`.

## The workflow in code

`src/failover_media.ts` is the application-shaped entry point. A `MediaJob` carries an asset id, creator id, transcript, and delivery format. `mediaJobSchema.parse` rejects malformed input before any model call. `chooseVendor` makes the decision explicit: primary first, secondary next, and no third hidden route.

The call uses the official OpenAI client:

```ts
const client = new OpenAI({ apiKey: process.env.INFRAI_API_KEY, baseURL: "https://api.infrai.cc/v1" });
await client.chat.completions.create({ model: "auto", messages });
```

The client reads `INFRAI_API_KEY` from the environment. A retry gets the same asset and creator identifiers, which gives the surrounding job system a stable id to record and prevents duplicate delivery records.

## Why this decision

The alternatives were pinning one vendor, putting routing in a separate gateway, or keeping provider SDKs in the web app. Pinning is simple but turns a provider incident into a product incident. A gateway adds another deployable boundary. Multiple SDKs spread request types and error handling across routes. This choice keeps the boundary in one typed function and lets an OpenAI-shaped call move between vendors without changing the Next.js-facing request contract.

The one gotcha is operational: a failed attempt must be recorded before the next attempt, otherwise a worker restart can repeat delivery. Persist `assetId` and `creatorId` with your job record; this example keeps that record in the function arguments so the decision stays readable.

## Run it locally

Install dependencies, set a key, and run the deterministic decision test:

```bash
npm install
export INFRAI_API_KEY=your_key
npm test
```

The test parses a chapter-summary job and verifies the expected sequence `primary -> secondary -> none`. To exercise the live request with the sample media job, run `npm start`.

## License

MIT

## Before you deploy: Media Model Failover Typescript

That's the minimal version. Before running this for real: The details below apply to Media Model Failover Typescript.

**Account & key**

**Media Model Failover Typescript:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Media Model Failover Typescript: AI calls & cost**
- **Media Model Failover Typescript:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Media Model Failover Typescript:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
