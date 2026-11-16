import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

type RouterValue = {
  navigate: (href: string, replace?: boolean) => void;
};

const RouterContext = createContext<RouterValue | null>(null);

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function getPathname() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const navigate = useCallback((href: string, replace = false) => {
    if (replace) {
      window.history.replaceState(null, "", href);
    } else {
      window.history.pushState(null, "", href);
    }

    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  return (
    <RouterContext.Provider value={{ navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useCurrentLocation() {
  return useSyncExternalStore(subscribe, getPathname, () => "/dashboard");
}

export function useNavigate() {
  const router = useContext(RouterContext);
  if (!router) {
    throw new Error("useNavigate must be used within a RouterProvider.");
  }
  return router.navigate;
}

type RouteLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  current?: boolean;
};

export function RouteLink({
  children,
  className = "",
  current = false,
  href,
  onClick,
  ...props
}: RouteLinkProps) {
  const navigate = useNavigate();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      props.target === "_blank" ||
      props.download ||
      !href ||
      !href.startsWith("/") ||
      href.startsWith("//")
    ) {
      return;
    }

    event.preventDefault();
    navigate(href);
  }

  return (
    <a
      {...props}
      aria-current={current ? "page" : undefined}
      className={className}
      href={href}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
