import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SiteHeader } from "@/components/site-header";
import { getContentColumn, getPostContent, isMarkdownColumn } from "@/lib/content-column";
import { getMeme, recordView } from "@/lib/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const meme = getMeme((await params).slug);
  return meme ? { title: meme.title, description: meme.summary } : {};
}

export default async function MemePage({ params }: Props) {
  const { slug } = await params;
  const column = getContentColumn();
  const meme = getMeme(slug);
  if (!meme) notFound();
  after(() => recordView(slug));
  const content = getPostContent(meme, column) || "Sin contenido disponible.";

  return (
    <>
      <SiteHeader />
      <main className="shell article-shell">
        <div className="article-topline"><Link href="/">← Volver al archivo</Link><span className="column-label">Fuente: <code>{column}</code></span></div>
        <article className="article-layout">
          <header>
            <p className="eyebrow">Historia del meme</p>
            <h1>{meme.title}</h1>
            <p className="article-deck">{meme.summary}</p>
            <dl><div><dt>Columna</dt><dd>{column}</dd></div><div><dt>Fuente</dt><dd><a href={meme.url} rel="noreferrer" target="_blank">meme.com ↗</a></dd></div></dl>
          </header>
          <div className="article-body">
            {isMarkdownColumn(column) ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown> : <p className="summary-only">{content}</p>}
          </div>
        </article>
      </main>
    </>
  );
}
