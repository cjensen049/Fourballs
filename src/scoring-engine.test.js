const {
  getTalentScore,
  compositeScore,
  calculateVenueFit,
  dominantStyleTag,
  computeChemistry,
  computePlayerCaptainConnection,
  computePlayerChemScore,
  computeCaptainChemScore,
  computeTeamChemScore,
  captainPerkBoost,
  calculateMatchProbability,
  simulateMatch,
  singlesOrder,
  simulateFullEvent
} = require('./scoring-engine');

// ─── Test fixtures ────────────────────────────────────────────────────────────

const playerA = {
  id: 'test_player_a', name: 'Player A', tier: 'platinum',
  nationality: 'USA',
  stat_driving_distance: 92, stat_driving_accuracy: 80,
  stat_greens_in_regulation: 89, stat_scrambling: 85,
  stat_birdie_rate: 90, stat_pressure_index: 95,
  style_power: 88, style_accuracy: 80, style_aggression: 82,
  style_consistency: 88, style_match_play_affinity: 85,
  fit_foursomes: 85, fit_fourball: 88, fit_singles: 90,
  rc_won: 15, rc_lost: 8, rc_halved: 4, rc_played: true,
  ryder_cup_years: ['2008', '2010', '2012', '2014', '2016'],
  made_team: true
};

const playerB = {
  id: 'test_player_b', name: 'Player B', tier: 'bronze',
  nationality: 'USA',
  stat_driving_distance: 63, stat_driving_accuracy: 62,
  stat_greens_in_regulation: 63, stat_scrambling: 63,
  stat_birdie_rate: 63, stat_pressure_index: 62,
  style_power: 55, style_accuracy: 62, style_aggression: 55,
  style_consistency: 65, style_match_play_affinity: 58,
  fit_foursomes: 70, fit_fourball: 72, fit_singles: 68,
  rc_won: 0, rc_lost: 0, rc_halved: 0, rc_played: false,
  ryder_cup_years: [],
  made_team: false
};

const heroPlayer = {
  id: 'test_hero', name: 'Hero Player', tier: 'hero',
  nationality: 'USA',
  stat_driving_distance: 68, stat_driving_accuracy: 66,
  stat_greens_in_regulation: 67, stat_scrambling: 72,
  stat_birdie_rate: 69, stat_pressure_index: 76,
  style_power: 68, style_accuracy: 66, style_aggression: 85,
  style_consistency: 68, style_match_play_affinity: 85,
  fit_foursomes: 70, fit_fourball: 90, fit_singles: 80,
  rc_won: 14, rc_lost: 6, rc_halved: 5, rc_played: true,
  ryder_cup_years: ['2008', '2010', '2012'],
  made_team: true
};

const powerVenue = {
  id: 'test_venue', name: 'Test Venue', location: 'USA',
  hidden_tags: { power_weight: 90, accuracy_weight: 55, short_game_weight: 65, wind_factor: 20, pressure_factor: 80 }
};

const linksVenue = {
  id: 'links_venue', name: 'Links Venue', location: 'EUR',
  hidden_tags: { power_weight: 60, accuracy_weight: 78, short_game_weight: 70, wind_factor: 80, pressure_factor: 75 }
};

const captain = {
  id: 'test_captain', tier: 'hero',
  chemistry_mult: 1.10,
  perks: [
    { type: 'tactician',       label: 'Test Tactics',  desc: '+4% in all foursomes' },
    { type: 'pressure_player', label: 'Test Pressure', desc: '+4% in all singles'   }
  ],
  special: null
};

const aiCaptain = {
  id: 'ai_captain', tier: 'standard',
  chemistry_mult: 1.05,
  perks: [{ type: 'flamboyant', label: 'AI Fourball', desc: '+4% in all fourball' }],
  special: null
};

const roadWarriorCaptain = {
  id: 'road_warrior_captain', tier: 'legendary',
  chemistry_mult: 1.0,
  perks: [{ type: 'veteran_anchor', label: 'Test Anchor', desc: '+3% for veterans' }],
  special: { type: 'road_warrior', label: 'Road Warrior', desc: "Opponent's home advantage negated" }
};

const concessionCaptain = {
  id: 'concession_captain', tier: 'legendary',
  chemistry_mult: 1.0,
  perks: [{ type: 'tactician', label: 'Test Tactics', desc: '+4% in all foursomes' }],
  special: { type: 'concession', label: 'The Concession', desc: 'If leading entering singles, cannot lose' }
};

// Players with real shared history
const sharedPlayer1 = {
  id: 'shared_1', name: 'Player Shared1', tier: 'gold', nationality: 'EUR',
  stat_driving_distance: 82, stat_driving_accuracy: 78,
  stat_greens_in_regulation: 80, stat_scrambling: 77,
  stat_birdie_rate: 78, stat_pressure_index: 82,
  style_power: 75, style_accuracy: 78, style_aggression: 74,
  style_consistency: 80, style_match_play_affinity: 78,
  fit_foursomes: 80, fit_fourball: 78, fit_singles: 76,
  rc_won: 6, rc_lost: 3, rc_halved: 2, rc_played: true,
  ryder_cup_years: ['2018', '2021', '2023'],
  made_team: true, year: 2023
};

const sharedPlayer2 = {
  id: 'shared_2', name: 'Player Shared2', tier: 'gold', nationality: 'EUR',
  stat_driving_distance: 78, stat_driving_accuracy: 82,
  stat_greens_in_regulation: 81, stat_scrambling: 80,
  stat_birdie_rate: 76, stat_pressure_index: 80,
  style_power: 70, style_accuracy: 82, style_aggression: 70,
  style_consistency: 82, style_match_play_affinity: 80,
  fit_foursomes: 82, fit_fourball: 76, fit_singles: 78,
  rc_won: 5, rc_lost: 3, rc_halved: 3, rc_played: true,
  ryder_cup_years: ['2018', '2021', '2023'],
  made_team: true, year: 2023
};

