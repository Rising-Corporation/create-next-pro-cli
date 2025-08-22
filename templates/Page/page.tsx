import templatePageUI from "@/ui/template/page-ui";

export default function templatePage() {
  return <templatePageUI />;
}

// This page is the main entry point for the page
// It uses the `useTranslations` hook to fetch localized strings
// The `t` function is used to get the translated strings for the page
// You can add more components or logic here to build your page
// This is part of the Next.js app directory structure
// It will be automatically rendered when the user navigates to the page
// Make sure to define the translations in your locale files
