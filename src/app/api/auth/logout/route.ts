import { endSession } from "@/lib/auth";
import { handler } from "@/lib/http";

export const POST = handler(async () => {
  await endSession();
  return { ok: true };
});
