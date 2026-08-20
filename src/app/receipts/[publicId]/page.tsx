import { ArtifactWorkReceiptIssuer, publicReceiptProjection } from "@/lib/sim-engine/proof/sandbox/proof-repos";
import { WorkReceiptView } from "@/components/sandbox/WorkReceiptView";

export const dynamic = "force-dynamic";

export default async function PublicReceiptPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const issuer = new ArtifactWorkReceiptIssuer();
  const receipt = await issuer.loadPublic(publicId);
  if (!receipt) {
    return (
      <main className="min-h-screen bg-[var(--surface-canvas)] px-6 py-16 text-[var(--text-primary)]">
        <p className="text-app-body text-[var(--text-secondary)]">This work receipt was not found or has expired.</p>
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-[var(--surface-canvas)] px-6 py-16">
      <WorkReceiptView receipt={publicReceiptProjection(receipt.payload)} />
    </main>
  );
}
