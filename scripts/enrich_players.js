/**
 * enrich_players.js
 * Adds bonds, venue_connections, and ryder_cup_years to every player entry.
 *
 * bonds            – real-life friendships / tour bonds (bidirectional pairs)
 * venue_connections – notable player-venue connections (iconic moments, home soil)
 * ryder_cup_years  – derived from ryder_cup_teams.json; years player competed
 *
 * Run: node scripts/enrich_players.js
 */

const fs   = require('fs');
const path = require('path');

const PLAYERS_PATH = path.join(__dirname, '../data/players.json');
const TEAMS_PATH   = path.join(__dirname, '../data/ryder_cup_teams.json');

const players = JSON.parse(fs.readFileSync(PLAYERS_PATH, 'utf8'));
const teams   = JSON.parse(fs.readFileSync(TEAMS_PATH,   'utf8'));

// ─── BONDS ────────────────────────────────────────────────────────────────────
// Real-life friendships and documented tour bonds.
// Each pair is stored bidirectionally on both player entries.
const BOND_PAIRS = [
  ['Justin Thomas',    'Jordan Spieth'],       // best friends since juniors
  ['Patrick Cantlay',  'Xander Schauffele'],   // college rivals → close friends
  ['Rory McIlroy',     'Shane Lowry'],         // Irish friends, close bond
  ['Tommy Fleetwood',  'Francesco Molinari'],  // Moliwood
  ['Sergio Garcia',    'Jon Rahm'],            // Spanish bond
  ['Bubba Watson',     'Webb Simpson'],        // close friends on tour
  ['Lee Westwood',     'Paul Casey'],          // practiced together, close
  ['Henrik Stenson',   'Justin Rose'],         // regular practice partners, very close
  ['Justin Rose',      'Ian Poulter'],         // English pair, roomed together
  ['Phil Mickelson',   'Keegan Bradley'],      // 2012 partnership became genuine friendship
  ['Rory McIlroy',     'Graeme McDowell'],     // childhood friends, Northern Ireland
  ['Rickie Fowler',    'Justin Thomas'],       // young guns, close friends
  ['Rickie Fowler',    'Jordan Spieth'],       // same young guns group
  ['Rory McIlroy',     'Tommy Fleetwood'],     // close on tour, European teammates
  ['Jordan Spieth',    'Justin Thomas'],       // redundant with pair 1, already covered
  ['Matt Kuchar',      'Zach Johnson'],        // known friends and regular partners
  ['Dustin Johnson',   'Brooks Koepka'],       // friends on tour
  ['Colin Montgomerie','Lee Westwood'],        // very close European teammates for years
  ['Darren Clarke',    'Lee Westwood'],        // close friends, played 1997-2006 together
  ['Luke Donald',      'Paul Casey'],          // close European teammates
];

// Deduplicate the redundant pair 1/12 overlap
const seenPairs = new Set();
const UNIQUE_BOND_PAIRS = BOND_PAIRS.filter(([a, b]) => {
  const key = [a, b].sort().join('||');
  if (seenPairs.has(key)) return false;
  seenPairs.add(key);
  return true;
});

// Build bonds lookup: name → [name, ...]
const bondsMap = {};
UNIQUE_BOND_PAIRS.forEach(([a, b]) => {
  if (!bondsMap[a]) bondsMap[a] = [];
  if (!bondsMap[b]) bondsMap[b] = [];
  bondsMap[a].push(b);
  bondsMap[b].push(a);
});

