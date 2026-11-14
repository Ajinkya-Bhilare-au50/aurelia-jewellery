import { endSession } from "@/lib/auth";
import { handler } from "@/lib/http";

export const POST = handler(async () => {
  endSession();
  return { ok: true };
});
