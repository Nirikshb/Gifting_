import { ViewTransition } from "react";
import { publicPageMetadata } from "@/lib/site-url";
import { ProcessStage } from "./ProcessStage";

const description = "How a gift becomes a package someone keeps.";

export const metadata = {
  title: "Process",
  ...publicPageMetadata("Process | Aapulki", description, "/process"),
};

export default function ProcessPage() {
  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <ProcessStage />
    </ViewTransition>
  );
}
