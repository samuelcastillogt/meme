import Link from "next/link";

export default function NotFound() {
  return <main className="center-page"><p className="eyebrow">404</p><h1>Esta historia no está en el archivo.</h1><Link className="button button-dark" href="/">Volver al inicio</Link></main>;
}
