import React, { useEffect, useState } from 'react';
import actionRequestService, { ActionRequest } from '../services/actionRequestService';
import { toast } from 'react-hot-toast';

const PendingRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<ActionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await actionRequestService.getPending();
      setRequests(data);
    } catch (error) {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: number, decision: 'Approved' | 'Rejected') => {
    try {
      await actionRequestService.review(id, { decision, ownerNote: note });
      toast.success(`Request ${decision}`);
      setReviewingId(null);
      setNote('');
      loadRequests();
    } catch (error) {
      toast.error('Review submission failed');
    }
  };

  if (loading) return <div className="p-8 text-center text-white">Loading pending requests...</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-white">Pending Mechanic Actions</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {requests.length === 0 ? (
          <div className="col-span-full bg-gray-900/50 border border-gray-800 rounded-2xl p-12 text-center">
            <p className="text-gray-400">All actions are reviewed. No pending requests.</p>
          </div>
        ) : (
          requests.map(req => (
            <div key={req.id} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">
                    {req.actionType}
                  </span>
                  <h3 className="text-white text-lg font-semibold">Action by {req.mechanicName}</h3>
                  <p className="text-gray-500 text-xs">Submitted {new Date(req.requestedAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-black/40 rounded-xl p-4 mb-6 font-mono text-xs text-blue-300 overflow-auto max-h-40">
                <pre>{JSON.stringify(JSON.parse(req.actionPayload), null, 2)}</pre>
              </div>

              {reviewingId === req.id ? (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <textarea
                    placeholder="Add a note for the mechanic (optional)..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white text-sm focus:border-blue-500 outline-none h-24"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleReview(req.id, 'Approved')}
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg transition-all"
                    >
                      Approve & Execute
                    </button>
                    <button
                      onClick={() => handleReview(req.id, 'Rejected')}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg transition-all"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => setReviewingId(null)}
                      className="px-4 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setReviewingId(req.id)}
                  className="mt-auto w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/10"
                >
                  Process Request
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PendingRequestsPage;