// ─── VENUE CONNECTIONS ────────────────────────────────────────────────────────
// Notable player-specific venue connections:
// won there, defining Ryder Cup moment there, or home-country venue.
// EUR players automatically get a general +5 at EUR venues in the formula —
// these are the +10 specific connections.
const VENUE_CONNECTIONS = {
  'Francesco Molinari': ['le_golf_national_2018'],          // 5-0 record
  'Tommy Fleetwood':    ['le_golf_national_2018'],          // Moliwood 4-0
  'Ian Poulter':        ['medinah_2012', 'le_golf_national_2018'],  // 5 birdies in a row at Medinah
  'Martin Kaymer':      ['medinah_2012'],                   // holed the winning putt
  'Justin Rose':        ['medinah_2012'],                   // won clinching singles vs Phil
  'Nicolas Colsaerts':  ['medinah_2012'],                   // sensational debut
  'Sergio Garcia':      ['valderrama_1997', 'k_club_2006'], // debutant at Valderrama, emotional at K Club
  'Jon Rahm':           ['valderrama_1997', 'marco_simone_2023'],   // Spanish pride + 2023 captain
  'Graeme McDowell':    ['celtic_manor_2010'],              // won the clinching singles
  'Padraig Harrington': ['k_club_2006'],                    // home soil, Ireland
  'Darren Clarke':      ['k_club_2006', 'belfry_2002'],     // emotional return at K Club
  'Dustin Johnson':     ['whistling_straits_2021'],         // 5-0 record
  'Patrick Reed':       ['hazeltine_2016'],                 // The Reed vs Rory battle
  'Rory McIlroy':       ['le_golf_national_2018', 'celtic_manor_2010', 'medinah_2012', 'marco_simone_2023'],
  'Keegan Bradley':     ['medinah_2012'],                   // debut, emotional victory
  'Tyrrell Hatton':     ['marco_simone_2023', 'le_golf_national_2018'],
  'Viktor Hovland':     ['marco_simone_2023', 'whistling_straits_2021'],
  'Collin Morikawa':    ['whistling_straits_2021'],
  'Jordan Spieth':      ['whistling_straits_2021', 'hazeltine_2016'],
  'Matt Fitzpatrick':   ['marco_simone_2023'],              // won the US Open at nearby course
  'Ludvig Aberg':       ['marco_simone_2023'],              // dream debut
  'Shane Lowry':        ['marco_simone_2023'],              // standout at 2023
  'Colin Montgomerie':  ['valderrama_1997', 'brookline_1999'],  // unbeaten at Valderrama
  'Lee Westwood':       ['belfry_2002', 'k_club_2006', 'gleneagles_2014'],
  'Phil Mickelson':     ['medinah_2012'],                   // lost the clinching singles to Rose
  'Tiger Woods':        ['valhalla_2008'],                  // one of his better RC performances
  'Patrick Cantlay':    ['whistling_straits_2021'],         // strong debut
  'Xander Schauffele':  ['whistling_straits_2021'],         // strong debut
  'Bryson DeChambeau':  ['whistling_straits_2021'],
  'Scottie Scheffler':  ['whistling_straits_2021', 'marco_simone_2023'],
  'Paul Casey':         ['belfry_2002', 'k_club_2006', 'le_golf_national_2018'],
  'Nick Faldo':         ['belfry_1993', 'belfry_2002'],     // legend of The Belfry
  'Bernhard Langer':    ['oak_hill_1995', 'kiawah_1991'],   // defining moments
  'Luke Donald':        ['gleneagles_2014'],                // strong at Gleneagles
  'Henrik Stenson':     ['le_golf_national_2018', 'gleneagles_2014'],
};

// ─── RYDER CUP YEARS (from teams file) ───────────────────────────────────────
const rcYearsByName = {};
teams.forEach(event => {
  [...event.usa, ...event.eur].forEach(name => {
    if (!rcYearsByName[name]) rcYearsByName[name] = new Set();
    rcYearsByName[name].add(event.year);
  });
});

// ─── ENRICH ───────────────────────────────────────────────────────────────────
const enriched = players.map(p => ({
  ...p,
  bonds:             bondsMap[p.name]            || [],
  venue_connections: VENUE_CONNECTIONS[p.name]   || [],
  ryder_cup_years:   [...(rcYearsByName[p.name]  || [])].sort((a, b) => a - b),
}));

fs.writeFileSync(PLAYERS_PATH, JSON.stringify(enriched, null, 2));

// ─── REPORT ───────────────────────────────────────────────────────────────────
const uniqueNames  = [...new Set(enriched.map(p => p.name))];
const withBonds    = uniqueNames.filter(n => bondsMap[n]?.length);
const withVenue    = uniqueNames.filter(n => VENUE_CONNECTIONS[n]?.length);
const withRCYears  = uniqueNames.filter(n => rcYearsByName[n]?.size);

console.log(`\nEnriched ${enriched.length} entries for ${uniqueNames.length} unique players.`);
console.log(`Bonds:             ${withBonds.length} players (${UNIQUE_BOND_PAIRS.length} pairs)`);
console.log(`Venue connections: ${withVenue.length} players`);
console.log(`RC years:          ${withRCYears.length} players (from ${teams.length} events)`);
console.log('\nBonds assigned to:');
withBonds.forEach(n => console.log(`  ${n}: [${bondsMap[n].join(', ')}]`));
console.log('\nPlayers with NO rc_years (not found in teams file):');
uniqueNames.filter(n => !rcYearsByName[n]).forEach(n => console.log(`  ${n}`));
