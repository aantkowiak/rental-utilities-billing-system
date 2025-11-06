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
        { href: "/admin/properties", label: "Properties" },
        { href: "/admin/contracts", label: "Contracts" },
        { href: "/admin/monthly-conditions", label: "Monthly" },
        { href: "/admin/readings", label: "Readings" },
        { href: "/admin/tasks", label: "Tasks" },
      ];
    }

    return [
      { href: "/app/my-property", label: "My Property" },
      { href: "/app/readings", label: "My Readings" },
      { href: "/app/reports", label: "My Reports" },
      { href: "/app/profile", label: "Profile" },
    ];
  }, [role]);

  return (
    <nav aria-label="Primary">
      <ul role="list" style={{ display: "flex", gap: "0.75rem", padding: 0, margin: 0 }}>
        {links.map((link) => {
          const isCurrent = currentPath ? currentPath === link.href : false;
          return (
            <li key={link.href} style={{ listStyle: "none" }}>
              <a
                href={link.href}
                aria-current={isCurrent ? "page" : undefined}
                style={{ textDecoration: isCurrent ? "underline" : "none" }}
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
