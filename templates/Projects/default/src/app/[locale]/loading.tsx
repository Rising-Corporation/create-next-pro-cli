// app/[locale]/dashboard/loading.tsx

import LoadingUI from "@/ui/_global/Loading";

export default function Loading() {
  return <LoadingUI />;
}
// This component is used to show a loading state while the dashboard is being prepared
// You can customize it with a spinner, skeletons, or any loading UI you prefer
// It will be displayed when the dashboard is loading, for example during data fetching or component rendering
// This is useful for providing feedback to users that something is happening in the background
// You can also use this to implement a more complex loading state with animations or placeholders
// Make sure to keep it lightweight to avoid blocking the main thread
// This component is part of the Next.js app directory structure and will be automatically used by Next.js
