// app/[locale]/error.tsx
"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
      >
        Try again
      </button>
    </div>
  );
}
// This page is used to handle errors in the application
// You can customize this page to display a user-friendly error message
// or redirect to a different page if needed
// This is part of the Next.js app directory structure and will be automatically used by Next.js
// when an error occurs in the application
// Make sure to handle errors gracefully to improve user experience
// You can also log errors or send them to an error tracking service
