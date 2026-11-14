import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Wrap a route handler: maps HttpError / ZodError to JSON error responses. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  return async (...args: A) => {
    try {
      const data = await fn(...args);
      return data instanceof Response ? data : NextResponse.json(data ?? { ok: true });
    } catch (err) {
      if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
      if (err instanceof ZodError) {
        const first = err.issues[0];
        // Our own messages ("Enter a valid PIN code") are written for people; Zod's built-in ones
        // ("Required", "Expected number…") need the field name to make sense.
        const generic = !first || first.code === "invalid_type" || /^(Required|Invalid|Expected|String must|Number must|Array must)/.test(first.message);
        const message = !first ? "Invalid input" : generic ? `${first.path.join(".") || "input"}: ${first.message}` : first.message;
        return NextResponse.json({ error: message, field: first?.path.join(".") }, { status: 400 });
      }
      console.error(err);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}
