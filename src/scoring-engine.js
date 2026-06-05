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

// ─── Pairing chemistry ────────────────────────────────────────────────────────
// Returns 0–100.
// Foursomes: rewards accuracy, complementary power/accuracy, similar consistency.
// Fourball:  rewards at least one highly aggressive birdie-hunter.
function calculatePairingChemistry(p1, p2, format) {
  const st1 = p1.style_tags, st2 = p2.style_tags;
  const s1  = p1.stats,      s2  = p2.stats;

  if (format === 'foursomes') {
    const accuracy    = (st1.accuracy + st2.accuracy) / 2;
    const complement  = (Math.max(st1.power, st2.power) + Math.max(st1.accuracy, st2.accuracy)) / 2;
    const consistency = Math.max(0, 100 - Math.abs(st1.consistency - st2.consistency));
    const pressure    = (s1.pressure_index + s2.pressure_index) / 2;
    return Math.min(100, Math.max(0, Math.round(
      accuracy * 0.30 + complement * 0.30 + consistency * 0.20 + pressure * 0.20
    )));
  }

  if (format === 'fourball') {
    const maxAgg  = Math.max(st1.aggression, st2.aggression);
    const avgBird = (s1.birdie_rate + s2.birdie_rate) / 2;
    const pressure = (s1.pressure_index + s2.pressure_index) / 2;
    return Math.min(100, Math.max(0, Math.round(
      maxAgg * 0.45 + avgBird * 0.35 + pressure * 0.20
    )));
  }

  return Math.round((s1.pressure_index + s2.pressure_index) / 2);
}

// ─── Match probability ────────────────────────────────────────────────────────
// Returns { win, halve, loss } summing to exactly 100.
// captain = MY captain object (or null). myPartner = null for singles.
function calculateMatchProbability(myPlayer, oppPlayer, venue, format, captain, myPartner = null) {
  let adj = 0;

  // 1. Talent delta — 4% per 10-point composite gap, cap ±15%
  const delta = compositeScore(myPlayer) - compositeScore(oppPlayer);
  adj += Math.min(15, Math.max(-15, delta * 0.4));

  // 2. Venue fit — ±5%
  const fitDiff = calculateVenueFit(myPlayer, venue) - calculateVenueFit(oppPlayer, venue);
  adj += Math.min(5, Math.max(-5, fitDiff * 0.1));

  // 3. Format fit — ±3%
  const ff = (myPlayer.format_fit && myPlayer.format_fit[format]) || 75;
  adj += Math.min(3, Math.max(-3, (ff - 75) / 25 * 3));

  // 4. Pairing chemistry — team matches only, ±4%
  if (myPartner && (format === 'foursomes' || format === 'fourball')) {
    let chem = calculatePairingChemistry(myPlayer, myPartner, format);
    // Apply captain chemistry multiplier before probability calc
    if (captain && captain.bonus && captain.bonus.chemistry_multiplier) {
      chem = Math.min(100, chem * captain.bonus.chemistry_multiplier);
    }
    adj += Math.min(4, Math.max(-4, (chem - 65) / 35 * 4));
  }

  // 5. Captain modifier — flat format boost, included in cap
  if (captain && captain.bonus) {
    const boost =
      format === 'foursomes' ? captain.bonus.foursomes_boost :
      format === 'fourball'  ? captain.bonus.fourball_boost  :
      captain.bonus.singles_boost;
    adj += (boost || 0);
  }

  // 6. Ryder Cup history — ±4%
  const rc = myPlayer.ryder_cup_record;
  if (rc && rc.played) {
    const total = rc.won + rc.lost + rc.halved;
    if (total > 0) {
      const rate = (rc.won + rc.halved * 0.5) / total;
      adj += Math.min(4, Math.max(-4, (rate - 0.5) * 8));
    }
  }

  // 7. Home court advantage — +5% foursomes, +1% fourball/singles when at home venue
  if (venue && venue.location && myPlayer.nationality) {
    if (venue.location === myPlayer.nationality) {
      if      (format === 'foursomes') adj += 5;
      else if (format === 'fourball')  adj += 1;
      else if (format === 'singles')   adj += 1;
    }
  }

  // 8. Hero bonus — player's own bonuses
  const hb = myPlayer.hero_bonus;
  if (hb) {
    if (hb.all_formats_boost) adj += hb.all_formats_boost;
    if (hb.foursomes_boost && format === 'foursomes') adj += hb.foursomes_boost;
    if (hb.fourball_boost  && format === 'fourball')  adj += hb.fourball_boost;
    if (hb.singles_boost   && format === 'singles')   adj += hb.singles_boost;
    if (venue && venue.location && myPlayer.nationality) {
      if (hb.home_boost && venue.location === myPlayer.nationality) adj += hb.home_boost;
      if (hb.away_boost && venue.location !== myPlayer.nationality) adj += hb.away_boost;
    }
    // Chemistry bonus applied when paired in team formats
    if (hb.chemistry_boost && myPartner && (format === 'foursomes' || format === 'fourball')) {
      adj += hb.chemistry_boost;
    }
  }

  // 8b. Partner's chemistry bonus also lifts this pair
  const phb = myPartner && myPartner.hero_bonus;
  if (phb && phb.chemistry_boost && (format === 'foursomes' || format === 'fourball')) {
    adj += phb.chemistry_boost;
  }

  // Cap total adjustment at ±25%
  adj = Math.min(25, Math.max(-25, adj));

  // Base: Win 45% / Halve 10% / Loss 45%
  let win   = 45 + adj;
  let halve = 10;
  let loss  = 45 - adj;

  // Normalize to exactly 100 (handles floating point drift)
  const sum = win + halve + loss;
  win   = Math.round(win   / sum * 1000) / 10;
  halve = Math.round(halve / sum * 1000) / 10;
  loss  = Math.round(loss  / sum * 1000) / 10;
  loss  = Math.round((100 - win - halve) * 10) / 10;

  // Tiger-style singles_loss_ceiling: applied after normalization
  if (format === 'singles' && hb && hb.singles_loss_ceiling != null && loss > hb.singles_loss_ceiling) {
    const excess = loss - hb.singles_loss_ceiling;
    loss  = hb.singles_loss_ceiling;
    win   = Math.round((win + excess) * 10) / 10;
    loss  = Math.round((100 - win - halve) * 10) / 10;
  }

  return { win, halve, loss };
}

