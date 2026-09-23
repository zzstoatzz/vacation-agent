import type { Metadata } from "next";
import "./style.css";

export const metadata: Metadata = {
  title: "away — a little less planning",
  description: "A place to turn a vacation idea into a plan.",
};

export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
