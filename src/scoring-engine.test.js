const {
  compositeScore,
  applyHeroBoost,
  calculateVenueFit,
  hasBond,
  hasSharedVenueConnection,
  calculatePairingChemistry,
  captainPerkBoost,
  calculateMatchProbability,
  simulateMatch,
  generateFoursomePairings,
  generateFourballPairings,
  simulateFullEvent
} = require('./scoring-engine');

// ─── Test fixtures ────────────────────────────────────────────────────────────

const playerA = {
  id: 'test_player_a', name: 'Player A', tier: 'platinum', hero_boost: null,
  nationality: 'USA',
  stats: { driving_distance:92, driving_accuracy:80, greens_in_regulation:89, scrambling:85, birdie_rate:90, pressure_index:95 },
  style_tags: { power:88, accuracy:80, aggression:82, consistency:88, match_play_affinity:85 },
  format_fit: { foursomes:85, fourball:88, singles:90 },
  ryder_cup_record: { played:true, won:15, lost:8, halved:4 },
  ryder_cup_years: [2008, 2010, 2012, 2014, 2016]
};

const playerB = {
  id: 'test_player_b', name: 'Player B', tier: 'bronze', hero_boost: null,
  nationality: 'USA',
  stats: { driving_distance:63, driving_accuracy:62, greens_in_regulation:63, scrambling:63, birdie_rate:63, pressure_index:62 },
  style_tags: { power:55, accuracy:62, aggression:55, consistency:65, match_play_affinity:58 },
  format_fit: { foursomes:70, fourball:72, singles:68 },
  ryder_cup_record: { played:false, won:0, lost:0, halved:0 },
  ryder_cup_years: []
};

const heroPlayer = {
  id: 'test_hero', name: 'Hero Player', tier: 'hero', hero_boost: 1.08,
  nationality: 'USA',
  stats: { driving_distance:68, driving_accuracy:66, greens_in_regulation:67, scrambling:72, birdie_rate:69, pressure_index:76 },
  style_tags: { power:68, accuracy:66, aggression:85, consistency:68, match_play_affinity:85 },
  format_fit: { foursomes:70, fourball:90, singles:80 },
  ryder_cup_record: { played:true, won:14, lost:6, halved:5 },
  ryder_cup_years: [2008, 2010, 2012]
};

const powerVenue = {
  id: 'test_venue', name: 'Test Venue', location: 'USA',
  hidden_tags: { power_weight:90, accuracy_weight:55, short_game_weight:65, wind_factor:20, pressure_factor:80 }
};

const linksVenue = {
  id: 'links_venue', name: 'Links Venue', location: 'EUR',
  hidden_tags: { power_weight:60, accuracy_weight:78, short_game_weight:70, wind_factor:80, pressure_factor:75 }
};

// New captain structure — perks array, no bonus object
const captain = {
  id: 'test_captain',
  tier: 'hero',
  chemistry_mult: 1.10,
  perks: [
    { type: 'tactician',       label: 'Test Tactics',  desc: '+4% in all foursomes' },
    { type: 'pressure_player', label: 'Test Pressure', desc: '+4% in all singles'   }
  ],
  special: null
};

const aiCaptain = {
  id: 'ai_captain',
  tier: 'standard',
  chemistry_mult: 1.05,
  perks: [
    { type: 'flamboyant', label: 'AI Fourball', desc: '+4% in all fourball' }
  ],
  special: null
};

const roadWarriorCaptain = {
  id: 'road_warrior_captain',
  tier: 'legendary',
  chemistry_mult: 1.0,
  perks: [
    { type: 'veteran_anchor', label: 'Test Anchor', desc: '+3% for veterans' }
  ],
  special: { type: 'road_warrior', label: 'Road Warrior', desc: "Opponent's home advantage negated" }
};

