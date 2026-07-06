import { describe, it, expect } from 'vitest';
import { Task, TaskStatus, TaskStatusCounts } from '../../../core/domain/entities';
import { TaskStatusDerivedService } from './task-status.derived';

const buildTask = (id: string, status: TaskStatus): Task => ({
  id,
  userId: 'u1',
  title: id,
  priority: 'medium',
  status,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('TaskStatusDerivedService', () => {
  const service = new TaskStatusDerivedService();

  describe('deriveStatus', () => {
    it('returns pending when there are no children', () => {
      expect(service.deriveStatus([])).toBe<TaskStatus>('pending');
    });

    it('returns pending when all children are pending', () => {
      const children = [buildTask('a', 'pending'), buildTask('b', 'pending')];
      expect(service.deriveStatus(children)).toBe<TaskStatus>('pending');
    });

    it('returns in_progress when any child is in_progress', () => {
      const children = [buildTask('a', 'completed'), buildTask('b', 'in_progress'), buildTask('c', 'pending')];
      expect(service.deriveStatus(children)).toBe<TaskStatus>('in_progress');
    });

    it('returns completed when all children are completed', () => {
      const children = [buildTask('a', 'completed'), buildTask('b', 'completed')];
      expect(service.deriveStatus(children)).toBe<TaskStatus>('completed');
    });

    it('returns in_progress when there is a mix of completed and in_progress', () => {
      const children = [buildTask('a', 'completed'), buildTask('b', 'in_progress')];
      expect(service.deriveStatus(children)).toBe<TaskStatus>('in_progress');
    });
  });

  describe('aggregateCounts', () => {
    it('returns zero counts for empty list', () => {
      const expected: TaskStatusCounts = { pending: 0, in_progress: 0, completed: 0 };
      expect(service.aggregateCounts([])).toEqual(expected);
    });

    it('counts each status correctly', () => {
      const children = [
        buildTask('a', 'pending'),
        buildTask('b', 'pending'),
        buildTask('c', 'in_progress'),
        buildTask('d', 'completed'),
        buildTask('e', 'completed'),
        buildTask('f', 'completed'),
      ];
      const expected: TaskStatusCounts = { pending: 2, in_progress: 1, completed: 3 };
      expect(service.aggregateCounts(children)).toEqual(expected);
    });
  });
});
