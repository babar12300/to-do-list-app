import { useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
import { t } from '@/i18n/translations';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { parseGoogleFiles, parsePastedText, type ImportedTask } from '@/lib/google-import';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoogleImportDialog({ open, onOpenChange }: Props) {
  const { state, dispatch } = useApp();
  const lang = state.language;
  const [items, setItems] = useState<ImportedTask[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [text, setText] = useState('');
  const [listId, setListId] = useState(state.lists.some(l => l.id === state.activeListId) ? state.activeListId : state.lists[0]?.id ?? 'inbox');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'file' | 'paste'>('file');

  const load = (next: ImportedTask[]) => {
    setItems(next);
    setSelected(new Set(next.map((_, i) => i)));
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const parsed = await parseGoogleFiles(Array.from(files));
      load(parsed);
      if (!parsed.length) toast.error(t(lang, 'importNothingFound'));
    } catch {
      toast.error(t(lang, 'importReadFailed'));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (i: number) => setSelected(prev => {
    const n = new Set(prev);
    n.has(i) ? n.delete(i) : n.add(i);
    return n;
  });

  const doImport = () => {
    const now = new Date().toISOString();
    let count = 0;
    items.forEach((item, i) => {
      if (!selected.has(i)) return;
      count++;
      dispatch({
        type: 'ADD_TASK',
        payload: {
          id: crypto.randomUUID(),
          title: item.title,
          notes: item.notes,
          dueDate: item.dueDate,
          completed: item.completed,
          completedAt: item.completed ? now : undefined,
          starred: false,
          listId,
          createdAt: now,
        },
      });
    });
    toast.success(t(lang, 'importDone').replace('{count}', String(count)));
    load([]);
    setText('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(lang, 'importFromGoogle')}</DialogTitle>
          <DialogDescription>{t(lang, 'importIntro')}</DialogDescription>
        </DialogHeader>

        <div className="grid w-full grid-cols-2 gap-2">
          <Button variant={mode === 'file' ? 'default' : 'secondary'} size="sm" onClick={() => { setMode('file'); load([]); }}>{t(lang, 'importUploadTab')}</Button>
          <Button variant={mode === 'paste' ? 'default' : 'secondary'} size="sm" onClick={() => { setMode('paste'); load([]); }}>{t(lang, 'importPasteTab')}</Button>
        </div>
        {mode === 'file' ? (
          <div className="space-y-2">
            <p className="type-body-sm text-muted-foreground">{t(lang, 'importFileHelp')}</p>
            <input
              type="file"
              accept=".json,.zip,application/json,application/zip"
              multiple
              aria-label={t(lang, 'importChooseFile')}
              disabled={busy}
              onChange={e => onFiles(e.target.files)}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-secondary-foreground"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              className="w-full rounded-md border border-input bg-background p-2 text-sm"
              rows={6}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={t(lang, 'importPastePlaceholder')}
              aria-label={t(lang, 'importPasteTab')}
            />
            <Button variant="secondary" size="sm" onClick={() => load(parsePastedText(text))} disabled={!text.trim()}>
              {t(lang, 'importPreview')}
            </Button>
          </div>
        )}

        {items.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="type-body-sm">{selected.size} / {items.length}</p>
              <Button variant="ghost" size="sm" onClick={() => setSelected(selected.size === items.length ? new Set() : new Set(items.map((_, i) => i)))}>
                {selected.size === items.length ? t(lang, 'importClear') : t(lang, 'importSelectAll')}
              </Button>
            </div>
            <ul className="max-h-48 overflow-y-auto rounded-lg border divide-y">
              {items.map((item, i) => (
                <li key={i}>
                  <label className="flex items-start gap-2 p-2 text-sm cursor-pointer">
                    <input type="checkbox" className="mt-1" checked={selected.has(i)} onChange={() => toggle(i)} />
                    <span className={item.completed ? 'line-through text-muted-foreground' : ''}>
                      {item.title}
                      {item.dueDate && <span className="ml-2 text-xs text-muted-foreground">{item.dueDate}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div>
              <p className="type-body-sm mb-1">{t(lang, 'importIntoList')}</p>
              <Select value={listId} onValueChange={setListId}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {state.lists.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.emoji ? `${l.emoji} ` : ''}{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={doImport} disabled={!selected.size}>
              {t(lang, 'importButton').replace('{count}', String(selected.size))}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
