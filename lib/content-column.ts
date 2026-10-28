export const CONTENT_COLUMNS = ["summary", "summary_tr", "content_md", "content_tr"] as const;
export type ContentColumn = (typeof CONTENT_COLUMNS)[number];

type PostContent = {
  summary: string;
  summaryTr: string;
  contentMd: string;
  contentTr: string;
};

export function getContentColumn(value = process.env.MEME_CONTENT_COLUMN): ContentColumn {
  if (!value) return "content_md";
  if (CONTENT_COLUMNS.includes(value as ContentColumn)) return value as ContentColumn;
  throw new Error(`MEME_CONTENT_COLUMN debe ser uno de: ${CONTENT_COLUMNS.join(", ")}`);
}

export function getPostContent(post: PostContent, column: ContentColumn) {
  const property: Record<ContentColumn, keyof PostContent> = {
    summary: "summary",
    summary_tr: "summaryTr",
    content_md: "contentMd",
    content_tr: "contentTr",
  };
  return post[property[column]];
}

export function isMarkdownColumn(column: ContentColumn) {
  return column === "content_md" || column === "content_tr";
}
