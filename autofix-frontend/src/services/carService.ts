import axiosClient from './axiosClient';

// PHASE 2: Service Layer Modularization
export const carService = {
  /**
   * Fetch all cars for the current user or admin
   */
  getAllCars: async (includeArchived: boolean = false, search?: string) => {
    try {
      let url = `/cars?includeArchived=${includeArchived}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      const response = await axiosClient.get(url);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Register a new vehicle
   */
  addCar: async (carData: { make: string; model: string; year: number; licensePlate: string; vin: string; currentOdometerKm?: number; allowDuplicate?: boolean; allowLowerOdometer?: boolean; customerId?: number }) => {
    try {
      const response = await axiosClient.post('/cars', carData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update vehicle details
   */
  updateCar: async (id: number, carData: any) => {
    try {
      const response = await axiosClient.put(`/cars/${id}`, carData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update Odometer reading with warning detection
   */
  updateOdometer: async (id: number, data: { newOdometerKm: number; source?: string; notes?: string; allowLowerOdometer?: boolean }) => {
    try {
      const response = await axiosClient.post(`/cars/${id}/odometer`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetch odometer history logs
   */
  getOdometerHistory: async (id: number) => {
    try {
      const response = await axiosClient.get(`/cars/${id}/odometer-history`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetch cars worked on by a specific mechanic
   */
  getCarsByMechanic: async (mechanicId: number) => {
    try {
      const response = await axiosClient.get(`/cars/by-mechanic/${mechanicId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Archive a vehicle
   */
  archiveCar: async (id: number) => {
    try {
      const response = await axiosClient.post(`/cars/${id}/archive`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Restore an archived vehicle
   */
  restoreCar: async (id: number) => {
    try {
      const response = await axiosClient.post(`/cars/${id}/restore`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete a vehicle by ID (calls archive)
   */
  deleteCar: async (id: number) => {
    try {
      const response = await axiosClient.delete(`/cars/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetch cars belonging to a specific customer ID
   */
  getByCustomerId: async (customerId: number) => {
    try {
      const response = await axiosClient.get(`/customers/${customerId}`);
      return response.data?.cars || [];
    } catch (error) {
      return [];
    }
  },

  // Aliases for backward compatibility with existing components
  getAll: function(includeArchived: boolean = false, search?: string) { return this.getAllCars(includeArchived, search); },
  delete: function(id: number) { return this.deleteCar(id); }
};

export default carService;
