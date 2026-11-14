import { z } from "zod";
import { addressSchema, listAddresses, saveAddress } from "@/lib/addresses";
import { requireUser } from "@/lib/auth";
import { handler } from "@/lib/http";
import { rateLimit } from "@/lib/rateLimit";

/** The signed-in user's address book. */
export const GET = handler(async () => {
  const user = await requireUser();
  return { addresses: await listAddresses(user.id) };
});

/** Add an address. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  await rateLimit(`address:${user.id}`, 60, 3600);
  const { address, isDefault } = z.object({ address: addressSchema, isDefault: z.boolean().optional() }).parse(await req.json());
  return { address: await saveAddress(user.id, address, { makeDefault: isDefault }) };
});
