import { useEffect } from 'react';
import { saveToCloud, getStoredCredential } from '../services/cloudSync';

export const useCloudAutoSave = (currentPage?: string) => {
  // 1. Auto-save every 20 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const credential = getStoredCredential();
      if (credential) {
        await saveToCloud(credential);
      }
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  // 2. Auto-save when currentPage changes
  useEffect(() => {
    const triggerSave = async () => {
      const credential = getStoredCredential();
      if (credential) {
        await saveToCloud(credential);
      }
    };
    triggerSave();
  }, [currentPage]);
};
