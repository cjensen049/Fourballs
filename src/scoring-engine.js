// scoring-engine.js — pure JS module, no UI dependencies

// ─── Composite score ──────────────────────────────────────────────────────────
function compositeScore(player) {
  const s = player.stats;
  return (s.driving_distance + s.driving_accuracy + s.greens_in_regulation +
          s.scrambling + s.birdie_rate + s.pressure_index) / 6;
}

// ─── Hero boost ───────────────────────────────────────────────────────────────
// Returns a deep copy with stats multiplied. Never mutates source.
function applyHeroBoost(player) {
  if (!player.hero_boost) return player;
  const p = JSON.parse(JSON.stringify(player));
  const m = player.hero_boost;
  const s = p.stats;
  s.driving_distance     = Math.min(99, Math.round(s.driving_distance     * m));
  s.driving_accuracy     = Math.min(99, Math.round(s.driving_accuracy     * m));
  s.greens_in_regulation = Math.min(99, Math.round(s.greens_in_regulation * m));
  s.scrambling           = Math.min(99, Math.round(s.scrambling           * m));
  s.birdie_rate          = Math.min(99, Math.round(s.birdie_rate          * m));
  s.pressure_index       = Math.min(99, Math.round(s.pressure_index       * m));
  return p;
}

// ─── Venue fit ────────────────────────────────────────────────────────────────
// Returns 0–100. Weighted average of how well player attributes match venue demands.
function calculateVenueFit(player, venue) {
  const ht = venue.hidden_tags;
  const st = player.style_tags;
  const s  = player.stats;
  const num =
    ht.power_weight      * st.power       +
    ht.accuracy_weight   * st.accuracy    +
    ht.short_game_weight * s.scrambling   +
    ht.wind_factor       * st.consistency +
    ht.pressure_factor   * s.pressure_index;
  const den =
    ht.power_weight + ht.accuracy_weight + ht.short_game_weight +
    ht.wind_factor  + ht.pressure_factor;
  return Math.min(100, Math.max(0, Math.round(num / den)));
}

// ─── Chemistry helpers ────────────────────────────────────────────────────────
function hasBond(p1, p2) {
  if (!p1 || !p2) return false;
  const b1 = p1.bonds || [];
  const b2 = p2.bonds || [];
  return b1.includes(p2.name) || b2.includes(p1.name);
}

function hasSharedVenueConnection(p1, p2, venue) {
  if (!venue || !p1 || !p2) return false;
  const v1 = p1.venue_connections || [];
  const v2 = p2.venue_connections || [];
  return v1.some(id => id === venue.id && v2.includes(id));
}

// ─── Pairing chemistry ────────────────────────────────────────────────────────
// Returns 0–100. Designed to spread ~40–90 so pairing decisions actually matter.
// Foursomes: weakest-link accuracy floor, consistency mismatch penalty, power bonus.
// Fourball:  avg aggression (not max) so a defensive player genuinely hurts the pair.
// Both: +5 bonus when both players have 3+ Ryder Cup appearances (year-filtered).
function calculatePairingChemistry(p1, p2, format, venue = null) {
  const st1 = p1.style_tags, st2 = p2.style_tags;
  const s1  = p1.stats,      s2  = p2.stats;

  let base;
  if (format === 'foursomes') {
    // Weakest-link accuracy: alternating shots punish the inaccurate player hard
    const accuracyFloor = Math.min(st1.accuracy, st2.accuracy);
    // Consistency gap > 5 is a liability — styles must mesh
    const conPenalty    = Math.max(0, Math.abs(st1.consistency - st2.consistency) - 5) * 2;
    // Power bonus: beneficial but not defining
    const powerBonus    = Math.max(0, ((st1.power + st2.power) / 2 - 65) * 0.3);
    const pressure      = (s1.pressure_index + s2.pressure_index) / 2;
    base = accuracyFloor * 0.40 + pressure * 0.25 + powerBonus - conPenalty * 0.30 + 15;
  } else if (format === 'fourball') {
    // Both players hunt independently — avg aggression matters, not just the peak
    const avgAgg  = (st1.aggression + st2.aggression) / 2;
    const avgBird = (s1.birdie_rate + s2.birdie_rate) / 2;
    const pressure = (s1.pressure_index + s2.pressure_index) / 2;
    base = avgAgg * 0.40 + avgBird * 0.35 + pressure * 0.25;
  } else {
    base = (s1.pressure_index + s2.pressure_index) / 2;
  }

  // Ryder Cup experience: count only years up to the player's card year (data stores full career)
  const rc1 = p1.ryder_cup_years ? p1.ryder_cup_years.filter(y => y <= (p1.year || 9999)).length : 0;
  const rc2 = p2.ryder_cup_years ? p2.ryder_cup_years.filter(y => y <= (p2.year || 9999)).length : 0;
  const rcBonus = (rc1 >= 3 && rc2 >= 3) ? 5 : 0;

  return Math.min(100, Math.max(0, Math.round(base + rcBonus)));
}

