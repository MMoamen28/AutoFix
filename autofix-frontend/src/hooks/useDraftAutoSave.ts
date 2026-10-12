import { useState, useEffect, useRef, useCallback } from 'react';
import draftService, { DraftData } from '../services/draftService';
import { useUnsavedChanges } from '../context/UnsavedChangesContext';

interface UseDraftAutoSaveOptions<T> {
  formKey: string;
  formData: T;
  initialData?: T;
  onRestore: (restoredData: T) => void;
  isFormOpen?: boolean;
  debounceMs?: number; // defaults to 5000ms
}

export function useDraftAutoSave<T extends Record<string, any>>({
  formKey,
  formData,
  initialData,
  onRestore,
  isFormOpen = true,
  debounceMs = 5000
}: UseDraftAutoSaveOptions<T>) {
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasDraftAvailable, setHasDraftAvailable] = useState(false);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);
  const [cachedDraftData, setCachedDraftData] = useState<T | null>(null);

  const { setDirty } = useUnsavedChanges();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formDataRef = useRef<T>(formData);
  formDataRef.current = formData;

  // Determine if form has meaningful changes compared to initial state
  const isFormDirty = useCallback((): boolean => {
    if (!initialData) {
      // If no initialData provided, check if any value in formData is truthy/non-empty
      return Object.values(formData).some(val => {
        if (val === null || val === undefined || val === '') return false;
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === 'object') return Object.keys(val).length > 0;
        return true;
      });
    }

    try {
      return JSON.stringify(formData) !== JSON.stringify(initialData);
    } catch {
      return true;
    }
  }, [formData, initialData]);

  const dirty = isFormOpen && isFormDirty();

  // Load existing draft when form opens
  useEffect(() => {
    if (!isFormOpen) return;

    let mounted = true;
    const checkDraft = async () => {
      try {
        const draft = await draftService.getDraft(formKey);
        if (!mounted || !draft || !draft.formData) return;

        // Verify draft has meaningful content
        const hasContent = Object.values(draft.formData).some(
          val => val !== null && val !== undefined && val !== '' && val !== 0
        );

        if (hasContent) {
          setCachedDraftData(draft.formData);
          setDraftUpdatedAt(draft.updatedAt);
          setHasDraftAvailable(true);
        }
      } catch (err) {
        // Safe fallback
      }
    };

    checkDraft();

    return () => {
      mounted = false;
    };
  }, [formKey, isFormOpen]);

  // Actual save routine
  const performSave = useCallback(async (): Promise<void> => {
    if (!isFormOpen || !isFormDirty()) return;

    try {
      setIsSaving(true);
      await draftService.saveDraft(formKey, formDataRef.current);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSavedTime(timeStr);
    } catch (err) {
      console.warn('AutoSave draft warning:', err);
    } finally {
      setIsSaving(false);
    }
  }, [formKey, isFormOpen, isFormDirty]);

  // Register with UnsavedChangesContext
  useEffect(() => {
    if (dirty) {
      setDirty(true, performSave);
    } else {
      setDirty(false);
    }

    return () => {
      setDirty(false);
    };
  }, [dirty, setDirty, performSave]);

  // Autosave debounce: 5 seconds after last change
  useEffect(() => {
    if (!dirty) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [formData, dirty, debounceMs, performSave]);

  // Trigger on blur
  const handleBlur = useCallback(() => {
    if (dirty) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      performSave();
    }
  }, [dirty, performSave]);

  // Restore draft
  const restoreDraft = useCallback(() => {
    if (cachedDraftData) {
      onRestore(cachedDraftData);
      setHasDraftAvailable(false);
      const now = new Date();
      setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
  }, [cachedDraftData, onRestore]);

  // Discard draft
  const discardDraft = useCallback(async () => {
    await draftService.deleteDraft(formKey);
    setHasDraftAvailable(false);
    setCachedDraftData(null);
  }, [formKey]);

  // Clear draft after successful submit
  const clearDraft = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    await draftService.deleteDraft(formKey);
    setLastSavedTime(null);
    setHasDraftAvailable(false);
    setCachedDraftData(null);
    setDirty(false);
  }, [formKey, setDirty]);

  return {
    lastSavedTime,
    isSaving,
    hasDraftAvailable,
    draftUpdatedAt,
    isDirty: dirty,
    restoreDraft,
    discardDraft,
    clearDraft,
    handleBlur,
    triggerSave: performSave
  };
}

export default useDraftAutoSave;