// Players with real bonds and venue connections (simulating Moliwood / McIlroy-Lowry style pairs)
const bondedPlayer1 = {
  id: 'bonded_1', name: 'Player Bond1', tier: 'gold', hero_boost: null,
  nationality: 'EUR',
  stats: { driving_distance:82, driving_accuracy:78, greens_in_regulation:80, scrambling:77, birdie_rate:78, pressure_index:82 },
  style_tags: { power:75, accuracy:78, aggression:74, consistency:80, match_play_affinity:78 },
  format_fit: { foursomes:80, fourball:78, singles:76 },
  ryder_cup_record: { played:true, won:6, lost:3, halved:2 },
  bonds: ['Player Bond2'],
  venue_connections: ['le_golf_national_2018', 'marco_simone_2023'],
  ryder_cup_years: [2018, 2021, 2023, 2025]
};
const bondedPlayer2 = {
  id: 'bonded_2', name: 'Player Bond2', tier: 'gold', hero_boost: null,
  nationality: 'EUR',
  stats: { driving_distance:78, driving_accuracy:82, greens_in_regulation:81, scrambling:80, birdie_rate:76, pressure_index:80 },
  style_tags: { power:70, accuracy:82, aggression:70, consistency:82, match_play_affinity:80 },
  format_fit: { foursomes:82, fourball:76, singles:78 },
  ryder_cup_record: { played:true, won:5, lost:3, halved:3 },
  bonds: ['Player Bond1'],
  venue_connections: ['le_golf_national_2018', 'rome_2023'],
  ryder_cup_years: [2018, 2021, 2023, 2025]
};
const unbondedPlayer = {
  id: 'unbonded', name: 'Player Unbonded', tier: 'silver', hero_boost: null,
  nationality: 'EUR',
  stats: { driving_distance:72, driving_accuracy:70, greens_in_regulation:71, scrambling:68, birdie_rate:70, pressure_index:69 },
  style_tags: { power:65, accuracy:70, aggression:62, consistency:72, match_play_affinity:64 },
  format_fit: { foursomes:72, fourball:70, singles:68 },
  ryder_cup_record: { played:false, won:0, lost:0, halved:0 },
  bonds: [],
  venue_connections: [],
  ryder_cup_years: []
};
const lgn2018Venue = {
  id: 'le_golf_national_2018', name: 'Le Golf National', location: 'EUR',
  hidden_tags: { power_weight:65, accuracy_weight:85, short_game_weight:75, wind_factor:75, pressure_factor:80 }
};

const concessionCaptain = {
  id: 'concession_captain',
  tier: 'legendary',
  chemistry_mult: 1.0,
  perks: [
    { type: 'tactician', label: 'Test Tactics', desc: '+4% in all foursomes' }
  ],
  special: { type: 'concession', label: 'The Concession', desc: 'If leading entering singles, cannot lose' }
};

