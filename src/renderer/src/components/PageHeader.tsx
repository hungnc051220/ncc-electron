import type { ReactNode } from "react";

interface PageHeaderProps {
  left: ReactNode;
  right?: ReactNode;
}

const PageHeader = ({ left, right }: PageHeaderProps) => {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <div className="min-w-0">{left}</div>
      {right ? <div className="flex items-center gap-2">{right}</div> : <div />}
    </div>
  );
};

export type { PageHeaderProps };
export default PageHeader;
