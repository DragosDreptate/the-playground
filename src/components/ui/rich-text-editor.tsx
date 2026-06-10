"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AtSign, Bold, Italic, Link2, List, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  /** HTML restauré au montage (ex : réouverture d'une modale fermée par erreur). */
  initialContent?: string;
  /**
   * Jetons insérables au curseur depuis la barre d'outils (ex : placeholder
   * prénom). Le `value` est inséré tel quel dans le contenu.
   */
  tokens?: Array<{ label: string; value: string }>;
  /** HTML + longueur du texte seul, à chaque frappe. */
  onChange: (html: string, textLength: number) => void;
  className?: string;
};

/**
 * Éditeur rich text WYSIWYG (Tiptap) à barre d'outils restreinte :
 * gras, italique, listes, lien. La sanitization ne se fait PAS ici
 * (client non fiable) — toujours côté serveur avant tout usage du HTML.
 */
export function RichTextEditor({
  id,
  placeholder,
  disabled,
  initialContent,
  tokens,
  onChange,
  className,
}: Props) {
  const t = useTranslations("RichTextEditor");
  const [linkPopoverOpen, setLinkPopoverOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  // Re-render à chaque transaction pour rafraîchir l'état actif des boutons
  const [, forceRender] = React.useReducer((n: number) => n + 1, 0);

  const editor = useEditor({
    immediatelyRender: false,
    content: initialContent ?? "",
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        link: {
          openOnClick: false,
          defaultProtocol: "https",
        },
      }),
    ],
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class:
          "prose-sm min-h-28 max-h-64 overflow-y-auto px-3 py-2 text-sm outline-none [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5",
        ...(placeholder ? { "aria-placeholder": placeholder } : {}),
      },
    },
    onTransaction: () => forceRender(),
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText().trim().length);
    },
  });

  React.useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  function applyLink() {
    if (!editor) return;
    const url = linkUrl.trim();
    if (url) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url.startsWith("http") || url.startsWith("mailto:") ? url : `https://${url}` })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setLinkUrl("");
    setLinkPopoverOpen(false);
  }

  return (
    <div
      className={cn(
        // Focus neutre (bordure assombrie), sans le ring rose du design system
        "border-input rounded-md border shadow-xs transition-colors focus-within:border-muted-foreground/40",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <div className="border-input bg-muted/50 flex items-center gap-0.5 rounded-t-md border-b px-1.5 py-1">
        <ToolbarButton
          editor={editor}
          active={editor?.isActive("bold") ?? false}
          label={t("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          active={editor?.isActive("italic") ?? false}
          label={t("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <div className="bg-border mx-1 h-4 w-px" />
        <ToolbarButton
          editor={editor}
          active={editor?.isActive("bulletList") ?? false}
          label={t("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          active={editor?.isActive("orderedList") ?? false}
          label={t("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <div className="bg-border mx-1 h-4 w-px" />
        <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              tabIndex={-1}
              aria-label={t("link")}
              title={t("link")}
              className={cn(
                "size-7 p-0",
                (editor?.isActive("link") ?? false) && "bg-background text-primary shadow-sm"
              )}
              onClick={() => {
                const existing = editor?.getAttributes("link").href as string | undefined;
                setLinkUrl(existing ?? "");
              }}
            >
              <Link2 className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                applyLink();
              }}
            >
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder={t("linkPlaceholder")}
                className="h-8 text-sm"
                autoFocus
              />
              <Button type="submit" size="sm" variant="outline" className="shrink-0">
                {t("linkApply")}
              </Button>
            </form>
          </PopoverContent>
        </Popover>
        {tokens && tokens.length > 0 && (
          <>
            <div className="bg-border mx-1 h-4 w-px" />
            {tokens.map((token) => (
              <Button
                key={token.value}
                type="button"
                variant="ghost"
                size="sm"
                tabIndex={-1}
                disabled={!editor}
                title={token.label}
                className="h-7 gap-1 px-1.5 text-xs font-medium"
                onClick={() => editor?.chain().focus().insertContent(token.value).run()}
              >
                <AtSign className="size-3" />
                {token.label}
              </Button>
            ))}
          </>
        )}
      </div>
      <div className="relative">
        {editor && editor.isEmpty && placeholder && (
          <p
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-2 left-3 text-sm"
          >
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({
  editor,
  active,
  label,
  onClick,
  children,
}: {
  editor: Editor | null;
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      // Hors de l'ordre de tabulation : Tab passe du champ précédent
      // directement à la zone de saisie, sans traverser la toolbar.
      tabIndex={-1}
      disabled={!editor}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn("size-7 p-0", active && "bg-background text-primary shadow-sm")}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
