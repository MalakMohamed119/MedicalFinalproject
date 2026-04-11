export interface AppointmentResponse {
  id: number;
  clinicId: number;
  timeSlotId: number;
  patientId: string;
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  priceAtBooking: number;
}
