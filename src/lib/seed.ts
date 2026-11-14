import bcrypt from "bcryptjs";
import { img } from "./format";
import type { DB, Product } from "./types";

const P = {
  pearlStrand: "1515562141207-7a88fb7ce338",
  topazPendant: "1599643478518-a784e5dc4c8f",
  haloRing: "1605100804763-247f67b3557e",
  roseBangle: "1611591437281-460bfbe1220a",
  hoops: "1617038220319-276d3cfab638",
  tennis: "1573408301185-9146fe634ad0",
  sapphireDrops: "1535632066927-ab7c9ab60908",
  chainBracelet: "1602173574767-37ac01994b2a",
  pearlDrop: "1611085583191-a3b181a88401",
  heart: "1588444837495-c6cfeb53f32d",
  blueHearts: "1630019852942-f89202989a59",
  templeSet: "1601121141461-9d6647bca1ed",
  pinkSapphire: "1603561591411-07134e71a2a9",
  hoopsAlt: "1617038260897-41a1f14a8ca0",
  cocktail: "1608042314453-ae338d80c427",
  linkBracelet: "1611652022419-a9419f74343d",
  stack: "1625908733875-efa9c75c084d",
};

export { LIFESTYLE } from "./lifestyle";

type SeedProduct = Omit<Product, "id" | "createdAt">;

const products: SeedProduct[] = [
  { slug: "celeste-halo-solitaire-ring", name: "Celeste Halo Solitaire Ring", category: "rings", metal: "Platinum", purity: "PT950", weight: "4.1 g", price: 148500, compareAtPrice: 162000, stock: 6, images: [P.haloRing], featured: true,
    description: "A 0.70 ct round brilliant diamond framed by a rose-gold pavé halo and set on a split platinum shank. IGI certified, VS1 clarity, F colour." },
  { slug: "rosa-pink-sapphire-ring", name: "Rosa Pink Sapphire Ring", category: "rings", metal: "Rose Gold", purity: "18K", weight: "3.6 g", price: 89900, stock: 4, images: [P.pinkSapphire], featured: true,
    description: "An emerald-cut pink sapphire surrounded by a delicate halo of micro-pavé diamonds, finished in warm 18K rose gold." },
  { slug: "terra-gemstone-cocktail-ring", name: "Terra Gemstone Cocktail Ring", category: "rings", metal: "Gold", purity: "18K", weight: "5.2 g", price: 46500, stock: 9, images: [P.cocktail], featured: false,
    description: "Smooth cabochon carnelian set in a sculpted 18K gold bezel. A bold, modern heirloom made to be stacked or worn alone." },
  { slug: "trio-diamond-stacking-rings", name: "Trio Diamond Stacking Rings", category: "rings", metal: "Gold", purity: "18K", weight: "7.8 g", price: 112000, compareAtPrice: 124000, stock: 3, images: [P.stack], featured: false,
    description: "A set of three textured mesh bands accented with pavé diamond motifs. Wear together for impact or separately for every day." },

  { slug: "akoya-pearl-strand", name: "Akoya Pearl Strand", category: "necklaces", metal: "Gold", purity: "18K", weight: "28 g", price: 74500, stock: 5, images: [P.pearlStrand], featured: true,
    description: "Hand-knotted 7 mm Akoya pearls with mirror lustre, finished with a diamond-set ball clasp in 18K white gold. Arrives in a keepsake box." },
  { slug: "midnight-topaz-pendant", name: "Midnight Topaz Pendant", category: "necklaces", metal: "Gold", purity: "14K", weight: "3.4 g", price: 32900, stock: 12, images: [P.topazPendant], featured: false,
    description: "A London blue topaz in a geometric bezel on a fine 14K gold cable chain. Adjustable at 16 and 18 inches." },
  { slug: "amour-diamond-heart-pendant", name: "Amour Diamond Heart Pendant", category: "necklaces", metal: "Platinum", purity: "PT950", weight: "2.9 g", price: 58500, stock: 8, images: [P.heart], featured: true,
    description: "An open heart outlined with 24 brilliant-cut diamonds, suspended from a sparkling bead chain in platinum." },
  { slug: "rani-temple-necklace-set", name: "Rani Temple Necklace Set", category: "necklaces", metal: "Gold", purity: "22K", weight: "46 g", price: 312000, compareAtPrice: 335000, stock: 2, images: [P.templeSet], featured: true,
    description: "Bridal temple necklace in 22K hallmarked gold with ruby-red stones and matching jhumka earrings. Handcrafted by artisans in Coimbatore." },
  { slug: "luna-pearl-drop-necklace", name: "Luna Pearl Drop Necklace", category: "necklaces", metal: "Gold", purity: "18K", weight: "2.1 g", price: 18900, stock: 15, images: [P.pearlDrop], featured: false,
    description: "A single freshwater pearl on a whisper-thin 18K gold chain. The quiet everyday piece you never take off." },

  { slug: "soleil-twisted-hoops", name: "Soleil Twisted Hoops", category: "earrings", metal: "Gold", purity: "18K", weight: "6.3 g", price: 38500, stock: 10, images: [P.hoops, P.hoopsAlt], featured: true,
    description: "Rope-twisted hoops in high-polish 18K gold, light enough for all-day wear. Secure hinged closure." },
  { slug: "nila-sapphire-drop-earrings", name: "Nila Sapphire Drop Earrings", category: "earrings", metal: "Silver", purity: "925", weight: "8.2 g", price: 24900, compareAtPrice: 29900, stock: 7, images: [P.sapphireDrops], featured: false,
    description: "Pear-cut blue sapphire centres framed by baguette and round cubic zirconia in rhodium-plated sterling silver." },
  { slug: "coeur-blue-crystal-earrings", name: "Coeur Blue Crystal Earrings", category: "earrings", metal: "Gold", purity: "14K", weight: "1.8 g", price: 8900, stock: 20, images: [P.blueHearts], featured: false,
    description: "Faceted sapphire-blue crystal hearts on 14K gold French hooks. A playful gift that feels precious." },

  { slug: "aurora-rose-diamond-bangle", name: "Aurora Rose Diamond Bangle", category: "bracelets", metal: "Rose Gold", purity: "18K", weight: "14.5 g", price: 168000, stock: 3, images: [P.roseBangle], featured: true,
    description: "An openwork infinity bangle in 18K rose gold paved with 1.20 ct of brilliant diamonds. Box clasp with safety catch." },
  { slug: "eternity-tennis-bracelet", name: "Eternity Tennis Bracelet", category: "bracelets", metal: "Platinum", purity: "PT950", weight: "12.0 g", price: 225000, compareAtPrice: 249000, stock: 2, images: [P.tennis], featured: false,
    description: "Interlocking diamond-set links in polished platinum, 3.0 ct total weight. A red-carpet classic." },
  { slug: "riviera-gold-chain-bracelet", name: "Riviera Gold Chain Bracelet", category: "bracelets", metal: "Gold", purity: "18K", weight: "9.6 g", price: 54900, stock: 11, images: [P.chainBracelet], featured: true,
    description: "Chunky oval links with a pearl toggle accent in 18K gold. Statement-making yet effortlessly wearable." },
  { slug: "nova-link-bracelet", name: "Nova Link Bracelet", category: "bracelets", metal: "Silver", purity: "925", weight: "7.4 g", price: 12900, stock: 0, images: [P.linkBracelet], featured: false,
    description: "Elongated paperclip links in sterling silver with a lobster clasp. Layer with your favourite chains." },
];

