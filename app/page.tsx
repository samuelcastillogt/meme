import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { StoryboardArt } from "@/components/storyboard-art";
import { getContentColumn, getPostContent } from "@/lib/content-column";
import { getMemeCount, getMemes } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function Home() {
  const column = getContentColumn();
  const memes = getMemes(undefined, 24, 0, column);
  const count = getMemeCount(undefined, column);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="shell hero">
          <div className="hero-copy">
            <p className="eyebrow">Archivo vivo de cultura digital</p>
            <h1>Las historias detrás de los memes que mueven internet.</h1>
            <p>Explora de dónde vienen, por qué funcionan y cómo cambiaron la conversación online.</p>
            <Link className="button button-dark" href="#archivo">Explorar el archivo</Link>
          </div>
          <StoryboardArt />
        </section>

        <section className="trust-line">
          <div className="shell trust-inner">
            <strong>{count.toLocaleString("es")} historias documentadas</strong>
            <span>ORÍGENES</span><span>FORMATOS</span><span>CONTEXTO</span><span>CULTURA</span>
          </div>
        </section>

        <section className="shell archive" id="archivo">
          <div className="section-heading">
            <div><p className="eyebrow">Colección abierta</p><h2>Un meme. Una historia.</h2></div>
            <p className="column-label">Fuente: <code>{column}</code></p>
          </div>
          <div className="meme-grid">
            {memes.map((meme, index) => {
              const content = getPostContent(meme, column);
              return (
                <article className={`meme-card tone-${index % 4}`} key={meme.slug}>
                  <div className="card-visual"><span>{String(index + 1).padStart(2, "0")}</span><div className="mini-frame" /></div>
                  <div className="card-copy">
                    <p className="card-meta">{column} · {meme.lang || "en"}</p>
                    <h3><Link href={`/memes/${meme.slug}`}>{meme.title}</Link></h3>
                    <p>{content.replace(/[#>*_`\[\]]/g, "").slice(0, 180)}{content.length > 180 ? "…" : ""}</p>
                    <Link className="text-link" href={`/memes/${meme.slug}`}>Leer historia <span>→</span></Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="cta-band" id="contexto">
          <div className="shell cta-card">
            <div><p className="eyebrow">Contexto antes que ruido</p><h2>Internet cambia rápido.<br />Su memoria no debería.</h2></div>
            <StoryboardArt />
          </div>
        </section>
      </main>
      <footer><div className="shell footer-inner"><LogoText /><p>Archivo independiente de cultura de internet.</p><Link href="/admin">Panel administrador</Link></div></footer>
    </>
  );
}

function LogoText() {
  return <strong className="footer-logo">MEME ATLAS</strong>;
}
