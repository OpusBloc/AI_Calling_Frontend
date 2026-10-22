export type OwnedRecord = Record<string, unknown>;

function asString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value);
  return s.trim() === '' ? undefined : s;
}

export function normalizeOwnedResponse(json: unknown): OwnedRecord[] {
  const j = json as Record<string, unknown> | unknown[] | undefined;
  if (!j) return [];
  if (Array.isArray(j)) return j as OwnedRecord[];
  const data = (j as Record<string, unknown>)['data'];
  const metadataList = (j as Record<string, unknown>)['metadataList'];
  const result = (j as Record<string, unknown>)['result'];
  if (Array.isArray(metadataList)) return metadataList as OwnedRecord[];
  if (Array.isArray((data as Record<string, unknown> | undefined)?.['metadataList'])) {
    return ((data as Record<string, unknown>)['metadataList'] as unknown[]) as OwnedRecord[];
  }
  if (Array.isArray(data)) return data as OwnedRecord[];
  if (Array.isArray((data as Record<string, unknown> | undefined)?.['data'])) {
    return ((data as Record<string, unknown>)['data'] as unknown[]) as OwnedRecord[];
  }
  if (Array.isArray(result)) return result as OwnedRecord[];
  return [];
}

export interface OwnershipMaps {
  parentIds: string[];
  parentToFlatIds: Record<string, string[]>;
  flatToSubflatIds: Record<string, string[]>;
  flatToSubflatIdsByParent: Record<string, string[]>;
  flatToContractMap: Record<string, string>;
  subflatToContractMap: Record<string, string>;
  parentOwnerMap: Record<string, string>;
  parentContractMap: Record<string, string>;
}

export function buildOwnershipMaps(items: OwnedRecord[]): OwnershipMaps {
  const parentsSet = new Set<string>();
  const parentToFlatIds: Record<string, string[]> = {};
  const flatToSubflatIds: Record<string, string[]> = {};
  const flatToSubflatIdsByParent: Record<string, string[]> = {};
  const flatToContractMap: Record<string, string> = {};
  const subflatToContractMap: Record<string, string> = {};
  const parentOwnerMap: Record<string, string> = {};
  const parentContractMap: Record<string, string> = {};

  for (const raw of items) {
    try {
      const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
      const meta = obj && typeof obj['metadata'] === 'object' ? (obj['metadata'] as Record<string, unknown>) : {};

      const parent =
  asString(obj['parentTokenId']) ??
  asString(meta['parentTokenId']) ??
  asString(obj['tokenId']) ??
  asString(meta['tokenId'])??
    asString(meta['tokenId']) ??
  asString(obj['token_id']) ??      // ✅ ADD
  asString(meta['token_id']) ??     // ✅ ADD
  asString(obj['id']) ??            // ✅ ADD
  asString(meta['id']);      
  

      const flat = asString(obj['flatTokenId']) ?? asString(meta['flatTokenId']);
      const parentFlat = asString(obj['parentFlatTokenId']) ?? asString(meta['parentFlatTokenId']);
      const subflat = asString(obj['subflatTokenId']) ?? asString(meta['subflatTokenId']);

      const typeValRaw = asString(obj['type']) ?? asString(meta['type']);
      const typeVal = typeValRaw ? typeValRaw.toLowerCase() : undefined;
      const isSubRaw = obj['isSubflat'] ?? meta['isSubflat'];
      const isSub = isSubRaw === true || isSubRaw === 'true' || typeVal === 'subflat' || !!subflat;

      const contractCandidate = asString(obj['contractAddress'])
        ?? asString(meta['contractAddress'])
        ?? asString(obj['nftAddress'])
        ?? asString(meta['nftAddress']);
      const ownerCandidate = asString(obj['ownerAddress'])
        ?? asString(meta['ownerAddress'])
        ?? asString(obj['ownedBy'])
        ?? asString(meta['ownedBy'])
        ?? asString(obj['owner'])
        ?? asString(meta['owner']);

      if (!parent) continue;

      parentsSet.add(parent);

      // Determine which flat id to group under this record
      const flatGroup = isSub ? (parentFlat ?? flat) : flat;

      if (flatGroup) {
        if (!parentToFlatIds[parent]) parentToFlatIds[parent] = [];
        if (!parentToFlatIds[parent].includes(flatGroup)) parentToFlatIds[parent].push(flatGroup);
      }

      if (ownerCandidate) parentOwnerMap[parent] = ownerCandidate;

      // Only set parent fractional contract when record clearly relates to flats
      if (contractCandidate && contractCandidate.startsWith('0x') && flatGroup) {
        parentContractMap[parent] = contractCandidate;
      }

      if (isSub && flatGroup && subflat) {
        if (!flatToSubflatIds[flatGroup]) flatToSubflatIds[flatGroup] = [];
        if (!flatToSubflatIds[flatGroup].includes(subflat)) flatToSubflatIds[flatGroup].push(subflat);
        const compositeKey = `${parent}:${flatGroup}`;
        if (!flatToSubflatIdsByParent[compositeKey]) flatToSubflatIdsByParent[compositeKey] = [];
        if (!flatToSubflatIdsByParent[compositeKey].includes(subflat)) flatToSubflatIdsByParent[compositeKey].push(subflat);
      }

      // Map contracts:
      // - For flat records: map flat id to contract
      // - For subflat records: map subflat id to contract
      if (contractCandidate && contractCandidate.startsWith('0x')) {
        if (!isSub) {
          const flatKey = flatGroup ?? flat;
          if (flatKey) flatToContractMap[flatKey] = contractCandidate;
        } else if (subflat) {
          subflatToContractMap[subflat] = contractCandidate;
        }
      }
    } catch {
      continue;
    }
  }

  return {
    parentIds: Array.from(parentsSet),
    parentToFlatIds,
    flatToSubflatIds,
    flatToSubflatIdsByParent,
    flatToContractMap,
    subflatToContractMap,
    parentOwnerMap,
    parentContractMap,
  };
}


