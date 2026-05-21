import Link from "next/link";

const links = [
  { href: "/", label: "Início" },
  { href: "/veiculos", label: "Veículos" },
  { href: "/multas", label: "Multas" },
];

export function NavBar() {
  return (
    <nav className="navbar">
      {links.map((link) => (
        <Link key={link.href} href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