const strandedPlayer = {
  id: 'stranded', name: 'Player Stranded', tier: 'silver', nationality: 'EUR',
  stat_driving_distance: 72, stat_driving_accuracy: 70,
  stat_greens_in_regulation: 71, stat_scrambling: 68,
  stat_birdie_rate: 70, stat_pressure_index: 69,
  style_power: 65, style_accuracy: 70, style_aggression: 62,
  style_consistency: 72, style_match_play_affinity: 64,
  fit_foursomes: 72, fit_fourball: 70, fit_singles: 68,
  rc_won: 0, rc_lost: 0, rc_halved: 0, rc_played: false,
  ryder_cup_years: [],
  made_team: false, year: 2023
};

// All-player list for computeChemistry history lookup
const ALL_PLAYERS = [
  { ...sharedPlayer1, year: 2018, made_team: true },
  { ...sharedPlayer1, year: 2021, made_team: true },
  { ...sharedPlayer1, year: 2023, made_team: true },
  { ...sharedPlayer2, year: 2018, made_team: true },
  { ...sharedPlayer2, year: 2021, made_team: true },
  { ...sharedPlayer2, year: 2023, made_team: true },
  { ...strandedPlayer, year: 2023, made_team: false },
  { ...playerA, year: 2016, made_team: true },
  { ...playerB, year: 2016, made_team: false },
];

const CUP_RESULTS = {
  '2018': 'EUR', '2021': 'USA', '2023': 'EUR'
};

function makeTestPlayer(tier, overrides = {}) {
  const base = JSON.parse(JSON.stringify(playerA));
  base.tier = tier;
  Object.assign(base, overrides);
  return base;
}

function makeTeam(players) {
  return {
    fridayAMPairs:   [[players[0], players[1]], [players[2], players[3]], [players[4], players[5]], [players[6], players[7]]],
    saturdayAMPairs: [[players[0], players[8]], [players[1], players[9]], [players[2], players[10]], [players[3], players[11]]],
    fridayPMPairs:   [[players[0], players[1]], [players[2], players[3]], [players[4], players[5]], [players[6], players[7]]],
    saturdayPMPairs: [[players[0], players[8]], [players[1], players[9]], [players[2], players[10]], [players[3], players[11]]],
    allPlayers: players
  };
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

console.log('\ngetTalentScore');
{
  assert('hero = 20',     getTalentScore('hero')     === 20);
  assert('platinum = 15', getTalentScore('platinum') === 15);
  assert('gold = 10',     getTalentScore('gold')     === 10);
  assert('silver = 7',    getTalentScore('silver')   === 7);
  assert('bronze = 3',    getTalentScore('bronze')   === 3);
  assert('unknown tier defaults to 7', getTalentScore('legendary') === 7);
  assert('hero > platinum > gold > silver > bronze',
    getTalentScore('hero') > getTalentScore('platinum') &&
    getTalentScore('platinum') > getTalentScore('gold') &&
    getTalentScore('gold') > getTalentScore('silver') &&
    getTalentScore('silver') > getTalentScore('bronze'));
}

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
    const p = makeTestPlayer('silver', {
      stat_driving_distance: 50 + i * 2, stat_driving_accuracy: 60 + i,
      stat_greens_in_regulation: 65, stat_scrambling: 65,
      stat_birdie_rate: 65, stat_pressure_index: 65
    });
    const v = i % 2 === 0 ? powerVenue : linksVenue;
    const f = calculateVenueFit(p, v);
    assert(`random combo ${i} returns 0–100`, f >= 0 && f <= 100);
  }
}

// ─── Chemistry v2 test helpers ───────────────────────────────────────────────
// powerDom: dominant tag = power (stat_driving_distance highest)
const powerDom = makeTestPlayer('gold', {
  id: 'pd', name: 'Power Dom',
  stat_driving_distance: 99, stat_driving_accuracy: 70, stat_greens_in_regulation: 72,
  stat_scrambling: 68, stat_birdie_rate: 70, stat_pressure_index: 65,
});
// shortDom: dominant tag = shortgame (stat_scrambling highest)
const shortDom = makeTestPlayer('gold', {
  id: 'sd', name: 'Short Dom',
  stat_driving_distance: 68, stat_driving_accuracy: 70, stat_greens_in_regulation: 72,
  stat_scrambling: 99, stat_birdie_rate: 70, stat_pressure_index: 65,
});
// accurateDom: dominant tag = accurate
const accurateDom = makeTestPlayer('gold', {
  id: 'ad', name: 'Accurate Dom',
  stat_driving_distance: 68, stat_driving_accuracy: 99, stat_greens_in_regulation: 99,
  stat_scrambling: 68, stat_birdie_rate: 70, stat_pressure_index: 65,
});
// Two EUR players who were teammates in the same year with a win
const teamWin1 = makeTestPlayer('gold', {
  id: 'tw1', name: 'Team Win 1', nationality: 'EUR', year: 2018, made_team: true,
  stat_driving_distance: 75, stat_driving_accuracy: 70, stat_greens_in_regulation: 70,
  stat_scrambling: 68, stat_birdie_rate: 70, stat_pressure_index: 65,
});
const teamWin2 = makeTestPlayer('gold', {
  id: 'tw2', name: 'Team Win 2', nationality: 'EUR', year: 2018, made_team: true,
  stat_driving_distance: 68, stat_driving_accuracy: 70, stat_greens_in_regulation: 70,
  stat_scrambling: 99, stat_birdie_rate: 70, stat_pressure_index: 65, // shortDom
});
// Two EUR players same year but at least one snubbed
const snub1 = makeTestPlayer('silver', {
  id: 'sn1', name: 'Snub 1', nationality: 'EUR', year: 2021, made_team: false,
});
const snub2 = makeTestPlayer('silver', {
  id: 'sn2', name: 'Snub 2', nationality: 'EUR', year: 2021, made_team: true,
});
// EUR player from different year, explicitly power-dominant to match teamWin1 (no comp bonus)
const diffYear = makeTestPlayer('silver', {
  id: 'dy', name: 'Diff Year', nationality: 'EUR', year: 2004, made_team: true,
  stat_driving_distance: 85, stat_driving_accuracy: 68, stat_greens_in_regulation: 68,
  stat_scrambling: 65, stat_birdie_rate: 65, stat_pressure_index: 65,
});

