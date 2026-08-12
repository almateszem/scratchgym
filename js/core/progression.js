/* scratchgym — progressziós számítás.
 *
 * Ez a projekt egyetlen súlyszámító képlete. Ugyanez van dokumentálva a
 * README-ben is, hogy a fogyasztó app az exportált heteken túl is tudjon
 * számolni.
 */

window.SG = window.SG || {};

SG.Progression = {

  /** Lebegőpontos maradékok levágása (0.1 + 0.2 típusú hibák ellen). */
  round: function (n) {
    return Math.round(n * 100) / 100;
  },

  /**
   * Egy progresszív gyakorlat súlya az N. héten.
   *
   *   weightKg(week) = max(0, startKg + incrementKgPerWeek * (week - 1))
   *
   * A 0-ra vágás azért kell, hogy negatív növekménnyel (deload) se csússzon
   * a súly negatívba.
   *
   * @param {{startKg: number, incrementKgPerWeek: number}} rule
   * @param {number} week 1-alapú hétszám
   * @return {number} kg
   */
  weightForWeek: function (rule, week) {
    if (!rule) return 0;
    var start = Number(rule.startKg) || 0;
    var increment = Number(rule.incrementKgPerWeek) || 0;
    var w = Math.max(1, Number(week) || 1);
    return SG.Progression.round(Math.max(0, start + increment * (w - 1)));
  }
};
