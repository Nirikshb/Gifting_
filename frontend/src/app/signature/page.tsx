import { ViewTransition } from "react";
import { listActiveProducts } from "@/lib/api/catalogue";
import { publicPageMetadata } from "@/lib/site-url";
import { SignatureListingView } from "@/components/SignatureListingView";

export const instant = false;

const description = "Pre-curated hampers by Aapulki, wrapped and ready to give.";

export const metadata = {
  title: "Signature collection",
  ...publicPageMetadata("Signature collection | Aapulki", description, "/signature"),
};

export default async function SignaturePage() {
  const products = await listActiveProducts();

  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <SignatureListingView products={products ?? []} />
    </ViewTransition>
  );
}
