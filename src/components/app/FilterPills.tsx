import { useApp } from '@/context/AppContext';
import { t } from '@/i18n/translations';
import { cn } from '@/lib/utils';
import { dateFilters } from '@/data/date-filters';

export function FilterPills() {
  const { state, dispatch } = useApp();
  const { language, dateFilter } = state;

  return (
    <div className="flex gap-0.5 mt-3 rounded-bubble bg-white/[0.65] backdrop-blur-[8px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.24)] p-1">
      {dateFilters.map(f => (
        <button
          key={f.id}
          onClick={() => dispatch({ type: 'SET_DATE_FILTER', payload: f.id })}
          className={cn(
            "px-2 sm:px-3 py-1 rounded-full type-body-sm transition-colors flex-1 whitespace-nowrap",
            dateFilter === f.id
              ? "bg-white !text-foreground border-[0.5px] border-tint-12"
              : "hover:!text-tint-68"
          )}
        >
          {t(language, f.key)}
        </button>
      ))}
    </div>
  );
}