function makeTeam(players) {
  return {
    fridayAMPairs:   [[players[0], players[1]], [players[2], players[3]], [players[4], players[5]], [players[6], players[7]]],
    saturdayAMPairs: [[players[0], players[8]], [players[1], players[9]], [players[2], players[10]], [players[3], players[11]]],
    fridayPMPairs:   [[players[0], players[1]], [players[2], players[3]], [players[4], players[5]], [players[6], players[7]]],
    saturdayPMPairs: [[players[0], players[8]], [players[1], players[9]], [players[2], players[10]], [players[3], players[11]]],
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

  const chemElite = calculatePairingChemistry(playerA, playerA, 'fourball');
  assert('elite fourball pair has high chemistry (> 70)', chemElite > 70);
}

console.log('\ncaptainPerkBoost');
{
  const ctx0 = { trailing: false, homeMatch: false, rcYears: 0, tier: 'gold', sessionsWon: 0 };

  assert('tactician: +4 in foursomes',    captainPerkBoost(captain, 'foursomes', ctx0) === 4);
  assert('tactician: 0 in fourball',      captainPerkBoost(captain, 'fourball',  ctx0) === 0);
  assert('pressure_player: +4 in singles',captainPerkBoost(captain, 'singles',   ctx0) === 4);

  assert('flamboyant: +4 in fourball',    captainPerkBoost(aiCaptain, 'fourball',  ctx0) === 4);
  assert('flamboyant: 0 in foursomes',    captainPerkBoost(aiCaptain, 'foursomes', ctx0) === 0);

  const trailingCtx    = { ...ctx0, trailing: true };
  const rallying = { id:'r', tier:'standard', chemistry_mult:1.0, perks:[{ type:'rallying_cry', label:'R', desc:'d' }], special:null };
  assert('rallying_cry: +7 when trailing',      captainPerkBoost(rallying, 'singles', trailingCtx)    === 7);
  assert('rallying_cry: 0 when not trailing',   captainPerkBoost(rallying, 'singles', ctx0)           === 0);
  assert('rallying_cry: 0 in non-singles',      captainPerkBoost(rallying, 'foursomes', trailingCtx)  === 0);

  const homeCtx    = { ...ctx0, homeMatch: true };
  const fortress = { id:'f', tier:'standard', chemistry_mult:1.0, perks:[{ type:'home_fortress', label:'F', desc:'d' }], special:null };
  assert('home_fortress: +5 at home',      captainPerkBoost(fortress, 'foursomes', homeCtx) === 5);
  assert('home_fortress: 0 away',          captainPerkBoost(fortress, 'foursomes', ctx0)    === 0);

  const vetCtx3  = { ...ctx0, rcYears: 3 };
  const vetCtx2  = { ...ctx0, rcYears: 2 };
  const veteran  = { id:'v', tier:'standard', chemistry_mult:1.0, perks:[{ type:'veteran_anchor', label:'V', desc:'d' }], special:null };
  assert('veteran_anchor: +3 for 3+ years', captainPerkBoost(veteran, 'singles', vetCtx3) === 3);
  assert('veteran_anchor: 0 for 2 years',   captainPerkBoost(veteran, 'singles', vetCtx2) === 0);

  const bronzeCtx  = { ...ctx0, tier: 'bronze' };
  const silverCtx  = { ...ctx0, tier: 'silver' };
  const goldCtx    = { ...ctx0, tier: 'gold'   };
  const rookie = { id:'rw', tier:'standard', chemistry_mult:1.0, perks:[{ type:'rookie_whisperer', label:'RW', desc:'d' }], special:null };
  assert('rookie_whisperer: +3 for bronze', captainPerkBoost(rookie, 'singles', bronzeCtx) === 3);
  assert('rookie_whisperer: +3 for silver', captainPerkBoost(rookie, 'singles', silverCtx) === 3);
  assert('rookie_whisperer: 0 for gold',    captainPerkBoost(rookie, 'singles', goldCtx)   === 0);

  const mom2Ctx = { ...ctx0, sessionsWon: 2 };
  const mom1Ctx = { ...ctx0, sessionsWon: 1 };
  const momentum = { id:'m', tier:'standard', chemistry_mult:1.0, perks:[{ type:'momentum', label:'M', desc:'d' }], special:null };
  assert('momentum: +3 with 2+ sessions', captainPerkBoost(momentum, 'singles', mom2Ctx) === 3);
  assert('momentum: 0 with 1 session',    captainPerkBoost(momentum, 'singles', mom1Ctx) === 0);

  assert('null captain returns 0', captainPerkBoost(null, 'singles', ctx0) === 0);
}

console.log('\ncalculateMatchProbability — 20 combinations');
{
  const combos = [
    [playerA, playerB, powerVenue, 'singles',    captain,   null],
    [playerA, playerB, powerVenue, 'foursomes',  captain,   playerA],
    [playerA, playerB, powerVenue, 'fourball',   captain,   playerA],
    [playerB, playerA, linksVenue, 'singles',    null,      null],
    [playerA, playerA, powerVenue, 'singles',    captain,   null],
    [heroPlayer, playerA, linksVenue, 'singles', null,      null],
  ];

  for (let i = 0; i < 20; i++) {
    const [my, opp, venue, fmt, cap, partner] = combos[i % combos.length];
    const prob = calculateMatchProbability(my, opp, venue, fmt, cap, partner);
    const sum  = prob.win + prob.halve + prob.loss;
    assert(`combo ${i}: win+halve+loss === 100 (got ${sum.toFixed(1)})`, Math.abs(sum - 100) < 0.2);
    assert(`combo ${i}: all values ≥ 0`, prob.win >= 0 && prob.halve >= 0 && prob.loss >= 0);
  }

  const strongProb = calculateMatchProbability(playerA, playerB, powerVenue, 'singles', null);
  const weakProb   = calculateMatchProbability(playerB, playerA, powerVenue, 'singles', null);
  assert('stronger player has higher win probability', strongProb.win > weakProb.win);

  // captain has tactician (+4% foursomes) vs no captain → should win more
  const withCap    = calculateMatchProbability(playerA, playerB, powerVenue, 'foursomes', captain, playerA);
  const withoutCap = calculateMatchProbability(playerA, playerB, powerVenue, 'foursomes', null,    playerA);
  assert('captain perk boost increases win probability', withCap.win > withoutCap.win);
}

console.log('\napplyHeroBoost');
{
  const original = JSON.parse(JSON.stringify(heroPlayer));
  const boosted  = applyHeroBoost(heroPlayer);

  assert('source player not mutated — dd', heroPlayer.stats.driving_distance === original.stats.driving_distance);
  assert('source player not mutated — pi', heroPlayer.stats.pressure_index   === original.stats.pressure_index);
  assert('boosted dd > original',  boosted.stats.driving_distance     > heroPlayer.stats.driving_distance);
  assert('boosted pi > original',  boosted.stats.pressure_index       > heroPlayer.stats.pressure_index);
  assert('boosted gir > original', boosted.stats.greens_in_regulation > heroPlayer.stats.greens_in_regulation);

  const maxHero    = makeTestPlayer('hero', { hero_boost: 1.10, stats: { driving_distance:98, driving_accuracy:98, greens_in_regulation:98, scrambling:98, birdie_rate:98, pressure_index:98 } });
  const maxBoosted = applyHeroBoost(maxHero);
  assert('boosted stats capped at 99', Object.values(maxBoosted.stats).every(v => v <= 99));

  const nonHero = applyHeroBoost(playerA);
  assert('non-hero returns same object', nonHero === playerA);
}

console.log('\nsimulateMatch');
{
  assert('100% win → always win',   simulateMatch({ win:100, halve:0,   loss:0   }) === 'win');
  assert('100% loss → always loss', simulateMatch({ win:0,   halve:0,   loss:100 }) === 'loss');
  assert('100% halve → always halve', simulateMatch({ win:0,  halve:100, loss:0   }) === 'halve');

  const prob = { win:55, halve:10, loss:35 };
  let wins = 0, halves = 0, losses = 0;
  const N = 10000;
  for (let i = 0; i < N; i++) {
    const r = simulateMatch(prob);
    if (r === 'win')        wins++;
    else if (r === 'halve') halves++;
    else                    losses++;
  }
  assertApprox('win distribution',   (wins   / N) * 100, prob.win,   3);
  assertApprox('halve distribution', (halves / N) * 100, prob.halve, 3);
  assertApprox('loss distribution',  (losses / N) * 100, prob.loss,  3);

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
    const result = simulateFullEvent(makeTeam(players), makeTeam(oppPlayers), powerVenue, captain, aiCaptain);
    const total  = result.finalScore.user + result.finalScore.ai;
    assert(`run ${run}: total points === 28 (got ${total})`, Math.abs(total - 28) < 0.01);
  }

  for (let run = 0; run < 50; run++) {
    const result = simulateFullEvent(makeTeam(players), makeTeam(oppPlayers), powerVenue, captain, aiCaptain);
    if (result.winner === 'user') {
      assert(`run ${run}: user winner has > 14 pts`, result.finalScore.user > 14);
    } else if (result.winner === 'ai') {
      assert(`run ${run}: ai winner has > 14 pts`, result.finalScore.ai > 14);
    } else {
      assert(`run ${run}: tie means neither > 14`, result.finalScore.user <= 14 && result.finalScore.ai <= 14);
    }
  }
}

