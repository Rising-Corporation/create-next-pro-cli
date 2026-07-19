import GlobalMain from "@/ui/_global/GlobalMain";
import HomePageUI from "@/ui/_home/page-ui";

const footer = (
  <footer className="border-t px-4 py-6 text-center text-sm text-gray-600 dark:text-gray-300">
    <p>Empowered by Rising Corporation</p>
  </footer>
);

export default function HomePageShell() {
  return (
    <GlobalMain footer={footer}>
      <HomePageUI />
    </GlobalMain>
  );
}
