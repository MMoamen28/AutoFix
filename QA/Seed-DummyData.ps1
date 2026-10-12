# Seed-DummyData.ps1 - Generates isolated dummy dataset for AutoFix overnight QA simulation
param(
    [string]$TargetDir = "C:\AutoFixTestData\Dummy",
    [int]$Port = 5262
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\QA_Common.ps1"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " AutoFix Dummy Data Seeder" -ForegroundColor Cyan
Write-Host " Target Directory: $TargetDir" -ForegroundColor Cyan
Write-Host " Port: $Port" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Enforce strict Safety Guard
Assert-QASafeDataFolder $TargetDir

$baselineDir = "$TargetDir" + "_baseline"
Assert-QASafeDataFolder $baselineDir

# 1. Prepare directory
if (Test-Path $TargetDir) {
    Write-Host "[1/7] Cleaning existing dummy folder: $TargetDir..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $TargetDir -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null

# 2. Start server host
Write-Host "[2/7] Starting AutoFix host on port $Port..." -ForegroundColor Yellow
$baseUrl = "http://127.0.0.1:$Port"
$binDll = "d:\AutoFix\bin\Debug\net8.0\AutoFix.dll"

if (-not (Test-Path $binDll)) {
    dotnet build "d:\AutoFix\AutoFix.csproj" -c Debug
}

$env:AUTOFIX_DATA_DIR = $TargetDir
$env:DataDirectory = $TargetDir
$env:ASPNETCORE_URLS = $baseUrl
$env:ASPNETCORE_ENVIRONMENT = "Development"

$proc = Start-Process -FilePath "dotnet" -ArgumentList "$binDll --DataDirectory `"$TargetDir`"" -PassThru -NoNewWindow

$started = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 600
    try {
        $resp = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method GET -TimeoutSec 2 -UseBasicParsing
        if ($resp.StatusCode -eq 200) {
            $started = $true
            break
        }
    } catch {}
}

if (-not $started) {
    if ($proc -and -not $proc.HasExited) { Stop-Process -Id $proc.Id -Force }
    throw "AutoFix host failed to start within timeout on port $Port."
}
Write-Host "AutoFix host running and healthy." -ForegroundColor Green

try {
    # 3. Authenticate Admin
    Write-Host "[3/7] Provisioning admin credentials..." -ForegroundColor Yellow
    $adminToken = Get-QAAdminToken -BaseUrl $baseUrl
    if (-not $adminToken) {
        throw "Failed to acquire Admin JWT token."
    }

    # 4. Seed Customers & Cars
    Write-Host "[4/7] Seeding Customers and Cars..." -ForegroundColor Yellow
    $customersData = @(
        @{ Name = "Ahmed Mahmoud Hassan"; Phone = "01012345671"; Plate = "ABC 1234"; Make = "Toyota"; Model = "Corolla"; Year = 2021; Vin = "JTDBR32E1J0123456"; Odo = 45000 },
        @{ Name = "Mohamed Abdelaziz"; Phone = "01123456782"; Plate = "XYZ 5678"; Make = "Hyundai"; Model = "Elantra"; Year = 2020; Vin = "KMHD84LF1LU123457"; Odo = 68000 },
        @{ Name = "Mahmoud El Sayed"; Phone = "01234567893"; Plate = "KTR 9821"; Make = "Kia"; Model = "Cerato"; Year = 2019; Vin = "KNAFK411B55123458"; Odo = 82000 },
        @{ Name = "Khaled Ibrahim"; Phone = "01098765434"; Plate = "NSN 4432"; Make = "Nissan"; Model = "Sunny"; Year = 2022; Vin = "3N1AB7AP4NY123459"; Odo = 31000 },
        @{ Name = "Tarek Omar"; Phone = "01155443325"; Plate = "MBZ 7765"; Make = "Mercedes-Benz"; Model = "C180"; Year = 2018; Vin = "WDD2050401F123460"; Odo = 95000 },
        @{ Name = "Yasser Kamal"; Phone = "01288776656"; Plate = "BMW 1123"; Make = "BMW"; Model = "320i"; Year = 2020; Vin = "WBA5R1C51LK123461"; Odo = 52000 },
        @{ Name = "Mostafa Kamel"; Phone = "01066554437"; Plate = "CHV 3388"; Make = "Chevrolet"; Model = "Optra"; Year = 2017; Vin = "KL1NA6978EC123462"; Odo = 115000 },
        @{ Name = "Hossam Abdullah"; Phone = "01177889908"; Plate = "RNL 6654"; Make = "Renault"; Model = "Megane"; Year = 2021; Vin = "VF1RFB00465123463"; Odo = 39000 },
        @{ Name = "Hisham Salah"; Phone = "01299887719"; Plate = "SKD 8890"; Make = "Skoda"; Model = "Octavia"; Year = 2022; Vin = "TMBAG7NE2L0123464"; Odo = 28000 },
        @{ Name = "Karim Sherif"; Phone = "01033221100"; Plate = "VWP 5521"; Make = "Volkswagen"; Model = "Passat"; Year = 2019; Vin = "WVWZZZ3CZKE123465"; Odo = 74000 }
    )

    $createdCustomers = @()
    $createdCars = @()

    foreach ($cd in $customersData) {
        $qaRes = Invoke-QARequest -Url "$baseUrl/api/customers/quick-add" -Method "POST" -Token $adminToken -Body @{
            fullName = $cd.Name
            phone = $cd.Phone
            email = "customer$($cd.Phone)@workshop.local"
            address = "Cairo - Egypt"
            make = $cd.Make
            model = $cd.Model
            year = $cd.Year
            licensePlate = $cd.Plate
            vin = $cd.Vin
            currentOdometerKm = $cd.Odo
            customerNotes = "VIP Customer"
            carNotes = "Clean condition"
        }
        if ($qaRes.Success) {
            $createdCustomers += $qaRes.Data.customer
            $createdCars += $qaRes.Data.car
        }
    }
    Write-Host "  -> Seeded $($createdCustomers.Count) customers and $($createdCars.Count) cars." -ForegroundColor Green

    # 5. Seed Work Orders & Invoices (Including Priority Team 2 Exact Hand-Calculated Scenarios)
    Write-Host "[5/7] Seeding Work Orders, Invoices, and Priority Scenarios..." -ForegroundColor Yellow

    # SCENARIO 1:
    # Labor 2,250.00 + Parts 2,750.00 = Subtotal 5,000.00
    # Discount 200.00 = 4,800.00
    # VAT 14% = 672.00
    # Total = 5,472.00
    # Paid = 2,000.00
    # Remaining = 3,472.00
    # Line Cost = 3,420.00
    # Gross Margin before VAT = 1,380.00 (4,800.00 - 3,420.00)
    $c1 = $createdCustomers[0]
    $car1 = $createdCars[0]

    $wo1Res = Invoke-QARequest -Url "$baseUrl/api/workorders" -Method "POST" -Token $adminToken -Body @{
        customerId = $c1.id
        carId = $car1.id
        customerComplaint = "Periodic maintenance 50,000 km, brakes and AC"
        notes = "QA Scenario 1: Exact hand-calculated test scenario"
        lines = @(
            @{ lineType = "Labor"; description = "Brake overhaul and full mechanical inspection"; quantity = 1; unitPrice = 2250.00; unitCost = 1420.00 },
            @{ lineType = "Part"; description = "Original OEM spare parts and synthetic oil"; quantity = 1; unitPrice = 2750.00; unitCost = 2000.00 }
        )
    }

    if ($wo1Res.Success) {
        $wo1Id = $wo1Res.Data.id
        # Complete work order
        Invoke-QARequest -Url "$baseUrl/api/workorders/$wo1Id/status" -Method "PUT" -Token $adminToken -Body @{ status = "Completed" } | Out-Null

        # Create Invoice
        $inv1Res = Invoke-QARequest -Url "$baseUrl/api/invoices" -Method "POST" -Token $adminToken -Body @{
            workOrderId = $wo1Id
            customerId = $c1.id
            carId = $car1.id
            subtotal = 5000.00
            discountAmount = 200.00
            vatPercentage = 14.00
            notes = "QA Exact Hand-Calculated Scenario 1 (Total: 5,472.00)"
        }
        if ($inv1Res.Success) {
            $inv1Id = $inv1Res.Data.id
            # Partial payment: 2,000.00
            Invoke-QARequest -Url "$baseUrl/api/invoices/$inv1Id/payments" -Method "POST" -Token $adminToken -Body @{
                amount = 2000.00
                paymentMethod = "Cash"
                notes = "QA Partial Payment 2000 EGP"
            } | Out-Null
            Write-Host "  -> Seeded Scenario 1 Invoice #$inv1Id (Total: 5472.00, Paid: 2000.00, Remaining: 3472.00)." -ForegroundColor Green
        }
    }

    # SCENARIO 2:
    # Workmanship 250.00 + 100.00 + 400.00 = 750.00 with parts 350.00 = 1,100.00
    # Discount 100.00 = 1,000.00
    # VAT 14% = 140.00
    # Total = 1,140.00
    $c2 = $createdCustomers[1]
    $car2 = $createdCars[1]

    $wo2Res = Invoke-QARequest -Url "$baseUrl/api/workorders" -Method "POST" -Token $adminToken -Body @{
        customerId = $c2.id
        carId = $car2.id
        customerComplaint = "Brake pads + oil & filter + AC service"
        notes = "QA Scenario 2: Workmanship price list verification"
        lines = @(
            @{ lineType = "Workmanship"; description = "Brake pads replacement"; quantity = 1; unitPrice = 250.00; unitCost = 100.00 },
            @{ lineType = "Workmanship"; description = "Oil change"; quantity = 1; unitPrice = 100.00; unitCost = 40.00 },
            @{ lineType = "Workmanship"; description = "AC service"; quantity = 1; unitPrice = 400.00; unitCost = 150.00 },
            @{ lineType = "Part"; description = "Oil filter and lubricant"; quantity = 1; unitPrice = 350.00; unitCost = 250.00 }
        )
    }

    if ($wo2Res.Success) {
        $wo2Id = $wo2Res.Data.id
        Invoke-QARequest -Url "$baseUrl/api/workorders/$wo2Id/status" -Method "PUT" -Token $adminToken -Body @{ status = "Completed" } | Out-Null

        $inv2Res = Invoke-QARequest -Url "$baseUrl/api/invoices" -Method "POST" -Token $adminToken -Body @{
            workOrderId = $wo2Id
            customerId = $c2.id
            carId = $car2.id
            subtotal = 1100.00
            discountAmount = 100.00
            vatPercentage = 14.00
            notes = "QA Scenario 2 (Total: 1,140.00)"
        }
        if ($inv2Res.Success) {
            $inv2Id = $inv2Res.Data.id
            # Full payment: 1,140.00
            Invoke-QARequest -Url "$baseUrl/api/invoices/$inv2Id/payments" -Method "POST" -Token $adminToken -Body @{
                amount = 1140.00
                paymentMethod = "Visa"
                notes = "QA Full Payment Scenario 2"
            } | Out-Null
            Write-Host "  -> Seeded Scenario 2 Invoice #$inv2Id (Total: 1140.00, Fully Paid)." -ForegroundColor Green
        }
    }

    # Additional Work Orders & Inspections
    for ($k = 2; $k -lt 6; $k++) {
        $cust = $createdCustomers[$k]
        $car = $createdCars[$k]

        $woRes = Invoke-QARequest -Url "$baseUrl/api/workorders" -Method "POST" -Token $adminToken -Body @{
            customerId = $cust.id
            carId = $car.id
            customerComplaint = "Periodic diagnostic inspection"
            notes = "Standard seeded order"
            lines = @(
                @{ lineType = "Labor"; description = "Wheel alignment and diagnostics"; quantity = 1; unitPrice = 300.00; unitCost = 50.00 },
                @{ lineType = "Part"; description = "Consumable parts"; quantity = 1; unitPrice = 450.00; unitCost = 300.00 }
            )
        }
        if ($woRes.Success) {
            $woId = $woRes.Data.id
            if ($k % 2 -eq 0) {
                Invoke-QARequest -Url "$baseUrl/api/workorders/$woId/status" -Method "PUT" -Token $adminToken -Body @{ status = "Completed" } | Out-Null
                $invRes = Invoke-QARequest -Url "$baseUrl/api/invoices" -Method "POST" -Token $adminToken -Body @{
                    workOrderId = $woId
                    customerId = $cust.id
                    carId = $car.id
                    subtotal = 750.00
                    discountAmount = 0.00
                    vatPercentage = 14.00
                }
                if ($invRes.Success) {
                    Invoke-QARequest -Url "$baseUrl/api/invoices/$($invRes.Data.id)/payments" -Method "POST" -Token $adminToken -Body @{
                        amount = 855.00
                        paymentMethod = "Cash"
                    } | Out-Null
                }
            } else {
                Invoke-QARequest -Url "$baseUrl/api/workorders/$woId/status" -Method "PUT" -Token $adminToken -Body @{ status = "InProgress" } | Out-Null
            }
        }

        # Seed Inspection Report
        $inspRes = Invoke-QARequest -Url "$baseUrl/api/inspections" -Method "POST" -Token $adminToken -Body @{
            customerId = $cust.id
            carId = $car.id
            customerComplaint = "Pre-purchase technical inspection"
            isDraft = ($k % 2 -eq 1)
        }
    }

    # 6. Initial Manual Backup Creation
    Write-Host "[6/7] Creating initial verified SQLite backup..." -ForegroundColor Yellow
    $bkRes = Invoke-QARequest -Url "$baseUrl/api/backup/manual" -Method "POST" -Token $adminToken
    if ($bkRes.Success) {
        Write-Host "  -> Initial backup created: $($bkRes.Data.fileName)" -ForegroundColor Green
    }
}
finally {
    Write-Host "Stopping AutoFix host..." -ForegroundColor Yellow
    if ($proc -and -not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force
        Start-Sleep -Seconds 1
    }
}

# 7. Create Baseline Copy and Save Baseline Counts
Write-Host "[7/7] Creating Dummy_baseline copy and exporting baseline counts..." -ForegroundColor Yellow

$dbPath = "$TargetDir\autofix.db"
if (-not (Test-Path $dbPath)) {
    throw "Database file was not created: $dbPath"
}

# Verify database integrity directly via SQLite
$integ = Test-QADatabaseIntegrity $dbPath
if (-not $integ) {
    throw "Database integrity check FAILED on seeded database!"
}
Write-Host "Seeded database PRAGMA integrity check: OK." -ForegroundColor Green

# Take complete snapshot copy to Dummy_baseline
if (Test-Path $baselineDir) {
    Remove-Item -Recurse -Force $baselineDir -ErrorAction SilentlyContinue
}
Copy-Item -Path $TargetDir -Destination $baselineDir -Recurse -Force
Write-Host "Created exact baseline snapshot: $baselineDir" -ForegroundColor Green

# Export row counts
$counts = Get-QATableCounts $dbPath
$countsJson = $counts | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText("$TargetDir\baseline_counts.json", $countsJson, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText("$baselineDir\baseline_counts.json", $countsJson, [System.Text.Encoding]::UTF8)

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host " Seeding Completed Successfully!" -ForegroundColor Green
Write-Host " Dummy Folder: $TargetDir" -ForegroundColor Cyan
Write-Host " Baseline Snapshot: $baselineDir" -ForegroundColor Cyan
Write-Host " Table Counts Saved: $TargetDir\baseline_counts.json" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
