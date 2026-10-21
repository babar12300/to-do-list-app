import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { t } from '@/i18n/translations';
import { X, Star, CalendarDays, Trash2, Link as LinkIcon, ImageIcon, Plus, ExternalLink } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { defaultListEmoji } from '@/data/emoji';
import { toast } from 'sonner';

export function TaskDetailPanel() {
  const { state, dispatch } = useApp();
  const { language, activeTaskId, tasks, lists } = state;
  const task = tasks.find(t => t.id === activeTaskId);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const debounceRef = useRef<number>();
  const panelRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setNotes(task.notes || '');
    }
  }, [task?.id]);

  // Auto-expand notes textarea
  useEffect(() => {
    const el = notesRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  }, [notes]);

  const update = useCallback((updates: Record<string, unknown>) => {
    if (!activeTaskId) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      dispatch({ type: 'UPDATE_TASK', payload: { id: activeTaskId, updates } });
    }, 300);
  }, [activeTaskId, dispatch]);

  // Flush pending debounce + close
  const close = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      // Flush: grab current local state and save immediately
      if (activeTaskId) {
        dispatch({ type: 'UPDATE_TASK', payload: { id: activeTaskId, updates: { title, notes } } });
      }
    }
    dispatch({ type: 'SET_ACTIVE_TASK', payload: null });
  }, [activeTaskId, dispatch, title, notes]);

  // Escape to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [close]);

  // Focus trap
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    // Focus first element on open
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) focusable[0].focus();

    return () => document.removeEventListener('keydown', handleTab);
  }, [activeTaskId]);

  if (!task || !activeTaskId) return null;

  // Only http(s): `new URL` alone accepts javascript:/data: URLs, which run script when clicked.
  const isValidUrl = (url: string) => {
    if (url.length > 2048) return false;
    try { const u = new URL(url); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
  };

  const addLink = () => {
    if (!linkInput.trim()) return;
    if (!isValidUrl(linkInput.trim())) {
      toast.error(t(language, 'invalidUrl'));
      return;
    }
    const links = [...(task.links || []), linkInput.trim()];
    dispatch({ type: 'UPDATE_TASK', payload: { id: activeTaskId, updates: { links } } });
    setLinkInput('');
  };

  const removeLink = (index: number) => {
    const links = (task.links || []).filter((_, i) => i !== index);
    dispatch({ type: 'UPDATE_TASK', payload: { id: activeTaskId, updates: { links } } });
  };

  const addImage = () => {
    if (!imageInput.trim()) return;
    if (!isValidUrl(imageInput.trim())) {
      toast.error(t(language, 'invalidUrl'));
      return;
    }
    const images = [...(task.images || []), imageInput.trim()];
    dispatch({ type: 'UPDATE_TASK', payload: { id: activeTaskId, updates: { images } } });
    setImageInput('');
  };

  const removeImage = (index: number) => {
    const images = (task.images || []).filter((_, i) => i !== index);
    dispatch({ type: 'UPDATE_TASK', payload: { id: activeTaskId, updates: { images } } });
  };

  const dueDate = task.dueDate ? parseISO(task.dueDate) : undefined;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-white/85 z-40 animate-sheet-fade-in" onClick={close} />

      {/* Panel: dot frosted sheet */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 bottom-0 w-full max-w-[380px] bg-white/60 backdrop-blur-[16px] border-l-[0.5px] border-black/[0.12] shadow-[0_8px_20px_rgba(0,0,0,0.12)] z-50 animate-slide-in-right overflow-y-auto"
        role="dialog"
        aria-label="Task details"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-[0.5px] border-tint-12">
          <button
            onClick={() => dispatch({ type: 'TOGGLE_STAR', payload: task.id })}
            className="flex w-8 h-8 items-center justify-center rounded-full transition-[background,transform] duration-100 ease-out hover:bg-tint-4 active:bg-tint-12 active:scale-[0.85]"
            aria-label={task.starred ? t(language, 'unstarTask') : t(language, 'starTask')}
          >
            <Star className={cn("w-4 h-4", task.starred ? "fill-star text-star" : "text-tint-56")} />
          </button>
          <button onClick={close} className="flex w-8 h-8 items-center justify-center rounded-full text-tint-56 transition-[background,transform] duration-100 ease-out hover:bg-tint-4 active:bg-tint-12 active:scale-[0.85]" aria-label={t(language, 'close')}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        <div className="px-6 py-4 border-b-[0.5px] border-tint-12">
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); update({ title: e.target.value }); }}
            className="w-full type-body-lg bg-transparent text-foreground placeholder:text-black/25 focus:outline-none"
            placeholder={t(language, 'addTask')}
          />
        </div>

        {/* Due Date */}
        <div className="px-6 py-4 border-b-[0.5px] border-tint-12">
          <p className="type-body-sm mb-2">{t(language, 'dueDate')}</p>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-2 rounded-row bg-tint-4 type-body-md text-foreground hover:bg-tint-12 transition-colors">
                <CalendarDays className="w-4 h-4 text-tint-56" />
                {dueDate ? format(dueDate, 'PPP') : t(language, 'noDate')}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={d => dispatch({ type: 'UPDATE_TASK', payload: { id: activeTaskId, updates: { dueDate: d ? format(d, 'yyyy-MM-dd') : undefined } } })}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* List assignment */}
        <div className="px-6 py-4 border-b-[0.5px] border-tint-12">
          <p className="type-body-sm mb-2">{t(language, 'moveToList')}</p>
          <Select
            value={task.listId}
            onValueChange={val => dispatch({ type: 'UPDATE_TASK', payload: { id: activeTaskId, updates: { listId: val } } })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inbox">{t(language, 'inbox')}</SelectItem>
              {lists.map(l => (
                <SelectItem key={l.id} value={l.id}>{l.emoji || defaultListEmoji} {l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="px-6 py-4 border-b-[0.5px] border-tint-12">
          <p className="type-body-sm mb-2">{t(language, 'notes')}</p>
          <textarea
            ref={notesRef}
            value={notes}
            onChange={e => { setNotes(e.target.value); update({ notes: e.target.value }); }}
            placeholder={t(language, 'addNotes')}
            className="w-full min-h-[100px] bg-transparent border-[0.5px] border-tint-12 rounded-row p-3 type-body-md text-foreground placeholder:text-black/25 focus:outline-none resize-none overflow-hidden"
          />
        </div>

        {/* Links */}
        <div className="px-6 py-4 border-b-[0.5px] border-tint-12">
          <p className="type-body-sm mb-2">{t(language, 'links')}</p>
          <div className="space-y-2 mb-2">
            {(task.links || []).map((link, i) => (
              <div key={i} className="flex items-center gap-2 group">
                <a href={isValidUrl(link) ? link : undefined} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center gap-1.5 type-body-sm !text-foreground truncate hover:underline bg-tint-4 px-2 py-1.5 rounded-row">
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{link}</span>
                </a>
                <button onClick={() => removeLink(i)} className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={linkInput}
              onChange={e => setLinkInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addLink(); }}
              placeholder={t(language, 'addLink')}
              className="flex-1 type-body-sm !text-foreground bg-transparent border-[0.5px] border-tint-12 rounded-row px-3 py-2 placeholder:text-black/25 focus:outline-none"
            />
            <button onClick={addLink} className="flex w-8 h-8 flex-shrink-0 items-center justify-center rounded-full text-tint-56 transition-[background,transform] duration-100 ease-out hover:bg-tint-4 active:bg-tint-12 active:scale-[0.85]">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Images */}
        <div className="px-6 py-4 border-b-[0.5px] border-tint-12">
          <p className="type-body-sm mb-2">{t(language, 'images')}</p>
          {(task.images || []).length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {(task.images || []).map((img, i) => (
                <div key={i} className="relative group aspect-square">
                  <img
                    src={isValidUrl(img) ? img : '/placeholder.svg'}
                    alt=""
                    className="w-full h-full object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => isValidUrl(img) && setLightboxImage(img)}
                    onError={e => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={imageInput}
              onChange={e => setImageInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addImage(); }}
              placeholder={t(language, 'addImage')}
              className="flex-1 type-body-sm !text-foreground bg-transparent border-[0.5px] border-tint-12 rounded-row px-3 py-2 placeholder:text-black/25 focus:outline-none"
            />
            <button onClick={addImage} className="flex w-8 h-8 flex-shrink-0 items-center justify-center rounded-full text-tint-56 transition-[background,transform] duration-100 ease-out hover:bg-tint-4 active:bg-tint-12 active:scale-[0.85]">
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Delete */}
        <div className="px-6 py-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-row text-destructive hover:bg-tint-4 transition-colors type-body-md">
                <Trash2 className="w-4 h-4" />
                {t(language, 'delete')}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t(language, 'delete')}</AlertDialogTitle>
                <AlertDialogDescription>{t(language, 'deleteConfirm')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t(language, 'cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => dispatch({ type: 'DELETE_TASK', payload: activeTaskId })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {t(language, 'delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Image Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={open => { if (!open) setLightboxImage(null); }}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-black/90 border-none">
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt=""
              className="w-full h-full object-contain max-h-[85vh] rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
