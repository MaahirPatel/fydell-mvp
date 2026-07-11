$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:3002"
$jar = Join-Path $env:TEMP "fydell-e2e-cookies.txt"
Remove-Item $jar -Force -ErrorAction SilentlyContinue
$email = "looptest_$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())@example.com"

Write-Output "1) SIGNUP $email"
$signupBody = @{ email = $email; password = "password123"; companyName = "Loop Test Co" } | ConvertTo-Json
curl.exe -s -c $jar -b $jar -X POST "$base/api/platform/signup" -H "Content-Type: application/json" --data-binary $signupBody --max-time 20
Write-Output ""

Write-Output "2) INVITE"
$inviteBody = '{"simulationId":"sim-meridian-001","candidateName":"Alex Candidate","candidateEmail":"alex@example.com"}'
$inviteRaw = curl.exe -s -c $jar -b $jar -X POST "$base/api/mvp/invites" -H "Content-Type: application/json" --data-binary $inviteBody --max-time 20
Write-Output $inviteRaw
$invite = $inviteRaw | ConvertFrom-Json
$token = $invite.token
if (-not $token) { $token = $invite.invite.token }
if (-not $token) { throw "No invite token" }
Write-Output "TOKEN_PREFIX=$($token.Substring(0,[Math]::Min(8,$token.Length))) IS_DEMO=$($token.StartsWith('demo'))"

Write-Output "3) START ATTEMPT"
$startBody = @{ token = $token } | ConvertTo-Json
$startRaw = curl.exe -s -X POST "$base/api/mvp/attempts/start" -H "Content-Type: application/json" --data-binary $startBody --max-time 20
Write-Output $startRaw
$start = $startRaw | ConvertFrom-Json
$attemptId = $start.attempt.id
if (-not $attemptId) { throw "No attempt id" }

Write-Output "4) SUBMIT"
$rec = "VERDICT: HOLD`n`nRISKS:`nPipeline concentration and ramp risk.`n`nKEY ASSUMPTIONS:`nRevenue growth assumes quality pipeline.`n`nQUESTIONS FOR MANAGEMENT:`nWhat is pipeline conversion by segment?`n`nEXECUTIVE MEMO:`nI recommend hold. EBITDA and cash flow are sensitive to hiring ramp. Valuation looks stretched if synergies are double-counted."
$submitBody = @{ recommendation = $rec } | ConvertTo-Json
$submitRaw = curl.exe -s -X POST "$base/api/mvp/attempts/$attemptId/submit" -H "Content-Type: application/json" --data-binary $submitBody --max-time 20
Write-Output $submitRaw

Write-Output "5) DASHBOARD"
$dashRaw = curl.exe -s -c $jar -b $jar "$base/api/mvp/dashboard" --max-time 20
$dash = $dashRaw | ConvertFrom-Json
Write-Output ("attempts={0} invites={1} completed={2}" -f $dash.attempts.Count, $dash.invites.Count, $dash.stats.completedAttempts)

Write-Output "6) REPORT"
$reportRaw = curl.exe -s -c $jar -b $jar "$base/api/mvp/attempts/$attemptId/report" --max-time 20
Write-Output $reportRaw.Substring(0, [Math]::Min(400, $reportRaw.Length))

if (Test-Path "debug-dc0a6c.log") {
  Write-Output "LOG_LINES=$((Get-Content debug-dc0a6c.log).Count)"
} else {
  Write-Output "NO_DEBUG_LOG"
}
