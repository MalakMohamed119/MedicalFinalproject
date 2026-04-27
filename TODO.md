# Fix Tasks

## PART 1 — Fix modal styling & button layout ✅

### manage-doctors.component.html ✅
- [x] Update actions cell with new button classes (`action-btn toggle-btn`, `action-btn edit-btn`, `action-btn pwd-btn`) + toggle icon
- [x] Update Edit Modal: add `.modal-header` with close button
- [x] Update Password Modal: add `.modal-header` with close button

### manage-doctors.component.scss ✅
- [x] Add `.actions-cell` flex layout
- [x] Add `.action-btn` base class
- [x] Update `.toggle-btn` styling with `.inactive` variant
- [x] Update `.edit-btn` to teal outline
- [x] Rename `.password-btn` → `.pwd-btn` with indigo color
- [x] Update `.modal-overlay` with backdrop blur
- [x] Update `.modal-card` with animation
- [x] Add `.modal-header`, `.modal-close`
- [x] Update `.form-group` labels and inputs
- [x] Update `.modal-actions` buttons

## PART 2 — Show doctor's real name in dashboard ✅

### dashboard.component.ts ✅
- [x] Add `doctorName` signal
- [x] Call `authService.getCurrentUser()` in `ngOnInit`

### dashboard.component.html ✅
- [x] Replace hardcoded "Doctor" with `{{ doctorName() }}`