// ─── Captain perk boost ───────────────────────────────────────────────────────
// Returns the raw percentage boost from a captain's perks for a given format and context.
// ctx: { trailing, homeMatch, rcYears, tier, sessionsWon }
// Zero-sum: caller computes (myBoost - aiBoost) * 2 to add to totalSwing.
function captainPerkBoost(captain, format, ctx) {
  if (!captain || !captain.perks || !captain.perks.length) return 0;
  const c = ctx || {};
  let boost = 0;
  for (const perk of captain.perks) {
    switch (perk.type) {
      case 'tactician':        if (format === 'foursomes')                                   boost += 4; break;
      case 'flamboyant':       if (format === 'fourball')                                    boost += 4; break;
      case 'pressure_player':  if (format === 'singles')                                     boost += 4; break;
      case 'rallying_cry':     if (format === 'singles' && c.trailing)                       boost += 7; break;
      case 'home_fortress':    if (c.homeMatch)                                              boost += 5; break;
      case 'veteran_anchor':   if ((c.rcYears || 0) >= 3)                                    boost += 3; break;
      case 'rookie_whisperer': if (c.tier === 'bronze' || c.tier === 'silver')               boost += 3; break;
      case 'momentum':         if ((c.sessionsWon || 0) >= 2)                                boost += 3; break;
    }
  }
  return boost;
}

