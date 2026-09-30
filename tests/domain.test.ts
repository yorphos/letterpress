import { test } from "node:test";
import assert from "node:assert/strict";
import {
  seed,
  templates,
  applyTemplate,
  normalize,
  nodeHTML,
  publicationHTML,
  paragraph,
} from "../shared/domain.js";
import { config } from "../server/config.js";
test("every starting template produces mode-specific editable material", () => {
  for (const [mode, names] of Object.entries(templates))
    for (const name of names) {
      const d = normalize(applyTemplate(seed(), mode, name));
      assert.ok(d.content.content.length > 4);
      assert.ok(d.slides.length >= 4);
      assert.equal(d.template, name);
      assert.match(publicationHTML(d), /doctype html/);
    }
});
test("imported rich text rejects scripts, remote images and unsafe links", () => {
  assert.throws(
    () =>
      normalize({
        ...seed(),
        content: { type: "doc", content: [{ type: "script" }] },
      }),
    /structure/,
  );
  assert.throws(
    () =>
      normalize({
        ...seed(),
        content: {
          type: "doc",
          content: [
            { type: "image", attrs: { src: "http://127.0.0.1/private" } },
          ],
        },
      }),
    /image/,
  );
  assert.throws(
    () =>
      normalize({
        ...seed(),
        content: {
          type: "doc",
          content: [
            {
              type: "text",
              text: "unsafe",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      }),
    /HTTP/,
  );
  assert.match(
    nodeHTML({ type: "doc", content: [paragraph("<script>bad</script>")] }),
    /&lt;script&gt;/,
  );
});
test("email outputs contain semantic HTML and matching readable plain text", async () => {
  const d = applyTemplate(seed(), "email", "Progress update"),
    mail = await config.email(d);
  assert.match(mail.html, /<h2>A useful update/);
  assert.match(mail.text, /What changed/i);
  assert.equal(
    (await config.export({ data: d }, "email-html")).body,
    mail.html,
  );
});
