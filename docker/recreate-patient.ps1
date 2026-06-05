# Recreates PatientV7 with Identity service URL reachable inside Docker.
# Required for POST /patient/Patiant/Create (otherwise 500: Connection refused localhost:7179).

docker stop PatientV7 2>$null
docker rm PatientV7 2>$null

docker run -d `
  --name PatientV7 `
  --network clinic-network `
  -p 8083:7248 `
  -e ASPNETCORE_URLS=http://+:7248/ `
  -e ASPNETCORE_ENVIRONMENT=Development `
  -e "ConnectionStrings__DefaultConnection=Server=clinic-sql,1433;Database=ClinicPatientDb;User Id=sa;Password=Docker123@;TrustServerCertificate=True" `
  -e "Identity__Authority=http://Clinic-AuthV22:7179/" `
  mohamedtarek2/patiantmicroservice:V7

Write-Host "PatientV7 started. API gateway: http://localhost:8082"