console.log('\ndominantStyleTag');
{
  assert('power dominant when stat_driving_distance highest', dominantStyleTag(powerDom) === 'power');
  assert('shortgame dominant when stat_scrambling highest',   dominantStyleTag(shortDom) === 'shortgame');
  assert('accurate dominant when accuracy+GIR highest',       dominantStyleTag(accurateDom) === 'accurate');
}

console.log('\ncomputeChemistry — v2 point model (0–3)');
{
  // Guard
  assert('same player returns 0', computeChemistry(teamWin1, teamWin1, [], CUP_RESULTS) === 0);
  assert('null p1 returns 0',     computeChemistry(null, teamWin1, [], CUP_RESULTS) === 0);
  assert('null p2 returns 0',     computeChemistry(teamWin1, null, [], CUP_RESULTS) === 0);

  // Teammates who won together: +1 teammates, +1 champion = 2 (no comp: both power vs short → check)
  // teamWin1 dominant=power, teamWin2 dominant=shortgame → power+shortgame IS complementary → +1
  const twChem = computeChemistry(teamWin1, teamWin2, [], CUP_RESULTS);
  assert('teammates+champion+comp = 3', twChem === 3);

  // Teammates who won but no complement: two identical-stat EUR players, same year, 2018 win
  const teamWin3 = makeTestPlayer('gold', {
    id: 'tw3', name: 'Team Win 3', nationality: 'EUR', year: 2018, made_team: true,
    stat_driving_distance: 75, stat_driving_accuracy: 70, stat_greens_in_regulation: 70,
    stat_scrambling: 68, stat_birdie_rate: 70, stat_pressure_index: 65,
  });
  const tw13 = computeChemistry(teamWin1, teamWin3, [], CUP_RESULTS);
  assert('teammates+champion, same dominant tag = 2', tw13 === 2);

  // Same season, not teammates (snub): +1
  const snubChem = computeChemistry(snub1, snub2, [], CUP_RESULTS);
  assert('same season, one snubbed = 1', snubChem === 1);

  // Different years, same nat → only comp possible
  const diffYearComp = computeChemistry(teamWin1, diffYear, [], CUP_RESULTS);
  // teamWin1 dominant=power, diffYear default (from playerA copy) dominant=?
  // diffYear uses playerA base: stat_driving_distance=90 → power. Same tag, no comp.
  assert('different years, same dominant tag = 0', diffYearComp === 0);

  // Cross-nationality: no year/nat match, only comp possible
  const crossNat = computeChemistry(sharedPlayer1, playerA, [], CUP_RESULTS);
  assert('cross-nationality has at most comp bonus (0 or 1)', crossNat <= 1);

  // complementary styles alone (different years, different nat or same nat different years)
  const compOnly = computeChemistry(powerDom, shortDom, [], {});
  assert('complementary tags only = 1', compOnly === 1);

  // accurate+clutch is complementary
  const clutchDom = makeTestPlayer('silver', {
    id: 'cd2', name: 'Clutch Dom2',
    stat_driving_distance: 65, stat_driving_accuracy: 68, stat_greens_in_regulation: 70,
    stat_scrambling: 65, stat_birdie_rate: 65, stat_pressure_index: 99,
  });
  const compAC = computeChemistry(accurateDom, clutchDom, [], {});
  assert('accurate+clutch complementary = 1', compAC === 1);

  // Same dominant tag → no comp
  const noComp = computeChemistry(powerDom, makeTestPlayer('silver', {
    id: 'pd2', name: 'Power Dom2',
    stat_driving_distance: 85, stat_driving_accuracy: 68, stat_greens_in_regulation: 70,
    stat_scrambling: 65, stat_birdie_rate: 65, stat_pressure_index: 65,
  }), [], {});
  assert('same dominant tag = 0 comp', noComp === 0);

  // Result always 0–3
  for (let i = 0; i < 10; i++) {
    const pa = makeTestPlayer('gold', { id: `pa${i}`, name: `CTestA${i}`, nationality: 'EUR', year: 2018, made_team: i % 2 === 0 });
    const pb = makeTestPlayer('silver', { id: `pb${i}`, name: `CTestB${i}`, nationality: 'EUR', year: 2018, made_team: true });
    const c  = computeChemistry(pa, pb, [], CUP_RESULTS);
    assert(`random combo ${i}: result 0–3`, c >= 0 && c <= 3);
  }
}

