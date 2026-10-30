/**
 * NIH RxNorm REST API Client
 * 100% Free Public API - No key required
 * Normalizes generic drug salts and checks multi-drug interactions
 * https://rxnav.nlm.nih.gov/REST/
 */

const RXNORM_BASE = 'https://rxnav.nlm.nih.gov/REST';

export interface RxNormConcept {
  rxcui: string;
  name: string;
  synonym?: string;
  tty?: string;
}

export interface DrugInteraction {
  severity: string;
  description: string;
  drugs: string[];
}

/**
 * Find RxNorm Concept Unique Identifier (RxCUI) by drug name
 */
export async function getRxCUI(drugName: string): Promise<string | null> {
  try {
    const url = `${RXNORM_BASE}/rxcui.json?name=${encodeURIComponent(drugName)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const rxnormId = data?.idGroup?.rxnormId;
    return rxnormId && rxnormId.length > 0 ? rxnormId[0] : null;
  } catch (error) {
    console.error(`Error finding RxCUI for ${drugName}:`, error);
    return null;
  }
}

/**
 * Get spelling suggestions / approximate match for a drug name
 */
export async function getApproximateMatch(term: string): Promise<RxNormConcept[]> {
  try {
    const url = `${RXNORM_BASE}/approximateTerm.json?term=${encodeURIComponent(term)}&maxEntries=5`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const candidates = data?.approximateGroup?.candidate || [];
    return candidates.map((c: any) => ({
      rxcui: c.rxcui,
      name: c.name || term,
      tty: c.tty,
    }));
  } catch (error) {
    console.error(`Error finding approximate matches for ${term}:`, error);
    return [];
  }
}

/**
 * Check drug-drug interactions between multiple RxCUIs
 */
export async function checkDrugInteractions(rxcuis: string[]): Promise<DrugInteraction[]> {
  if (rxcuis.length < 2) return [];
  try {
    const rxcuiList = rxcuis.join('+');
    const url = `${RXNORM_BASE}/interaction/list.json?rxcuis=${rxcuiList}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    
    const interactions: DrugInteraction[] = [];
    const groups = data?.fullInteractionTypeGroup || [];
    
    for (const group of groups) {
      for (const item of group.fullInteractionType || []) {
        for (const pair of item.interactionPair || []) {
          interactions.push({
            severity: pair.severity || 'unspecified',
            description: pair.description,
            drugs: [
              pair.interactionConcept?.[0]?.minConceptItem?.name || 'Drug 1',
              pair.interactionConcept?.[1]?.minConceptItem?.name || 'Drug 2',
            ],
          });
        }
      }
    }
    
    return interactions;
  } catch (error) {
    console.error('Error checking drug interactions:', error);
    return [];
  }
}
