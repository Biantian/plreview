import clsx from "clsx";
import type { ReactNode } from "react";

type PageIntroProps = {
  actions?: ReactNode;
  className?: string;
  description: ReactNode;
  eyebrow: ReactNode;
  title: ReactNode;
};

export function PageIntro({ actions, className, description, eyebrow, title }: PageIntroProps) {
  return (
    <div className={clsx("page-intro", className)}>
      <div className="page-intro-copy">
        <p className="section-eyebrow">{eyebrow}</p>
        <h1 className="section-title">{title}</h1>
        <p className="section-copy">{description}</p>
      </div>
      {actions ? <div className="page-intro-actions">{actions}</div> : null}
    </div>
  );
}