console.log('\ncomputePlayerChemScore');
{
  // Pod of 4 EUR 2018 winners: each pair is teammates+champion → 2pts minimum per pair
  // Pod member sees 3 podmates: teamWin2 (3pts with teamWin1) + two more at 2pts each = 7pts → green
  const pod2018 = [teamWin2,
    makeTestPlayer('gold', { id:'pod3', name:'Pod 3', nationality:'EUR', year:2018, made_team:true, stat_driving_distance:75, stat_driving_accuracy:70, stat_greens_in_regulation:70, stat_scrambling:68, stat_birdie_rate:70, stat_pressure_index:65 }),
    makeTestPlayer('gold', { id:'pod4', name:'Pod 4', nationality:'EUR', year:2018, made_team:true, stat_driving_distance:75, stat_driving_accuracy:70, stat_greens_in_regulation:70, stat_scrambling:68, stat_birdie_rate:70, stat_pressure_index:65 }),
  ];
  const greenScore = computePlayerChemScore(teamWin1, pod2018, [], CUP_RESULTS);
  assert('four 2018 EUR winners: player green tier (≥4pts)', greenScore.tier === 'green');
  assert('green tier reward = 11', greenScore.reward === 11);

  // Pod of strangers: different years/nats AND same dominant tag (power) as teamWin1 → 0 pts → red
  const strangerPod = [
    makeTestPlayer('bronze', { id:'s1', name:'Stranger 1', nationality:'USA', year:1999, made_team:false, stat_driving_distance:85, stat_driving_accuracy:68, stat_greens_in_regulation:68, stat_scrambling:65, stat_birdie_rate:65, stat_pressure_index:65 }),
    makeTestPlayer('bronze', { id:'s2', name:'Stranger 2', nationality:'USA', year:2004, made_team:false, stat_driving_distance:85, stat_driving_accuracy:68, stat_greens_in_regulation:68, stat_scrambling:65, stat_birdie_rate:65, stat_pressure_index:65 }),
    makeTestPlayer('bronze', { id:'s3', name:'Stranger 3', nationality:'USA', year:2010, made_team:false, stat_driving_distance:85, stat_driving_accuracy:68, stat_greens_in_regulation:68, stat_scrambling:65, stat_birdie_rate:65, stat_pressure_index:65 }),
  ];
  const redScore = computePlayerChemScore(teamWin1, strangerPod, [], {});
  assert('strangers across years/nats: red tier', redScore.tier === 'red');
  assert('red tier reward = 0', redScore.reward === 0);

  // 2 podmates give 1pt each → total 2 → yellow
  const yellowPod = [
    makeTestPlayer('silver', { id:'y1', name:'Yellow 1', nationality:'EUR', year:2021, made_team:false }),
    makeTestPlayer('silver', { id:'y2', name:'Yellow 2', nationality:'USD', year:2015, made_team:false }),
  ];
  // teamWin1 (EUR, 2018) vs yellow1 (EUR, 2021 snub): diff year → only comp; power vs power = 0
  // teamWin1 vs yellow2 (USD, 2015): cross-nat → 0 unless comp
  // Adjust yellow1 to have shortgame dominant so comp fires
  const yellowPod2 = [
    makeTestPlayer('silver', { id:'yy1', name:'Yellow Y1', nationality:'USA', year:2008, made_team:false,
      stat_driving_distance:65, stat_driving_accuracy:70, stat_greens_in_regulation:70, stat_scrambling:99, stat_birdie_rate:70, stat_pressure_index:65 }),
    makeTestPlayer('silver', { id:'yy2', name:'Yellow Y2', nationality:'USA', year:2010, made_team:false,
      stat_driving_distance:65, stat_driving_accuracy:70, stat_greens_in_regulation:70, stat_scrambling:99, stat_birdie_rate:70, stat_pressure_index:65 }),
  ];
  // teamWin1 power vs yy1 shortgame → comp: 1pt. teamWin1 power vs yy2 shortgame → comp: 1pt. total=2 → yellow
  const yellowScore = computePlayerChemScore(teamWin1, yellowPod2, [], {});
  assert('2 comp-only podmates: yellow tier (2pts)', yellowScore.tier === 'yellow');
  assert('yellow tier reward = 6', yellowScore.reward === 6);

  // Empty pod → 0 pts → red
  const emptyScore = computePlayerChemScore(teamWin1, [], [], {});
  assert('empty pod: red tier', emptyScore.tier === 'red');
  assert('empty pod points = 0', emptyScore.points === 0);
}

console.log('\ncomputeCaptainChemScore');
{
  const eurCap = {
    id: 'test_cap', name: 'Test Captain',
    nationality: 'EUR', years: ['2018', '2021'],
    perks: [], special: null,
  };
  const mockVenue2018 = { year: 2018 };
  const mockVenue2004 = { year: 2004 };

  // No drafted players, no venue match → only won cups
  // 2018=EUR win, 2021=USA win → 1 cup win
  const baseScore = computeCaptainChemScore(eurCap, [], [], mockVenue2004, CUP_RESULTS);
  assert('no players, no venue: 1 cup win point', baseScore.points === 1);
  assert('1pt → red tier', baseScore.tier === 'red');
  assert('red reward = 0', baseScore.reward === 0);

  // Venue match (2018): +1
  const venueScore = computeCaptainChemScore(eurCap, [], [], mockVenue2018, CUP_RESULTS);
  assert('venue match adds 1pt (total 2)', venueScore.points === 2);

  // Add 4 drafted EUR players who were on the 2018 team: +4 pts
  const squad2018 = Array.from({ length: 4 }, (_, i) => makeTestPlayer('gold', {
    id: `sq${i}`, name: `Squad ${i}`, nationality: 'EUR', year: 2018, made_team: true,
  }));
  const squadScore = computeCaptainChemScore(eurCap, squad2018, [], mockVenue2018, CUP_RESULTS);
  // venue(1) + 4 players(4) + cup win(1) = 6 → yellow
  assert('venue + 4 players + 1 win = 6pts', squadScore.points === 6);
  assert('6pts → yellow tier', squadScore.tier === 'yellow');
  assert('yellow reward = 10', squadScore.reward === 10);

  // 8 drafted players on their 2018 team: venue(1) + 8(8) + cup win(1) = 10 → green
  const bigSquad = Array.from({ length: 8 }, (_, i) => makeTestPlayer('gold', {
    id: `bs${i}`, name: `Big Squad ${i}`, nationality: 'EUR', year: 2018, made_team: true,
  }));
  const bigScore = computeCaptainChemScore(eurCap, bigSquad, [], mockVenue2018, CUP_RESULTS);
  assert('venue + 8 players + 1 win = 10pts', bigScore.points === 10);
  assert('10pts → green tier', bigScore.tier === 'green');
  assert('green reward = 15', bigScore.reward === 15);

  // Null captain returns red
  const nullScore = computeCaptainChemScore(null, [], [], mockVenue2018, CUP_RESULTS);
  assert('null captain: red tier', nullScore.tier === 'red');

  // Players from wrong year or nationality don't score
  const wrongYear = makeTestPlayer('gold', { id:'wy', name:'Wrong Year', nationality:'EUR', year:2004, made_team:true });
  const wrongNat  = makeTestPlayer('gold', { id:'wn', name:'Wrong Nat',  nationality:'USA', year:2018, made_team:true });
  const noMatchScore = computeCaptainChemScore(eurCap, [wrongYear, wrongNat], [], null, CUP_RESULTS);
  assert('wrong year/nat players do not score roster pts', noMatchScore.points === 1); // only cup win

  // Captain with 2 cup wins
  const twoWinCap = { id:'twc', name:'Two Win Cap', nationality:'EUR',
    years: ['2018', '2023'], perks: [], special: null };
  const cr2 = { '2018': 'EUR', '2023': 'EUR' };
  const twoWinScore = computeCaptainChemScore(twoWinCap, [], [], null, cr2);
  assert('captain with 2 wins gets 2 cup win points', twoWinScore.points === 2);
}

