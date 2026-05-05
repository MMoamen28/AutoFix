import axiosClient from './axiosClient';

export const sparePartCategoryService = {
  getAll: () => {
    // For now, return a hardcoded list to support the UI redesign 
    // until a full Category entity is added if needed.
    // In a real scenario, this would be axiosClient.get('/sparepartcategories')
    return Promise.resolve([
      { id: 1, name: 'Engine' },
      { id: 2, name: 'Brakes' },
      { id: 3, name: 'Suspension' },
      { id: 4, name: 'Electrical' },
      { id: 5, name: 'Body' },
      { id: 6, name: 'Filters' },
      { id: 7, name: 'Tires' }
    ]);
  }
};

export default sparePartCategoryService;
