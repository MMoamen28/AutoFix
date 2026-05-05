import axiosClient from './axiosClient';

// PHASE 2: Service Layer Modularization
export const carService = {
  /**
   * Fetch all cars for the current user
   */
  getAllCars: async () => {
    try {
      const response = await axiosClient.get('/cars');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Register a new vehicle
   */
  addCar: async (carData: { make: string; model: string; year: number; licensePlate: string; vin: string }) => {
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
   * Delete a vehicle by ID
   */
  deleteCar: async (id: number) => {
    try {
      const response = await axiosClient.delete(`/cars/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Aliases for backward compatibility with existing components
  getAll: function() { return this.getAllCars(); },
  delete: function(id: number) { return this.deleteCar(id); }
};

export default carService;
