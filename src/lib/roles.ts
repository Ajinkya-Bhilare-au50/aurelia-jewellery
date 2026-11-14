// Role helpers shared by server code, middleware (edge) and client components.
import type { Role } from "./types";

/** Full admin, or the public read-only demo admin. */
export const canViewAdmin = (role: Role | string | undefined) => role === "admin" || role === "demo_admin";

/** Read-only demo admin: sees the admin panel with customer details masked; every change is refused. */
export const isDemoAdmin = (role: Role | string | undefined) => role === "demo_admin";

export const parseRole = (r: unknown): Role => (r === "admin" || r === "demo_admin" ? r : "customer");

export const DEMO_ADMIN_READ_ONLY = "This is a read-only demo admin. Changes are disabled.";
