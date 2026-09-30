import {
  defaultTheme,
  theme,
  text,
  safeURL,
  escapeHTML,
  documentHTML,
} from "../vendor/professional/shared/model.js";
export const templates = {
  document: [
    "Brief",
    "Proposal presentation",
    "Technical specification",
    "Progress report",
    "Case study",
    "Handoff guide",
  ],
  email: [
    "Invitation",
    "Proposal ready",
    "Progress update",
    "Change request",
    "Handoff",
    "Release announcement",
  ],
  presentation: [
    "Project pitch",
    "Technical overview",
    "Progress review",
    "Case study",
  ],
};
export const paragraph = (value) => ({
  type: "paragraph",
  content: value ? [{ type: "text", text: value }] : [],
});
export function seed(name = "Untitled publication") {
  return {
    name,
    theme: structuredClone(defaultTheme),
    mode: "document",
    template: "Progress report",
    subject: "A thoughtful update from the studio",
    content: {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Good work, clearly presented." }],
        },
        paragraph(
          "Bring the important decisions, useful evidence, and next steps together.",
        ),
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "What changed" }],
        },
        paragraph(
          "The first interface is ready for review. Its visual identity and supporting materials now speak the same language.",
        ),
      ],
    },
    slides: [
      {
        title: "Good work, clearly presented.",
        body: "One project identity. A clear story. Useful next steps.",
        layout: "title",
      },
      {
        title: "From idea to useful work",
        body: "Scope the engagement. Build the interface. Bring the result together.",
        layout: "split",
      },
      {
        title: "The next step",
        body: "Review the proposal and choose a direction.",
        layout: "closing",
      },
    ],
    notes: "",
  };
}
const allowed = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "hardBreak",
  "horizontalRule",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
  "image",
]);
export function validateContent(node, depth = 0, counter = { n: 0 }) {
  if (
    !node ||
    typeof node !== "object" ||
    !allowed.has(node.type) ||
    depth > 16 ||
    ++counter.n > 5000
  )
    throw new Error("Invalid or oversized document structure.");
  const out = { type: node.type };
  if (node.type === "image") {
    const src = text(node.attrs?.src, 4 * 1024 * 1024);
    if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src))
      throw new Error("Invalid embedded image.");
    out.attrs = { src, alt: text(node.attrs?.alt || "", 200) };
  }
  if (node.type === "text") out.text = text(node.text, 20000);
  if (node.type === "heading")
    out.attrs = {
      level: [1, 2, 3].includes(node.attrs?.level) ? node.attrs.level : 2,
    };
  if (["tableCell", "tableHeader"].includes(node.type))
    out.attrs = { colspan: 1, rowspan: 1 };
  if (node.marks)
    out.marks = node.marks
      .filter((m) =>
        ["bold", "italic", "strike", "code", "link"].includes(m.type),
      )
      .map((m) =>
        m.type === "link"
          ? { type: "link", attrs: { href: safeURL(m.attrs?.href) } }
          : { type: m.type },
      );
  if (node.content) {
    if (!Array.isArray(node.content))
      throw new Error("Invalid document children.");
    out.content = node.content.map((n) =>
      validateContent(n, depth + 1, counter),
    );
  }
  return out;
}
export function normalize(v) {
  const d = { ...seed(), ...v };
  if (
    !["document", "email", "presentation"].includes(d.mode) ||
    !templates[d.mode].includes(d.template)
  )
    throw new Error("Invalid publication mode or template.");
  if (!Array.isArray(d.slides) || d.slides.length > 50)
    throw new Error("Invalid or oversized slide list.");
  return {
    name: text(d.name, 120),
    theme: theme(d.theme),
    mode: d.mode,
    template: d.template,
    subject: text(d.subject, 200),
    content: (() => {
      if (d.content?.type !== "doc") throw new Error("Invalid document root.");
      return validateContent(d.content);
    })(),
    slides: d.slides.map((s) => ({
      title: text(s.title, 200),
      body: text(s.body, 6000),
      layout: ["title", "split", "closing"].includes(s.layout)
        ? s.layout
        : "title",
    })),
    notes: text(d.notes || "", 20000),
  };
}
export function nodeHTML(n) {
  if (n.type === "doc") n = validateContent(n);
  if (n.type === "image")
    return `<img src="${escapeHTML(n.attrs.src)}" alt="${escapeHTML(n.attrs.alt)}">`;
  if (n.type === "text") {
    let value = escapeHTML(n.text);
    for (const mark of n.marks || []) {
      const tag = {
        bold: "strong",
        italic: "em",
        strike: "s",
        code: "code",
        link: "a",
      }[mark.type];
      value = `<${tag}${mark.type === "link" ? ` href="${escapeHTML(mark.attrs.href)}"` : ""}>${value}</${tag}>`;
    }
    return value;
  }
  if (n.type === "hardBreak") return "<br>";
  if (n.type === "horizontalRule") return "<hr>";
  const tags = {
    paragraph: "p",
    bulletList: "ul",
    orderedList: "ol",
    listItem: "li",
    blockquote: "blockquote",
    codeBlock: "pre",
    table: "table",
    tableRow: "tr",
    tableCell: "td",
    tableHeader: "th",
  };
  const children = (n.content || []).map(nodeHTML).join("");
  if (n.type === "doc") return children;
  const tag = n.type === "heading" ? "h" + n.attrs.level : tags[n.type];
  return `<${tag}>${children}</${tag}>`;
}
export function nodeText(n) {
  if (n.type === "text") return n.text;
  if (n.type === "hardBreak") return "\n";
  const value = (n.content || [])
    .map(nodeText)
    .join(
      ["doc", "bulletList", "orderedList", "table", "tableRow"].includes(n.type)
        ? "\n\n"
        : "",
    );
  return n.type === "heading" ? "#".repeat(n.attrs.level) + " " + value : value;
}
export function publicationHTML(v) {
  const d = normalize(v);
  const body =
    d.mode === "presentation"
      ? d.slides
          .map(
            (s) =>
              `<section class="slide ${s.layout}"><p>${escapeHTML(d.name)}</p><h1>${escapeHTML(s.title)}</h1><p>${escapeHTML(s.body)}</p></section>`,
          )
          .join("")
      : nodeHTML(d.content);
  let html = documentHTML(d.name, body, d.theme);
  if (d.mode === "presentation")
    html = html.replace(
      "</style>",
      "@page{size:1280px 720px;margin:0}body{padding:0}.slide{height:720px;overflow:hidden;background:var(--kit-surface)}.slide.title h1{font-size:72px;max-width:900px}.slide.split{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-content:center}.slide.split>p:first-child{grid-column:1/-1}.slide.closing{background:var(--kit-accent);color:var(--kit-accent-text)}.slide.closing h1{font-size:64px}</style>",
    );
  return html;
}