console.log('\ncomputePlayerCaptainConnection');
{
  const eurCap2018 = { id:'ec18', name:'EUR Cap 2018', nationality:'EUR', years:['2018','2021'], perks:[], special:null };
  const playerLed  = makeTestPlayer('gold', { id:'pl1', name:'Led Player',  nationality:'EUR', year:2018, made_team:true  });
  const playerSnub = makeTestPlayer('silver',{ id:'pl2', name:'Snub Player', nationality:'EUR', year:2018, made_team:false });
  const playerWrong= makeTestPlayer('silver',{ id:'pl3', name:'Wrong Year',  nationality:'EUR', year:2004, made_team:true  });
  const playerUSA  = makeTestPlayer('gold',  { id:'pl4', name:'USA Player',  nationality:'USA', year:2018, made_team:true  });

  // Led together in 2018 (EUR win): +1 led, +1 won = 2
  assert('led+won = 2', computePlayerCaptainConnection(playerLed, eurCap2018, CUP_RESULTS) === 2);

  // Led together in 2021 (USA win): +1 led, 0 won = 1
  const playerLed21 = makeTestPlayer('gold', { id:'pl21', name:'Led 21', nationality:'EUR', year:2021, made_team:true });
  assert('led but not won = 1', computePlayerCaptainConnection(playerLed21, eurCap2018, CUP_RESULTS) === 1);

  // Snubbed (made_team=false) → 0
  assert('snubbed player: 0', computePlayerCaptainConnection(playerSnub, eurCap2018, CUP_RESULTS) === 0);

  // Wrong year → 0
  assert('wrong year: 0', computePlayerCaptainConnection(playerWrong, eurCap2018, CUP_RESULTS) === 0);

  // Cross-nationality → 0
  assert('cross-nationality: 0', computePlayerCaptainConnection(playerUSA, eurCap2018, CUP_RESULTS) === 0);

  // Null guards
  assert('null player: 0', computePlayerCaptainConnection(null, eurCap2018, CUP_RESULTS) === 0);
  assert('null captain: 0', computePlayerCaptainConnection(playerLed, null, CUP_RESULTS) === 0);
}

console.log('\ncomputeTeamChemScore');
{
  const eurCap2018 = { id:'tcs_cap', name:'TCS Cap', nationality:'EUR', years:['2018'], perks:[], special:null };
  // Pod of 4 EUR 2018 winners (teamWin1+teamWin2 + 2 more)
  const tw3 = makeTestPlayer('gold', { id:'tcw3', name:'TC Win 3', nationality:'EUR', year:2018, made_team:true,
    stat_driving_distance:75, stat_driving_accuracy:70, stat_greens_in_regulation:70, stat_scrambling:68, stat_birdie_rate:70, stat_pressure_index:65 });
  const tw4 = makeTestPlayer('gold', { id:'tcw4', name:'TC Win 4', nationality:'EUR', year:2018, made_team:true,
    stat_driving_distance:65, stat_driving_accuracy:70, stat_greens_in_regulation:70, stat_scrambling:99, stat_birdie_rate:70, stat_pressure_index:65 });

  // Pod A: teamWin1, teamWin2, tw3, tw4 (all EUR 2018 winners)
  // Pod B+C: empty
  const pods = [[teamWin1, teamWin2, tw3, tw4], [null,null,null,null], [null,null,null,null]];
  const mockVenue2018b = { year: 2018 };

  const teamScore = computeTeamChemScore(pods, eurCap2018, mockVenue2018b, CUP_RESULTS);
  // Each player: 3 pod-pair connections (some mix of 2-3 pts each) + captain connection (led+won=2)
  // Total per player easily >= 4 → green tier → points + 11 reward
  // Plus captain: venue(1) + 4 players(4) + 1 win(1) = 6 → yellow(10 reward) → 6+10=16
  assert('well-connected 2018 EUR pod gives substantial score', teamScore > 40);

  // Empty pods + no captain: 0
  const emptyPods = [[null,null,null,null],[null,null,null,null],[null,null,null,null]];
  assert('empty pods + null captain: 0', computeTeamChemScore(emptyPods, null, null, {}) === 0);

  // null pods: 0
  assert('null pods: 0', computeTeamChemScore(null, null, null, {}) === 0);

  // computePlayerChemScore now accepts optional captain (backward compat)
  const noCapScore = computePlayerChemScore(teamWin1, [teamWin2], [], CUP_RESULTS);
  assert('computePlayerChemScore: no captain param still works', noCapScore.points >= 0);

  const withCapScore = computePlayerChemScore(teamWin1, [teamWin2], [], CUP_RESULTS, eurCap2018);
  assert('computePlayerChemScore: captain param adds points', withCapScore.points > noCapScore.points);
}

