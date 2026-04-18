export interface DashboardResponse {
  // Doctor Fields
  todaysAppointments?: number;
  confirmedAppointments?: number;
  cancelledAppointments?: number;
  availableTimeSlots?: number;
  
  // Admin Fields
  totalPatients?: number;
  totalRevenue?: number;
  pendingRequests?: number;
  totalClinics?: number;
}




