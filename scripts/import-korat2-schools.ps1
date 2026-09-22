param(
  [string]$SourceUrl = 'https://bigdata.korat2.go.th/tableSchoolAddress.php?op=1.7&year=2568-1',
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\supabase\schools_seed.sql')
)

$html = (Invoke-WebRequest -UseBasicParsing -Uri $SourceUrl -TimeoutSec 60).Content
$table = [regex]::Matches($html, '<table[\s\S]*?</table>', 'IgnoreCase')[0].Value
$rows = [regex]::Matches($table, '<tr>([\s\S]*?)</tr>', 'IgnoreCase')
$items = @()

foreach ($row in $rows) {
  $cells = [regex]::Matches($row.Groups[1].Value, '<t[dh][^>]*>([\s\S]*?)</t[dh]>', 'IgnoreCase')
  if ($cells.Count -ne 17 -or $cells[0].Groups[1].Value -notmatch '^\d') { continue }
  $values = foreach ($cell in $cells) {
    $plain = [regex]::Replace($cell.Groups[1].Value, '<[^>]+>', '')
    [System.Net.WebUtility]::HtmlDecode($plain).Trim()
  }
  $items += [pscustomobject]@{
    dmc = $values[0]
    moe = $values[2]
    name = $values[3]
    subdistrict = $values[6]
    district = $values[7]
    network = $values[9]
  }
}

if ($items.Count -ne 175) { throw "Expected 175 schools, received $($items.Count)" }

function SqlValue([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { return 'null' }
  return "'" + $value.Replace("'", "''") + "'"
}

$lines = @(
  '-- Generated from the official BIG DATA portal of Nakhon Ratchasima Primary Educational Service Area Office 2.'
  "-- Source: $SourceUrl"
  "-- Generated: $([DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ'))"
  'insert into public.schools (dmc_code, moe_code, name, subdistrict, district, network_center_id) values'
)

for ($i = 0; $i -lt $items.Count; $i++) {
  $item = $items[$i]
  $ending = if ($i -eq $items.Count - 1) { '' } else { ',' }
  $lines += "  ($(SqlValue $item.dmc), $(SqlValue $item.moe), $(SqlValue $item.name), $(SqlValue $item.subdistrict), $(SqlValue $item.district), (select id from public.network_centers where name = $(SqlValue $item.network)))$ending"
}
$lines += 'on conflict (dmc_code) do update set moe_code = excluded.moe_code, name = excluded.name, subdistrict = excluded.subdistrict, district = excluded.district, network_center_id = excluded.network_center_id;'

[System.IO.File]::WriteAllLines([System.IO.Path]::GetFullPath($OutputPath), $lines, [System.Text.UTF8Encoding]::new($false))
Write-Output "Wrote $($items.Count) schools to $OutputPath"
