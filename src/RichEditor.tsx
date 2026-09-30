import { useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import type { EditorProps } from "../vendor/professional/react/studio";
export default function RichEditor({ data, onChange, readonly }: EditorProps) {
  const latest = useRef(data);
  latest.current = data;
  const editor = useEditor({
    extensions: [StarterKit, TableKit, Image.configure({ allowBase64: true })],
    content: data.content,
    editable: !readonly,
    immediatelyRender: false,
    onUpdate: ({ editor }) =>
      onChange({ ...latest.current, content: editor.getJSON() }),
  });
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readonly);
      if (JSON.stringify(editor.getJSON()) !== JSON.stringify(data.content))
        editor.commands.setContent(data.content, { emitUpdate: false });
    }
  }, [data.content, readonly, editor]);
  return (
    <>
      <div className="editor-toolbar" aria-label="Document formatting">
        {[
          {
            name: "Bold",
            action: () => editor?.chain().focus().toggleBold().run(),
          },
          {
            name: "Italic",
            action: () => editor?.chain().focus().toggleItalic().run(),
          },
          {
            name: "Heading",
            action: () =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run(),
          },
          {
            name: "List",
            action: () => editor?.chain().focus().toggleBulletList().run(),
          },
          {
            name: "Code",
            action: () => editor?.chain().focus().toggleCodeBlock().run(),
          },
          {
            name: "Quote",
            action: () => editor?.chain().focus().toggleBlockquote().run(),
          },
          {
            name: "Table",
            action: () =>
              editor
                ?.chain()
                .focus()
                .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
                .run(),
          },
          { name: "Undo", action: () => editor?.chain().focus().undo().run() },
        ].map((x) => (
          <button
            type="button"
            key={x.name}
            disabled={readonly}
            onClick={x.action}
          >
            {x.name}
          </button>
        ))}
        <label className="file-button">
          Image
          <input
            type="file"
            disabled={readonly}
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.size < 3 * 1024 * 1024) {
                const reader = new FileReader();
                reader.onload = () =>
                  editor
                    ?.chain()
                    .focus()
                    .setImage({ src: String(reader.result), alt: file.name })
                    .run();
                reader.readAsDataURL(file);
              }
            }}
          />
        </label>
      </div>
      <EditorContent editor={editor} className="prose-editor" />
    </>
  );
}
