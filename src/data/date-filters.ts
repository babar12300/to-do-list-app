/* The date-filter pills, in the order they are drawn.

   `id` matches a bucket id from TaskList's `dateBucket`, so a pill and the group
   header it corresponds to can never drift apart.

   It lives here rather than inside FilterPills because two components read it:
   the pills draw it, and the empty state looks a label up in it to name the
   filter that is hiding tasks (empty-state rule 10). */
export const dateFilters = [
  { id: 'today', key: 'today' },
  { id: 'tomorrow', key: 'tomorrow' },
  { id: 'next7', key: 'next7Days' },
  { id: 'later', key: 'later' },
  { id: 'nodate', key: 'noDate' },
];
