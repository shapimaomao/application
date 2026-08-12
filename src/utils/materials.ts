/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Determines whether a material requirement string from Checklist or template represents a required material.
 * Empty strings, whitespace, or non-required markers like '/', '\', '-', '--', '无', 'none', 'n/a', 'na', '不适用', '非必需', '不需要', '无需' mean NOT required (returns false).
 */
export function isMaterialRequired(val: string | undefined | null): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  const nonRequiredPlaceholders = [
    '/', '\\', '-', '--', '无', 'none', 'n/a', 'na', '不适用', '非必需', '不需要', '无需'
  ];
  return !nonRequiredPlaceholders.includes(lower);
}

/** Non-general material IDs for school applications */
export const NON_GENERAL_MATERIAL_IDS = ['ps', 'rp', 'portfolio', 'video'];
