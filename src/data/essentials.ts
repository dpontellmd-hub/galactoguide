import type { ImageSource } from 'expo-image';

export type EssentialTone = 'blue' | 'green' | 'gold';

export interface EssentialDecision {
  label: 'Buy if' | 'Ask first' | 'Skip when';
  text: string;
}

export interface EssentialItem {
  name: string;
  role: string;
  lookFor: string[];
  skip: string;
}

export interface EssentialSource {
  label: string;
  url: string;
}

export interface EssentialExample {
  name: string;
  context: string;
  reasons: string[];
  linkLabel: string;
  url: string;
  image: ImageSource;
  imageAlt: string;
}

export interface EssentialGuide {
  slug: string;
  eyebrow: string;
  title: string;
  summary: string;
  principle: string;
  tone: EssentialTone;
  decisions: EssentialDecision[];
  example: EssentialExample;
  items: EssentialItem[];
  noPurchase: string[];
  careNote?: string;
  sources: EssentialSource[];
  updated: string;
}

export const ESSENTIAL_GUIDES: EssentialGuide[] = [
  {
    slug: 'pumping-away-from-home',
    eyebrow: 'WORK, TRAVEL & CHILDCARE',
    title: 'Pumping away from home',
    summary: 'Build a small carry kit around cold storage, clean parts, and the route your milk takes.',
    principle: 'Start with your day, not a shopping list.',
    tone: 'blue',
    decisions: [
      {
        label: 'Buy if',
        text: 'Your routine has no reliable refrigerator, or milk regularly travels between locations.',
      },
      {
        label: 'Ask first',
        text: 'Check what your workplace, childcare provider, pump supplier, or insurer already provides.',
      },
      {
        label: 'Skip when',
        text: 'You already have dependable cold storage and enough compatible parts for your day.',
      },
    ],
    example: {
      name: 'PackIt Freezable Breastmilk & Formula Cooler',
      context:
        'A compact cooler example for routes without dependable refrigeration. This is a comparison starting point, not a ranked pick.',
      reasons: [
        'Built-in freezable walls remove the need for a separate ice pack.',
        'The manufacturer says it holds up to four 5-ounce bottles, depending on bottle shape.',
      ],
      linkLabel: 'View at PackIt',
      url: 'https://packit.com/products/freezable-breast-milk-and-formula-cooler',
      image: require('@/assets/essentials/cooler.png'),
      imageAlt: 'Illustrative insulated cooler with four milk storage bottles and an ice pack',
    },
    items: [
      {
        name: 'Insulated cooler and frozen ice packs',
        role: 'Useful when you cannot move expressed milk directly into a food-safe refrigerator.',
        lookFor: [
          'Enough room for your usual containers without crowding',
          'A wipe-clean lining and ice packs that stay frozen for your full route',
          'A shape you can keep closed between stops',
        ],
        skip: 'A connected temperature tracker is usually optional for a straightforward daily route.',
      },
      {
        name: 'Spare milk-contact parts',
        role: 'A second clean set can reduce dependence on washing one set in an unsuitable space.',
        lookFor: [
          'Exact compatibility with your pump model',
          'A clean, protected container for dry parts',
          'A separate contained place for used parts until they can be cleaned',
        ],
        skip: 'Do not buy a full second pump if your current pump and power setup already travel well.',
      },
      {
        name: 'Simple transport containers',
        role: 'Keep clean, dry parts separate from used parts and other bag contents.',
        lookFor: [
          'Washable or disposable food-safe containers',
          'A clear clean-versus-used system you can follow when tired',
        ],
        skip: 'A dedicated organizer is optional; clean sealable containers can do the same job.',
      },
    ],
    noPurchase: [
      'Expressed milk can share a refrigerator that is appropriate for food storage.',
      'A clean container you already own may work for transporting dry pump parts.',
      'Ask your pump supplier about included or covered spare parts before ordering extras.',
    ],
    careNote:
      'If your baby was born prematurely or has other health concerns, follow the cleaning and storage plan from your care team.',
    sources: [
      {
        label: 'CDC · Returning to your workplace',
        url: 'https://www.cdc.gov/infant-toddler-nutrition/breastfeeding/returning-to-your-workplace.html',
      },
      {
        label: 'CDC · Breast milk storage questions',
        url: 'https://www.cdc.gov/breastfeeding/php/guidelines-recommendations/faqs.html',
      },
    ],
    updated: 'August 2026',
  },
  {
    slug: 'flange-fit',
    eyebrow: 'PUMP COMFORT',
    title: 'Finding a better flange fit',
    summary: 'Use comfort, centered nipple movement, and pump compatibility to guide the next step.',
    principle: 'Fit is a question to solve, not a kit to collect.',
    tone: 'green',
    decisions: [
      {
        label: 'Buy if',
        text: 'Your current shield is uncomfortable, rubs, or does not keep the nipple centered during pumping.',
      },
      {
        label: 'Ask first',
        text: 'A lactation professional or your pump manufacturer may help assess fit and available sizes.',
      },
      {
        label: 'Skip when',
        text: 'Your current flange is comfortable, centered, compatible, and working well for you.',
      },
    ],
    example: {
      name: 'Maymom silicone flange inserts',
      context:
        'A lower-cost size-adjustment example after you have checked fit. The linked 19 mm insert is not a universal recommendation.',
      reasons: [
        'Lets some compatible 24 mm shields use a smaller tunnel size.',
        'Compatibility varies by pump, shield, cup, and insert series—check the exact model before buying.',
      ],
      linkLabel: 'View the 19 mm example at Maymom',
      url: 'https://maymom.com/eshop/index.php?main_page=product_info&products_id=575',
      image: require('@/assets/essentials/flange-fit.png'),
      imageAlt: 'Illustrative pump flange with several translucent flange inserts and a sizing ruler',
    },
    items: [
      {
        name: 'Alternate-size flange',
        role: 'A different tunnel size may help when the current shield rubs or pulls in more surrounding tissue than expected.',
        lookFor: [
          'Compatibility with the exact pump and collection setup you use',
          'A return or exchange policy when fit cannot be tested first',
          'Comfortable, centered movement rather than size alone',
        ],
        skip: 'Avoid buying a large variety pack before checking your current fit and pump compatibility.',
      },
      {
        name: 'Manufacturer-compatible insert',
        role: 'An insert can adapt some larger flanges when the pump maker permits it.',
        lookFor: [
          'An opening appropriate for your nipple without compression',
          'Material and cleaning instructions that match the manufacturer guidance',
          'A secure fit that does not distort during pumping',
        ],
        skip: 'Do not use an insert that is too small or one your pump setup does not support.',
      },
      {
        name: 'Simple sizing guide',
        role: 'A printable or reusable ruler can provide a starting point before assessing comfort during pumping.',
        lookFor: [
          'Clear millimeter markings',
          'Instructions from your pump manufacturer or lactation professional',
        ],
        skip: 'A paid measuring gadget is not necessary when a reliable printable guide is available.',
      },
    ],
    noPurchase: [
      'Check whether your manufacturer offers a printable sizing guide.',
      'Ask whether a lactation visit already includes a pump-fit assessment.',
      'Reassess over time; fit can change, so a one-time purchase is not a permanent verdict.',
    ],
    careNote:
      'Pain, tissue injury, or persistent pumping difficulty deserves individualized assessment rather than another accessory.',
    sources: [
      {
        label: 'FDA · Using a breast pump',
        url: 'https://www.fda.gov/medical-devices/breast-pumps/using-breast-pump',
      },
      {
        label: 'FDA · Choosing a breast pump',
        url: 'https://www.fda.gov/medical-devices/breast-pumps/choosing-breast-pump',
      },
    ],
    updated: 'August 2026',
  },
  {
    slug: 'clean-store-transport',
    eyebrow: 'MILK & PUMP-PART CARE',
    title: 'Cleaning, storing, and transporting milk',
    summary: 'Choose a repeatable routine for washing, air-drying, protecting parts, and storing milk safely.',
    principle: 'A reliable routine matters more than specialized gear.',
    tone: 'gold',
    decisions: [
      {
        label: 'Buy if',
        text: 'Your current setup lacks a clean washing basin, air-drying space, or appropriate milk containers.',
      },
      {
        label: 'Ask first',
        text: 'Check pump-part instructions and whether your dishwasher already provides the needed cleaning cycle.',
      },
      {
        label: 'Skip when',
        text: 'Clean household items already meet the guidance and are reserved or protected for this use.',
      },
    ],
    example: {
      name: 'OXO Tot Expandable Drying Rack',
      context:
        'A counter-storage example when you want vertical drying space and removable trays. A clean towel may still be enough.',
      reasons: [
        'Uses upright storage to hold bottles and small parts without a wide footprint.',
        'Most removable components are listed as top-rack dishwasher safe by the manufacturer.',
      ],
      linkLabel: 'View at OXO',
      url: 'https://www.oxo.com/expandable-drying-rack.html',
      image: require('@/assets/essentials/drying-rack.png'),
      imageAlt: 'Illustrative drying rack holding clean pump parts, bottle pieces, and a brush',
    },
    items: [
      {
        name: 'Dedicated wash basin',
        role: 'Keeps pump and feeding parts from sitting directly in a sink where they can be contaminated.',
        lookFor: [
          'Enough space for disassembled parts without crowding',
          'A smooth, washable surface',
          'A place where the basin itself can air-dry',
        ],
        skip: 'A branded basin is unnecessary; a clean, appropriately sized household basin can work.',
      },
      {
        name: 'Bottle or pump-part brush',
        role: 'Helps clean hard-to-reach areas when the pump manufacturer permits brushing.',
        lookFor: [
          'A brush reserved for infant feeding and pump items',
          'A shape that reaches your specific parts without damaging them',
          'A handle and bristles that can be cleaned and air-dried',
        ],
        skip: 'Do not add a special brush when your dishwasher and manufacturer instructions already cover cleaning.',
      },
      {
        name: 'Drying and protected storage setup',
        role: 'Allows parts to air-dry thoroughly before they are stored away from dirt and dust.',
        lookFor: [
          'Good airflow and enough separation for small parts',
          'A clean, protected container only after parts are fully dry',
        ],
        skip: 'A designer drying rack is optional; a clean unused towel or paper towel can provide a drying surface.',
      },
      {
        name: 'Milk storage containers',
        role: 'Holds expressed milk in a container designed or appropriate for food storage.',
        lookFor: [
          'Breast milk storage bags or clean food-grade glass or plastic',
          'Tight-fitting lids and an easy-to-label surface',
          'A size that avoids unnecessary waste for your feeding pattern',
        ],
        skip: 'Do not use disposable bottle liners or general-purpose plastic bags not intended for milk storage.',
      },
    ],
    noPurchase: [
      'A clean household basin can be reserved for pump and feeding items.',
      'A clean unused dish towel or paper towel can provide an air-drying surface.',
      'If dishwasher-safe parts go through hot water and heated drying or a sanitizing setting, CDC says a separate sanitizing step is not necessary.',
    ],
    careNote:
      'Daily sanitizing is especially important for babies younger than 2 months, born prematurely, or with a weakened immune system. Follow your care team’s instructions.',
    sources: [
      {
        label: 'CDC · How to clean and sanitize breast pumps',
        url: 'https://www.cdc.gov/hygiene/about/about-breast-pump-hygiene.html',
      },
      {
        label: 'CDC · Breast milk storage and preparation',
        url: 'https://www.cdc.gov/breastfeeding/breast-milk-preparation-and-storage/handling-breastmilk.html',
      },
    ],
    updated: 'August 2026',
  },
];

export function getEssentialGuide(slug: string | undefined) {
  return ESSENTIAL_GUIDES.find((guide) => guide.slug === slug);
}
