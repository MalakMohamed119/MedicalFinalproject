export interface TimeSlot {
  id: number;
  clinicId: number;
  clinicName: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  availableCount: number;
  price: number;
}
