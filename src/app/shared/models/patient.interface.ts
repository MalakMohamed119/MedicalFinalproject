export interface PatientProfileResponse {
  id?: string | number;
  patientId?: string | number;
  identityUserId?: string;
  displayName?: string;
  fullName?: string;
  name?: string;
  email?: string;
  userName?: string;
  phoneNumber?: string;
  phone?: string;
  age?: number;
  gender?: string | number;
  bloodType?: string;
  dateOfBirth?: string;
  address?: string;
  medicalHistory?: string;
  allergies?: string | PatientAllergy[];
  medicalRecords?: PatientMedicalRecord[];
  chronicDiseases?: string;
  medications?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  [key: string]: unknown;
}

export interface PatientAllergy {
  id?: number;
  name: string;
  description: string;
}

export interface PatientMedicalRecord {
  id?: number;
  diagnosis: string;
  notes: string;
}

export interface PatientCreateRequest {
  dateOfBirth: string;
  gender: number;
  address: string;
  userId: string;
  allergies: PatientAllergy[];
  medicalRecords: PatientMedicalRecord[];
}

export interface PatientUpdateRequest {
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  allergies: PatientAllergy[];
  medicalRecords: PatientMedicalRecord[];
}

export interface PatientMedicalData {
  allergies: PatientAllergy[];
  medicalRecords: PatientMedicalRecord[];
  [key: string]: unknown;
}
