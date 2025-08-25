// app/[locale]/not-found.tsx
import { Link } from "@/lib/i18n/navigation";

export default function NotFound() {
  return (
    <div>
      <h2>Not Found</h2>
      <p>Could not find requested resource</p>
      <Link href="/">Return Home</Link>
    </div>
  );
}
// This page is used to handle 404 errors in the application
// You can customize this page to display a user-friendly error message
// or redirect to a different page if needed
// This is part of the Next.js app directory structure and will be automatically used by Next.js
// when a requested page is not found
// Make sure to handle 404 errors gracefully to improve user experience
// You can also log errors or send them to an error tracking service
// This component can be styled with CSS or Tailwind CSS to match your application's design
// You can also add additional links or actions for the user to take, such as searching or navigating to other parts of the site
// This component is lightweight and does not block the main thread
