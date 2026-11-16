import type { ReactNode } from "react";
import { PublicNavbar } from "../../shared/ui/PublicNavbar";
import { PublicFooter } from "../../shared/ui/PublicFooter";

type PublicLayoutProps = {
  children: ReactNode;
  currentPath: string;
};

export function PublicLayout({ children, currentPath }: PublicLayoutProps) {
  return (
    <div className="public-layout">
      <PublicNavbar currentPath={currentPath} />
      <main className="public-layout__main">{children}</main>
      <PublicFooter />
    </div>
  );
}
