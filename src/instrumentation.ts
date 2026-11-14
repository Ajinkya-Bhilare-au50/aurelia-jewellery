export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkProductionEnv } = await import("./lib/env");
    checkProductionEnv();
  }
}
