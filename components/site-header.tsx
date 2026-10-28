import Link from "next/link";
import { Logo } from "./logo";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell nav-inner">
        <Logo />
        <nav aria-label="Navegación principal">
          <Link href="/#archivo">Archivo</Link>
          <Link href="/#contexto">Contexto</Link>
          <Link className="button button-dark" href="/admin">Administrar</Link>
        </nav>
      </div>
    </header>
  );
}
