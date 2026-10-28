import Link from "next/link";
import { deleteMemeAction, logoutAction, startScraperAction } from "@/app/actions";
import { JobRefresh } from "@/components/job-refresh";
import { requireAdmin } from "@/lib/auth";
import { getAdminMemes, getAdminStats, getRecentScraperJobs } from "@/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ saved?: string; page?: string; scraper?: string }> }) {
  await requireAdmin();
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page || "1", 10) || 1);
  const memes = getAdminMemes(undefined, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  const stats = getAdminStats();
  const jobs = getRecentScraperJobs();
  const totalPages = Math.max(1, Math.ceil(stats.entries / PAGE_SIZE));
  const saved = query.saved === "1";

  return (
    <main className="admin-shell shell">
      <JobRefresh active={jobs.some((job) => job.status === "running")} />
      <header className="admin-header">
        <div><p className="eyebrow">Meme Atlas / Admin</p><h1>Panel editorial</h1></div>
        <div className="admin-actions"><Link className="button button-light" href="/">Ver sitio</Link><form action={logoutAction}><button className="button button-dark">Salir</button></form></div>
      </header>
      {saved ? <p className="notice">Cambios guardados correctamente.</p> : null}
      {query.scraper === "started" ? <p className="notice">El scraper se inició en segundo plano.</p> : null}
      {query.scraper === "invalid" ? <p className="notice notice-error">No se pudo iniciar: revisa el modo, idioma y límite.</p> : null}
      <section className="stat-grid"><div><span>Entradas</span><strong>{stats.entries.toLocaleString("es")}</strong></div><div><span>Visitas totales</span><strong>{stats.totalViews.toLocaleString("es")}</strong></div><div><span>Más vista</span><strong>{stats.topViews.toLocaleString("es")}</strong></div></section>
      <section className="scraper-panel">
        <div className="scraper-intro"><p className="eyebrow">Automatización</p><h2>Ejecutar scraper</h2><p>Inicia la descarga o traducción sin salir del panel. Usa un límite pequeño para las pruebas.</p></div>
        <form className="scraper-form" action={startScraperAction}>
          <label htmlFor="mode">Proceso</label>
          <select id="mode" name="mode" defaultValue="translate"><option value="translate">Solo traducir</option><option value="scrape">Solo descargar</option><option value="full">Descargar y traducir</option></select>
          <label htmlFor="lang">Idioma destino</label><input id="lang" name="lang" defaultValue="es" pattern="[a-z]{2,3}(-[A-Z]{2})?" required />
          <label htmlFor="limit">Límite</label><input id="limit" name="limit" type="number" min="-1" max="10000" defaultValue="10" required />
          <small>Usa <code>-1</code> para procesar todas las entradas.</small>
          <button className="button button-dark" type="submit">Iniciar proceso</button>
        </form>
      </section>
      {jobs.length ? <section className="jobs-panel"><div className="jobs-heading"><h2>Ejecuciones recientes</h2><span>Actualización automática mientras están activas</span></div>{jobs.map((job) => <article className="job-row" key={job.id}><div><strong>#{job.id} · {job.mode}</strong><span>{job.lang} · límite {job.limit} · PID {job.pid || "—"}</span></div><span className={`job-status ${job.status}`}>{job.status}</span><details><summary>Ver salida</summary><pre>{job.output || "Esperando salida de Python…"}</pre></details></article>)}</section> : null}
      <section className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Entrada</th><th>Estado</th><th>Visitas</th><th>Acciones</th></tr></thead>
          <tbody>{memes.map((meme) => (
            <tr key={meme.slug}>
              <td><strong>{meme.title}</strong><small>/{meme.slug}</small></td>
              <td><span className="status">{meme.status}</span></td>
              <td className="views-cell">{meme.views.toLocaleString("es")}</td>
              <td><div className="row-actions"><Link href={`/admin/${meme.slug}`}>Editar</Link><form action={deleteMemeAction.bind(null, meme.slug)}><button type="submit">Eliminar</button></form></div></td>
            </tr>
          ))}</tbody>
        </table>
      </section>
      <nav className="pagination" aria-label="Paginación del administrador">
        {page > 1 ? <Link href={`/admin?page=${page - 1}`}>← Anterior</Link> : <span />}
        <strong>Página {page} de {totalPages}</strong>
        {page < totalPages ? <Link href={`/admin?page=${page + 1}`}>Siguiente →</Link> : <span />}
      </nav>
    </main>
  );
}
