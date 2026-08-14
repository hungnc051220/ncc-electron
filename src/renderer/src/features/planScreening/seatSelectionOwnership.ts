import type { SelectingChairSnapshot } from "@renderer/api/orders.api";

export type SeatOwnersByKey = Map<string, Set<string>>;
export const SELECTION_SYNC_RETRY_DELAYS = [250, 500, 1000] as const;

export interface SeatOwnershipResolution {
  confirmedSeatKeys: Set<string>;
  conflictedSeatKeys: Set<string>;
  missingSeatKeys: Set<string>;
}

export const getSelectionSyncRetryDelay = (attempt: number) =>
  attempt >= 1 && attempt <= SELECTION_SYNC_RETRY_DELAYS.length
    ? SELECTION_SYNC_RETRY_DELAYS[attempt - 1]
    : null;

export const buildSeatOwnersByKey = (
  snapshots: SelectingChairSnapshot[],
  planScreenId: number,
  parseSeatIndexes: (value: string | undefined, floor: number) => string[]
) => {
  const ownersBySeat: SeatOwnersByKey = new Map();

  snapshots.forEach((snapshot) => {
    if (snapshot.planScreenId !== planScreenId) return;

    const seatKeys = [
      ...parseSeatIndexes(snapshot.selectingChairIndexF1, 1),
      ...parseSeatIndexes(snapshot.selectingChairIndexF2, 2),
      ...parseSeatIndexes(snapshot.selectingChairIndexF3, 3)
    ];

    seatKeys.forEach((seatKey) => {
      const owners = ownersBySeat.get(seatKey) || new Set<string>();
      owners.add(snapshot.posName);
      ownersBySeat.set(seatKey, owners);
    });
  });

  return ownersBySeat;
};

export const resolveSeatOwnership = (
  seatKeys: Iterable<string>,
  ownersBySeat: SeatOwnersByKey,
  currentPosName: string
): SeatOwnershipResolution => {
  const confirmedSeatKeys = new Set<string>();
  const conflictedSeatKeys = new Set<string>();
  const missingSeatKeys = new Set<string>();

  for (const seatKey of seatKeys) {
    const owners = ownersBySeat.get(seatKey);

    if (!owners || owners.size === 0) {
      missingSeatKeys.add(seatKey);
      continue;
    }

    if (owners.size === 1 && owners.has(currentPosName)) {
      confirmedSeatKeys.add(seatKey);
      continue;
    }

    conflictedSeatKeys.add(seatKey);
  }

  return {
    confirmedSeatKeys,
    conflictedSeatKeys,
    missingSeatKeys
  };
};
