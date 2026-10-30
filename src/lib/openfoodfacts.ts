/**
 * OpenFoodFacts API v2 Client
 * 100% Free Public API - No key required
 * Lookup nutrition, sugars, sodium, Nutri-Score, Eco-Score, and allergens
 * https://world.openfoodfacts.org/api/v2/
 */

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2';

export interface FoodProductInfo {
  code: string;
  product_name: string;
  brands?: string;
  nutriscore_grade?: string;
  nova_group?: number;
  ingredients_text?: string;
  allergens?: string[];
  nutriments?: {
    energy_kcal?: number;
    fat?: number;
    sugars?: number;
    salt?: number;
    sodium?: number;
    proteins?: number;
    carbohydrates?: number;
    fiber?: number;
  };
  image_url?: string;
}

/**
 * Fetch product by barcode (EAN / UPC)
 */
export async function getProductByBarcode(barcode: string): Promise<FoodProductInfo | null> {
  try {
    const url = `${OFF_BASE}/product/${encodeURIComponent(barcode)}.json`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BolnaVoiceHack-IRA/1.0 (contact@example.com)',
      },
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    
    const p = data.product;
    return {
      code: p.code || barcode,
      product_name: p.product_name || p.product_name_en || 'Unknown Product',
      brands: p.brands,
      nutriscore_grade: p.nutriscore_grade?.toUpperCase(),
      nova_group: p.nova_group,
      ingredients_text: p.ingredients_text,
      allergens: p.allergens_tags || [],
      nutriments: {
        energy_kcal: p.nutriments?.['energy-kcal_100g'] ?? p.nutriments?.energy_kcal,
        fat: p.nutriments?.fat_100g ?? p.nutriments?.fat,
        sugars: p.nutriments?.sugars_100g ?? p.nutriments?.sugars,
        salt: p.nutriments?.salt_100g ?? p.nutriments?.salt,
        sodium: p.nutriments?.sodium_100g ?? p.nutriments?.sodium,
        proteins: p.nutriments?.proteins_100g ?? p.nutriments?.proteins,
        carbohydrates: p.nutriments?.carbohydrates_100g ?? p.nutriments?.carbohydrates,
        fiber: p.nutriments?.fiber_100g ?? p.nutriments?.fiber,
      },
      image_url: p.image_front_url || p.image_url,
    };
  } catch (error) {
    console.error(`Error querying OpenFoodFacts for barcode ${barcode}:`, error);
    return null;
  }
}

/**
 * Search products by keyword
 */
export async function searchFoodProducts(searchTerms: string, pageSize: number = 5): Promise<FoodProductInfo[]> {
  try {
    const url = `${OFF_BASE}/search?categories_tags_en=${encodeURIComponent(searchTerms)}&page_size=${pageSize}&json=true`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BolnaVoiceHack-IRA/1.0',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.products || []).map((p: any) => ({
      code: p.code,
      product_name: p.product_name || 'Unknown Product',
      brands: p.brands,
      nutriscore_grade: p.nutriscore_grade?.toUpperCase(),
      nova_group: p.nova_group,
      ingredients_text: p.ingredients_text,
      allergens: p.allergens_tags || [],
      nutriments: {
        energy_kcal: p.nutriments?.['energy-kcal_100g'],
        fat: p.nutriments?.fat_100g,
        sugars: p.nutriments?.sugars_100g,
        salt: p.nutriments?.salt_100g,
        sodium: p.nutriments?.sodium_100g,
        proteins: p.nutriments?.proteins_100g,
        carbohydrates: p.nutriments?.carbohydrates_100g,
      },
      image_url: p.image_front_small_url || p.image_url,
    }));
  } catch (error) {
    console.error(`Error searching OpenFoodFacts for ${searchTerms}:`, error);
    return [];
  }
}
