import { useMemo } from "react";

export type UserRole = "admin" | "tenant";

interface NavLink {
  href: string;
  label: string;
}

interface RoleNavProps {
  role: UserRole;
  currentPath?: string;
}

export function RoleNav({ role, currentPath }: RoleNavProps): JSX.Element {
  const links = useMemo<NavLink[]>(() => {
    if (role === "admin") {
      return [
        { href: "/admin/properties", label: "Nieruchomości" },
        { href: "/admin/contracts", label: "Umowy" },
        { href: "/admin/monthly-conditions", label: "Warunki miesięczne" },
        { href: "/admin/readings", label: "Odczyty" },
        { href: "/admin/reports", label: "Raporty" },
        { href: "/admin/tasks", label: "Zadania" },
      ];
    }

    return [
      { href: "/app/my-property", label: "Moja nieruchomość" },
      { href: "/app/readings", label: "Odczyty" },
      { href: "/app/reports", label: "Raporty" },
      { href: "/app/profile", label: "Profil" },
    ];
  }, [role]);

  return (
    <nav aria-label="Nawigacja główna">
      <ul className="flex flex-wrap items-center gap-2">
        {links.map((link) => {
          const isCurrent = currentPath ? currentPath === link.href : false;
          return (
            <li key={link.href}>
              <a
                className={[
                  "inline-flex items-center rounded-md border border-transparent px-3 py-1 text-sm font-medium transition",
                  isCurrent
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                ].join(" ")}
                href={link.href}
                aria-current={isCurrent ? "page" : undefined}
              >
                {link.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
