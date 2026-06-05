export type AppointmentStatusLabel =
  | 'Pending'
  | 'Confirmed'
  | 'Cancelled'
  | 'Completed'
  | 'Rejected'
  | 'NoShow'
  | 'Unknown';

export type AppointmentStatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed';

export function normalizeAppointmentStatus(status: number | string | undefined): AppointmentStatusLabel {
  if (typeof status === 'string') {
    const numericStatus = Number(status);
    if (Number.isFinite(numericStatus) && status.trim() !== '') {
      return normalizeAppointmentStatus(numericStatus);
    }

    switch (status.trim().toLowerCase()) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'cancelled':
      case 'canceled':
      case 'rejected':
        return 'Cancelled';
      case 'completed':
        return 'Completed';
      case 'noshow':
      case 'no show':
      case 'no-show':
        return 'NoShow';
      default:
        return 'Unknown';
    }
  }

  if (typeof status === 'number') {
    switch (status) {
      case 0:
        return 'Pending';
      case 1:
        return 'Confirmed';
      case 2:
        return 'Cancelled';
      case 3:
        return 'Completed';
      case 4:
        return 'NoShow';
      default:
        return 'Unknown';
    }
  }

  return 'Unknown';
}

export function getAppointmentStatusClass(status: AppointmentStatusLabel): string {
  switch (status) {
    case 'Pending':
      return 'status-pending';
    case 'Confirmed':
      return 'status-confirmed';
    case 'Completed':
      return 'status-completed';
    case 'Cancelled':
    case 'Rejected':
    case 'NoShow':
      return 'status-cancelled';
    default:
      return 'status-default';
  }
}

export function matchesStatusFilter(
  status: AppointmentStatusLabel,
  filter: AppointmentStatusFilter
): boolean {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'cancelled') {
    return status === 'Cancelled' || status === 'Rejected' || status === 'NoShow';
  }

  if (filter === 'pending') {
    return status === 'Pending';
  }

  if (filter === 'confirmed') {
    return status === 'Confirmed';
  }

  return status === 'Completed';
}

export function formatAdminDate(dateString: string | undefined): string {
  if (!dateString) {
    return '—';
  }

  const date = dateString.includes('T')
    ? new Date(dateString)
    : new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatAdminTime(timeString: string | undefined): string {
  if (!timeString) {
    return '—';
  }

  const parsedDate = new Date(timeString);
  if (!Number.isNaN(parsedDate.getTime()) && timeString.includes('T')) {
    return parsedDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const parts = timeString.split(':');
  if (parts.length < 2) {
    return timeString;
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return timeString;
  }

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}