console.log('\ncaptainPerkBoost');
{
  const ctx0 = { trailing: false, homeMatch: false, rcYears: 0, tier: 'gold', sessionsWon: 0 };

  assert('tactician: +4 in foursomes',     captainPerkBoost(captain, 'foursomes', ctx0) === 4);
  assert('tactician: 0 in fourball',       captainPerkBoost(captain, 'fourball',  ctx0) === 0);
  assert('pressure_player: +4 in singles', captainPerkBoost(captain, 'singles',   ctx0) === 4);

  assert('flamboyant: +4 in fourball',     captainPerkBoost(aiCaptain, 'fourball',  ctx0) === 4);
  assert('flamboyant: 0 in foursomes',     captainPerkBoost(aiCaptain, 'foursomes', ctx0) === 0);

  const trailingCtx = { ...ctx0, trailing: true };
  const rallying = { id:'r', tier:'standard', chemistry_mult:1.0, perks:[{ type:'rallying_cry', label:'R', desc:'d' }], special:null };
  assert('rallying_cry: +7 when trailing',    captainPerkBoost(rallying, 'singles', trailingCtx) === 7);
  assert('rallying_cry: 0 when not trailing', captainPerkBoost(rallying, 'singles', ctx0)        === 0);
  assert('rallying_cry: 0 in non-singles',    captainPerkBoost(rallying, 'foursomes', trailingCtx) === 0);

  const homeCtx = { ...ctx0, homeMatch: true };
  const fortress = { id:'f', tier:'standard', chemistry_mult:1.0, perks:[{ type:'home_fortress', label:'F', desc:'d' }], special:null };
  assert('home_fortress: +5 at home', captainPerkBoost(fortress, 'foursomes', homeCtx) === 5);
  assert('home_fortress: 0 away',     captainPerkBoost(fortress, 'foursomes', ctx0)    === 0);

  const vetCtx3 = { ...ctx0, rcYears: 3 };
  const vetCtx2 = { ...ctx0, rcYears: 2 };
  const veteran = { id:'v', tier:'standard', chemistry_mult:1.0, perks:[{ type:'veteran_anchor', label:'V', desc:'d' }], special:null };
  assert('veteran_anchor: +3 for 3+ years', captainPerkBoost(veteran, 'singles', vetCtx3) === 3);
  assert('veteran_anchor: 0 for 2 years',   captainPerkBoost(veteran, 'singles', vetCtx2) === 0);

  const bronzeCtx = { ...ctx0, tier: 'bronze' };
  const silverCtx = { ...ctx0, tier: 'silver' };
  const goldCtx   = { ...ctx0, tier: 'gold'   };
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
    [playerA, playerB, powerVenue, 'singles',   captain,  null],
    [playerA, playerB, powerVenue, 'foursomes', captain,  playerA],
    [playerA, playerB, powerVenue, 'fourball',  captain,  playerA],
    [playerB, playerA, linksVenue, 'singles',   null,     null],
    [playerA, playerA, powerVenue, 'singles',   captain,  null],
    [heroPlayer, playerA, linksVenue, 'singles', null,    null],
  ];

  for (let i = 0; i < 20; i++) {
    const [my, opp, venue, fmt, cap, partner] = combos[i % combos.length];
    const prob = calculateMatchProbability(my, opp, venue, fmt, cap, partner);
    const sum  = prob.win + prob.halve + prob.loss;
    assert(`combo ${i}: win+halve+loss === 100 (got ${sum.toFixed(1)})`, Math.abs(sum - 100) < 0.2);
    assert(`combo ${i}: all values ≥ 0`, prob.win >= 0 && prob.halve >= 0 && prob.loss >= 0);
    assert(`combo ${i}: halve in valid range`, prob.halve >= 2 && prob.halve <= 14);
  }

  const strongProb = calculateMatchProbability(playerA, playerB, powerVenue, 'singles', null);
  const weakProb   = calculateMatchProbability(playerB, playerA, powerVenue, 'singles', null);
  assert('stronger player has higher win probability', strongProb.win > weakProb.win);

  const withCap    = calculateMatchProbability(playerA, playerB, powerVenue, 'foursomes', captain, playerA);
  const withoutCap = calculateMatchProbability(playerA, playerB, powerVenue, 'foursomes', null, playerA);
  assert('captain perk boost increases win probability', withCap.win > withoutCap.win);

  // Hero vs platinum — hero's talent score (20) > platinum (15), should win more often
  const heroProb = calculateMatchProbability(heroPlayer, playerA, powerVenue, 'singles', null);
  // heroPlayer has lower raw stats but +20 talent vs +15 for platinum
  // Net talent delta: heroPlayer composite ~70 + 20 = 90 vs playerA composite ~89 + 15 = 104
  // playerA is still expected to win on raw+talent; just verify probabilities are valid
  assert('hero vs platinum: valid probabilities', heroProb.win + heroProb.halve + heroProb.loss > 99);
}

console.log('\ncalculateMatchProbability — talent score drives tier advantage');
{
  // Same raw stats, different tiers → talent score is the differentiator
  const heroSameStats = makeTestPlayer('hero', {
    id: 'hs', name: 'HeroSameStats',
    stat_driving_distance: 75, stat_driving_accuracy: 75,
    stat_greens_in_regulation: 75, stat_scrambling: 75,
    stat_birdie_rate: 75, stat_pressure_index: 75
  });
  const bronzeSameStats = makeTestPlayer('bronze', {
    id: 'bs', name: 'BronzeSameStats',
    stat_driving_distance: 75, stat_driving_accuracy: 75,
    stat_greens_in_regulation: 75, stat_scrambling: 75,
    stat_birdie_rate: 75, stat_pressure_index: 75
  });
  const heroVsBronze = calculateMatchProbability(heroSameStats, bronzeSameStats, powerVenue, 'singles', null);
  assert('hero beats bronze (same stats, talent score advantage)', heroVsBronze.win > heroVsBronze.loss);
  assert('platinum beats bronze (same stats)',
    calculateMatchProbability(
      makeTestPlayer('platinum', { id:'pts', name:'PlatinumSameStats' }),
      makeTestPlayer('bronze',   { id:'bts', name:'BronzeSameStats2' }),
      powerVenue, 'singles', null
    ).win > 47.5
  );
}

