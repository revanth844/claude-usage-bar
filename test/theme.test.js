const { resolveTheme, iconFrames, bar, pie, remain, usageLevel, bindingWindow, clockLevel, renderUsage } = require('../theme.js');

let n = 0; const ok = (c, m) => { console.log((c ? 'ok' : 'NOT OK') + ' - ' + m); if (!c) process.exitCode = 1; n++; };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + (JSON.stringify(a) === JSON.stringify(b) ? '' : ` (got ${JSON.stringify(a)})`));

const NOW = 1_700_000_000_000;
const sec = (ms) => Math.round((NOW + ms) / 1000);
const H = 3600 * 1000, D = 24 * H;

// presets
eq(resolveTheme({}), { theme: 'default', icon: 'quokka', usageStyle: 'progressBar', clock: false }, 'no settings → default');
eq(resolveTheme({ theme: 'compact' }), { theme: 'compact', icon: 'quokka', usageStyle: 'pieChart', clock: false }, 'compact preset');
eq(resolveTheme({ theme: 'micro' }), { theme: 'micro', icon: 'none', usageStyle: 'dot', clock: true }, 'micro preset');
eq(resolveTheme({ theme: 'bogus', icon: 'bogus', usageStyle: 'bogus' }).theme, 'default', 'unknown theme → default');
ok(resolveTheme({ theme: 'bogus', icon: 'bogus' }).icon === 'quokka', 'unknown icon → theme icon');

// overrides
eq(resolveTheme({ theme: 'micro', icon: 'sparkle' }).icon, 'sparkle', 'icon overrides preset');
eq(resolveTheme({ theme: 'default', usageStyle: 'pieChart' }).usageStyle, 'pieChart', 'usageStyle overrides preset');
eq(resolveTheme({ theme: 'compact', icon: 'auto', usageStyle: 'auto' }).usageStyle, 'pieChart', 'auto keeps the preset');

// icon frames
ok(iconFrames('quokka') === null, 'quokka → use characterFrames');
eq(iconFrames('none'), [], 'none → no frames');
eq(iconFrames('robot'), ['$(hubot)'], 'robot → hubot codicon');

// glyphs
eq(bar(0.5, 8), '████▒▒▒▒', 'bar 50%');
eq(bar(-1, 4), '▒▒▒▒', 'bar clamps below 0');
eq(bar(5, 4), '████', 'bar clamps above 1');
eq(bar(null, 4), '▒▒▒▒', 'bar treats unknown as empty');
eq([0, 0.1, 0.2, 0.5, 0.7, 0.9, 1].map(pie), ['○', '○', '◔', '◑', '◕', '●', '●'], 'pie rounds to the nearest quarter');

// levels
eq([usageLevel(0.1, 0.5, 0.9), usageLevel(0.5, 0.5, 0.9), usageLevel(0.9, 0.5, 0.9), usageLevel(null, 0.5, 0.9)], ['ok', 'warn', 'crit', null], 'usage levels at thresholds');

// remain
eq(remain(sec(-1000), NOW), 'now', 'remain past → now');
eq(remain(sec(12 * 60000), NOW), '12m', 'remain minutes');
eq(remain(sec(H + 23 * 60000), NOW), '1h 23m', 'remain hours');
eq(remain(sec(2 * D + 4 * H), NOW), '2d 4h', 'remain days');

// binding window
eq(bindingWindow({ u5: 0.3, u7: 0.6 }), '7d', 'higher weekly usage binds');
eq(bindingWindow({ u5: 0.4, u7: 0.4 }), '5h', 'tie → 5h');
eq(bindingWindow({ u5: 0.2, u7: 1 }), '7d', 'maxed weekly binds');
eq(bindingWindow({ u5: 0.2, u7: 1, blocked: true }), '5h', 'blocked → 5h');
eq(bindingWindow({ u5: null, u7: 0.1 }), '7d', 'missing 5h → 7d');

// clock level (fraction of window left)
eq(clockLevel(sec(1 * H), '5h', NOW), 'ok', '5h: 20% left → ok');
eq(clockLevel(sec(2.5 * H), '5h', NOW), 'warn', '5h: 50% left → warn');
eq(clockLevel(sec(4.5 * H), '5h', NOW), 'crit', '5h: 90% left → crit');
eq(clockLevel(sec(1 * D), '7d', NOW), 'ok', '7d: 1 day left → ok');
eq(clockLevel(sec(6 * D), '7d', NOW), 'crit', '7d: 6 days left → crit');
eq(clockLevel(null, '5h', NOW), null, 'unknown reset → no level');

// render
const u = { u5: 0.52, u7: 0.36, p5: 52, p7: 36, blocked: false, reset5hAt: sec(H), reset7dAt: sec(3 * D) };
const base = { barLen: 8, show7d: true, warnAt: 0.5, critAt: 0.9, now: NOW };
eq(renderUsage('.w', u, { ...base, usageStyle: 'progressBar' }).body, '.w ████▒▒▒▒ 52% · 36%', 'default body unchanged');
eq(renderUsage('.w', u, { ...base, usageStyle: 'pieChart' }).body, '.w ◑ 52% · ◔ 36%', 'compact body');
eq(renderUsage('.w', u, { ...base, usageStyle: 'pieChart', show7d: false }).body, '.w ◑ 52%', 'compact honors show7d');
const m = renderUsage('.w', u, { ...base, usageStyle: 'dot', clock: true });
eq(m.body, '.w ●', 'micro body is a dot');
eq(m.level, 'warn', 'micro level = worse window');
eq(m.clock, { text: '$(clock)', window: '5h', level: 'ok', tooltip: '.w · 5h resets in 1h 0m' }, 'micro clock for the binding 5h window');
ok(renderUsage('.w', u, { ...base, usageStyle: 'progressBar' }).clock === null, 'no clock outside micro');
const full7 = { ...u, u7: 1, p7: 100 };
eq(renderUsage('.w', full7, { ...base, usageStyle: 'progressBar' }).body, '.w ████████ 7d reset 3d 0h', 'maxed weekly → reset countdown (bar)');
eq(renderUsage('.w', full7, { ...base, usageStyle: 'pieChart' }).body, '.w ● 7d reset 3d 0h', 'maxed weekly → reset countdown (pie)');
eq(renderUsage('.w', full7, { ...base, usageStyle: 'dot', clock: true }).clock.level, 'warn', 'maxed weekly, 3 of 7 days left → warn clock');
eq(renderUsage('.w', { ...u, blocked: true }, { ...base, usageStyle: 'progressBar' }).body, '.w ████████ 5h reset 1h 0m', 'blocked → 5h countdown');
eq(renderUsage('.w', { u5: null, u7: null, p5: null, p7: null }, { ...base, usageStyle: 'progressBar' }).body, '.w ▒▒▒▒▒▒▒▒ ?', 'unknown usage');
eq(renderUsage('.w', { u5: 0.1, u7: null, p5: 10, p7: null }, { ...base, usageStyle: 'dot', clock: true }).clock.tooltip, '.w · 5h resets in ?', 'micro clock without a reset time');

console.log(`\n${n} checks`);
