'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  formatTime12,
  toHHMM,
  type TimeKind,
  type TimeOption,
} from '@/lib/time-options';
import { card, ghostBtn, input, label, primaryBtn } from './ui';

type Group = { id: string; university: string; department: string };

const KIND_LABEL: Record<TimeKind, string> = {
  arrival: '🌅 Arrival (morning)',
  departure: '🌆 Departure (evening)',
};

export default function TimeOptionsTab({ groups }: { groups: Group[] }) {
  const [supabase] = useState(() => createClient());
  const [scope, setScope] = useState(''); // '' = all groups
  const [options, setOptions] = useState<TimeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<
    Record<TimeKind, { time: string; label: string }>
  >({
    arrival: { time: '', label: '' },
    departure: { time: '', label: '' },
  });
  const [editing, setEditing] = useState<
    Record<string, { time: string; label: string }>
  >({});

  const load = useCallback(async () => {
    let query = supabase
      .from('time_options')
      .select('*')
      .order('sort_order')
      .order('time_value');
    query = scope ? query.eq('group_id', scope) : query.is('group_id', null);
    const { data, error: loadError } = await query;
    if (loadError) {
      setError(
        `Couldn't load time options: ${loadError.message}. Has the time_options migration been run?`,
      );
    } else {
      setError('');
      setOptions((data ?? []) as TimeOption[]);
    }
    setLoading(false);
  }, [supabase, scope]);

  useEffect(() => {
    // Async fetch; state is set after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const listFor = (kind: TimeKind) => options.filter((o) => o.kind === kind);

  const add = async (kind: TimeKind) => {
    const draft = drafts[kind];
    if (!draft.time) return;
    const list = listFor(kind);
    const { error: addError } = await supabase.from('time_options').insert({
      kind,
      time_value: draft.time,
      label: draft.label.trim() || null,
      group_id: scope || null,
      sort_order: list.length
        ? Math.max(...list.map((o) => o.sort_order)) + 1
        : 0,
      active: true,
    });
    if (addError) {
      setError(
        addError.code === '23505'
          ? 'That time already exists here.'
          : addError.message,
      );
      return;
    }
    setDrafts((prev) => ({ ...prev, [kind]: { time: '', label: '' } }));
    await load();
  };

  const update = async (id: string, patch: Partial<TimeOption>) => {
    const { error: updateError } = await supabase
      .from('time_options')
      .update(patch)
      .eq('id', id);
    if (updateError) setError(updateError.message);
    await load();
  };

  const remove = async (option: TimeOption) => {
    if (!window.confirm(`Remove ${formatTime12(option.time_value)}?`)) return;
    const { error: deleteError } = await supabase
      .from('time_options')
      .delete()
      .eq('id', option.id);
    if (deleteError) setError(deleteError.message);
    await load();
  };

  const move = async (kind: TimeKind, index: number, direction: -1 | 1) => {
    const list = listFor(kind);
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const reordered = [...list];
    [reordered[index], reordered[target]] = [
      reordered[target],
      reordered[index],
    ];
    await Promise.all(
      reordered.map((option, i) =>
        supabase
          .from('time_options')
          .update({ sort_order: i })
          .eq('id', option.id),
      ),
    );
    await load();
  };

  const saveEdit = async (option: TimeOption) => {
    const draft = editing[option.id];
    if (!draft?.time) return;
    await update(option.id, {
      time_value: draft.time,
      label: draft.label.trim() || null,
    });
    setEditing((prev) => {
      const next = { ...prev };
      delete next[option.id];
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className={card}>
        <h2 className="text-lg font-semibold text-white">
          Arrival & departure times
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Students can only pick from these times when they set or change their
          schedule. &quot;All groups&quot; times are offered to everyone; group
          times are added for that university/department only. If a list is
          empty, students can still enter any time.
        </p>
        <div className="mt-4 max-w-md">
          <label htmlFor="time-scope" className={label}>
            Applies to
          </label>
          <select
            id="time-scope"
            className={input}
            value={scope}
            onChange={(e) => {
              setLoading(true);
              setScope(e.target.value);
            }}
          >
            <option value="">All groups (global)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.university} · {g.department}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-300">
            {error}
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {(['arrival', 'departure'] as TimeKind[]).map((kind) => {
          const list = listFor(kind);
          return (
            <div key={kind} className={card}>
              <h3 className="font-semibold text-white">{KIND_LABEL[kind]}</h3>

              {loading ? (
                <p className="mt-4 text-sm text-zinc-500">Loading…</p>
              ) : list.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">No times yet.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {list.map((option, index) => {
                    const edit = editing[option.id];
                    return (
                      <li
                        key={option.id}
                        className={`flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 ${option.active ? '' : 'opacity-60'}`}
                      >
                        {edit ? (
                          <>
                            <input
                              type="time"
                              aria-label="Time"
                              className={`${input} w-32`}
                              value={edit.time}
                              onChange={(e) =>
                                setEditing((p) => ({
                                  ...p,
                                  [option.id]: {
                                    ...edit,
                                    time: e.target.value,
                                  },
                                }))
                              }
                            />
                            <input
                              aria-label="Label"
                              className={`${input} min-w-0 flex-1`}
                              value={edit.label}
                              placeholder="Label (optional)"
                              onChange={(e) =>
                                setEditing((p) => ({
                                  ...p,
                                  [option.id]: {
                                    ...edit,
                                    label: e.target.value,
                                  },
                                }))
                              }
                            />
                            <button
                              type="button"
                              className={ghostBtn}
                              onClick={() => saveEdit(option)}
                            >
                              Save
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="min-w-0 flex-1 text-sm text-white">
                              <span className="font-semibold">
                                {formatTime12(option.time_value)}
                              </span>
                              {option.label && (
                                <span className="text-zinc-400">
                                  {' '}
                                  · {option.label}
                                </span>
                              )}
                              {!option.active && (
                                <span className="ml-2 text-xs text-zinc-500">
                                  (hidden)
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              className={ghostBtn}
                              aria-label="Move up"
                              disabled={index === 0}
                              onClick={() => move(kind, index, -1)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className={ghostBtn}
                              aria-label="Move down"
                              disabled={index === list.length - 1}
                              onClick={() => move(kind, index, 1)}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className={ghostBtn}
                              onClick={() =>
                                setEditing((p) => ({
                                  ...p,
                                  [option.id]: {
                                    time: toHHMM(option.time_value),
                                    label: option.label ?? '',
                                  },
                                }))
                              }
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className={ghostBtn}
                              aria-pressed={option.active}
                              onClick={() =>
                                update(option.id, { active: !option.active })
                              }
                            >
                              {option.active ? 'Active' : 'Inactive'}
                            </button>
                            <button
                              type="button"
                              className={`${ghostBtn} hover:border-red-500/50 hover:text-red-300`}
                              onClick={() => remove(option)}
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-zinc-800 pt-4">
                <div>
                  <label htmlFor={`${kind}-new-time`} className={label}>
                    Time
                  </label>
                  <input
                    id={`${kind}-new-time`}
                    type="time"
                    className={`${input} w-32`}
                    value={drafts[kind].time}
                    onChange={(e) =>
                      setDrafts((p) => ({
                        ...p,
                        [kind]: { ...p[kind], time: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor={`${kind}-new-label`} className={label}>
                    Label (optional)
                  </label>
                  <input
                    id={`${kind}-new-label`}
                    className={input}
                    value={drafts[kind].label}
                    placeholder="e.g. Morning batch"
                    onChange={(e) =>
                      setDrafts((p) => ({
                        ...p,
                        [kind]: { ...p[kind], label: e.target.value },
                      }))
                    }
                  />
                </div>
                <button
                  type="button"
                  className={primaryBtn}
                  disabled={!drafts[kind].time}
                  onClick={() => add(kind)}
                >
                  Add
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
