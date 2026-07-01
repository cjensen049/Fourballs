// scoring-engine.js — pure JS module, no UI dependencies

// ─── Talent score (tier → baseline match advantage) ──────────────────────────
const _TALENT = { hero: 20, platinum: 15, gold: 10, silver: 7, bronze: 3 };
function getTalentScore(tier) { return _TALENT[tier] || 7; }

// ─── Composite score ──────────────────────────────────────────────────────────
function compositeScore(player) {
  return (player.stat_driving_distance + player.stat_driving_accuracy +
          player.stat_greens_in_regulation + player.stat_scrambling +
          player.stat_birdie_rate + player.stat_pressure_index) / 6;
}

// ─── Venue fit ────────────────────────────────────────────────────────────────
function calculateVenueFit(player, venue) {
  const ht  = venue.hidden_tags;
  const num =
    ht.power_weight      * player.style_power       +
    ht.accuracy_weight   * player.style_accuracy    +
    ht.short_game_weight * player.stat_scrambling   +
    ht.wind_factor       * player.style_consistency +
    ht.pressure_factor   * player.stat_pressure_index;
  const den = ht.power_weight + ht.accuracy_weight + ht.short_game_weight +
              ht.wind_factor  + ht.pressure_factor;
  return Math.min(100, Math.max(0, Math.round(num / den)));
}