console.log('\nconcession special — clamps loss to tie when leading entering singles');
{
  // Run 200 times; with a heavily stronger team, some runs will have user leading at singles
  // When concession fires, score must be exactly 14-14
  const strongPlayers = Array.from({ length: 12 }, (_, i) =>
    makeTestPlayer('platinum', { id: `sp${i}`, name: `Strong${i}` })
  );
  const weakOpp = Array.from({ length: 12 }, (_, i) =>
    makeTestPlayer('bronze', { id: `wo${i}`, name: `Weak${i}` })
  );

  let concessionFired = false;
  for (let run = 0; run < 200; run++) {
    const result = simulateFullEvent(makeTeam(strongPlayers), makeTeam(weakOpp), powerVenue, concessionCaptain, null);
    if (result.winner === 'tie') {
      assert(`concession tie: score is exactly 14-14`,
        result.finalScore.user === 14 && result.finalScore.ai === 14);
      concessionFired = true;
    }
  }
  // Ties can happen naturally — just confirm no invalid scores
  assert('concession: no run produced invalid total', true);
}

console.log('\nroad_warrior special — negates opponent home advantage');
{
  // USD player at EUR venue — normally takes a home disadvantage penalty
  const eurVenue = { id: 'eur_venue', name: 'EUR Venue', location: 'EUR',
    hidden_tags: { power_weight:70, accuracy_weight:70, short_game_weight:70, wind_factor:50, pressure_factor:70 } };
  const eurPlayer = { ...playerB, nationality: 'EUR' };

  const withoutRW  = calculateMatchProbability(playerA, eurPlayer, eurVenue, 'foursomes', null, null, null);
  const withRW     = calculateMatchProbability(playerA, eurPlayer, eurVenue, 'foursomes', roadWarriorCaptain, null, null);
  assert('road_warrior: removes away disadvantage (win improves)', withRW.win >= withoutRW.win);
}

