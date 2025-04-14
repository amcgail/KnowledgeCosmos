// Re-export TourController from the new module for backward compatibility
// This ensures any code that still uses import from tour.js will continue to work
export { TourController } from './tourController.js';