// ─── Chemistry ────────────────────────────────────────────────────────────────
// Returns 0–20. Two pillars:
//   Pillar 1 — Stat Complementarity (0–10): bigger spread across style dimensions
//              = more complementary skill sets.
//   Pillar 2 — Shared History (0–10): teammates on real Ryder Cup rosters
//              (via made_team==true rows), with bonuses for winning together and
//              repeated partnerships.
// allPlayers: full multi-year player list (needed for shared history lookup).
// cupResults: { "year": "NAT" } map.
// NOTE: in-match effect is not yet wired into calculateMatchProbability —
//   this score is used for pairing decisions and display only.
function computeChemistry(p1, p2, allPlayers, cupResults) {
  if (!p1 || !p2 || p1.name === p2.name) return 0;

  // Pillar 1 — Stat Complementarity
  const diffs = [
    Math.abs(p1.style_power               - p2.style_power),
    Math.abs(p1.style_accuracy            - p2.style_accuracy),
    Math.abs(p1.style_aggression          - p2.style_aggression),
    Math.abs(p1.style_consistency         - p2.style_consistency),
    Math.abs(p1.style_match_play_affinity - p2.style_match_play_affinity),
  ];
  const avgDiff        = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const complementarity = Math.min(10, avgDiff / 4);

  // Pillar 2 — Shared History
  const aYears = new Set(
    (allPlayers || []).filter(p => p.name === p1.name && p.made_team === true).map(p => p.year)
  );
  const bYears = new Set(
    (allPlayers || []).filter(p => p.name === p2.name && p.made_team === true).map(p => p.year)
  );
  const sharedYears = [...aYears].filter(y => bYears.has(y));

  let history = 0;
  if (sharedYears.length > 0) {
    history = 4;
    const sharedNat  = p1.nationality;
    const cupRef     = cupResults || {};
    const wonTogether = sharedYears.some(y => cupRef[String(y)] === sharedNat);
    if (wonTogether) history += 3;
    history += Math.min(3, sharedYears.length - 1);
    history  = Math.min(10, history);
  }

  return Math.min(20, Math.round(complementarity + history));
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
      case 'tactician':        if (format === 'foursomes')                             boost += 4; break;
      case 'flamboyant':       if (format === 'fourball')                              boost += 4; break;
      case 'pressure_player':  if (format === 'singles')                               boost += 4; break;
      case 'rallying_cry':     if (format === 'singles' && c.trailing)                 boost += 7; break;
      case 'home_fortress':    if (c.homeMatch)                                        boost += 5; break;
      case 'veteran_anchor':   if ((c.rcYears || 0) >= 3)                              boost += 3; break;
      case 'rookie_whisperer': if (c.tier === 'bronze' || c.tier === 'silver')         boost += 3; break;
      case 'momentum':         if ((c.sessionsWon || 0) >= 2)                          boost += 3; break;
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
function calculateMatchProbability(myPlayer, oppPlayer, venue, format, captain, myPartner = null, aiCaptain = null, oppPartner = null, matchCtx = {}) {
  let totalSwing = 0;

  // 1. Talent delta — composite stats + tier talent score, max ±9 full swing
  const myTalent  = compositeScore(myPlayer)  + getTalentScore(myPlayer.tier);
  const oppTalent = compositeScore(oppPlayer) + getTalentScore(oppPlayer.tier);
  totalSwing += Math.min(9, Math.max(-9, (myTalent - oppTalent) / 10 * 3));

  // 2. Venue fit delta — max ±6 full swing
  const fitDiff = calculateVenueFit(myPlayer, venue) - calculateVenueFit(oppPlayer, venue);
  totalSwing += Math.min(6, Math.max(-6, fitDiff / 100 * 6));

  // 3. Format fit delta — max ±4 full swing
  const FIT = { foursomes: 'fit_foursomes', fourball: 'fit_fourball', singles: 'fit_singles' };
  const myFF  = myPlayer[FIT[format]]  || 75;
  const oppFF = oppPlayer[FIT[format]] || 75;
  totalSwing += Math.min(4, Math.max(-4, (myFF - oppFF) / 100 * 4));

  // 4. Chemistry — in-match effect not yet defined; wired into pairing/display only.
  //    Placeholder zero; revisit after balance design.

  // 5. Captain perk delta — zero-sum, max ±16 full swing (±8% after halving)
  const homeMatch   = !!(venue && venue.location && myPlayer.nationality  && venue.location === myPlayer.nationality);
  const aiHomeMatch = !!(venue && venue.location && oppPlayer.nationality && venue.location === oppPlayer.nationality);
  const myRCYears   = myPlayer.ryder_cup_years
    ? myPlayer.ryder_cup_years.filter(y => parseInt(y) <= (myPlayer.year  || 9999)).length : 0;
  const aiRCYears   = oppPlayer.ryder_cup_years
    ? oppPlayer.ryder_cup_years.filter(y => parseInt(y) <= (oppPlayer.year || 9999)).length : 0;

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
    if (!p.rc_played) return 0.5;
    const tot = (p.rc_won || 0) + (p.rc_lost || 0) + (p.rc_halved || 0);
    return tot ? ((p.rc_won || 0) + (p.rc_halved || 0) * 0.5) / tot : 0.5;
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
  const _agg = p => (p && p.style_aggression)   || 65;
  const _con = p => (p && p.style_consistency)  || 65;

  const pairAgg    = myPartner  ? (_agg(myPlayer) + _agg(myPartner))   / 2 : _agg(myPlayer);
  const oppPairAgg = oppPartner ? (_agg(oppPlayer) + _agg(oppPartner)) / 2 : _agg(oppPlayer);
  const pairCon    = myPartner  ? (_con(myPlayer) + _con(myPartner))   / 2 : _con(myPlayer);
  const matchAgg   = (pairAgg + oppPairAgg) / 2;

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

  return { win, halve, loss };
}

// ─── Simulate one match ───────────────────────────────────────────────────────
function simulateMatch(probability) {
  const r = Math.random() * 100;
  if (r < probability.win)                     return 'win';
  if (r < probability.win + probability.halve) return 'halve';
  return 'loss';
}

// ─── Singles order ────────────────────────────────────────────────────────────
function _hasPerk(captain, type) {
  return !!(captain && captain.perks && captain.perks.some(p => p.type === type));
}

function singlesOrder(players, captain = null) {
  const sorted = [...players].sort((a, b) => compositeScore(b) - compositeScore(a));
  const order  = new Array(12);

  let slots;
  if (_hasPerk(captain, 'rallying_cry')) {
    slots = [11, 10, 9, 8, 0, 1, 2, 3, 4, 5, 6, 7];
  } else if (_hasPerk(captain, 'home_fortress')) {
    slots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  } else if (_hasPerk(captain, 'pressure_player')) {
    slots = [11, 1, 6, 0, 2, 3, 4, 5, 7, 8, 9, 10];
  } else if (_hasPerk(captain, 'flamboyant')) {
    slots = [5, 3, 7, 0, 1, 2, 4, 6, 8, 9, 10, 11];
  } else {
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
// Players with 4+ team match appearances are fatigued in singles (−2%/+2%).
// Concession special: if user captain has it, user was leading entering singles,
// but lost overall — result is clamped to 14-14 tie.
function simulateFullEvent(myTeam, opponentTeam, venue, myCaptain, aiCaptain) {
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
  const myFatiguedIds  = new Set(Object.entries(myAppearances).filter(([, c]) => c >= 4).map(([id]) => id));
  const oppFatiguedIds = new Set(Object.entries(oppAppearances).filter(([, c]) => c >= 4).map(([id]) => id));

  const mySingles  = singlesOrder(myTeam.allPlayers,         myCaptain);
  const oppSingles = singlesOrder(opponentTeam.allPlayers,   aiCaptain);

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
      const [myP1, myP2]   = myPairs[i];
      const [oppP1, oppP2] = oppPairs[i];
      if (!myP1 || !oppP1) continue;
      const myProb = calculateMatchProbability(myP1, oppP1, venue, format, myCaptain, myP2, aiCaptain, oppP2, sessionCtx);
      const result = simulateMatch(myProb);
      addPoints(result);
      if      (result === 'win')   sUser++;
      else if (result === 'halve') { sUser += 0.5; sAI += 0.5; }
      else                          sAI++;
      results.push({
        myPlayers:  [myP1.name,  myP2  ? myP2.name  : null],
        oppPlayers: [oppP1.name, oppP2 ? oppP2.name : null],
        format, result,
        points: result === 'win' ? 1 : result === 'halve' ? 0.5 : 0
      });
    }
    if      (sUser > sAI) userSessionsWon++;
    else if (sAI > sUser) aiSessionsWon++;
    return results;
  }

  const fridayAM = playTeamSession(myTeam.fridayAMPairs, opponentTeam.fridayAMPairs, 'foursomes', {
    userSessionsWon: 0, aiSessionsWon: 0,
    userTrailing: false, aiTrailing: false
  });
  const fridayPM = playTeamSession(myTeam.fridayPMPairs, opponentTeam.fridayPMPairs, 'fourball', {
    userSessionsWon, aiSessionsWon,
    userTrailing: scores.user < scores.ai, aiTrailing: scores.ai < scores.user
  });
  const saturdayAM = playTeamSession(myTeam.saturdayAMPairs, opponentTeam.saturdayAMPairs, 'foursomes', {
    userSessionsWon, aiSessionsWon,
    userTrailing: scores.user < scores.ai, aiTrailing: scores.ai < scores.user
  });
  const saturdayPM = playTeamSession(myTeam.saturdayPMPairs, opponentTeam.saturdayPMPairs, 'fourball', {
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
    if (isFatigued) {
      prob = {
        win:   Math.max(0,   Math.round((prob.win   - 2) * 10) / 10),
        halve: prob.halve,
        loss:  Math.min(100, Math.round((prob.loss  + 2) * 10) / 10)
      };
    }

    const isOppFatigued = oppFatiguedIds.has(oppP.id);
    if (isOppFatigued) {
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
      fatigued:    isFatigued,
      oppFatigued: isOppFatigued
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
    getTalentScore,
    compositeScore,
    calculateVenueFit,
    computeChemistry,
    captainPerkBoost,
    calculateMatchProbability,
    simulateMatch,
    singlesOrder,
    simulateFullEvent
  };
}
