import axiosClient from './axiosClient';

export interface ActionRequest {
  id: number;
  mechanicId: number;
  mechanicName: string;
  actionType: string;
  actionPayload: string;
  status: string;
  ownerNote?: string;
  requestedAt: string;
  reviewedAt?: string;
}

export interface ReviewRequest {
  decision: 'Approved' | 'Rejected';
  ownerNote?: string;
}

const actionRequestService = {
  getAll: async (): Promise<ActionRequest[]> => {
    const response = await axiosClient.get('/mechanic-requests');
    return response.data;
  },

  getPending: async (): Promise<ActionRequest[]> => {
    const response = await axiosClient.get('/mechanic-requests/pending');
    return response.data;
  },

  getMine: async (): Promise<ActionRequest[]> => {
    const response = await axiosClient.get('/mechanic-requests/mine');
    return response.data;
  },

  create: async (type: string, payload: any): Promise<ActionRequest> => {
    const response = await axiosClient.post('/mechanic-requests', {
      actionType: type,
      actionPayload: JSON.stringify(payload),
    });
    return response.data;
  },

  review: async (id: number, review: ReviewRequest): Promise<ActionRequest> => {
    const response = await axiosClient.patch(`/mechanic-requests/${id}/review`, review);
    return response.data;
  },
};

export default actionRequestService;
