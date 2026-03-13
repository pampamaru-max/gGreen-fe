import { FileDown } from "lucide-react";
import type { ContentBlock } from "./AboutContentEditor";

interface Props {
  blocks: ContentBlock[];
}

export default function AboutContentRenderer({ blocks }: Props) {
  if (!blocks || blocks.length === 0) {
    return <p className="text-sm text-muted-foreground">ยังไม่มีเนื้อหา</p>;
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.type === "text") {
          return (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {block.content}
            </p>
          );
        }
        if (block.type === "image") {
          return (
            <figure key={i} className="space-y-1">
              <img src={block.url} alt={block.caption || ""} className="rounded-lg max-w-full" />
              {block.caption && (
                <figcaption className="text-xs text-muted-foreground text-center">{block.caption}</figcaption>
              )}
            </figure>
          );
        }
        if (block.type === "file") {
          return (
            <div key={i} className="space-y-1">
              {block.title && (
                <p className="text-sm font-medium text-foreground">{block.title}</p>
              )}
              <a
                href={block.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline border border-border rounded-lg px-3 py-2"
              >
                <FileDown className="h-4 w-4" />
                {block.name}
              </a>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
