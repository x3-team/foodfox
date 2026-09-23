/**
 * Canonical FOX Food Xplorer antigen catalog (286 items).
 * Source: MADx IFU 80-IFU-01-EN-03 (May 2021), antigen list section.
 */
export interface FoxCatalogItem {
  id: string;
  category: string;
  nameEn: string;
  isMolecular: boolean;
}

const ANTIGEN_BLOCK = `
Vegetables: Artichoke, Arugula, Avocado, Bamboo sprouts, Broccoli, Brussels sprouts, Cabbage, Caper, Carrot, Cauliflower, Celery bulb, Celery stalk, Chard, Chicorèe, Chinese cabbage, Chives, Cucumber, Eggplant, Endive, Fennel, Garlic, Green cabbage, Horseradish, Kiwano, Kohlrabi, Lamb's lettuce, Leek, Nettle leaves, Olive, Onion, Parsnip, Pok-Choi, Potato, Pumpkin (Butternut), Pumpkin (Hokkaido), Radicchio, Radish, Red beet, Red cabbage, Romanesco, Savoy, Shallot, Spinach, Sweet potato, Tomato, Turnip, Watercress, White Asparagus, White cabbage, Wild garlic, Zucchini
Fish & Seafood: Abalone, Atlantic cod, Atlantic herring, Atlantic redfish, Carp, Caviar, Cockle, Common mussel, Crab, Eel, European anchovy, European pilchard, European plaice, Gilt-head bream, Haddock, Hake, Lobster, Mackerel, Monkfish, Noble crayfish, Northern pike, Northern prawn, Octopus, Oyster, Razor shell, Salmon, Scallop, Sepia, Shrimp mix, Sole, Squid, Swordfish, Thornback Ray, Trout, Tuna, Turbot, Venus clam
Fruits: Apple, Apricot, Banana, Blackberry, Blueberry, Cherry, Cranberry, Date, Elderberry, Fig, Gooseberry, Grape, Grapefruit, Kiwi, Lemon, Lime, Lychee, Mango, Melon, Mulberry, Nectarine, Orange, Papaya, Passion fruit, Peach, Pear, Physalis, Pineapple, Plum, Pomegranate, Raisin, Raspberry, Red currant, Strawberry, Tangerine, Watermelon
Spices: Anise, Basil, Bay leaf, Caraway, Cardamom, Cayenne pepper, Chili (red), Cinnamon, Clove, Coriander, Cumin, Curry, Dill, Fenugreek, Ginger, Juniper berry, Lemongrass, Majoram, Mint, Mustard, Nutmeg, Oregano, Paprika, Parsley, Pepper (black/white/green/red/yellow), Rosemary, Sage, Tarragon, Thyme, Turmeric, Vanilla
Cereals & Seeds: Amaranth, Barley, Buckwheat, Chickpea, Corn, Durum, Einkorn, Emmer, Gluten, Hempseed, Linseed, Lupineseed, Malt (barley), Millet, Oat, Pine nut, Polish wheat, Poppyseed, Pumpkin seed, Quinoa, Rapeseed, Rice, Rye, Sesame, Spelt, Sunflower, Wheat, Wheat bran, Wheat gliadin, Wheatgrass
Novel Foods: Almond milk, Aloe, Aronia, Baobab, Chia seed, Chlorella, Dandelion root, Ginkgo, Ginseng, Greater burdock root, Guarana, House cricket, Maca root, Mealworm, Migratory locust, Nori, Safflower oil, Spirulina, Tapioca, Wakame, Yacòn root
Egg & Milk: Buffalo milk, Buttermilk, Camel's milk, Camembert, Cottage cheese, Cow's milk, Egg white, Egg yolk, Emmental, Goat cheese, Goat milk, Gouda, Mozzarella, Parmesan, Quail egg, Sheep cheese, Sheep milk
Meat: Beef, Boar, Chicken, Duck, Goat, Horse, Lamb, Ostrich, Pork, Rabbit, Stag, Turkey, Veal, Venison
Nuts: Almond, Brazil nut, Cashew, Coconut, Coconut milk, Hazelnut, Kola nut, Macadamia, Pecan nut, Pistachio, Sweet chestnut, Tigernut, Walnut
Coffee & Tea: Chamomile, Cocoa, Coffee, Hibiscus, Jasmine, Moringa, Peppermint, Tee (black), Tee (green)
Legumes: Green bean, Lentil, Mung bean, Pea, Peanut, Soy, Sugar pea, Tamarind, White bean
Edible Mushrooms: Boletus, Chanterelle, Enoki, French horn mushroom, Oyster mushroom, White mushroom
Others: Agar agar, Aspergillus niger, Baker's yeast, Brewer's yeast, Elderflower, Honey, Hops, M-Transglutaminase (meat glue), Cane sugar, Cross-reactive Carbohydrate Determinants
Molecular (Egg & Milk): Cow's milk Bos d 4 *, Cow's milk Bos d 5 *, Cow's milk Bos d 8 *
`;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildFoxCatalogEn(): FoxCatalogItem[] {
  const items: FoxCatalogItem[] = [];
  for (const line of ANTIGEN_BLOCK.trim().split("\n")) {
    const idx = line.indexOf(":");
    const category = line.slice(0, idx).trim();
    const names = line
      .slice(idx + 1)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const nameEn of names) {
      const isMolecular = /Bos d \d/i.test(nameEn);
      items.push({
        id: slugify(`${category}-${nameEn}`),
        category,
        nameEn,
        isMolecular,
      });
    }
  }
  return items;
}

export const FOX_CATALOG_EN = buildFoxCatalogEn();
export const FOX_CATALOG_SIZE = FOX_CATALOG_EN.length;
