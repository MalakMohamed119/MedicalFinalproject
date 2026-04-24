export interface ClinicResponse {
  id: number;
  doctorId: string;
  doctorName: string;
  clinicName: string;
  clinicAddress: string;
  phoneNumber?: string;
  description: string;
}
