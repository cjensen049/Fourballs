const {
  compositeScore,
  applyHeroBoost,
  calculateVenueFit,
  calculatePairingChemistry,
  calculateMatchProbability,
  simulateMatch,
  generateFoursomePairings,
  generateFourballPairings,
  simulateFullEvent
} = require('./scoring-engine');

// ─── Test fixtures ────────────────────────────────────────────────────────────

const playerA = {
  id: 'test_player_a', name: 'Player A', tier: 'platinum', hero_boost: null,
  stats: { driving_distance:92, driving_accuracy:80, greens_in_regulation:89, scrambling:85, birdie_rate:90, pressure_index:95 },
  style_tags: { power:88, accuracy:80, aggression:82, consistency:88, match_play_affinity:85 },
  format_fit: { foursomes:85, fourball:88, singles:90 },
  ryder_cup_record: { played:true, won:15, lost:8, halved:4 }
};

const playerB = {
  id: 'test_player_b', name: 'Player B', tier: 'bronze', hero_boost: null,
  stats: { driving_distance:63, driving_accuracy:62, greens_in_regulation:63, scrambling:63, birdie_rate:63, pressure_index:62 },
  style_tags: { power:55, accuracy:62, aggression:55, consistency:65, match_play_affinity:58 },
  format_fit: { foursomes:70, fourball:72, singles:68 },
  ryder_cup_record: { played:false, won:0, lost:0, halved:0 }
};

const heroPlayer = {
  id: 'test_hero', name: 'Hero Player', tier: 'hero', hero_boost: 1.08,
  stats: { driving_distance:68, driving_accuracy:66, greens_in_regulation:67, scrambling:72, birdie_rate:69, pressure_index:76 },
  style_tags: { power:68, accuracy:66, aggression:85, consistency:68, match_play_affinity:85 },
  format_fit: { foursomes:70, fourball:90, singles:80 },
  ryder_cup_record: { played:true, won:14, lost:6, halved:5 }
};

const powerVenue = {
  id: 'test_venue', name: 'Test Venue',
  hidden_tags: { power_weight:90, accuracy_weight:55, short_game_weight:65, wind_factor:20, pressure_factor:80 }
};

const linksVenue = {
  id: 'links_venue', name: 'Links Venue',
  hidden_tags: { power_weight:60, accuracy_weight:78, short_game_weight:70, wind_factor:80, pressure_factor:75 }
};

const captain = {
  id: 'test_captain',
  bonus: { foursomes_boost:6, fourball_boost:5, singles_boost:4, chemistry_multiplier:1.10 }
};

function makeTeam(players) {
  // foursomesPairs and fourballPairs both use first 8 players (overlapping = fatigued in singles)
  return {
    foursomesPairs: [
      [players[0], players[1]], [players[2], players[3]],
      [players[4], players[5]], [players[6], players[7]]
    ],
    fourballPairs: [
      [players[0], players[1]], [players[2], players[3]],
      [players[4], players[5]], [players[6], players[7]]
    ],
    allPlayers: players
  };
}

function makeTestPlayer(tier, overrides = {}) {
  const base = JSON.parse(JSON.stringify(playerA));
  base.tier = tier;
  base.hero_boost = null;
  Object.assign(base, overrides);
  return base;
}

// ─── Assertion helpers ────────────────────────────────────────────────────────
let passed = 0, failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    failed++;
  }
}