export function buildSeed(): DB {
  const now = Date.now();
  const iso = (daysAgo: number) => new Date(now - daysAgo * 864e5).toISOString();
  return {
    orderSeq: 10230,
    users: [
      { id: "u_admin", name: "Aurelia Admin", email: "admin@aurelia.test", phoneVerified: false, passwordHash: bcrypt.hashSync("Admin@123", 10), role: "admin", referralCode: "AURELIA", referralDiscountUsed: true, createdAt: iso(120) },
      { id: "u_ajinkya", name: "Ajinkya Bhilare", email: "ajinkya@aurelia.test", phone: "+919876543210", phoneVerified: true, passwordHash: bcrypt.hashSync("Ajinkya@123", 10), role: "customer", referralCode: "AJINKYA10", referralDiscountUsed: true, createdAt: iso(60) },
    ],
    products: products.map((p, i) => ({ ...p, id: `p_${String(i + 1).padStart(3, "0")}`, images: p.images.map(img), createdAt: iso(products.length - i) })),
    coupons: [
      { id: "c_welcome", code: "WELCOME10", type: "percent", value: 10, minOrder: 5000, maxDiscount: 5000, usedCount: 0, active: true, description: "10% off your first piece (max ₹5,000)", createdAt: iso(30) },
      { id: "c_flat2000", code: "SPARKLE2000", type: "flat", value: 2000, minOrder: 25000, usedCount: 0, active: true, description: "₹2,000 off orders above ₹25,000", createdAt: iso(20) },
      { id: "c_expired", code: "DIWALI25", type: "percent", value: 25, minOrder: 10000, maxDiscount: 15000, expiresAt: iso(5), usedCount: 41, active: true, description: "Festive offer (expired)", createdAt: iso(40) },
    ],
    orders: [],
  };
}
