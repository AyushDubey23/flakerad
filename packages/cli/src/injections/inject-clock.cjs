/**
 * flakerad: frozen clock / deterministic timing injection
 * Created by Ayush Dubey for flakerad
 */

const targetTime = parseInt(process.env.FLAKERAD_EPOCH || '1767225600000', 10); // 2026-01-01T00:00:00.000Z

try {
  const FakeTimers = require('@sinonjs/fake-timers');
  const clock = FakeTimers.install({
    now: targetTime,
    toFake: ['Date', 'hrtime', 'performance'],
    shouldAdvanceTime: false
  });

  Date.now = () => targetTime;

  if (process.env.FLAKERAD_DEBUG) {
    process.stderr.write(`[flakerad] Injected @sinonjs/fake-timers frozen at epoch ${targetTime}\n`);
  }
} catch (e) {
  const OriginalDate = Date;
  const virtualTime = targetTime;

  function MockDate(...args) {
    if (args.length === 0) {
      return new OriginalDate(virtualTime);
    }
    return new OriginalDate(...args);
  }
  MockDate.prototype = OriginalDate.prototype;
  MockDate.now = () => virtualTime;
  MockDate.parse = OriginalDate.parse;
  MockDate.UTC = OriginalDate.UTC;

  global.Date = MockDate;

  if (process.env.FLAKERAD_DEBUG) {
    process.stderr.write(`[flakerad] Injected fallback mock Date at epoch ${targetTime}\n`);
  }
}
