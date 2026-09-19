import { ConflictResolverService } from './conflict-resolver.service';

describe('ConflictResolverService', () => {
  let service: ConflictResolverService;

  beforeEach(() => {
    service = new ConflictResolverService();
  });

  describe('isLoopOrUnchanged', () => {
    it('should detect unchanged data by identical hash', () => {
      expect(service.isLoopOrUnchanged('hash123', 'hash123')).toBe(true);
      expect(service.isLoopOrUnchanged('hash123', 'hash456')).toBe(false);
      expect(service.isLoopOrUnchanged('hash123', undefined)).toBe(false);
    });
  });

  describe('resolveConflict', () => {
    it('should skip if hash is identical', () => {
      const resolution = service.resolveConflict(
        { 'Tên khách hàng': 'Test' },
        { ID: 1, TITLE: 'Test' },
        'hash123',
        'hash123',
      );

      expect(resolution.action).toBe('SKIP_IDENTICAL');
    });

    it('should prioritize CRM status when CRM status changes', () => {
      const resolution = service.resolveConflict(
        { 'Tên khách hàng': 'Test', 'Trạng thái': 'Mới' },
        { ID: 1, TITLE: 'Test', STATUS_ID: 'IN_PROCESS' },
        'hash_new',
        'hash_old',
      );

      expect(resolution.action).toBe('UPDATE_SHEET');
      expect(resolution.fieldsToSheet?.['Trạng thái']).toBe('IN_PROCESS');
    });

    it('should prioritize Sheet contact info when Sheet name changes', () => {
      const resolution = service.resolveConflict(
        { 'Tên khách hàng': 'Updated Name', 'Trạng thái': 'Mới' },
        { ID: 1, TITLE: 'Old Name', STATUS_ID: 'Mới' },
        'hash_new',
        'hash_old',
      );

      expect(resolution.action).toBe('UPDATE_CRM');
      expect(resolution.fieldsToCrm?.['TITLE']).toBe('Updated Name');
    });

    it('should merge both when both CRM status and Sheet contact details changed', () => {
      const resolution = service.resolveConflict(
        { 'Tên khách hàng': 'Updated Name', 'Trạng thái': 'Mới' },
        { ID: 1, TITLE: 'Old Name', STATUS_ID: 'QUALIFIED' },
        'hash_new',
        'hash_old',
      );

      expect(resolution.action).toBe('MERGE_BOTH');
      expect(resolution.fieldsToCrm?.['TITLE']).toBe('Updated Name');
      expect(resolution.fieldsToSheet?.['Trạng thái']).toBe('QUALIFIED');
    });
  });
});
