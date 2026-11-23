import Link from "next/link";

const LINKS = [
  ["/admin", "Overview"],
  ["/admin/mechanics", "Mechanics & drivers"],
  ["/admin/inventory", "Inventory"],
  ["/admin/claims", "Claims"],
  ["/admin/audit", "Audit log"],
];

export default function AdminNav({ active }) {
  return (
    <nav className="subnav" aria-label="Admin sections">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} className={active === href ? "active" : ""} aria-current={active === href ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