// ─── Simulate one match ───────────────────────────────────────────────────────
function simulateMatch(probability) {
  const r = Math.random() * 100;
  if (r < probability.win)                    return 'win';
  if (r < probability.win + probability.halve) return 'halve';
  return 'loss';
}

// ─── Pairings (utility — kept for external use / tests) ──────────────────────
// Structure: F1+F2, F1+F3, F3+F4, F2+F3
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
// Sort by composite score, then distribute: best in slots 1, 6, 12 (captain logic)
function _singlesOrder(players) {
  const sorted = [...players].sort((a, b) => compositeScore(b) - compositeScore(a));
  const order  = new Array(12);
  // Slot mapping: sorted rank → match position (0-indexed)
  const slots  = [0, 5, 11, 1, 6, 10, 2, 7, 9, 3, 4, 8];
  sorted.forEach((p, i) => { order[slots[i]] = p; });
  return order;
}

// ─── Simulate full event ──────────────────────────────────────────────────────
// myTeam / opponentTeam shape:
//   { foursomesPairs: [[p1,p2],...×4], fourballPairs: [[p1,p2],...×4], allPlayers: [...×12] }
// Same pairings play both AM and PM sessions for their format.
// Players in BOTH foursomesPairs and fourballPairs take a -2% fatigue penalty in singles.
// Returns: { sessions, finalScore, totalPoints, winner }
function simulateFullEvent(myTeam, opponentTeam, venue, myCaptain, aiCaptain) {
  // Apply hero boosts to pairs — never mutate source data
  function boostPair([p1, p2]) {
    return {
      p1: p1 ? applyHeroBoost(p1) : null,
      p2: p2 ? applyHeroBoost(p2) : null
    };
  }

  const myFs   = myTeam.foursomesPairs.map(boostPair);
  const myFb   = myTeam.fourballPairs.map(boostPair);
  const myAll  = myTeam.allPlayers.map(applyHeroBoost);
  const oppFs  = opponentTeam.foursomesPairs.map(boostPair);
  const oppFb  = opponentTeam.fourballPairs.map(boostPair);
  const oppAll = opponentTeam.allPlayers.map(applyHeroBoost);

  // Players in both formats play 5 matches — -2% win probability in singles
  const myFsIds        = new Set(myTeam.foursomesPairs.flat().filter(Boolean).map(p => p.id));
  const myFbIds        = new Set(myTeam.fourballPairs.flat().filter(Boolean).map(p => p.id));
  const myFatiguedIds  = new Set([...myFsIds].filter(id => myFbIds.has(id)));

  const oppFsIds       = new Set(opponentTeam.foursomesPairs.flat().filter(Boolean).map(p => p.id));
  const oppFbIds       = new Set(opponentTeam.fourballPairs.flat().filter(Boolean).map(p => p.id));
  const oppFatiguedIds = new Set([...oppFsIds].filter(id => oppFbIds.has(id)));

  const mySingles  = _singlesOrder(myAll);
  const oppSingles = _singlesOrder(oppAll);
  const scores = { user: 0, ai: 0 };

  function addPoints(result) {
    if      (result === 'win')   scores.user += 1;
    else if (result === 'halve') { scores.user += 0.5; scores.ai += 0.5; }
    else                          scores.ai   += 1;
  }

  function playTeamSession(myPairs, oppPairs, format) {
    const results = [];
    for (let i = 0; i < myPairs.length; i++) {
      const myPair  = myPairs[i];
      const oppPair = oppPairs[i];
      if (!myPair.p1 || !oppPair || !oppPair.p1) continue;
      const myProb = calculateMatchProbability(myPair.p1, oppPair.p1, venue, format, myCaptain, myPair.p2);
      const result = simulateMatch(myProb);
      addPoints(result);
      results.push({
        myPlayers:  [myPair.p1.name,  myPair.p2 ? myPair.p2.name : null],
        oppPlayers: [oppPair.p1.name, oppPair.p2 ? oppPair.p2.name : null],
        format, result,
        points: result === 'win' ? 1 : result === 'halve' ? 0.5 : 0
      });
    }
    return results;
  }

  const fridayAM   = playTeamSession(myFs, oppFs, 'foursomes');
  const fridayPM   = playTeamSession(myFs, oppFs, 'foursomes');
  const saturdayAM = playTeamSession(myFb, oppFb, 'fourball');
  const saturdayPM = playTeamSession(myFb, oppFb, 'fourball');

  const sunday = mySingles.map((myP, i) => {
    const oppP    = oppSingles[i];
    const aiBoost = aiCaptain && aiCaptain.bonus ? (aiCaptain.bonus.singles_boost || 0) : 0;
    const effectiveCaptain = myCaptain
      ? { bonus: { ...myCaptain.bonus, singles_boost: (myCaptain.bonus.singles_boost || 0) - aiBoost } }
      : null;
    let prob = calculateMatchProbability(myP, oppP, venue, 'singles', effectiveCaptain);

    // My player fatigue penalty
    const isFatigued = myFatiguedIds.has(myP.id);
    const isImmune   = myP.hero_bonus && myP.hero_bonus.fatigue_immune;
    if (isFatigued && !isImmune) {
      prob = {
        win:   Math.max(0,   Math.round((prob.win   - 2) * 10) / 10),
        halve: prob.halve,
        loss:  Math.min(100, Math.round((prob.loss  + 2) * 10) / 10)
      };
    }

    // Opponent fatigue bonus — if their player is fatigued, my win goes up 2%
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

  const winner =
    scores.user > 14   ? 'user' :
    scores.ai   > 14   ? 'ai'   : 'tie';

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
    calculatePairingChemistry,
    calculateMatchProbability,
    simulateMatch,
    generateFoursomePairings,
    generateFourballPairings,
    simulateFullEvent
  };
}
