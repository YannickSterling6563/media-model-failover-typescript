import assert from "node:assert/strict";
import { chooseVendor, mediaJobSchema } from "./failover_media.js";

const job = mediaJobSchema.parse({
  assetId: "asset-7",
  creatorId: "creator-9",
  transcript: "A recipe walkthrough.",
  deliveryFormat: "chapter-summary"
});

assert.equal(job.deliveryFormat, "chapter-summary");
assert.equal(chooseVendor([]), "primary");
assert.equal(chooseVendor(["primary"]), "secondary");
assert.equal(chooseVendor(["primary", "secondary"]), null);
console.log("media failover decision test passed");
