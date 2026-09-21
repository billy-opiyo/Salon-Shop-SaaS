param(
  [Parameter(Mandatory = $true)]
  [string]$InputPath,
  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$source = Get-Content -LiteralPath $InputPath -Raw
$bodyMatch = [regex]::Match($source, '<body[^>]*>([\s\S]*?)</body>', 'IgnoreCase')
if (-not $bodyMatch.Success) {
  throw "The reference document does not contain a body."
}

$body = $bodyMatch.Groups[1].Value
$body = [regex]::Replace($body, '<script\b[\s\S]*?</script>', '', 'IgnoreCase')
$body = [regex]::Replace($body, '<!--[\s\S]*?-->', '')
$body = [regex]::Replace($body, '(?<=(?:src|href)=["''])(?:\./)?IMG/', '/assets/salon/')

$attributeNames = @{
  'class' = 'className'
  'for' = 'htmlFor'
  'crossorigin' = 'crossOrigin'
  'fetchpriority' = 'fetchPriority'
  'tabindex' = 'tabIndex'
  'readonly' = 'readOnly'
  'maxlength' = 'maxLength'
  'minlength' = 'minLength'
  'autocomplete' = 'autoComplete'
  'autofocus' = 'autoFocus'
  'enctype' = 'encType'
  'novalidate' = 'noValidate'
  'cellpadding' = 'cellPadding'
  'cellspacing' = 'cellSpacing'
  'rowspan' = 'rowSpan'
  'colspan' = 'colSpan'
  'allowfullscreen' = 'allowFullScreen'
  'contenteditable' = 'contentEditable'
  'spellcheck' = 'spellCheck'
  'stop-color' = 'stopColor'
  'stop-opacity' = 'stopOpacity'
  'text-anchor' = 'textAnchor'
  'stroke-width' = 'strokeWidth'
  'stroke-linecap' = 'strokeLinecap'
  'stroke-linejoin' = 'strokeLinejoin'
  'fill-rule' = 'fillRule'
  'clip-rule' = 'clipRule'
}

foreach ($name in $attributeNames.Keys) {
  $replacement = $attributeNames[$name]
  $body = [regex]::Replace($body, "\b$name=", "$replacement=")
}

$styleEvaluator = [System.Text.RegularExpressions.MatchEvaluator] {
  param($match)
  $declarations = @()
  foreach ($declaration in $match.Groups[1].Value.Split(';')) {
    if ($declaration -notmatch '^\s*([^:]+):\s*(.+?)\s*$') { continue }
    $property = $matches[1].Trim()
    $value = $matches[2].Trim()
    if ($property -notmatch '^--') {
      $property = [regex]::Replace($property, '-([a-z])', { param($part) $part.Groups[1].Value.ToUpperInvariant() })
    }
    $propertyExpression = if ($property.StartsWith('--')) { '"' + $property + '"' } else { $property }
    $valueExpression = $value | ConvertTo-Json -Compress
    $declarations += "${propertyExpression}: $valueExpression"
  }
  if ($declarations.Count -eq 0) { return '' }
  $styleExpression = ' style={{' + ($declarations -join ', ') + '}}'
  if ($declarations -join '' -match '"--') {
    $styleExpression = ' style={{' + ($declarations -join ', ') + '} as React.CSSProperties}'
  }
  return $styleExpression
}

$body = [regex]::Replace($body, '\sstyle="([^"]*)"', $styleEvaluator)
$voidTags = 'img|input|meta|link|br|hr|source|area|base|embed|param|track|wbr'
$body = [regex]::Replace($body, "<($voidTags)\b([^>]*?)(?<!/)>", '<$1$2 />', 'IgnoreCase')

$content = @"
"use client"

import type { ReactNode } from "react"
import type React from "react"

export function SalonStorefrontMarkup(): ReactNode {
	return (
		<>
$body
		</>
	)
}
"@

$parent = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $parent | Out-Null
Set-Content -LiteralPath $OutputPath -Value $content -Encoding utf8NoBOM
