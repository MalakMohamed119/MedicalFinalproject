export interface AppointmentResponse {
  id: number;
  clinicId: number;
  clinicName?: string; // Optional as API doesn't return it
  timeSlotId: number;
  patientId: string;
  patientName?: string; // Optional as API doesn't return it
  doctorName?: string; // Optional as API doesn't return it
  status: number | string; // API returns number, template expects string
  appointmentDate?: string; // Optional as API returns 'date' instead
  date: string; // API returns this field
  startTime: string;
  endTime: string;
  priceAtBooking: number;
  price?: number;
}
