export interface AdminNavItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

export const ADMIN_MAIN_NAV: AdminNavItem[] = [
  { label: 'Dashboard', icon: 'fa-gauge-high', route: '/admin-dashboard', exact: true }
];

export const ADMIN_MANAGE_NAV: AdminNavItem[] = [
  { label: 'Manage Doctors', icon: 'fa-user-doctor', route: '/admin/manage-doctors' },
  { label: 'All Clinics', icon: 'fa-hospital', route: '/admin/manage-clinics' },
  { label: 'All Appointments', icon: 'fa-calendar-days', route: '/admin/manage-appointments' },
  { label: 'Add Doctor', icon: 'fa-user-plus', route: '/admin/add-doctor' }
];
