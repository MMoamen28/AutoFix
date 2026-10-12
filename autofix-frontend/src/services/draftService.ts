import api from './axiosClient';

export interface DraftData {
  formKey: string;
  formData: any;
  updatedAt: string;
}

export const draftService = {
  async getDraft(formKey: string): Promise<DraftData | null> {
    try {
      const res = await api.get(`/drafts/${formKey}`);
      if (res.data && res.data.formDataJson) {
        const parsed = JSON.parse(res.data.formDataJson);
        return {
          formKey,
          formData: parsed,
          updatedAt: res.data.updatedAt
        };
      }
    } catch (err) {
      // Fallback to localStorage if server unreachable / offline
    }

    try {
      const local = localStorage.getItem(`draft_${formKey}`);
      if (local) {
        const parsed = JSON.parse(local);
        return {
          formKey,
          formData: parsed.formData,
          updatedAt: parsed.updatedAt
        };
      }
    } catch { }

    return null;
  },

  async saveDraft(formKey: string, formData: any): Promise<void> {
    const now = new Date().toISOString();
    // Always update localStorage as immediate fallback
    try {
      localStorage.setItem(`draft_${formKey}`, JSON.stringify({
        formData,
        updatedAt: now
      }));
    } catch { }

    // Save to server
    try {
      await api.post(`/drafts/${formKey}`, {
        formDataJson: JSON.stringify(formData)
      });
    } catch (err) {
      // Server offline / network error; localStorage is already stored safely
    }
  },

  async deleteDraft(formKey: string): Promise<void> {
    try {
      localStorage.removeItem(`draft_${formKey}`);
    } catch { }

    try {
      await api.delete(`/drafts/${formKey}`);
    } catch { }
  }
};

export default draftService;
