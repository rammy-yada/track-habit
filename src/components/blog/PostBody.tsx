import { Fragment } from "react";
import Link from "next/link";
import { parseInline, parsePost } from "@/lib/blog-format";

function Text({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, i) => {
        if (part.type === "bold") return <strong key={i}>{part.text}</strong>;
        if (part.type === "italic") return <em key={i}>{part.text}</em>;
        if (part.type === "code") return <code key={i}>{part.text}</code>;
        if (part.type === "link")
          return part.external ? (
            <a key={i} href={part.href} target="_blank" rel="noopener noreferrer nofollow">
              {part.text}
            </a>
          ) : (
            <Link key={i} href={part.href}>
              {part.text}
            </Link>
          );
        return <Fragment key={i}>{part.text}</Fragment>;
      })}
    </>
  );
}

/**
 * A blog post's text, laid out. The post is parsed into headings, lists and
 * so on and rendered as React elements — never inserted as HTML — so whatever
 * is typed into a post is shown as text. Used on the public page and for the
 * live preview in the admin's editor, so both look the same.
 */
export function PostBody({ body }: { body: string }) {
  return (
    <div className="space-y-5 text-[17px] leading-[1.75] text-ink/90 [&_a]:font-semibold [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-2 [&_code]:rounded [&_code]:bg-raised [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_strong]:font-bold [&_strong]:text-ink">
      {parsePost(body).map((block, i) => {
        switch (block.type) {
          case "h2":
            return (
              <h2 key={i} className="!mt-10 font-display text-2xl font-bold tracking-tight text-ink">
                <Text text={block.text} />
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="!mt-8 font-display text-xl font-bold tracking-tight text-ink">
                <Text text={block.text} />
              </h3>
            );
          case "quote":
            return (
              <blockquote key={i} className="border-l-4 border-brand pl-4 text-lg italic text-muted">
                <Text text={block.text} />
              </blockquote>
            );
          case "ul":
          case "ol": {
            const List = block.type;
            return (
              <List key={i} className={`space-y-2 pl-6 ${block.type === "ul" ? "list-disc" : "list-decimal"}`}>
                {block.items.map((item, n) => (
                  <li key={n}>
                    <Text text={item} />
                  </li>
                ))}
              </List>
            );
          }
          case "hr":
            return <hr key={i} className="!my-9 border-line" />;
          default:
            return (
              <p key={i}>
                <Text text={block.text} />
              </p>
            );
        }
      })}
    </div>
  );
}
