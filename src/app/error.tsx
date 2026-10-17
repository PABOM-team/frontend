"use client";

import { useEffect } from "react";
import { ErrorScreen } from "./error-screens";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorScreen onRetry={retry} />;
}
