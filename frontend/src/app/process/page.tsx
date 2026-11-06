import { ViewTransition } from "react";
import { ProcessStage } from "./ProcessStage";

export const metadata = {
  title: "Process",
  description: "How a gift becomes a package someone keeps.",
};

export default function ProcessPage() {
  return (
    <ViewTransition name="page-curtain" share="curtain" default="none">
      <ProcessStage />
    </ViewTransition>
  );
}
