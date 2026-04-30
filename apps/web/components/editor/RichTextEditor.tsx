"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Bold, Italic, Strikethrough, List, ListOrdered, RemoveFormatting, Heading2, Heading3, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogClose, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MediaPicker, type MediaPickerValue } from "@/components/admin/media/MediaPicker";
import { useState } from "react";

type Props = {
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
  eventSlug?: string;
};

export function RichTextEditor({ value, onChange, eventSlug }: Props) {
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Image],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: "prose prose-slate prose-admin max-w-none focus:outline-none min-h-[400px] p-5",
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-white overflow-hidden focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20">
      <div className="flex flex-wrap items-center gap-1 border-b border-border/60 bg-slate-50/50 p-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`size-8 ${editor.isActive("bold") ? "bg-slate-200" : ""}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`size-8 ${editor.isActive("italic") ? "bg-slate-200" : ""}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`size-8 ${editor.isActive("strike") ? "bg-slate-200" : ""}`}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-4" />
        </Button>
        
        <div className="w-px h-4 bg-border/60 mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`size-8 ${editor.isActive("heading", { level: 2 }) ? "bg-slate-200" : ""}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`size-8 ${editor.isActive("heading", { level: 3 }) ? "bg-slate-200" : ""}`}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="size-4" />
        </Button>

        <div className="w-px h-4 bg-border/60 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`size-8 ${editor.isActive("bulletList") ? "bg-slate-200" : ""}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={`size-8 ${editor.isActive("orderedList") ? "bg-slate-200" : ""}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </Button>

        <div className="w-px h-4 bg-border/60 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setIsImageDialogOpen(true)}
        >
          <ImageIcon className="size-4" />
        </Button>

        <div className="w-px h-4 bg-border/60 mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        >
          <RemoveFormatting className="size-4" />
        </Button>
      </div>

      <EditorContent editor={editor} />

      <Dialog open={isImageDialogOpen} onClose={() => setIsImageDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Sisipkan Gambar</DialogTitle>
          <DialogClose onClose={() => setIsImageDialogOpen(false)} />
        </DialogHeader>
        <DialogBody>
          <MediaPicker
            value={null}
            onChange={(asset) => {
              if (asset?.url) {
                editor.chain().focus().setImage({ src: asset.url }).run();
              }
              setIsImageDialogOpen(false);
            }}
            folder={eventSlug ? `public/events/${eventSlug}/pages/content` : `public/general`}
            visibility="public"
          />
        </DialogBody>
      </Dialog>
    </div>
  );
}
