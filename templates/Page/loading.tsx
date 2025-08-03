// app/[locale]/template/loading.tsx
"use client";

export default function Loading() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <p className="text-gray-500">Loading ...</p>
    </div>
  );
}
// This component is used to show a loading state while the page is being prepared
// You can customize it with a spinner, skeletons, or any loading UI you prefer
// It will be displayed when the page is loading, for example during data fetching or component rendering
// This is useful for providing feedback to users that something is happening in the background
// You can also use this to implement a more complex loading state with animations or placeholders
// Make sure to keep it lightweight to avoid blocking the main thread
// This component is part of the Next.js app directory structure and will be automatically used by Next.js
