import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';
import UnsavedChangesDialog from '../components/shared/UnsavedChangesDialog';

interface UnsavedChangesContextType {
  isDirty: boolean;
  setDirty: (dirty: boolean, onSaveDraft?: () => Promise<void>) => void;
  markClean: () => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType>({
  isDirty: false,
  setDirty: () => {},
  markClean: () => {}
});

export const useUnsavedChanges = () => useContext(UnsavedChangesContext);

export const UnsavedChangesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveHandlerRef = useRef<(() => Promise<void>) | null>(null);

  const setDirty = useCallback((dirty: boolean, onSaveDraft?: () => Promise<void>) => {
    setIsDirty(dirty);
    if (onSaveDraft) {
      saveHandlerRef.current = onSaveDraft;
    } else if (!dirty) {
      saveHandlerRef.current = null;
    }
  }, []);

  const markClean = useCallback(() => {
    setIsDirty(false);
    saveHandlerRef.current = null;
  }, []);

  // 1. Browser tab close or window reload (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // 2. React Router blocker for in-app navigation & browser back button
  // Will block if form is dirty and user tries to navigate to a different location
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  const handleSaveAndProceed = async () => {
    try {
      setIsSaving(true);
      if (saveHandlerRef.current) {
        await saveHandlerRef.current();
      }
      setIsDirty(false);
      if (blocker.state === 'blocked') {
        blocker.proceed();
      }
    } catch (err) {
      console.error('Failed to save draft before navigation', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardAndProceed = () => {
    setIsDirty(false);
    saveHandlerRef.current = null;
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  };

  const handleCancel = () => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  };

  return (
    <UnsavedChangesContext.Provider value={{ isDirty, setDirty, markClean }}>
      {children}
      <UnsavedChangesDialog
        isOpen={blocker.state === 'blocked'}
        onSave={handleSaveAndProceed}
        onDiscard={handleDiscardAndProceed}
        onCancel={handleCancel}
        isSaving={isSaving}
      />
    </UnsavedChangesContext.Provider>
  );
};

export default UnsavedChangesContext;
