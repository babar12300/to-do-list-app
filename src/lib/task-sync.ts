import type { Task, TaskList } from '@/context/AppContext';

export interface Plan { tasks: Task[]; lists: TaskList[] }
export interface RemotePlan extends Plan { revision: number }
export interface PlanCache { data: Plan; base: Plan; revision: number }
export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'error';
export const emptyPlan = (): Plan => ({ tasks: [], lists: [] });
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Three-way merge: only locally changed fields override the current remote row.
function mergeItems<T extends { id: string }>(base: T[], local: T[], remote: T[]): T[] {
  const b = new Map(base.map(x => [x.id, x]));
  const l = new Map(local.map(x => [x.id, x]));
  const r = new Map(remote.map(x => [x.id, x]));
  const order = equal(base.map(x => x.id), local.map(x => x.id)) ? remote : local;
  const ids = [...new Set([...order, ...remote, ...local].map(x => x.id))];
  return ids.flatMap(id => {
    const old = b.get(id), mine = l.get(id), theirs = r.get(id);
    if (!mine) return old ? [] : theirs ? [theirs] : [];
    if (!theirs) return old && equal(mine, old) ? [] : [mine];
    if (!old) return [theirs];
    const merged = { ...theirs };
    for (const key of new Set([...Object.keys(old), ...Object.keys(mine)])) {
      const field = key as keyof T;
      if (!equal(old[field], mine[field])) merged[field] = mine[field];
    }
    return [merged];
  });
}

export function mergePlans(base: Plan, local: Plan, remote: Plan): Plan {
  const lists = mergeItems(base.lists, local.lists, remote.lists);
  const valid = new Set(['inbox', ...lists.map(x => x.id)]);
  const tasks = mergeItems(base.tasks, local.tasks, remote.tasks).map(task =>
    valid.has(task.listId) ? task : { ...task, listId: 'inbox' });
  return { tasks, lists };
}

export interface PlanTransport {
  read(userId: string): Promise<RemotePlan>;
  save(revision: number, plan: Plan): Promise<RemotePlan | null>;
}

export class TaskSync {
  private userId: string | null = null;
  private cache: PlanCache = { data: emptyPlan(), base: emptyPlan(), revision: 0 };
  private running = false;
  private generation = 0;
  private dirtyVersion = 0;
  constructor(private transport: PlanTransport, private storage: Storage,
    private replace: (plan: Plan) => void, private status: (status: SyncStatus) => void) {}

  get owner() { return this.userId; }

  switchAccount(userId: string | null, guest: Plan) {
    if (userId === this.userId) return;
    this.generation++;
    this.userId = userId;
    this.running = false;
    if (!userId) { this.replace(guest); this.status('local'); return; }
    let saved: PlanCache | null = null;
    try { saved = JSON.parse(this.storage.getItem(`taskly-account-${userId}`) || 'null'); } catch {}
    this.cache = saved ?? { data: emptyPlan(), base: emptyPlan(), revision: 0 };
    this.cache.data = mergePlans(emptyPlan(), guest, this.cache.data);
    this.persist();
    this.replace(this.cache.data);
    this.status('syncing');
    void this.sync();
  }

  update(plan: Plan) {
    if (!this.userId) return;
    this.cache.data = plan;
    this.dirtyVersion++;
    this.persist();
    this.status('syncing');
    void this.sync();
  }

  private persist() {
    if (this.userId) this.storage.setItem(`taskly-account-${this.userId}`, JSON.stringify(this.cache));
  }

  async sync() {
    if (!this.userId || this.running) return;
    this.running = true;
    const generation = this.generation, userId = this.userId;
    try {
      for (let attempt = 0; attempt < 8; attempt++) {
        const remote = await this.transport.read(userId);
        if (generation !== this.generation) return;
        const merged = mergePlans(this.cache.base, this.cache.data, remote);
        this.cache = { data: merged, base: { tasks: remote.tasks, lists: remote.lists }, revision: remote.revision };
        this.replace(merged);
        this.persist();
        if (equal(merged, this.cache.base)) { this.status('synced'); return; }
        const version = this.dirtyVersion;
        const saved = await this.transport.save(remote.revision, merged);
        if (generation !== this.generation) return;
        if (!saved) continue; // Another device wrote first: read and merge again.
        this.cache.base = { tasks: saved.tasks, lists: saved.lists };
        this.cache.revision = saved.revision;
        this.persist();
        if (version === this.dirtyVersion) { this.status('synced'); return; }
      }
      this.status('error');
    } catch { if (generation === this.generation) this.status(navigator.onLine ? 'error' : 'offline'); }
    finally { if (generation === this.generation) this.running = false; }
  }
}