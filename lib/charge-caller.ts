import { NextResponse } from "next/server";
import { requireIdentity, type VerifiedIdentity } from "../cursor/identity";

export async function chargeCaller(request: Request): Promise<VerifiedIdentity | Response> {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) {
    const headers = new Headers(identity.headers);
    headers.set("cache-control", "private, no-store");
    return new Response(identity.body, { status: identity.status, headers });
  }
  if (identity.stage === "preview") {
    return NextResponse.json(
      { error: "A prévia não gera cobrança." },
      { status: 403, headers: { "cache-control": "private, no-store" } },
    );
  }
  return identity;
}
