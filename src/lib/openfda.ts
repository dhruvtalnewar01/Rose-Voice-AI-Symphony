/**
 * OpenFDA Drug Label & Adverse Event API Client
 * 100% Free Public API (240 requests/min free, no key required)
 * https://api.fda.gov/drug/label.json
 */

const BASE_URL = process.env.OPENFDA_API_URL || 'https://api.fda.gov/drug/label.json';

export interface DrugLabelResult {
  brand_name?: string[];
  generic_name?: string[];
  indications_and_usage?: string[];
  warnings?: string[];
  dosage_and_administration?: string[];
  contraindications?: string[];
  active_ingredient?: string[];
  drug_interactions?: string[];
  purpose?: string[];
}

export async function searchDrugLabel(query: string, limit: number = 3): Promise<DrugLabelResult[]> {
  try {
    const encoded = encodeURIComponent(`openfda.brand_name:"${query}"+openfda.generic_name:"${query}"`);
    const res = await fetch(`${BASE_URL}?search=${encoded}&limit=${limit}`);
    
    if (!res.ok) {
      // Fallback search with generic wildcard
      const fallbackRes = await fetch(`${BASE_URL}?search=indications_and_usage:"${encodeURIComponent(query)}"&limit=${limit}`);
      if (!fallbackRes.ok) return [];
      const data = await fallbackRes.json();
      return (data.results || []).map(formatDrugResult);
    }
    
    const data = await res.json();
    return (data.results || []).map(formatDrugResult);
  } catch (error) {
    console.error('Error querying OpenFDA API:', error);
    return [];
  }
}

function formatDrugResult(item: any): DrugLabelResult {
  return {
    brand_name: item.openfda?.brand_name,
    generic_name: item.openfda?.generic_name,
    indications_and_usage: item.indications_and_usage,
    warnings: item.warnings,
    dosage_and_administration: item.dosage_and_administration,
    contraindications: item.contraindications,
    active_ingredient: item.active_ingredient,
    drug_interactions: item.drug_interactions,
    purpose: item.purpose,
  };
}
