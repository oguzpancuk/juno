import { describe, expect, it, vi } from 'vitest';
import { LeaveGate } from './leave-gate';

describe('settings leave gate', () => {
  it('waits for the sheet to be gone before leaving', () => {
    const gate = new LeaveGate();
    const next = vi.fn();
    const close = vi.fn();
    gate.opened();
    expect(gate.leave(next, close)).toBe('queued');
    expect(close).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
    gate.dismissed();
    expect(next).toHaveBeenCalledOnce();
  });

  it('still waits while the sheet is fading out', () => {
    const gate = new LeaveGate();
    const next = vi.fn();
    gate.opened();
    // Closed by the person, not yet reported gone: a leave now is queued.
    expect(gate.leave(next, vi.fn())).toBe('queued');
    expect(next).not.toHaveBeenCalled();
    gate.dismissed();
    expect(next).toHaveBeenCalledOnce();
  });

  it('leaves at once when the sheet was already closed', () => {
    const gate = new LeaveGate();
    const next = vi.fn();
    const close = vi.fn();
    gate.opened();
    gate.dismissed();
    // A deletion that finished after the sheet went away.
    expect(gate.leave(next, close)).toBe('ran');
    expect(next).toHaveBeenCalledOnce();
    expect(close).not.toHaveBeenCalled();
  });

  it('leaves only once', () => {
    const gate = new LeaveGate();
    const first = vi.fn();
    const second = vi.fn();
    gate.opened();
    expect(gate.leave(first, vi.fn())).toBe('queued');
    gate.dismissed();
    expect(gate.leave(second, vi.fn())).toBe('ignored');
    expect(first).toHaveBeenCalledOnce();
    expect(second).not.toHaveBeenCalled();
  });

  it('does nothing once the host is gone', () => {
    const gate = new LeaveGate();
    const queued = vi.fn();
    const late = vi.fn();
    gate.opened();
    gate.leave(queued, vi.fn());
    gate.unmounted();
    gate.dismissed();
    expect(queued).not.toHaveBeenCalled();
    const fresh = new LeaveGate();
    fresh.unmounted();
    expect(fresh.leave(late, vi.fn())).toBe('ignored');
    expect(late).not.toHaveBeenCalled();
  });

  it('opens again when a development build re-runs the effect', () => {
    const gate = new LeaveGate();
    const next = vi.fn();
    gate.unmounted();
    gate.attached();
    expect(gate.leave(next, vi.fn())).toBe('ran');
    expect(next).toHaveBeenCalledOnce();
  });
});
