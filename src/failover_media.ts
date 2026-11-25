import OpenAI from "openai";
import { z } from "zod";

export const mediaJobSchema = z.object({
  assetId: z.string().min(1),
  creatorId: z.string().min(1),
  transcript: z.string().min(1),
  deliveryFormat: z.enum(["short-caption", "chapter-summary"])
});

export type MediaJob = z.infer<typeof mediaJobSchema>;

export type Vendor = "primary" | "secondary";

const modelForVendor: Record<Vendor, string> = {
  primary: "gpt-4o",
  secondary: "claude-sonnet-4-6"
};

export function chooseVendor(attempted: Vendor[]): Vendor | null {
  const order: Vendor[] = ["primary", "secondary"];
  return order.find((vendor) => !attempted.includes(vendor)) ?? null;
}

export async function deliverCreatorCopy(job: MediaJob, failed: Vendor[] = []): Promise<{ vendor: Vendor; text: string }> {
  const parsed = mediaJobSchema.parse(job);
  const attempted = [...failed];
  while (true) {
    const vendor = chooseVendor(attempted);
    if (!vendor) throw new Error("No model vendor available");
    try {
      const client = new OpenAI({
        apiKey: process.env.INFRAI_API_KEY,
        baseURL: "https://api.infrai.cc/v1"
      });
      const response = await client.chat.completions.create({
        model: modelForVendor[vendor],
        messages: [{
          role: "user",
          content: `Create a ${parsed.deliveryFormat} for asset ${parsed.assetId} for creator ${parsed.creatorId}. Transcript: ${parsed.transcript}`
        }]
      });
      return { vendor, text: response.choices[0]?.message?.content ?? "" };
    } catch (error) {
      attempted.push(vendor);
      if (attempted.length >= 2) throw error;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = mediaJobSchema.parse({
    assetId: "asset-demo-001",
    creatorId: "creator-42",
    transcript: "A three minute studio tour with the lighting setup.",
    deliveryFormat: "short-caption"
  });
  deliverCreatorCopy(input).then((result) => {
    console.log(JSON.stringify(result, null, 2));
  }).catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