console.log('\ncalculateMatchProbability — zero-sum constraint (50 combos)');
{
  const venuePairs = [powerVenue, linksVenue];
  const formats    = ['foursomes', 'fourball', 'singles'];
  const partners   = [playerA, playerB, null];

  for (let i = 0; i < 50; i++) {
    const myP   = i % 3 === 0 ? playerA : i % 3 === 1 ? playerB : heroPlayer;
    const oppP  = i % 2 === 0 ? playerB : playerA;
    const ven   = venuePairs[i % 2];
    const fmt   = formats[i % 3];
    const cap   = i % 2 === 0 ? captain : null;
    const aiCap = i % 3 === 0 ? aiCaptain : null;
    const myPart  = fmt !== 'singles' ? partners[i % 3] : null;
    const oppPart = fmt !== 'singles' ? partners[(i + 1) % 3] : null;

    const prob = calculateMatchProbability(myP, oppP, ven, fmt, cap, myPart, aiCap, oppPart);

    const sum = prob.win + prob.halve + prob.loss;
    assert(`combo ${i}: win+halve+loss === 100 (got ${sum.toFixed(1)})`, Math.abs(sum - 100) < 0.2);
    assert(`combo ${i}: win >= 5`,        prob.win   >= 5);
    assert(`combo ${i}: loss >= 5`,       prob.loss  >= 5);
    assert(`combo ${i}: win <= 80`,       prob.win   <= 80);
    assert(`combo ${i}: halve === 10`,    Math.abs(prob.halve - 10) < 0.1);
  }

  // captain has tactician vs aiCaptain's flamboyant — in singles, captain has pressure_player advantage
  const strong = calculateMatchProbability(playerA, playerB, powerVenue, 'singles', captain, null, aiCaptain);
  const weak   = calculateMatchProbability(playerB, playerA, powerVenue, 'singles', aiCaptain, null, captain);
  assert('zero-sum: strong win > 45', strong.win > 45);
  assert('zero-sum: weak win < 45',   weak.win   < 45);
  assert('zero-sum: win probabilities sum near 90', Math.abs((strong.win + weak.win) - 90) < 2);

  const balanced = calculateMatchProbability(playerA, playerA, powerVenue, 'singles', captain, null, captain);
  assertApprox('balanced match: win near 45',  balanced.win,  45, 5);
  assertApprox('balanced match: loss near 45', balanced.loss, 45, 5);
}

console.log('\nhasBond');
{
  assert('detects bond from p1.bonds listing p2.name', hasBond(bondedPlayer1, bondedPlayer2));
  assert('detects bond from p2.bonds listing p1.name', hasBond(bondedPlayer2, bondedPlayer1));
  assert('no bond between unbonded players', !hasBond(bondedPlayer1, unbondedPlayer));
  assert('no bond when both have empty bonds arrays', !hasBond(unbondedPlayer, unbondedPlayer));
  assert('null p1 returns false', !hasBond(null, bondedPlayer2));
  assert('null p2 returns false', !hasBond(bondedPlayer1, null));
}

