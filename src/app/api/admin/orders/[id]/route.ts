import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { handler } from "@/lib/http";
import { advanceStatus } from "@/lib/orders";

const schema = z.object({
  status: z.enum(["pending_payment", "confirmed", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"]),
  note: z.string().trim().max(200).optional(),
  courier: z.string().trim().max(40).optional(),
  awb: z.string().trim().max(40).optional(),
});

export const PATCH = handler(async (req: Request, { params }: { params: { id: string } }) => {
  await requireAdmin();
  const input = schema.parse(await req.json());
  return { order: await advanceStatus(params.id, input.status, input) };
});
