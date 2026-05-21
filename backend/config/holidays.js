// Comma-separated YYYY-MM-DD values, for example:
// PAYROLL_HOLIDAYS=2026-01-01,2026-04-30,2026-05-01,2026-09-02
const configuredHolidayDates = (process.env.PAYROLL_HOLIDAYS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

module.exports = {
  HOLIDAY_DATES: new Set(configuredHolidayDates),
};
