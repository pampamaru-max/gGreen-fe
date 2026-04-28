import { FileDown, Link } from "lucide-react";
import type { ContentBlock } from "./AboutContentEditor";

interface Props {
  blocks: ContentBlock[];
}

export default function AboutContentRenderer({ blocks }: Props) {
  if (!blocks || blocks.length === 0) {
    return <p className="text-muted-foreground">ยังไม่มีเนื้อหา</p>;
  }

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.type === "text") {
          return (
            <div
              key={i}
              className="text-muted-foreground leading-relaxed break-words [&_p]:mb-2 [&_strong]:font-semibold [&_strong]:text-inherit [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:space-y-1 [&_li]:leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-semibold"
              dangerouslySetInnerHTML={{ __html: block.content ?? "" }}
            />
          );
        }
        if (block.type === "image") {
          return (
            <div key={i} className="flex flex-col flex-1 gap-1 justify-center items-center">
              <img
                src={block.url}
                alt={block.caption || ""}
                className="rounded-lg w-fit h-fit max-w-full max-h-[85vh]"
              />
              {block.caption && (
                <figcaption className="text-xs text-muted-foreground text-center">
                  {block.caption}
                </figcaption>
              )}
            </div>
          );
        }
        if (block.type === "file") {
          return (
            <div key={i} className="space-y-1">
              {block.title && (
                <p className="font-medium text-foreground">
                  {block.title}
                </p>
              )}
              <a
                href={block.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline border border-border rounded-lg px-3 py-2"
              >
                <FileDown className="h-4 w-4" />
                {block.name}
              </a>
            </div>
          );
        }
        if (block.type === "link") {
          return (
            <div key={i} className="space-y-1 flex items-center text-center gap-2">
              <Link className="h-4 w-4 text-muted-foreground" />
              <a
                key={i}
                href={block.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                {block.title}
              </a>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
