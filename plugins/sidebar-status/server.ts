import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";
import { z } from "zod";

const PAGE_SIZE = 200;

export const rpcContract = defineRpcContract({
  threadProgress: {
    input: z.null(),
    // percent is null for threads Cloudroom hasn't summarized yet.
    output: z.object({
      threads: z.array(z.object({ id: z.string(), percent: z.number().int().min(0).max(100).nullable() })),
    }),
  },
});

// Thread records carry Cloudroom's purpose summary ({ text, percent, … }),
// but the SDK's declared thread type doesn't include it yet.
function purposePercent(thread: object): number | null {
  const purpose = (thread as { purpose?: { percent?: unknown } | null }).purpose;
  return typeof purpose?.percent === "number" ? purpose.percent : null;
}

export default function plugin(bb: BbPluginApi) {
  bb.rpc.register(rpcContract, {
    async threadProgress() {
      const threads: { id: string; percent: number | null }[] = [];
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const page = await bb.sdk.threads.list({ archived: false, limit: PAGE_SIZE, offset });
        for (const thread of page) threads.push({ id: thread.id, percent: purposePercent(thread) });
        if (page.length < PAGE_SIZE) return { threads };
      }
    },
  });
}