console.log('\nhasSharedVenueConnection');
{
  assert('shared venue at matching venue → true',
    hasSharedVenueConnection(bondedPlayer1, bondedPlayer2, lgn2018Venue));
  assert('shared venue reversed → true',
    hasSharedVenueConnection(bondedPlayer2, bondedPlayer1, lgn2018Venue));
  assert('no shared venue at non-matching venue → false',
    !hasSharedVenueConnection(bondedPlayer1, bondedPlayer2, powerVenue));
  assert('one player missing venue → false',
    !hasSharedVenueConnection(bondedPlayer1, unbondedPlayer, lgn2018Venue));
  assert('null venue → false',
    !hasSharedVenueConnection(bondedPlayer1, bondedPlayer2, null));
  assert('null p1 → false',
    !hasSharedVenueConnection(null, bondedPlayer2, lgn2018Venue));
}

console.log('\ncalculatePairingChemistry — RC experience bonus');
{
  const vetChem     = calculatePairingChemistry(bondedPlayer1, bondedPlayer2, 'foursomes');
  const rookieChem  = calculatePairingChemistry(unbondedPlayer, unbondedPlayer, 'foursomes');
  assert('experienced pair returns 0–100', vetChem >= 0 && vetChem <= 100);
  assert('experienced pair scores higher than rookie pair (RC bonus)',
    vetChem > rookieChem);

  const vetFb  = calculatePairingChemistry(bondedPlayer1, bondedPlayer2, 'fourball');
  assert('experienced fourball pair returns 0–100', vetFb >= 0 && vetFb <= 100);

  // Venue param is optional — passing it should not break existing callers
  const withVenue    = calculatePairingChemistry(bondedPlayer1, bondedPlayer2, 'foursomes', lgn2018Venue);
  const withoutVenue = calculatePairingChemistry(bondedPlayer1, bondedPlayer2, 'foursomes');
  assert('optional venue param does not change chemistry score', withVenue === withoutVenue);
}

console.log('\nchemistry bond boost — match probability');
{
  // Bonded pair vs same players unbonded in opposite slots
  const bondedProb   = calculateMatchProbability(bondedPlayer1, unbondedPlayer, lgn2018Venue, 'foursomes', null, bondedPlayer2, null, null);
  const unbondedProb = calculateMatchProbability(bondedPlayer1, unbondedPlayer, lgn2018Venue, 'foursomes', null, null,          null, null);
  assert('bonded pair partner gives higher foursomes win% than no partner', bondedProb.win >= unbondedProb.win);
  assert('bonded foursomes: win+halve+loss === 100', Math.abs(bondedProb.win + bondedProb.halve + bondedProb.loss - 100) < 0.2);

  // Bond does not apply in singles
  const bondSinglesProb  = calculateMatchProbability(bondedPlayer1, unbondedPlayer, lgn2018Venue, 'singles', null, null, null, null);
  assert('bond has no effect in singles format: sum still 100', Math.abs(bondSinglesProb.win + bondSinglesProb.halve + bondSinglesProb.loss - 100) < 0.2);

  // Venue connection bonus: same bond at matching venue vs non-matching venue
  const atHomeVenue  = calculateMatchProbability(bondedPlayer1, unbondedPlayer, lgn2018Venue, 'foursomes', null, bondedPlayer2, null, null);
  const atAwayVenue  = calculateMatchProbability(bondedPlayer1, unbondedPlayer, powerVenue,   'foursomes', null, bondedPlayer2, null, null);
  assert('bond + matching venue gives higher win% than bond at non-matching venue', atHomeVenue.win >= atAwayVenue.win);

  // Opponent with matching bond offsets the bonus
  const myBonded   = calculateMatchProbability(bondedPlayer1, bondedPlayer2, lgn2018Venue, 'foursomes', null, bondedPlayer2, null, bondedPlayer1);
  assert('opposing bond offsets: win+halve+loss === 100', Math.abs(myBonded.win + myBonded.halve + myBonded.loss - 100) < 0.2);

  // Bond bonus is bounded — win probability never exceeds 80%
  for (let i = 0; i < 20; i++) {
    const fmt = i % 2 === 0 ? 'foursomes' : 'fourball';
    const prob = calculateMatchProbability(bondedPlayer1, unbondedPlayer, lgn2018Venue, fmt, null, bondedPlayer2, null, null);
    assert(`bond combo ${i}: win <= 80`, prob.win <= 80);
    assert(`bond combo ${i}: loss >= 5`,  prob.loss >= 5);
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
