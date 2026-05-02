import { useState, useEffect } from 'react';
import actionRequestService, { ActionRequest } from '../services/actionRequestService';
import { useAuth } from '../context/AuthContext';

export const useActionRequests = () => {
  const { role } = useAuth();
  const [requests, setRequests] = useState<ActionRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    if (role !== 'Owner') return;
    
    setLoading(true);
    try {
      const data = await actionRequestService.getPending();
      setRequests(data);
      setPendingCount(data.length);
    } catch (err) {
      console.error('Failed to fetch action requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    
    // Poll every 30 seconds for new requests
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, [role]);

  return {
    requests,
    pendingCount,
    loading,
    refresh: fetchRequests
  };
};
