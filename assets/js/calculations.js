/**
 * Calculations.js — Pure calculation helpers for Moje filamenty
 * No dependencies. Exported as global Calculations object.
 */
const Calculations = (() => {

  /**
   * Get filament density from settings, or null if not found.
   * @param {string} material
   * @param {object} settings
   * @returns {number|null}
   */
  function getDensity(material, settings) {
    if (!settings || !settings.materials) return null;
    const mat = settings.materials[material];
    if (!mat) return null;
    return typeof mat.density === 'number' ? mat.density : null;
  }

  /**
   * Calculate filament length in meters.
   * volumeCm3 = netWeightG / densityGcm3
   * radiusCm = (diameterMm / 10) / 2
   * areaCm2 = Math.PI * radius²
   * lengthCm = volumeCm3 / areaCm2
   * meters = lengthCm / 100
   * @param {number} netWeightG
   * @param {number} densityGcm3
   * @param {number} diameterMm
   * @returns {number} meters, 1 decimal
   */
  function calculateLength(netWeightG, densityGcm3, diameterMm) {
    if (!netWeightG || !densityGcm3 || !diameterMm) return 0;
    if (netWeightG <= 0 || densityGcm3 <= 0 || diameterMm <= 0) return 0;
    const volumeCm3 = netWeightG / densityGcm3;
    const radiusCm = (diameterMm / 10) / 2;
    const areaCm2 = Math.PI * radiusCm * radiusCm;
    const lengthCm = volumeCm3 / areaCm2;
    const meters = lengthCm / 100;
    return Math.round(meters * 10) / 10;
  }

  /**
   * Calculate all derived stats for a filament object.
   * @param {object} filament
   * @param {object} settings
   * @returns {{netWeight: number, remainingPercent: number, lengthMeters: number, status: string}}
   */
  function calculateFilamentStats(filament, settings) {
    const netWeight = Math.max(0, (filament.currentTotalWeight || 0) - (filament.emptySpoolWeight || 0));
    const originalWeight = filament.originalWeight || 1;
    const rawPercent = (netWeight / originalWeight) * 100;
    const remainingPercent = Math.min(100, Math.round(rawPercent * 10) / 10);

    const density = getDensity(filament.material, settings);
    const diameter = filament.diameter || 1.75;
    const lengthMeters = density ? calculateLength(netWeight, density, diameter) : 0;

    let status;
    if (filament.status === 'archived') {
      status = 'archived';
    } else if (netWeight === 0) {
      status = 'empty';
    } else {
      const threshold = (settings && settings.lowFilamentThreshold) ? settings.lowFilamentThreshold : 20;
      status = remainingPercent <= threshold ? 'low' : 'active';
    }

    return { netWeight, remainingPercent, lengthMeters, status };
  }

  /**
   * Returns CSS class for progress bar wrapper div.
   * @param {number} percent
   * @returns {string}
   */
  function getProgressBarClass(percent) {
    if (percent <= 0) return 'bg-secondary';
    if (percent <= 20) return 'progress-danger';
    if (percent <= 50) return 'progress-warning';
    return 'progress-ok';
  }

  /**
   * Returns Czech label for filament status.
   * @param {string} status
   * @returns {string}
   */
  function getStatusLabel(status) {
    const labels = {
      active: 'Aktivní',
      low: 'Dochází',
      empty: 'Prázdná',
      archived: 'Archivovaná'
    };
    return labels[status] || status;
  }

  /**
   * Returns CSS class name for status badge.
   * @param {string} status
   * @returns {string}
   */
  function getStatusBadgeClass(status) {
    const classes = {
      active: 'badge-active',
      low: 'badge-low',
      empty: 'badge-empty',
      archived: 'badge-archived'
    };
    return classes[status] || 'bg-secondary';
  }

  return {
    getDensity,
    calculateLength,
    calculateFilamentStats,
    getProgressBarClass,
    getStatusLabel,
    getStatusBadgeClass
  };
})();
