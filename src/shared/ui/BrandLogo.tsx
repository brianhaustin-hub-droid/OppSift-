import { RouteLink } from "../../app/routing/router";

type BrandLogoProps = {
  variant?: "light" | "dark" | "auto";
  size?: "sm" | "md" | "lg";
  className?: string;
  linkTo?: string;
  markOnly?: boolean;
  onClick?: () => void;
};

export function BrandLogo({
  variant = "auto",
  size = "md",
  className = "",
  linkTo,
  markOnly = false,
  onClick,
}: BrandLogoProps) {
  const content = (
    <img
      alt={markOnly ? "OppSift" : "OppSift — Global Opportunity Intelligence"}
      className={`brand-logo__image${markOnly ? " brand-logo__image--mark" : ""}`}
      data-variant={variant}
      src={
        markOnly
          ? "/assets/oppsift-app-mark-transparent.png"
          : "/assets/oppsift-wordmark-transparent.png"
      }
    />
  );
  const logo = (
    <span
      className={`brand-logo brand-logo--${size}${markOnly ? " brand-logo--mark-only" : ""} ${className}`.trim()}
    >
      {content}
    </span>
  );

  if (!linkTo) return logo;

  return (
    <RouteLink
      href={linkTo}
      onClick={onClick}
      aria-label="OppSift — Global Opportunity Intelligence"
      className="brand-logo__link"
    >
      {logo}
    </RouteLink>
  );
}
