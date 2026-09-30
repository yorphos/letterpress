import { useState, lazy, Suspense } from "react";
import { Field, Studio } from "../vendor/professional/react/studio";
import type { Product, EditorProps } from "../vendor/professional/react/studio";
import { themeVars, ThemeFields } from "../vendor/professional/react/theme";
import { seed, templates, nodeHTML, applyTemplate } from "../shared/domain.js";
const RichEditor = lazy(() => import("./RichEditor"));
function Editor(props: EditorProps) {
  const { data, onChange, module, readonly } = props;
  const set = (key: string, value: any) => onChange({ ...data, [key]: value });
  const mode = module === "identity" ? data.mode : module;
  const supported = templates as Record<string, string[]>;
  if (module !== "identity" && data.mode !== module) {
    return (
      <fieldset disabled={readonly}>
        <p className="handoff-note">
          This publication is currently a {data.mode}. Switch its mode to work
          with {module} output.
        </p>
        <button
          onClick={() =>
            onChange(applyTemplate(data, module, supported[module][0]))
          }
        >
          Use {module} mode
        </button>
      </fieldset>
    );
  }
  return (
    <fieldset disabled={readonly}>
      <Field label="Project name">
        <input
          value={data.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </Field>
      {module === "identity" ? (
        <ThemeFields value={data.theme} onChange={(t) => set("theme", t)} />
      ) : (
        <>
          <Field label="Starting template">
            <select
              value={data.template}
              onChange={(e) => set("template", e.target.value)}
            >
              {supported[mode].map((t: string) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            onClick={() => onChange(applyTemplate(data, mode, data.template))}
          >
            Apply starting template · replace current content
          </button>
          {mode === "email" && (
            <Field label="Email subject">
              <input
                value={data.subject}
                onChange={(e) => set("subject", e.target.value)}
              />
            </Field>
          )}
          {mode === "presentation" ? (
            <>
              {data.slides.map((s: any, i: number) => (
                <div className="list-item" key={i}>
                  <h3>Slide {i + 1}</h3>
                  <Field label="Slide heading">
                    <input
                      value={s.title}
                      onChange={(e) =>
                        set(
                          "slides",
                          data.slides.map((v: any, j: number) =>
                            j === i ? { ...s, title: e.target.value } : v,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Slide copy">
                    <textarea
                      value={s.body}
                      onChange={(e) =>
                        set(
                          "slides",
                          data.slides.map((v: any, j: number) =>
                            j === i ? { ...s, body: e.target.value } : v,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Layout">
                    <select
                      value={s.layout}
                      onChange={(e) =>
                        set(
                          "slides",
                          data.slides.map((v: any, j: number) =>
                            j === i ? { ...s, layout: e.target.value } : v,
                          ),
                        )
                      }
                    >
                      <option value="title">Title & statement</option>
                      <option value="split">Two-column story</option>
                      <option value="closing">Closing & next step</option>
                    </select>
                  </Field>
                  <div className="actions">
                    <button
                      disabled={!i}
                      onClick={() => {
                        const slides = [...data.slides];
                        [slides[i - 1], slides[i]] = [slides[i], slides[i - 1]];
                        set("slides", slides);
                      }}
                    >
                      Move up
                    </button>
                    <button
                      onClick={() =>
                        set(
                          "slides",
                          data.slides.filter((_: any, j: number) => j !== i),
                        )
                      }
                    >
                      Remove slide
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() =>
                  set("slides", [
                    ...data.slides,
                    {
                      title: "Your next chapter",
                      body: "Add the useful details.",
                      layout: "title",
                    },
                  ])
                }
              >
                Add slide
              </button>
            </>
          ) : (
            <Suspense
              fallback={<p role="status">Opening the document editor…</p>}
            >
              <RichEditor {...props} />
            </Suspense>
          )}
        </>
      )}
      <Field label="Implementation and editorial notes">
        <textarea
          value={data.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>
    </fieldset>
  );
}
export function Preview({ data, module }: { data: any; module: string }) {
  const [slide, setSlide] = useState(0);
  const current = data.slides[Math.min(slide, data.slides.length - 1)];
  if (data.mode === "presentation" && current)
    return (
      <div style={themeVars(data.theme)}>
        <div
          className={"slide-preview " + current.layout}
          tabIndex={0}
          aria-label="Presentation preview"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight")
              setSlide(Math.min(slide + 1, data.slides.length - 1));
            if (e.key === "ArrowLeft") setSlide(Math.max(slide - 1, 0));
          }}
        >
          <small>
            {data.name} / {String(slide + 1).padStart(2, "0")}
          </small>
          <h1>{current.title}</h1>
          <p>{current.body}</p>
        </div>
        <div className="slide-queue">
          {data.slides.map((s: any, i: number) => (
            <button
              key={i}
              className={i === slide ? "active" : ""}
              onClick={() => setSlide(i)}
            >
              {i + 1}. {s.title}
            </button>
          ))}
        </div>
      </div>
    );
  return (
    <div className="preview-document" style={themeVars(data.theme)}>
      <p className="preview-label">
        {data.mode === "email" ? "Subject: " + data.subject : data.template} /{" "}
        {data.name}
      </p>
      <div dangerouslySetInnerHTML={{ __html: nodeHTML(data.content) }} />
    </div>
  );
}
const product: Product = {
  id: "letterpress",
  name: "Letterpress",
  kicker: "BRING YOUR WORK INTO THE WORLD.",
  tagline: "Make every piece feel considered.",
  description:
    "Documents, emails, and presentations that speak the same language. Compose with care, review together, and keep your project’s identity in every detail.",
  modules: [
    {
      id: "document",
      name: "Documents",
      description: "Clear briefs, reports, and the details worth keeping.",
    },
    {
      id: "email",
      name: "Email",
      description: "Thoughtful updates, reviewed before they leave.",
    },
    {
      id: "presentation",
      name: "Presentations",
      description: "A clear story, with room for your next idea.",
    },
    {
      id: "identity",
      name: "Identity",
      description: "The same color, type, and tone in every piece.",
    },
  ],
  seed,
  Editor,
  Preview,
  exports: [
    { id: "email-html", name: "Email HTML" },
    { id: "email-text", name: "Email plain text" },
    { id: "pdf", name: "Publication · PDF" },
    { id: "html", name: "Document or web deck · HTML" },
    { id: "markdown", name: "Editable source · Markdown" },
  ],
};
export default function App() {
  return <Studio product={product} />;
}