// ─── Match probability ────────────────────────────────────────────────────────
// Returns { win, halve, loss } summing to exactly 100.
// Zero-sum: each factor produces a swing; totalSwing/2 = delta applied to base 45/10/45.
// Positive totalSwing favors user. Cap ±30 → delta ±15 → userWin range 30–60%.
//
// matchCtx (optional): { userTrailing, aiTrailing, userSessionsWon, aiSessionsWon }
//   userTrailing/aiTrailing: boolean — whether that team is trailing entering this session
//   sessionsWon: how many sessions won so far (used for momentum perk)
function calculateMatchProbability(myPlayer, oppPlayer, venue, format, captain, myPartner = null, aiCaptain = null, oppPartner = null, matchCtx = {}) {
  const myP  = applyHeroBoost(myPlayer);
  const oppP = applyHeroBoost(oppPlayer);

  let totalSwing = 0;

  // 1. Talent delta — per 10-point composite gap, max ±9 full swing
  const talentGap = compositeScore(myP) - compositeScore(oppP);
  totalSwing += Math.min(9, Math.max(-9, talentGap / 10 * 3));

  // 2. Venue fit delta — max ±6 full swing
  const fitDiff = calculateVenueFit(myPlayer, venue) - calculateVenueFit(oppPlayer, venue);
  totalSwing += Math.min(6, Math.max(-6, fitDiff / 100 * 6));

  // 3. Format fit delta — max ±4 full swing
  const myFF  = (myPlayer.format_fit && myPlayer.format_fit[format])  || 75;
  const oppFF = (oppPlayer.format_fit && oppPlayer.format_fit[format]) || 75;
  totalSwing += Math.min(4, Math.max(-4, (myFF - oppFF) / 100 * 4));

  // 4. Pairing chemistry delta — team matches only, max ±6 full swing from style tags
  //    Named bond: +5% win swing (+10 before /2), shared venue connection: +3% (+6), stacked cap +7% (+14)
  if (format === 'foursomes' || format === 'fourball') {
    // Support both new chemistry_mult and old bonus.chemistry_multiplier
    const myCaptainMult  = (captain   && captain.chemistry_mult)   || (captain   && captain.bonus && captain.bonus.chemistry_multiplier)   || 1;
    const aiCaptainMult  = (aiCaptain && aiCaptain.chemistry_mult) || (aiCaptain && aiCaptain.bonus && aiCaptain.bonus.chemistry_multiplier) || 1;
    const myChem  = myPartner  ? Math.min(100, calculatePairingChemistry(myPlayer, myPartner, format, venue)  * myCaptainMult)  : 50;
    const oppChem = oppPartner ? Math.min(100, calculatePairingChemistry(oppPlayer, oppPartner, format, venue) * aiCaptainMult)  : 50;
    totalSwing += Math.min(10, Math.max(-10, (myChem - oppChem) / 100 * 10));

    // Bond/venue bonuses applied directly — bypasses chemistry scale cap but flows through ±30 total cap
    const myBondSwing  = Math.min(14,
      (myPartner  && hasBond(myPlayer,  myPartner)                            ? 10 : 0) +
      (myPartner  && hasSharedVenueConnection(myPlayer,  myPartner,  venue)  ?  6 : 0));
    const oppBondSwing = Math.min(14,
      (oppPartner && hasBond(oppPlayer, oppPartner)                           ? 10 : 0) +
      (oppPartner && hasSharedVenueConnection(oppPlayer, oppPartner, venue)  ?  6 : 0));
    totalSwing += (myBondSwing - oppBondSwing);
  }

  // 5. Captain perk delta — zero-sum, max ±16 full swing (±8% after halving)
  const homeMatch   = !!(venue && venue.location && myPlayer.nationality  && venue.location === myPlayer.nationality);
  const aiHomeMatch = !!(venue && venue.location && oppPlayer.nationality && venue.location === oppPlayer.nationality);
  const myRCYears   = myPlayer.ryder_cup_years  ? myPlayer.ryder_cup_years.filter(y  => y <= (myPlayer.year  || 9999)).length : 0;
  const aiRCYears   = oppPlayer.ryder_cup_years ? oppPlayer.ryder_cup_years.filter(y => y <= (oppPlayer.year || 9999)).length : 0;

  const myCtx = {
    trailing:    !!matchCtx.userTrailing,
    homeMatch,
    rcYears:     myRCYears,
    tier:        myPlayer.tier,
    sessionsWon: matchCtx.userSessionsWon || 0
  };
  const aiCtx = {
    trailing:    !!matchCtx.aiTrailing,
    homeMatch:   aiHomeMatch,
    rcYears:     aiRCYears,
    tier:        oppPlayer.tier,
    sessionsWon: matchCtx.aiSessionsWon || 0
  };

  const myCapBoost = captainPerkBoost(captain,   format, myCtx);
  const aiCapBoost = captainPerkBoost(aiCaptain, format, aiCtx);
  totalSwing += Math.min(16, Math.max(-16, (myCapBoost - aiCapBoost) * 2));

  // 6. Ryder Cup history delta — max ±3 full swing
  function rcRate(p) {
    const rc = p.ryder_cup_record;
    if (!rc || !rc.played) return 0.5;
    const tot = rc.won + rc.lost + rc.halved;
    return tot ? (rc.won + rc.halved * 0.5) / tot : 0.5;
  }
  totalSwing += Math.min(3, Math.max(-3, (rcRate(myPlayer) - rcRate(oppPlayer)) * 3));

  // 7. Home advantage — asymmetric; doubled so halving yields intended %.
  //    foursomes: ±10 swing → ±5%. fourball/singles: ±2 swing → ±1%.
  //    road_warrior special: negates the negative swing when playing away.
  const hasRoadWarrior = captain && captain.special && captain.special.type === 'road_warrior';
  if (venue && venue.location && myPlayer.nationality && oppPlayer.nationality) {
    if (venue.location === myPlayer.nationality && venue.location !== oppPlayer.nationality) {
      totalSwing += format === 'foursomes' ? 10 : 2;
    } else if (venue.location === oppPlayer.nationality && venue.location !== myPlayer.nationality) {
      if (!hasRoadWarrior) {
        totalSwing -= format === 'foursomes' ? 10 : 2;
      }
    }
  }

  // 8. Hero bonus special abilities — one-sided; doubled so halving preserves the stated %
  const hb = myPlayer.hero_bonus;
  if (hb) {
    if (hb.all_formats_boost)                                              totalSwing += hb.all_formats_boost * 2;
    if (hb.foursomes_boost && format === 'foursomes')                      totalSwing += hb.foursomes_boost   * 2;
    if (hb.fourball_boost  && format === 'fourball')                       totalSwing += hb.fourball_boost    * 2;
    if (hb.singles_boost   && format === 'singles')                        totalSwing += hb.singles_boost     * 2;
    if (hb.chemistry_boost && myPartner && format !== 'singles')           totalSwing += hb.chemistry_boost   * 2;
    if (venue && venue.location && myPlayer.nationality) {
      if (hb.home_boost && venue.location === myPlayer.nationality)        totalSwing += hb.home_boost * 2;
      if (hb.away_boost && venue.location !== myPlayer.nationality)        totalSwing += hb.away_boost * 2;
    }
  }
  const phb = myPartner && myPartner.hero_bonus;
  if (phb && phb.chemistry_boost && format !== 'singles') totalSwing += phb.chemistry_boost * 2;

  // Cap total swing — delta = swing/2
  totalSwing = Math.min(30, Math.max(-30, totalSwing));
  const delta = totalSwing / 2;

  // Format-specific base halve: foursomes 5% (volatile), fourball 10%, singles 7%
  const BASE_HALVE    = format === 'foursomes' ? 5 : format === 'singles' ? 7 : 10;
  const BASE_WIN_LOSS = (100 - BASE_HALVE) / 2;

  let win   = Math.max(5, Math.min(85, Math.round((BASE_WIN_LOSS + delta) * 10) / 10));
  let halve = BASE_HALVE;
  let loss  = Math.round((100 - win - halve) * 10) / 10;

  // Aggression/consistency spread modifier
  // Aggressive match → halve drops, freed points redistributed based on MY pair's consistency.
  // High consistency → freed points lean toward win. Low consistency → blow-up risk (lean toward loss).
  const _agg = p => (p && p.style_tags && p.style_tags.aggression) || 65;
  const _con = p => (p && p.style_tags && p.style_tags.consistency) || 65;

  const pairAgg    = myPartner  ? (_agg(myPlayer) + _agg(myPartner))  / 2 : _agg(myPlayer);
  const oppPairAgg = oppPartner ? (_agg(oppPlayer) + _agg(oppPartner)) / 2 : _agg(oppPlayer);
  const pairCon    = myPartner  ? (_con(myPlayer) + _con(myPartner))   / 2 : _con(myPlayer);
  const matchAgg   = (pairAgg + oppPairAgg) / 2;

  // halveShift > 0 = fewer halves (aggressive); < 0 = more halves (defensive)
  const halveShift = Math.min(4, Math.max(-3, Math.round((matchAgg - 65) / 7)));
  const newHalve   = Math.max(2, Math.min(halve + 3, halve - halveShift));
  const freed      = halve - newHalve;
  halve = newHalve;

  if (freed !== 0) {
    const conBias = Math.min(0.25, Math.max(-0.25, (pairCon - 65) / 50));
    win  = Math.round((win  + freed * (0.5 + conBias)) * 10) / 10;
    loss = Math.round((loss + freed * (0.5 - conBias)) * 10) / 10;
  }

  // Blow-up risk: aggressive + inconsistent pair → additional loss exposure
  if (pairAgg > 72 && pairCon < 60) {
    const blowUp = Math.min(3, Math.round((pairAgg - 72) / 18 * (60 - pairCon) / 10));
    win  = Math.round((win  - blowUp) * 10) / 10;
    loss = Math.round((loss + blowUp) * 10) / 10;
  }

  // Clamp and re-derive loss to guarantee win+halve+loss = 100
  win  = Math.max(5, Math.min(85, win));
  loss = Math.round((100 - win - halve) * 10) / 10;
  if (loss < 5) { loss = 5; win = Math.round((100 - loss - halve) * 10) / 10; }

  // Hero singles_loss_ceiling — applied after all modifiers
  if (format === 'singles' && hb && hb.singles_loss_ceiling != null && loss > hb.singles_loss_ceiling) {
    const excess = loss - hb.singles_loss_ceiling;
    loss = hb.singles_loss_ceiling;
    win  = Math.round((win + excess) * 10) / 10;
    loss = Math.round((100 - win - halve) * 10) / 10;
  }

  return { win, halve, loss };
}

