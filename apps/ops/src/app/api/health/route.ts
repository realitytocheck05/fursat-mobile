export const dynamic = "force-dynamic";
export const GET = () => Response.json({ ok: true, service: "bjnexus-ops", at: new Date().toISOString() });
