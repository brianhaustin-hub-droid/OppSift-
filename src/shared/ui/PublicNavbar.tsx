import { useState, useEffect } from "react";
import { RouteLink } from "../../app/routing/router";
import { BrandLogo } from "./BrandLogo";
import "./public-navbar.css";

const navLinks = [
  { label: "Product", href: "/product" },
  { label: "Opportunities", href: "/opportunities" },
  { label: "Markets", href: "/markets" },
  { label: "About", href: "/about" },
];

type PublicNavbarProps = {
  currentPath?: string;
};

export function PublicNavbar({ currentPath = "/" }: PublicNavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className={`public-navbar${scrolled ? " public-navbar--scrolled" : ""}`}>
      <div className="public-navbar__inner">
        <BrandLogo size="md" linkTo="/" onClick={() => setMobileOpen(false)} />

        <nav className="public-navbar__nav" aria-label="Marketing navigation">
          {navLinks.map((link) => (
            <RouteLink
              key={link.href}
              href={link.href}
              className={`public-nav-link${currentPath === link.href ? " public-nav-link--active" : ""}`}
            >
              {link.label}
            </RouteLink>
          ))}
        </nav>

        <div className="public-navbar__actions">
          <RouteLink href="/login" className="public-nav-link">
            Sign In
          </RouteLink>
          <RouteLink href="/register" className="public-navbar__cta">
            Get Started
          </RouteLink>
        </div>

        <button
          className="public-navbar__mobile-toggle"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
          type="button"
        >
          <span className={`hamburger${mobileOpen ? " hamburger--open" : ""}`}>
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <button
            className="public-navbar__backdrop"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            type="button"
          />
          <nav
            className="public-navbar__mobile-nav"
            aria-label="Mobile navigation"
          >
            {navLinks.map((link) => (
              <RouteLink
                key={link.href}
                href={link.href}
                className="public-nav-link public-nav-link--mobile"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </RouteLink>
            ))}
            <div className="public-navbar__mobile-auth">
              <RouteLink
                href="/login"
                className="public-navbar__mobile-signin"
                onClick={() => setMobileOpen(false)}
              >
                Sign In
              </RouteLink>
              <RouteLink
                href="/register"
                className="public-navbar__cta"
                onClick={() => setMobileOpen(false)}
              >
                Get Started
              </RouteLink>
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
