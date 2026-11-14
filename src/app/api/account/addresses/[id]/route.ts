import { z } from "zod";
import { addressSchema, deleteAddress, updateAddress } from "@/lib/addresses";
import { requireUser } from "@/lib/auth";
import { handler } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";

type Ctx = { params: Promise<{ id: string }> };

/** Edit an address and/or make it the default. */
export const PUT = handler(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  await rateLimit(`address:${user.id}`, 60, 3600);
  const { id } = await ctx.params;
  const { address, isDefault } = z.object({ address: addressSchema, isDefault: z.boolean().optional() }).parse(await req.json());
  return { address: await updateAddress(user.id, id, address, Boolean(isDefault)) };
});

export const DELETE = handler(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await deleteAddress(user.id, id);
  return { ok: true };
});
