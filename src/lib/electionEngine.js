import { base44 } from '@/api/base44Client';

// Mayor cycle = 2 days, President cycle = 4 days
const OFFICE_DURATIONS = {
  mayor: 2 * 24 * 60 * 60 * 1000,
  president: 4 * 24 * 60 * 60 * 1000,
};

export async function getCurrentHolder(office) {
  const completed = await base44.entities.Election.filter(
    { office, status: 'completed' }, '-cycle_number', 1
  );
  return completed[0] || null;
}

export async function getActiveElection(office) {
  const active = await base44.entities.Election.filter(
    { office, status: 'voting' }, '-cycle_number', 1
  );
  return active[0] || null;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Start a new election cycle for an office.
// The current holder of the OTHER office is excluded from candidates,
// enforcing "no one can hold both offices at the same time, ever."
export async function startElectionCycle(office) {
  const otherOffice = office === 'mayor' ? 'president' : 'mayor';
  const otherHolder = await getCurrentHolder(otherOffice);
  const excludeId = otherHolder?.winner_player_id;

  const all = await base44.entities.Election.filter({ office }, '-cycle_number', 1);
  const nextCycle = (all[0]?.cycle_number || 0) + 1;

  const players = await base44.entities.Player.list('-created_date', 200);
  const pool = shuffle(players.filter((p) => p.id !== excludeId)).slice(0, 50);
  const candidates = pool.map((p) => ({
    player_id: p.id,
    username: p.username || 'Unknown Operative',
    level: p.level || 1,
  }));

  const now = new Date();
  return base44.entities.Election.create({
    cycle_number: nextCycle,
    office,
    status: 'voting',
    candidates,
    started_at: now.toISOString(),
    ends_at: new Date(now.getTime() + (OFFICE_DURATIONS[office] || OFFICE_DURATIONS.mayor)).toISOString(),
  });
}

export async function castVote({ election, player, candidate, cryptoAmount }) {
  const newBalance = (player.crypto_balance || 0) - cryptoAmount;
  if (newBalance < 0) throw new Error('Insufficient crypto balance to vote');
  await base44.entities.Player.update(player.id, { crypto_balance: newBalance });
  await base44.entities.ElectionVote.create({
    election_id: election.id,
    office: election.office,
    voter_id: player.id,
    voter_name: player.username,
    candidate_id: candidate.player_id,
    candidate_name: candidate.username,
    crypto_amount: cryptoAmount,
  });
  await base44.entities.Election.update(election.id, {
    total_crypto_voted: (election.total_crypto_voted || 0) + cryptoAmount,
    total_vote_count: (election.total_vote_count || 0) + 1,
  });
  return newBalance;
}

export function tallyResults(votes) {
  const map = {};
  votes.forEach((v) => {
    if (!map[v.candidate_id]) {
      map[v.candidate_id] = { candidate_id: v.candidate_id, candidate_name: v.candidate_name, crypto: 0, votes: 0 };
    }
    map[v.candidate_id].crypto += v.crypto_amount || 0;
    map[v.candidate_id].votes += 1;
  });
  return Object.values(map).sort((a, b) => b.crypto - a.crypto);
}

// Close voting and declare a winner.
// If the top vote-getter already holds the OTHER office, the runner-up wins
// instead — guaranteeing no player holds both offices simultaneously.
export async function completeElection(election) {
  const votes = await base44.entities.ElectionVote.filter({ election_id: election.id });
  const results = tallyResults(votes);

  const otherOffice = election.office === 'mayor' ? 'president' : 'mayor';
  const otherHolder = await getCurrentHolder(otherOffice);

  let winner = results[0];
  if (winner && otherHolder && winner.candidate_id === otherHolder.winner_player_id) {
    winner = results[1] || null;
  }

  const update = { status: 'completed', completed_at: new Date().toISOString() };
  if (winner) {
    update.winner_player_id = winner.candidate_id;
    update.winner_username = winner.candidate_name;
  }
  return base44.entities.Election.update(election.id, update);
}