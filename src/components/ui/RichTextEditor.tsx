'use client';

import { useCallback, useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { $getRoot, $createParagraphNode, FORMAT_TEXT_COMMAND, EditorState, $getSelection, $isRangeSelection } from 'lexical';
import { $generateHtmlFromNodes } from '@lexical/html';

function Toolbar() {
  const [editor] = useLexicalComposerContext();

  const formatBold = useCallback(() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
  }, [editor]);

  const formatItalic = useCallback(() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
  }, [editor]);

  const formatUnderline = useCallback(() => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
  }, [editor]);

  return (
    <div className="flex gap-1 p-2 border-b border-olive-600 bg-olive-900/50">
      <button
        type="button"
        onClick={formatBold}
        className="px-3 py-1 rounded hover:bg-olive-700 text-cream font-bold"
        title="Bold"
      >
        B
      </button>
      <button
        type="button"
        onClick={formatItalic}
        className="px-3 py-1 rounded hover:bg-olive-700 text-cream italic"
        title="Italic"
      >
        I
      </button>
      <button
        type="button"
        onClick={formatUnderline}
        className="px-3 py-1 rounded hover:bg-olive-700 text-cream underline"
        title="Underline"
      >
        U
      </button>
    </div>
  );
}

function HtmlExportPlugin({ onHtmlChange }: { onHtmlChange: (html: string) => void }) {
  const [editor] = useLexicalComposerContext();

  const handleChange = useCallback((editorState: EditorState) => {
    editorState.read(() => {
      const html = $generateHtmlFromNodes(editor, null);
      onHtmlChange(html);
    });
  }, [editor, onHtmlChange]);

  return <OnChangePlugin onChange={handleChange} />;
}

function ClearEditorPlugin({ shouldClear, onCleared }: { shouldClear: boolean; onCleared: () => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (shouldClear) {
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        const paragraph = $createParagraphNode();
        root.append(paragraph);
      });
      onCleared();
    }
  }, [editor, shouldClear, onCleared]);

  return null;
}

function InsertTextPlugin({ textToInsert, onInserted }: { textToInsert: string | null; onInserted: () => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (textToInsert) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertText(textToInsert);
        } else {
          // If no selection, append to the end
          const root = $getRoot();
          const lastChild = root.getLastChild();
          if (lastChild) {
            lastChild.selectEnd();
            const newSelection = $getSelection();
            if ($isRangeSelection(newSelection)) {
              newSelection.insertText(textToInsert);
            }
          }
        }
      });
      onInserted();
    }
  }, [editor, textToInsert, onInserted]);

  return null;
}

interface RichTextEditorProps {
  onHtmlChange: (html: string) => void;
  placeholder?: string;
  shouldClear?: boolean;
  onCleared?: () => void;
  textToInsert?: string | null;
  onInserted?: () => void;
}

export function RichTextEditor({
  onHtmlChange,
  placeholder = 'Write your message...',
  shouldClear = false,
  onCleared = () => {},
  textToInsert = null,
  onInserted = () => {},
}: RichTextEditorProps) {
  const initialConfig = {
    namespace: 'BulkEmailEditor',
    theme: {
      paragraph: 'mb-2',
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
      },
    },
    onError: (error: Error) => {
      console.error('Lexical error:', error);
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="border border-olive-600 rounded-lg overflow-hidden bg-charcoal">
        <Toolbar />
        <div className="relative min-h-[200px]">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-[200px] p-4 text-cream outline-none" />
            }
            placeholder={
              <div className="absolute top-4 left-4 text-olive-500 pointer-events-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <HtmlExportPlugin onHtmlChange={onHtmlChange} />
        <ClearEditorPlugin shouldClear={shouldClear} onCleared={onCleared} />
        <InsertTextPlugin textToInsert={textToInsert} onInserted={onInserted} />
      </div>
    </LexicalComposer>
  );
}
