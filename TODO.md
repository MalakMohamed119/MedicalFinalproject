# Doctor Registration Fix Tasks

## [x] 1. Update auth.service.ts registerDoctor()
   - Change endpoint to /api/doctors/CreateDoctor
   - Transform payload to lowercase keys: displayName, email, password, phoneNumber, specialty
   - Remove role: 'Doctor' addition

## [x] 2. Update AddDoctorComponent.ts onSubmit()
   - Fix casing: email and password lowercase in doctorData object


   - Navigate to /admin/add-doctor
   - Fill form and submit
   - Verify success without 400 error