// ─── Simulate one match ───────────────────────────────────────────────────────
function simulateMatch(probability) {
  const r = Math.random() * 100;
  if (r < probability.win)                     return 'win';
  if (r < probability.win + probability.halve) return 'halve';
  return 'loss';
}

// ─── Pairings (utility — kept for external use / tests) ──────────────────────
function _makePairings(players) {
  const [F1, F2, F3, F4] = players;
  return [
    { p1: F1, p2: F2 },
    { p1: F1, p2: F3 },
    { p1: F3, p2: F4 },
    { p1: F2, p2: F3 }
  ];
}

function generateFoursomePairings(players) { return _makePairings(players); }
function generateFourballPairings(players)  { return _makePairings(players); }

// ─── Singles order ────────────────────────────────────────────────────────────
// Captain perk determines singles deployment strategy.
// slots[i] = 0-indexed position assigned to the i-th ranked player.
function _hasPerk(captain, type) {
  return !!(captain && captain.perks && captain.perks.some(p => p.type === type));
}

function singlesOrder(players, captain = null) {
  const sorted = [...players].sort((a, b) => compositeScore(b) - compositeScore(a));
  const order  = new Array(12);

  let slots;
  if (_hasPerk(captain, 'rallying_cry')) {
    // Back-load: best 4 close it out — pairs with rallying_cry +7% when trailing
    slots = [11, 10, 9, 8, 0, 1, 2, 3, 4, 5, 6, 7];
  } else if (_hasPerk(captain, 'home_fortress')) {
    // Top-load: front the best players and build early momentum
    slots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  } else if (_hasPerk(captain, 'pressure_player')) {
    // Anchor: best player closes at 12, next two provide bookends at 2 and 7
    slots = [11, 1, 6, 0, 2, 3, 4, 5, 7, 8, 9, 10];
  } else if (_hasPerk(captain, 'flamboyant')) {
    // Mid-heavy: best 3 cluster in positions 4, 6, 8 — dominate the critical middle
    slots = [5, 3, 7, 0, 1, 2, 4, 6, 8, 9, 10, 11];
  } else {
    // Default stagger: best→2nd, 2nd best→6th, 3rd→11th, fill the rest
    slots = [1, 5, 10, 0, 2, 3, 4, 6, 7, 8, 9, 11];
  }

  sorted.forEach((p, i) => { order[slots[i]] = p; });
  return order;
}

