export type PairResult = { giverId: string; receiverId: string };

export type AlgorithmResult =
  | { success: true; pairings: PairResult[]; warning?: string }
  | { success: false; error: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function attempt(userIds: string[], exclusions: Set<string>): PairResult[] | null {
  const MAX = 2000;
  for (let i = 0; i < MAX; i++) {
    const receivers = shuffle(userIds);
    const valid = userIds.every(
      (giverId, idx) =>
        giverId !== receivers[idx] && !exclusions.has(`${giverId}:${receivers[idx]}`)
    );
    if (valid) {
      return userIds.map((giverId, idx) => ({ giverId, receiverId: receivers[idx] }));
    }
  }
  return null;
}

export function generatePairings(
  userIds: string[],
  coupleExclusions: { userAId: string; userBId: string }[],
  historicalByYear: { year: number; pairings: { giverId: string; receiverId: string }[] }[]
): AlgorithmResult {
  if (userIds.length < 2) {
    return { success: false, error: "At least 2 participants are required." };
  }

  // Couple exclusions are bidirectional
  const coupleSet = new Set<string>();
  for (const { userAId, userBId } of coupleExclusions) {
    coupleSet.add(`${userAId}:${userBId}`);
    coupleSet.add(`${userBId}:${userAId}`);
  }

  // Sort most-recent-first; we relax oldest year(s) first
  const byYear = [...historicalByYear].sort((a, b) => b.year - a.year);

  const relaxationLevels: { sets: typeof byYear; relaxed?: string }[] = [
    { sets: byYear },
    ...(byYear.length > 0 ? [{ sets: byYear.slice(1), relaxed: `${byYear[0].year}` }] : []),
    ...(byYear.length > 1
      ? [{ sets: byYear.slice(2), relaxed: `${byYear[0].year} and ${byYear[1].year}` }]
      : []),
  ];

  for (const { sets, relaxed } of relaxationLevels) {
    const exclusions = new Set<string>(coupleSet);
    for (const { pairings } of sets) {
      for (const { giverId, receiverId } of pairings) {
        exclusions.add(`${giverId}:${receiverId}`);
      }
    }

    const result = attempt(userIds, exclusions);
    if (result) {
      return {
        success: true,
        pairings: result,
        warning: relaxed
          ? `Historical exclusions from ${relaxed} were relaxed to find a valid assignment.`
          : undefined,
      };
    }
  }

  return {
    success: false,
    error:
      "No valid assignment found even after relaxing historical exclusions. " +
      "There may be too many couple exclusions for the group size.",
  };
}
