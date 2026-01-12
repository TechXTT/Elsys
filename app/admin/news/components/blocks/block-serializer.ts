import type { NewsBlockInstance } from "./types";

/**
 * Serializes an array of news blocks to markdown format for storage.
 * The markdown includes special comments to preserve block metadata.
 */
export function blocksToMarkdown(blocks: NewsBlockInstance[]): string {
  return blocks.map(blockToMarkdown).join("\n\n");
}

function blockToMarkdown(block: NewsBlockInstance): string {
  const props = block.props as Record<string, unknown>;

  switch (block.type) {
    case "Heading": {
      const text = (props.text as string) || "";
      const level = (props.level as string) || "h2";
      const prefix = level === "h3" ? "###" : "##";
      return `${prefix} ${text}`;
    }

    case "Paragraph": {
      return (props.content as string) || "";
    }

    case "Quote": {
      const text = (props.text as string) || "";
      const author = props.author as string | undefined;
      const lines = text.split("\n").map((line) => `> ${line}`).join("\n");
      return author ? `${lines}\n> — ${author}` : lines;
    }

    case "List": {
      const style = (props.style as string) || "bullet";
      const items = (props.items as Array<{ text: string }>) || [];
      return items
        .map((item, index) => {
          if (style === "numbered") {
            return `${index + 1}. ${item.text}`;
          } else if (style === "check") {
            return `- [x] ${item.text}`;
          }
          return `- ${item.text}`;
        })
        .join("\n");
    }

    case "Callout": {
      const type = (props.type as string) || "info";
      const title = props.title as string | undefined;
      const content = (props.content as string) || "";
      const typeEmoji: Record<string, string> = {
        info: "ℹ️",
        warning: "⚠️",
        success: "✅",
        tip: "💡",
      };
      const emoji = typeEmoji[type] || "ℹ️";
      const titlePart = title ? ` **${title}**` : "";
      return `> ${emoji}${titlePart}\n> \n> ${content}`;
    }

    case "Code": {
      const language = (props.language as string) || "";
      const code = (props.code as string) || "";
      const filename = props.filename as string | undefined;
      const header = filename ? `<!-- filename: ${filename} -->\n` : "";
      return `${header}\`\`\`${language}\n${code}\n\`\`\``;
    }

    case "Image": {
      const src = (props.src as string) || "";
      const alt = (props.alt as string) || "";
      const caption = props.caption as string | undefined;
      const img = `![${alt}](${src})`;
      return caption ? `${img}\n*${caption}*` : img;
    }

    case "Gallery": {
      const images = (props.images as Array<{ src: string; alt?: string; caption?: string }>) || [];
      return images
        .map((img) => `![${img.alt || ""}](${img.src})`)
        .join("\n");
    }

    case "Divider": {
      return "---";
    }

    case "Table": {
      const headers = (props.headers as Array<{ text: string }>) || [];
      const rows = (props.rows as Array<{ cells: Array<{ text: string }> }>) || [];

      if (headers.length === 0) return "";

      const headerRow = `| ${headers.map((h) => h.text).join(" | ")} |`;
      const separatorRow = `| ${headers.map(() => "---").join(" | ")} |`;
      const dataRows = rows
        .map((row) => `| ${row.cells?.map((c) => c.text).join(" | ")} |`)
        .join("\n");

      return `${headerRow}\n${separatorRow}\n${dataRows}`;
    }

    case "Video": {
      const url = (props.url as string) || "";
      const caption = props.caption as string | undefined;
      // Use a simple link format for videos
      const videoLink = `[📹 Video](${url})`;
      return caption ? `${videoLink}\n*${caption}*` : videoLink;
    }

    case "Link": {
      const url = (props.url as string) || "";
      const title = (props.title as string) || url;
      const description = props.description as string | undefined;
      const link = `[${title}](${url})`;
      return description ? `${link}\n> ${description}` : link;
    }

    default:
      return `<!-- Unknown block type: ${block.type} -->`;
  }
}

/**
 * Converts blocks to a JSON string for storage.
 * This preserves all block metadata and is the recommended format for storage.
 */
export function blocksToJson(blocks: NewsBlockInstance[]): string {
  return JSON.stringify(blocks, null, 2);
}

/**
 * Parses a JSON string back to blocks array.
 */
export function jsonToBlocks(json: string): NewsBlockInstance[] {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed as NewsBlockInstance[];
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Simple markdown to blocks parser.
 * Note: This is a basic implementation that handles common patterns.
 * For complex markdown, the JSON storage format is recommended.
 */
export function markdownToBlocks(markdown: string): NewsBlockInstance[] {
  const blocks: NewsBlockInstance[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      blocks.push({
        id: crypto.randomUUID(),
        type: "Heading",
        props: { text: line.slice(4), level: "h3" },
      });
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push({
        id: crypto.randomUUID(),
        type: "Heading",
        props: { text: line.slice(3), level: "h2" },
      });
      i++;
      continue;
    }

    // Divider
    if (line === "---" || line === "***" || line === "___") {
      blocks.push({
        id: crypto.randomUUID(),
        type: "Divider",
        props: { style: "solid", spacing: "md" },
      });
      i++;
      continue;
    }

    // Code blocks
    if (line.startsWith("```")) {
      const language = line.slice(3).trim() || "plain";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        id: crypto.randomUUID(),
        type: "Code",
        props: { language, code: codeLines.join("\n"), filename: "" },
      });
      i++; // Skip closing ```
      continue;
    }

    // Lists
    if (line.match(/^[-*]\s/) || line.match(/^\d+\.\s/)) {
      const items: Array<{ text: string }> = [];
      const isNumbered = line.match(/^\d+\.\s/);
      const isCheck = line.match(/^[-*]\s\[[ x]\]\s/);

      while (i < lines.length) {
        const listLine = lines[i];
        let match;

        if (isCheck) {
          match = listLine.match(/^[-*]\s\[[ x]\]\s(.+)/);
        } else if (isNumbered) {
          match = listLine.match(/^\d+\.\s(.+)/);
        } else {
          match = listLine.match(/^[-*]\s(.+)/);
        }

        if (!match) break;
        items.push({ text: match[1] });
        i++;
      }

      blocks.push({
        id: crypto.randomUUID(),
        type: "List",
        props: {
          style: isCheck ? "check" : isNumbered ? "numbered" : "bullet",
          items,
        },
      });
      continue;
    }

    // Blockquotes
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      const text = quoteLines.join("\n");
      blocks.push({
        id: crypto.randomUUID(),
        type: "Quote",
        props: { text, author: "", style: "default" },
      });
      continue;
    }

    // Images
    const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imageMatch) {
      blocks.push({
        id: crypto.randomUUID(),
        type: "Image",
        props: {
          alt: imageMatch[1],
          src: imageMatch[2],
          caption: "",
          size: "large",
        },
      });
      i++;
      continue;
    }

    // Default: treat as paragraph
    const paragraphLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith(">") &&
      !lines[i].startsWith("-") &&
      !lines[i].startsWith("*") &&
      !lines[i].match(/^\d+\./) &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("![")
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }

    blocks.push({
      id: crypto.randomUUID(),
      type: "Paragraph",
      props: { content: paragraphLines.join("\n") },
    });
  }

  return blocks;
}