// ─── Simulate full event ──────────────────────────────────────────────────────
// myTeam / opponentTeam shape:
//   { fridayAMPairs, saturdayAMPairs: foursomes [[p1,p2]×4]
//     fridayPMPairs, saturdayPMPairs: fourball  [[p1,p2]×4]
//     allPlayers: [×12] }
// Players with 3+ team match appearances are fatigued in singles (−2%/+2%).
// Concession special: if user captain has it, user was leading entering singles,
// but lost overall — result is clamped to 14-14 tie.
function simulateFullEvent(myTeam, opponentTeam, venue, myCaptain, aiCaptain) {
  function boostPair([p1, p2]) {
    return { p1: p1 ? applyHeroBoost(p1) : null, p2: p2 ? applyHeroBoost(p2) : null };
  }

  const myFriAM  = myTeam.fridayAMPairs.map(boostPair);
  const myFriPM  = myTeam.fridayPMPairs.map(boostPair);
  const mySatAM  = myTeam.saturdayAMPairs.map(boostPair);
  const mySatPM  = myTeam.saturdayPMPairs.map(boostPair);
  const myAll    = myTeam.allPlayers.map(applyHeroBoost);

  const oppFriAM  = opponentTeam.fridayAMPairs.map(boostPair);
  const oppFriPM  = opponentTeam.fridayPMPairs.map(boostPair);
  const oppSatAM  = opponentTeam.saturdayAMPairs.map(boostPair);
  const oppSatPM  = opponentTeam.saturdayPMPairs.map(boostPair);
  const oppAll    = opponentTeam.allPlayers.map(applyHeroBoost);

  function countAppearances(team) {
    const counts = {};
    const allPairs = [
      ...team.fridayAMPairs, ...team.fridayPMPairs,
      ...team.saturdayAMPairs, ...team.saturdayPMPairs
    ];
    for (const pair of allPairs) {
      for (const p of pair) {
        if (p) counts[p.id] = (counts[p.id] || 0) + 1;
      }
    }
    return counts;
  }
  const myAppearances  = countAppearances(myTeam);
  const oppAppearances = countAppearances(opponentTeam);
  const myFatiguedIds  = new Set(Object.entries(myAppearances).filter(([, c]) => c >= 3).map(([id]) => id));
  const oppFatiguedIds = new Set(Object.entries(oppAppearances).filter(([, c]) => c >= 3).map(([id]) => id));

  const mySingles  = singlesOrder(myAll,  myCaptain);
  const oppSingles = singlesOrder(oppAll, aiCaptain);

  const scores = { user: 0, ai: 0 };
  let userSessionsWon = 0, aiSessionsWon = 0;

  function addPoints(result) {
    if      (result === 'win')   scores.user += 1;
    else if (result === 'halve') { scores.user += 0.5; scores.ai += 0.5; }
    else                          scores.ai   += 1;
  }

  function playTeamSession(myPairs, oppPairs, format, sessionCtx) {
    const results = [];
    let sUser = 0, sAI = 0;
    for (let i = 0; i < myPairs.length; i++) {
      const myPair  = myPairs[i];
      const oppPair = oppPairs[i];
      if (!myPair.p1 || !oppPair || !oppPair.p1) continue;
      const myProb = calculateMatchProbability(myPair.p1, oppPair.p1, venue, format, myCaptain, myPair.p2, aiCaptain, oppPair.p2, sessionCtx);
      const result = simulateMatch(myProb);
      addPoints(result);
      if      (result === 'win')   sUser++;
      else if (result === 'halve') { sUser += 0.5; sAI += 0.5; }
      else                          sAI++;
      results.push({
        myPlayers:  [myPair.p1.name,  myPair.p2 ? myPair.p2.name : null],
        oppPlayers: [oppPair.p1.name, oppPair.p2 ? oppPair.p2.name : null],
        format, result,
        points: result === 'win' ? 1 : result === 'halve' ? 0.5 : 0
      });
    }
    if      (sUser > sAI) userSessionsWon++;
    else if (sAI > sUser) aiSessionsWon++;
    return results;
  }

  // Sessions run in order — context reflects live score/sessions at each point
  const fridayAM = playTeamSession(myFriAM, oppFriAM, 'foursomes', {
    userSessionsWon: 0, aiSessionsWon: 0,
    userTrailing: false, aiTrailing: false
  });
  const fridayPM = playTeamSession(myFriPM, oppFriPM, 'fourball', {
    userSessionsWon, aiSessionsWon,
    userTrailing: scores.user < scores.ai, aiTrailing: scores.ai < scores.user
  });
  const saturdayAM = playTeamSession(mySatAM, oppSatAM, 'foursomes', {
    userSessionsWon, aiSessionsWon,
    userTrailing: scores.user < scores.ai, aiTrailing: scores.ai < scores.user
  });
  const saturdayPM = playTeamSession(mySatPM, oppSatPM, 'fourball', {
    userSessionsWon, aiSessionsWon,
    userTrailing: scores.user < scores.ai, aiTrailing: scores.ai < scores.user
  });

  const preSinglesUser = scores.user;
  const preSinglesAI   = scores.ai;

  const singlesCtx = {
    userSessionsWon, aiSessionsWon,
    userTrailing: preSinglesUser < preSinglesAI,
    aiTrailing:   preSinglesAI   < preSinglesUser
  };

  const sunday = mySingles.map((myP, i) => {
    const oppP = oppSingles[i];
    let prob = calculateMatchProbability(myP, oppP, venue, 'singles', myCaptain, null, aiCaptain, null, singlesCtx);

    const isFatigued = myFatiguedIds.has(myP.id);
    const isImmune   = myP.hero_bonus && myP.hero_bonus.fatigue_immune;
    if (isFatigued && !isImmune) {
      prob = {
        win:   Math.max(0,   Math.round((prob.win   - 2) * 10) / 10),
        halve: prob.halve,
        loss:  Math.min(100, Math.round((prob.loss  + 2) * 10) / 10)
      };
    }

    const isOppFatigued = oppFatiguedIds.has(oppP.id);
    const isOppImmune   = oppP.hero_bonus && oppP.hero_bonus.fatigue_immune;
    if (isOppFatigued && !isOppImmune) {
      prob = {
        win:   Math.min(100, Math.round((prob.win   + 2) * 10) / 10),
        halve: prob.halve,
        loss:  Math.max(0,   Math.round((prob.loss  - 2) * 10) / 10)
      };
    }

    const result = simulateMatch(prob);
    addPoints(result);
    return {
      myPlayers:   [myP.name],
      oppPlayers:  [oppP.name],
      format:      'singles',
      result,
      points:      result === 'win' ? 1 : result === 'halve' ? 0.5 : 0,
      matchNumber: i + 1,
      fatigued:    isFatigued && !isImmune,
      oppFatigued: isOppFatigued && !isOppImmune
    };
  });

  // Concession special: user was leading entering singles but ended up losing → clamp to tie
  const hasConcession = myCaptain && myCaptain.special && myCaptain.special.type === 'concession';
  if (hasConcession && preSinglesUser > preSinglesAI && scores.ai > scores.user) {
    scores.user = 14;
    scores.ai   = 14;
  }

  const winner =
    scores.user > 14 ? 'user' :
    scores.ai   > 14 ? 'ai'   : 'tie';

  return {
    sessions:    { fridayAM, fridayPM, saturdayAM, saturdayPM, sunday },
    finalScore:  { user: scores.user, ai: scores.ai },
    totalPoints: scores.user + scores.ai,
    winner
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    compositeScore,
    applyHeroBoost,
    calculateVenueFit,
    hasBond,
    hasSharedVenueConnection,
    calculatePairingChemistry,
    captainPerkBoost,
    calculateMatchProbability,
    simulateMatch,
    singlesOrder,
    generateFoursomePairings,
    generateFourballPairings,
    simulateFullEvent
  };
}