function assertApprox(label, value, target, tolerance = 3) {
  assert(label + ` (got ${value.toFixed(1)}, want ≈${target}±${tolerance})`,
    Math.abs(value - target) <= tolerance);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log('\ncalculateVenueFit');
{
  const fit = calculateVenueFit(playerA, powerVenue);
  assert('returns 0–100', fit >= 0 && fit <= 100);
  assert('platinum player fits power venue well (> 75)', fit > 75);

  const fitB = calculateVenueFit(playerB, powerVenue);
  assert('bronze player fits power venue worse than platinum', fitB < fit);

  const fitLinks = calculateVenueFit(playerA, linksVenue);
  assert('returns 0–100 for links venue', fitLinks >= 0 && fitLinks <= 100);

  // 20 random player/venue combos
  for (let i = 0; i < 20; i++) {
    const p = makeTestPlayer('silver', { stats: { driving_distance:50+i*2, driving_accuracy:60+i, greens_in_regulation:65, scrambling:65, birdie_rate:65, pressure_index:65 } });
    const v = i % 2 === 0 ? powerVenue : linksVenue;
    const f = calculateVenueFit(p, v);
    assert(`random combo ${i} returns 0–100`, f >= 0 && f <= 100);
  }
}

console.log('\ncalculatePairingChemistry');
{
  const chemFs = calculatePairingChemistry(playerA, playerB, 'foursomes');
  assert('foursomes returns 0–100', chemFs >= 0 && chemFs <= 100);

  const chemFb = calculatePairingChemistry(playerA, playerB, 'fourball');
  assert('fourball returns 0–100', chemFb >= 0 && chemFb <= 100);

  const chemSelf = calculatePairingChemistry(playerA, playerA, 'foursomes');
  assert('same player with self returns 0–100', chemSelf >= 0 && chemSelf <= 100);

  // Two platinum players should have decent chemistry
  const chemElite = calculatePairingChemistry(playerA, playerA, 'fourball');
  assert('elite fourball pair has high chemistry (> 70)', chemElite > 70);
}

console.log('\ncalculateMatchProbability — 20 combinations');
{
  const combos = [
    [playerA, playerB, powerVenue, 'singles',    captain, null],
    [playerA, playerB, powerVenue, 'foursomes',  captain, playerA],
    [playerA, playerB, powerVenue, 'fourball',   captain, playerA],
    [playerB, playerA, linksVenue, 'singles',    null,    null],
    [playerA, playerA, powerVenue, 'singles',    captain, null],
    [heroPlayer, playerA, linksVenue, 'singles', null,    null],
  ];

  for (let i = 0; i < 20; i++) {
    const [my, opp, venue, fmt, cap, partner] = combos[i % combos.length];
    const prob = calculateMatchProbability(my, opp, venue, fmt, cap, partner);
    const sum  = prob.win + prob.halve + prob.loss;
    assert(`combo ${i}: win+halve+loss === 100 (got ${sum.toFixed(1)})`, Math.abs(sum - 100) < 0.2);
    assert(`combo ${i}: all values ≥ 0`, prob.win >= 0 && prob.halve >= 0 && prob.loss >= 0);
  }

  // Stronger player should win more often
  const strongProb = calculateMatchProbability(playerA, playerB, powerVenue, 'singles', null);
  const weakProb   = calculateMatchProbability(playerB, playerA, powerVenue, 'singles', null);
  assert('stronger player has higher win probability', strongProb.win > weakProb.win);

  // Captain boost increases win probability
  const withCap    = calculateMatchProbability(playerA, playerB, powerVenue, 'foursomes', captain, playerA);
  const withoutCap = calculateMatchProbability(playerA, playerB, powerVenue, 'foursomes', null,    playerA);
  assert('captain boost increases win probability', withCap.win > withoutCap.win);
}

console.log('\napplyHeroBoost');
{
  const original = JSON.parse(JSON.stringify(heroPlayer));
  const boosted  = applyHeroBoost(heroPlayer);

  // Source must not be mutated
  assert('source player not mutated — dd', heroPlayer.stats.driving_distance === original.stats.driving_distance);
  assert('source player not mutated — pi', heroPlayer.stats.pressure_index   === original.stats.pressure_index);

  // Boosted stats should all be higher
  assert('boosted dd > original', boosted.stats.driving_distance     > heroPlayer.stats.driving_distance);
  assert('boosted pi > original', boosted.stats.pressure_index       > heroPlayer.stats.pressure_index);
  assert('boosted gir > original', boosted.stats.greens_in_regulation > heroPlayer.stats.greens_in_regulation);

  // Boost should not exceed 99
  const maxHero = makeTestPlayer('hero', { hero_boost: 1.10, stats: { driving_distance:98, driving_accuracy:98, greens_in_regulation:98, scrambling:98, birdie_rate:98, pressure_index:98 } });
  const maxBoosted = applyHeroBoost(maxHero);
  assert('boosted stats capped at 99', Object.values(maxBoosted.stats).every(v => v <= 99));

  // Non-hero player returns same reference
  const nonHero = applyHeroBoost(playerA);
  assert('non-hero returns same object', nonHero === playerA);
}

console.log('\nsimulateMatch');
{
  const always_win  = { win:100, halve:0,   loss:0   };
  const always_lose = { win:0,   halve:0,   loss:100 };
  const always_halve = { win:0,  halve:100, loss:0   };

  assert('100% win → always win',   simulateMatch(always_win)   === 'win');
  assert('100% loss → always loss', simulateMatch(always_lose)  === 'loss');
  assert('100% halve → always halve', simulateMatch(always_halve) === 'halve');

  // Distribution test over 10,000 runs — within 3% of input
  const prob = { win:55, halve:10, loss:35 };
  let wins = 0, halves = 0, losses = 0;
  const N = 10000;
  for (let i = 0; i < N; i++) {
    const r = simulateMatch(prob);
    if (r === 'win')   wins++;
    else if (r === 'halve') halves++;
    else               losses++;
  }
  assertApprox('win distribution',   (wins   / N) * 100, prob.win,   3);
  assertApprox('halve distribution', (halves / N) * 100, prob.halve, 3);
  assertApprox('loss distribution',  (losses / N) * 100, prob.loss,  3);

  // Only valid outputs
  for (let i = 0; i < 100; i++) {
    const r = simulateMatch({ win:45, halve:10, loss:45 });
    assert(`run ${i}: valid output`, r === 'win' || r === 'halve' || r === 'loss');
  }
}

console.log('\nsimulateFullEvent — points always sum to 28');
{
  const players = Array.from({ length: 12 }, (_, i) =>
    makeTestPlayer(i < 4 ? 'gold' : i < 8 ? 'silver' : 'bronze', { id: `p${i}`, name: `Player${i}` })
  );
  const oppPlayers = Array.from({ length: 12 }, (_, i) =>
    makeTestPlayer(i < 4 ? 'silver' : 'bronze', { id: `opp${i}`, name: `Opp${i}` })
  );

  for (let run = 0; run < 100; run++) {
    const result = simulateFullEvent(makeTeam(players), makeTeam(oppPlayers), powerVenue, captain, captain);
    const total  = result.finalScore.user + result.finalScore.ai;
    assert(`run ${run}: total points === 28 (got ${total})`, Math.abs(total - 28) < 0.01);
  }

  // Winner always has more than 14 points
  for (let run = 0; run < 50; run++) {
    const result = simulateFullEvent(makeTeam(players), makeTeam(oppPlayers), powerVenue, captain, captain);
    if (result.winner === 'user') {
      assert(`run ${run}: user winner has > 14 pts`, result.finalScore.user > 14);
    } else if (result.winner === 'ai') {
      assert(`run ${run}: ai winner has > 14 pts`, result.finalScore.ai > 14);
    } else {
      assert(`run ${run}: tie means neither > 14`, result.finalScore.user <= 14 && result.finalScore.ai <= 14);
    }
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
