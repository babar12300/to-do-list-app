import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { PlanTransport, RemotePlan, Plan } from './task-sync';

function decode(row: { tasks: Json; lists: Json; revision: number }): RemotePlan {
  return { tasks: row.tasks as unknown as Plan['tasks'], lists: row.lists as unknown as Plan['lists'], revision: row.revision };
}

export const cloudTasks: PlanTransport = {
  async read(userId) {
    const { data, error } = await supabase.from('account_plans').select('tasks,lists,revision').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data ? decode(data) : { tasks: [], lists: [], revision: 0 };
  },
  async save(revision, plan) {
    const { data, error } = await supabase.rpc('save_account_plan', {
      expected_revision: revision,
      new_tasks: JSON.parse(JSON.stringify(plan.tasks)),
      new_lists: JSON.parse(JSON.stringify(plan.lists)),
    });
    if (error) throw error;
    return data?.[0] ? decode(data[0]) : null;
  },
};