$ErrorActionPreference = "Stop"

$base = "C:\Users\bonni\Desktop\ISM\Content\Quiz\v2"
$mdPath = Join-Path $base "Quiz_v2_Guide.md"
$docxPath = Join-Path $base "Quiz_v2_Guide.docx"
$build = Join-Path $base ".guide_docx_build"

function Esc($s) {
  if ($null -eq $s) { return "" }
  return [System.Security.SecurityElement]::Escape([string]$s)
}

function RunXml($text, $bold = $false, $size = 21, $color = "1F2933", $font = "Malgun Gothic") {
  $b = if ($bold) { "<w:b/>" } else { "" }
  return "<w:r><w:rPr><w:rFonts w:ascii=`"$font`" w:hAnsi=`"$font`" w:eastAsia=`"$font`"/><w:sz w:val=`"$size`"/><w:color w:val=`"$color`"/>$b</w:rPr><w:t xml:space=`"preserve`">$(Esc $text)</w:t></w:r>"
}

function ParaXml($text, $opts = @{}) {
  $size = if ($opts.ContainsKey("size")) { $opts.size } else { 21 }
  $color = if ($opts.ContainsKey("color")) { $opts.color } else { "1F2933" }
  $bold = $opts.ContainsKey("bold") -and $opts.bold
  $before = if ($opts.ContainsKey("before")) { $opts.before } else { 0 }
  $after = if ($opts.ContainsKey("after")) { $opts.after } else { 120 }
  $keep = if ($opts.ContainsKey("keep") -and $opts.keep) { "<w:keepNext/>" } else { "" }
  $shade = if ($opts.ContainsKey("shade")) { "<w:shd w:fill=`"$($opts.shade)`"/>" } else { "" }
  $indent = if ($opts.ContainsKey("indent")) { "<w:ind w:left=`"$($opts.indent)`"/>" } else { "" }
  $num = if ($opts.ContainsKey("num") -and $opts.num) { "<w:numPr><w:ilvl w:val=`"0`"/><w:numId w:val=`"1`"/></w:numPr><w:ind w:left=`"540`" w:hanging=`"270`"/>" } else { "" }
  $font = if ($opts.ContainsKey("font")) { $opts.font } else { "Malgun Gothic" }
  return "<w:p><w:pPr>$keep$num$indent<w:spacing w:before=`"$before`" w:after=`"$after`" w:line=`"300`" w:lineRule=`"auto`"/>$shade</w:pPr>$(RunXml $text $bold $size $color $font)</w:p>"
}

function CleanCell($s) {
  $t = ([string]$s).Trim()
  $t = $t -replace "\*\*", ""
  $t = $t -replace "`"", '"'
  return $t
}

function IsSepRow($parts) {
  foreach ($p in $parts) {
    if ($p.Trim() -notmatch "^:?-{3,}:?$") { return $false }
  }
  return $true
}

function TableXml($rows) {
  if ($rows.Count -lt 1) { return "" }
  $cols = $rows[0].Count
  $width = [int](9360 / [Math]::Max($cols, 1))
  $grid = ""
  for ($i = 0; $i -lt $cols; $i++) { $grid += "<w:gridCol w:w=`"$width`"/>" }
  $out = "<w:tbl><w:tblPr><w:tblW w:w=`"9360`" w:type=`"dxa`"/><w:tblInd w:w=`"120`" w:type=`"dxa`"/><w:tblBorders><w:top w:val=`"single`" w:sz=`"4`" w:color=`"BFC7D1`"/><w:left w:val=`"single`" w:sz=`"4`" w:color=`"BFC7D1`"/><w:bottom w:val=`"single`" w:sz=`"4`" w:color=`"BFC7D1`"/><w:right w:val=`"single`" w:sz=`"4`" w:color=`"BFC7D1`"/><w:insideH w:val=`"single`" w:sz=`"4`" w:color=`"BFC7D1`"/><w:insideV w:val=`"single`" w:sz=`"4`" w:color=`"BFC7D1`"/></w:tblBorders><w:tblCellMar><w:top w:w=`"80`" w:type=`"dxa`"/><w:left w:w=`"120`" w:type=`"dxa`"/><w:bottom w:w=`"80`" w:type=`"dxa`"/><w:right w:w=`"120`" w:type=`"dxa`"/></w:tblCellMar></w:tblPr><w:tblGrid>$grid</w:tblGrid>"
  for ($r = 0; $r -lt $rows.Count; $r++) {
    $out += "<w:tr>"
    for ($c = 0; $c -lt $cols; $c++) {
      $fill = if ($r -eq 0) { "<w:shd w:fill=`"E8EEF5`"/>" } else { "" }
      $bold = $r -eq 0
      $color = if ($r -eq 0) { "17365D" } else { "1F2933" }
      $out += "<w:tc><w:tcPr><w:tcW w:w=`"$width`" w:type=`"dxa`"/>$fill</w:tcPr>"
      $out += ParaXml (CleanCell $rows[$r][$c]) @{size=18; color=$color; bold=$bold; after=0}
      $out += "</w:tc>"
    }
    $out += "</w:tr>"
  }
  $out += "</w:tbl>"
  return $out
}

$resolved = Resolve-Path "C:\Users\bonni\Desktop\ISM\Content\Quiz\v2"
if (Test-Path $build) { Remove-Item -LiteralPath $build -Recurse -Force }
New-Item -ItemType Directory -Path $build, (Join-Path $build "_rels"), (Join-Path $build "word"), (Join-Path $build "word\_rels") | Out-Null

$body = New-Object System.Text.StringBuilder
$lines = Get-Content -LiteralPath $mdPath -Encoding UTF8
$i = 0
while ($i -lt $lines.Count) {
  $line = $lines[$i]
  if ([string]::IsNullOrWhiteSpace($line)) {
    [void]$body.Append((ParaXml "" @{after=60}))
    $i++
    continue
  }

  if ($line.StartsWith("|")) {
    $tableRows = New-Object System.Collections.ArrayList
    while ($i -lt $lines.Count -and $lines[$i].StartsWith("|")) {
      $parts = $lines[$i].Trim().Trim("|").Split("|") | ForEach-Object { CleanCell $_ }
      if (-not (IsSepRow $parts)) { [void]$tableRows.Add($parts) }
      $i++
    }
    [void]$body.Append((TableXml $tableRows))
    [void]$body.Append((ParaXml "" @{after=80}))
    continue
  }

  if ($line.StartsWith("# ")) {
    [void]$body.Append((ParaXml ($line.Substring(2).Trim()) @{size=44;color="1F4E79";bold=$true;after=160;keep=$true}))
  } elseif ($line.StartsWith("## ")) {
    [void]$body.Append((ParaXml ($line.Substring(3).Trim()) @{size=32;color="2E74B5";bold=$true;before=300;after=160;keep=$true}))
  } elseif ($line.StartsWith("### ")) {
    [void]$body.Append((ParaXml ($line.Substring(4).Trim()) @{size=26;color="1F4D78";bold=$true;before=180;after=100;keep=$true}))
  } elseif ($line.StartsWith("> ")) {
    [void]$body.Append((ParaXml ($line.Substring(2).Trim()) @{shade="F4F7FB";indent=220;after=140}))
  } elseif ($line.StartsWith("FORMULA: ")) {
    [void]$body.Append((ParaXml ($line.Substring(9).Trim()) @{shade="F8FAFC";indent=160;font="Consolas";size=18;after=120}))
  } elseif ($line -match "^\d+\. ") {
    [void]$body.Append((ParaXml ($line -replace "^\d+\. ", "") @{num=$true;after=80}))
  } else {
    [void]$body.Append((ParaXml $line.Trim() @{after=120}))
  }
  $i++
}

$documentXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>
$($body.ToString())
<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>
</w:body>
</w:document>
"@

$stylesXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="Malgun Gothic"/><w:sz w:val="21"/></w:rPr></w:style>
</w:styles>
"@

$numberingXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="540" w:hanging="270"/></w:pPr></w:lvl></w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>
"@

$settingsXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:compat/><w:zoom w:percent="100"/></w:settings>
"@

$relsRoot = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"@

$relsDoc = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>
"@

$contentTypes = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>
"@

[IO.File]::WriteAllText((Join-Path $build "[Content_Types].xml"), $contentTypes, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $build "_rels\.rels"), $relsRoot, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $build "word\document.xml"), $documentXml, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $build "word\styles.xml"), $stylesXml, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $build "word\settings.xml"), $settingsXml, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $build "word\numbering.xml"), $numberingXml, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $build "word\_rels\document.xml.rels"), $relsDoc, [Text.UTF8Encoding]::new($false))

if (Test-Path $docxPath) { Remove-Item -LiteralPath $docxPath -Force }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($docxPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  $entries = @(
    @("[Content_Types].xml", "[Content_Types].xml"),
    @("_rels\.rels", "_rels/.rels"),
    @("word\document.xml", "word/document.xml"),
    @("word\styles.xml", "word/styles.xml"),
    @("word\settings.xml", "word/settings.xml"),
    @("word\numbering.xml", "word/numbering.xml"),
    @("word\_rels\document.xml.rels", "word/_rels/document.xml.rels")
  )
  foreach ($entry in $entries) {
    $source = Join-Path $build $entry[0]
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $source, $entry[1]) | Out-Null
  }
}
finally {
  $zip.Dispose()
}
Remove-Item -LiteralPath $build -Recurse -Force

Write-Output "DOCX=$docxPath"
