import Link from "next/link";
import { notFound } from "next/navigation";
import { updateMemeAction } from "@/app/actions";
import { requireAdmin } from "@/lib/auth";
import { getMeme } from "@/lib/db";

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const meme = getMeme(slug);
  if (!meme) notFound();

  return (
    <main className="shell edit-shell">
      <Link className="back-link" href="/admin">← Volver al panel</Link>
      <header><p className="eyebrow">Editando / {meme.slug}</p><h1>{meme.title}</h1><p>{meme.views.toLocaleString("es")} visitas registradas</p></header>
      <form className="edit-form" action={updateMemeAction.bind(null, slug)}>
        <label htmlFor="title">Título</label><input id="title" name="title" defaultValue={meme.title} required />
        <label htmlFor="summary">Summary</label><textarea id="summary" name="summary" defaultValue={meme.summary} rows={5} />
        <label htmlFor="contentTr">Content_tr <span>Markdown</span></label><textarea className="code-textarea" id="contentTr" name="contentTr" defaultValue={meme.contentTr} rows={24} />
        <div className="form-buttons"><button className="button button-dark" type="submit">Guardar cambios</button><Link className="button button-light" href={`/memes/${slug}`}>Vista previa</Link></div>
      </form>
    </main>
  );
}