const templateSections = {
  Brief: [
    "Purpose",
    "Audience",
    "Deliverables",
    "Constraints",
    "Success criteria",
  ],
  "Proposal presentation": [
    "The opportunity",
    "Recommended approach",
    "Scope and exclusions",
    "Timeline",
    "Investment",
    "Next step",
  ],
  "Technical specification": [
    "Context",
    "Requirements",
    "Architecture",
    "Interfaces",
    "Failure handling",
    "Verification",
  ],
  "Progress report": [
    "What changed",
    "Evidence",
    "Decisions",
    "Risks",
    "Next steps",
  ],
  "Case study": [
    "The challenge",
    "The approach",
    "The result",
    "What we learned",
  ],
  "Handoff guide": [
    "What is included",
    "Getting started",
    "Operations",
    "Known limits",
    "Support",
  ],
  Invitation: [
    "You are invited",
    "What we will review",
    "How to join",
    "A next step",
  ],
  "Proposal ready": [
    "Your proposal is ready",
    "Scope and investment",
    "Review and questions",
    "Next step",
  ],
  "Progress update": [
    "A useful update",
    "What changed",
    "What needs your input",
    "Next checkpoint",
  ],
  "Change request": [
    "A proposed scope change",
    "Why it helps",
    "Price and schedule impact",
    "Review before proceeding",
  ],
  Handoff: [
    "Your materials are ready",
    "Included files",
    "Getting started",
    "Support",
  ],
  "Release announcement": [
    "A new release",
    "What is new",
    "How to try it",
    "Feedback",
  ],
  "Project pitch": [
    "The opportunity",
    "Our approach",
    "Scope",
    "Timeline and investment",
    "Next step",
  ],
  "Technical overview": [
    "System context",
    "Architecture",
    "Data and interfaces",
    "Reliability",
    "Operations",
  ],
  "Progress review": [
    "Where we are",
    "Evidence",
    "Decisions",
    "Risks",
    "Next step",
  ],
};
export function applyTemplate(data, mode, name) {
  if (!templates[mode]?.includes(name))
    throw new Error("Invalid starting template.");
  const sections = templateSections[name] || templateSections["Case study"];
  const content = {
    type: "doc",
    content: sections.flatMap((title) => [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: title }],
      },
      paragraph("Add the details, evidence, and decisions that belong here."),
    ]),
  };
  return {
    ...data,
    mode,
    template: name,
    subject: name + " — " + data.name,
    content,
    slides: sections.map((title, i) => ({
      title,
      body: "Add a clear point and the evidence that supports it.",
      layout:
        i === 0 ? "title" : i === sections.length - 1 ? "closing" : "split",
    })),
  };
}

export function nodeMarkdown(n) {
  if (n.type === "text") {
    let v = n.text;
    for (const m of n.marks || [])
      v =
        m.type === "bold"
          ? "**" + v + "**"
          : m.type === "italic"
            ? "*" + v + "*"
            : m.type === "code"
              ? "`" + v + "`"
              : m.type === "link"
                ? "[" + v + "](" + m.attrs.href + ")"
                : v;
    return v;
  }
  if (n.type === "image") return "![" + n.attrs.alt + "](" + n.attrs.src + ")";
  if (n.type === "hardBreak") return "  \n";
  if (n.type === "horizontalRule") return "\n---\n";
  const children = n.content || [];
  if (n.type === "bulletList" || n.type === "orderedList")
    return children
      .map(
        (v, i) =>
          (n.type === "bulletList" ? "- " : String(i + 1) + ". ") +
          nodeMarkdown(v),
      )
      .join("\n");
  if (n.type === "table")
    return children
      .map(
        (r, i) =>
          "| " +
          (r.content || [])
            .map((c) => nodeMarkdown(c).replaceAll("|", "\\|"))
            .join(" | ") +
          " |" +
          (i === 0
            ? "\n| " + (r.content || []).map(() => "---").join(" | ") + " |"
            : ""),
      )
      .join("\n");
  const v = children.map(nodeMarkdown).join(n.type === "doc" ? "\n\n" : "");
  return n.type === "heading"
    ? "#".repeat(n.attrs.level) + " " + v
    : n.type === "blockquote"
      ? "> " + v.replaceAll("\n", "\n> ")
      : n.type === "codeBlock"
        ? "```\n" + v + "\n```"
        : v;
}
