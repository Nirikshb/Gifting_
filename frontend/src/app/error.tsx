"use client";

import { useEffect } from "react";
import { StatusScreen } from "@/components/StatusScreen";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      code="Error"
      title="Something went wrong"
      message="This page could not be loaded. Try again, or head back to the shop."
      action={
        <button type="button" onClick={() => retry()}>
          Try again
        </button>
      }
    />
  );
}
