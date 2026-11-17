import { Suspense } from "react";

// Notebook and note screens read the address bar (which notebook, which note),
// which is only known in the browser, so they load inside a Suspense boundary.
export default function NotebookLayout({ children }: LayoutProps<"/n">) {
  return <Suspense fallback={<div className="page" />}>{children}</Suspense>;
}