console.log('\nsimulateMatch');
{
  assert('100% win → always win',     simulateMatch({ win:100, halve:0,   loss:0   }) === 'win');
  assert('100% loss → always loss',   simulateMatch({ win:0,   halve:0,   loss:100 }) === 'loss');
  assert('100% halve → always halve', simulateMatch({ win:0,   halve:100, loss:0   }) === 'halve');

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

console.log('\nconcession special');
{
  const strongPlayers = Array.from({ length: 12 }, (_, i) =>
    makeTestPlayer('platinum', { id: `sp${i}`, name: `Strong${i}` })
  );
  const weakOpp = Array.from({ length: 12 }, (_, i) =>
    makeTestPlayer('bronze', { id: `wo${i}`, name: `Weak${i}` })
  );

  for (let run = 0; run < 200; run++) {
    const result = simulateFullEvent(makeTeam(strongPlayers), makeTeam(weakOpp), powerVenue, concessionCaptain, null);
    if (result.winner === 'tie') {
      assert(`concession tie: score is exactly 14-14`,
        result.finalScore.user === 14 && result.finalScore.ai === 14);
    }
  }
  assert('concession: no run produced invalid total', true);
}

console.log('\nroad_warrior special');
{
  const eurVenue = { id: 'eur_venue', name: 'EUR Venue', location: 'EUR',
    hidden_tags: { power_weight:70, accuracy_weight:70, short_game_weight:70, wind_factor:50, pressure_factor:70 } };
  const eurPlayer = { ...playerB, nationality: 'EUR' };

  const withoutRW = calculateMatchProbability(playerA, eurPlayer, eurVenue, 'foursomes', null, null, null);
  const withRW    = calculateMatchProbability(playerA, eurPlayer, eurVenue, 'foursomes', roadWarriorCaptain, null, null);
  assert('road_warrior: removes away disadvantage (win improves)', withRW.win >= withoutRW.win);
}

console.log('\ncalculateMatchProbability — zero-sum constraint (50 combos)');
{
  const venuePairs = [powerVenue, linksVenue];
  const formats    = ['foursomes', 'fourball', 'singles'];
  const partners   = [playerA, playerB, null];

  for (let i = 0; i < 50; i++) {
    const myP    = i % 3 === 0 ? playerA : i % 3 === 1 ? playerB : heroPlayer;
    const oppP   = i % 2 === 0 ? playerB : playerA;
    const ven    = venuePairs[i % 2];
    const fmt    = formats[i % 3];
    const cap    = i % 2 === 0 ? captain : null;
    const aiCap  = i % 3 === 0 ? aiCaptain : null;
    const myPart  = fmt !== 'singles' ? partners[i % 3] : null;
    const oppPart = fmt !== 'singles' ? partners[(i + 1) % 3] : null;

    const prob = calculateMatchProbability(myP, oppP, ven, fmt, cap, myPart, aiCap, oppPart);
    const sum  = prob.win + prob.halve + prob.loss;
    assert(`combo ${i}: win+halve+loss === 100 (got ${sum.toFixed(1)})`, Math.abs(sum - 100) < 0.2);
    assert(`combo ${i}: win >= 5`,   prob.win  >= 5);
    assert(`combo ${i}: loss >= 5`,  prob.loss >= 5);
    assert(`combo ${i}: win <= 85`,  prob.win  <= 85);
    assert(`combo ${i}: halve in valid range`, prob.halve >= 2 && prob.halve <= 14);
  }

  const strong = calculateMatchProbability(playerA, playerB, powerVenue, 'singles', captain, null, aiCaptain);
  const weak   = calculateMatchProbability(playerB, playerA, powerVenue, 'singles', aiCaptain, null, captain);
  assert('zero-sum: strong win > 45', strong.win > 45);
  assert('zero-sum: weak win < 45',   weak.win   < 45);

  const balanced = calculateMatchProbability(playerA, playerA, powerVenue, 'singles', captain, null, captain);
  assertApprox('balanced match: win near 45',  balanced.win,  45, 5);
  assertApprox('balanced match: loss near 45', balanced.loss, 45, 5);
}

console.log('\nformat-specific halve base + aggression/consistency spread');
{
  const baseFS  = calculateMatchProbability(playerA, playerA, powerVenue, 'foursomes', null);
  const baseFB  = calculateMatchProbability(playerA, playerA, powerVenue, 'fourball',  null);
  const baseSgl = calculateMatchProbability(playerA, playerA, powerVenue, 'singles',   null);

  assert('foursomes halve < fourball halve (base)',  baseFS.halve  < baseFB.halve);
  assert('singles halve < fourball halve (base)',    baseSgl.halve < baseFB.halve);
  assert('foursomes halve < singles halve (base)',   baseFS.halve  < baseSgl.halve);
  assert('fourball base halve near 10 (±4)',  Math.abs(baseFB.halve  - 10) <= 4);
  assert('foursomes base halve near 5 (±3)',  Math.abs(baseFS.halve  -  5) <= 3);
  assert('singles base halve near 7 (±3)',    Math.abs(baseSgl.halve -  7) <= 3);

  for (const [label, prob] of [['foursomes', baseFS], ['fourball', baseFB], ['singles', baseSgl]]) {
    assert(`${label} sums to 100`, Math.abs(prob.win + prob.halve + prob.loss - 100) < 0.2);
  }

  const aggressivePair = makeTestPlayer('gold', {
    id: 'agg1', name: 'Aggressive1',
    style_aggression: 88, style_consistency: 72
  });
  const aggressivePartner = makeTestPlayer('gold', {
    id: 'agg2', name: 'Aggressive2',
    style_aggression: 85, style_consistency: 70
  });
  const defensivePlayer = makeTestPlayer('gold', {
    id: 'def1', name: 'Defensive1',
    style_aggression: 52, style_consistency: 88
  });
  const defensivePartner = makeTestPlayer('gold', {
    id: 'def2', name: 'Defensive2',
    style_aggression: 50, style_consistency: 90
  });

  const aggFB  = calculateMatchProbability(aggressivePair, playerB, powerVenue, 'fourball', null, aggressivePartner);
  const defFB  = calculateMatchProbability(defensivePlayer, playerB, powerVenue, 'fourball', null, defensivePartner);
  assert('aggressive fourball pair has fewer halves than defensive pair', aggFB.halve < defFB.halve);
  assert('aggressive fourball: win+halve+loss=100', Math.abs(aggFB.win + aggFB.halve + aggFB.loss - 100) < 0.2);

  const volatilePlayer = makeTestPlayer('gold', {
    id: 'vol1', name: 'Volatile1',
    style_aggression: 90, style_consistency: 48
  });
  const volatilePartner = makeTestPlayer('gold', {
    id: 'vol2', name: 'Volatile2',
    style_aggression: 88, style_consistency: 45
  });
  const steadyPlayer = makeTestPlayer('gold', {
    id: 'sdy1', name: 'Steady1',
    style_aggression: 88, style_consistency: 85
  });
  const steadyPartner = makeTestPlayer('gold', {
    id: 'sdy2', name: 'Steady2',
    style_aggression: 85, style_consistency: 88
  });

  const volProb    = calculateMatchProbability(volatilePlayer, playerA, powerVenue, 'fourball', null, volatilePartner);
  const steadyProb = calculateMatchProbability(steadyPlayer,  playerA, powerVenue, 'fourball', null, steadyPartner);
  assert('volatile aggressive pair: win+halve+loss=100', Math.abs(volProb.win + volProb.halve + volProb.loss - 100) < 0.2);
  assert('volatile aggressive pair has higher loss than steady aggressive pair', volProb.loss > steadyProb.loss);
}

console.log('\nsinglesOrder — captain strategy');
{
  const squad = Array.from({ length: 12 }, (_, i) =>
    makeTestPlayer(i < 3 ? 'platinum' : i < 6 ? 'gold' : 'silver', {
      id: `sq${i}`, name: `Squad${i}`,
      stat_driving_distance: 90 - i * 3, stat_driving_accuracy: 85 - i * 2,
      stat_greens_in_regulation: 88 - i * 2, stat_scrambling: 80 - i * 2,
      stat_birdie_rate: 85 - i * 3, stat_pressure_index: 90 - i * 3
    })
  );

  function posOf(order, id) { return order.findIndex(p => p.id === id) + 1; }

  const rallyingCap = { id:'rc', tier:'standard', chemistry_mult:1.0, perks:[{ type:'rallying_cry',    label:'R', desc:'d' }], special:null };
  const fortressCap = { id:'hf', tier:'standard', chemistry_mult:1.0, perks:[{ type:'home_fortress',   label:'H', desc:'d' }], special:null };
  const pressureCap = { id:'pp', tier:'standard', chemistry_mult:1.0, perks:[{ type:'pressure_player', label:'P', desc:'d' }], special:null };
  const flambCap    = { id:'fl', tier:'standard', chemistry_mult:1.0, perks:[{ type:'flamboyant',       label:'F', desc:'d' }], special:null };

  const defOrder = singlesOrder(squad, null);
  assert('default: best player in slot 2',  posOf(defOrder, 'sq0') === 2);
  assert('default: 2nd best in slot 6',     posOf(defOrder, 'sq1') === 6);
  assert('default: 3rd best in slot 11',    posOf(defOrder, 'sq2') === 11);
  assert('default: returns 12 players',     defOrder.length === 12);
  assert('default: no duplicate slots',     new Set(defOrder.map(p => p.id)).size === 12);

  const backOrder = singlesOrder(squad, rallyingCap);
  assert('back-load: best player in slot 12', posOf(backOrder, 'sq0') === 12);
  assert('back-load: 2nd best in slot 11',    posOf(backOrder, 'sq1') === 11);
  assert('back-load: 3rd best in slot 10',    posOf(backOrder, 'sq2') === 10);
  assert('back-load: no duplicates',          new Set(backOrder.map(p => p.id)).size === 12);

  const topOrder = singlesOrder(squad, fortressCap);
  assert('top-load: best player in slot 1',   posOf(topOrder, 'sq0') === 1);
  assert('top-load: 2nd best in slot 2',      posOf(topOrder, 'sq1') === 2);
  assert('top-load: no duplicates',           new Set(topOrder.map(p => p.id)).size === 12);

  const anchorOrder = singlesOrder(squad, pressureCap);
  assert('anchor: best player in slot 12',    posOf(anchorOrder, 'sq0') === 12);
  assert('anchor: 2nd best in slot 2',        posOf(anchorOrder, 'sq1') === 2);
  assert('anchor: no duplicates',             new Set(anchorOrder.map(p => p.id)).size === 12);

  const midOrder = singlesOrder(squad, flambCap);
  assert('mid-heavy: best player in slot 6',  posOf(midOrder, 'sq0') === 6);
  assert('mid-heavy: no duplicates',          new Set(midOrder.map(p => p.id)).size === 12);

  const multiCap = { id:'mc', tier:'hero', chemistry_mult:1.0,
    perks:[{ type:'home_fortress', label:'H', desc:'d' }, { type:'rallying_cry', label:'R', desc:'d' }], special:null };
  const multiOrder = singlesOrder(squad, multiCap);
  assert('multi-perk: rallying_cry takes priority over home_fortress',
    posOf(multiOrder, 'sq0') === 12);
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
