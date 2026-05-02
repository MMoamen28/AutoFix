import React, { useEffect, useState } from 'react';
import actionRequestService, { ActionRequest } from '../services/actionRequestService';

const MyRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<ActionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await actionRequestService.getMine();
        setRequests(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  if (loading) return <div className="p-8 text-center text-white">Loading my requests...</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-white">My Action Requests</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {requests.length === 0 ? (
          <div className="col-span-full bg-gray-900/50 border border-gray-800 rounded-2xl p-12 text-center">
            <p className="text-gray-400">You haven't submitted any action requests yet.</p>
          </div>
        ) : (
          requests.map(req => (
            <div key={req.id} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">
                    {req.actionType}
                  </span>
                  <p className="text-gray-500 text-xs">Submitted {new Date(req.requestedAt).toLocaleString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  req.status === 'Pending' ? 'bg-yellow-400/10 text-yellow-400' :
                  req.status === 'Approved' ? 'bg-green-400/10 text-green-400' :
                  'bg-red-400/10 text-red-400'
                }`}>
                  {req.status}
                </span>
              </div>

              {req.ownerNote && (
                <div className="bg-gray-800/80 rounded-xl p-4 mb-4 border-l-4 border-blue-500">
                  <p className="text-blue-400 text-[10px] font-bold uppercase mb-1">Owner Note</p>
                  <p className="text-white text-sm italic">"{req.ownerNote}"</p>
                </div>
              )}

              <div className="bg-black/40 rounded-xl p-4 font-mono text-[10px] text-gray-500 overflow-auto max-h-32">
                <pre>{JSON.stringify(JSON.parse(req.actionPayload), null, 2)}</pre>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyRequestsPage;
