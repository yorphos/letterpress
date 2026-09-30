import {
  seed,
  normalize,
  publicationHTML,
  nodeText,
  nodeMarkdown,
  paragraph,
  nodeHTML,
} from "../shared/domain.js";
import { defaultTheme } from "../vendor/professional/shared/model.js";
export const config = {
  id: "letterpress",
  name: "Letterpress",
  port: 8186,
  seed,
  normalize,
  publicView: normalize,
  importKit: (kit) =>
    normalize({
      ...seed(kit.data.name || kit.manifest.projectName),
      theme: kit.data.theme || defaultTheme,
      ...(kit.manifest.app === "letterpress"
        ? kit.data
        : {
            content: {
              type: "doc",
              content: [
                {
                  type: "heading",
                  attrs: { level: 1 },
                  content: [
                    {
                      type: "text",
                      text: kit.data.name || kit.manifest.projectName,
                    },
                  ],
                },
                paragraph(kit.data.brief?.goals || kit.data.description || ""),
                paragraph(kit.data.brief?.deliverables || kit.data.notes || ""),
              ],
            },
            notes: "Imported snapshot from " + kit.manifest.app,
          }),
    }),
  async export(p, format) {
    if (["email-html", "email-text"].includes(format)) {
      const mail = await this.email(p.data);
      return {
        body: format === "email-html" ? mail.html : mail.text,
        mime: format === "email-html" ? "text/html" : "text/plain",
        name: format === "email-html" ? "email.html" : "email.txt",
      };
    }
    if (format === "html" || format === "pdf")
      return {
        body: publicationHTML(p.data),
        mime: "text/html",
        name: "publication." + format,
      };
    if (format === "markdown")
      return {
        body:
          p.data.mode === "presentation"
            ? p.data.slides
                .map((s) => "# " + s.title + "\n\n" + s.body)
                .join("\n\n---\n\n")
            : nodeMarkdown(p.data.content),
        mime: "text/markdown",
        name: "publication.md",
      };
    return null;
  },
  async email(d) {
    const { render, toPlainText, Html, Head, Body, Container, Text } =
      await import("react-email");
    const { createElement: h } = await import("react");
    const content = nodeText(d.content);
    const element = h(
      Html,
      { lang: "en" },
      h(Head),
      h(
        Body,
        {
          style: {
            backgroundColor: d.theme.light.background,
            fontFamily: "sans-serif",
          },
        },
        h(
          Container,
          { style: { padding: 32, color: d.theme.light.text } },
          h(Text, { style: { fontSize: 28, fontWeight: 700 } }, d.name),
          h("div", {
            dangerouslySetInnerHTML: { __html: nodeHTML(d.content) },
          }),
        ),
      ),
    );
    const html = await render(element);
    return { subject: d.subject, html, text: toPlainText(html) };
  },
};
