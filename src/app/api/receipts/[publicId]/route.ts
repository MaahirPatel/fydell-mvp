import { NextResponse } from "next/server";
import { ArtifactWorkReceiptIssuer, publicReceiptProjection } from "@/lib/sim-engine/proof/sandbox/proof-repos";

export async function GET(_request: Request, context: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await context.params;
  const issuer = new ArtifactWorkReceiptIssuer();
  const receipt = await issuer.loadPublic(publicId);
  if (!receipt) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    receipt: publicReceiptProjection(receipt.payload),
    integrityHash: receipt.integrityHash,
  });
}
