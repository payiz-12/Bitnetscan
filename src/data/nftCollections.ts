export interface NftItem {
  id: number;
  name: string;
  image: string;
  rarity: 'Legendary' | 'Epic' | 'Rare' | 'Common' | string;
  rarityColor: string;
  owner: string;
  mintDate: string;
  traits: { trait_type: string; value: string }[];
  priceBtn?: number;
}

export interface NftHolder {
  rank: number;
  address: string;
  quantity: number;
  percentage: string;
  tokenIds: number[];
}

export interface NftTransfer {
  hash: string;
  from: string;
  to: string;
  tokenId: number;
  priceBtn: number;
  timestamp: number;
  blockNumber?: number;
}

export interface NftCollection {
  id: string;
  name: string;
  symbol: string;
  contract: string;
  standard: string;
  description: string;
  bannerImage: string;
  iconImage: string;
  totalSupply: number;
  minted: number;
  holdersCount: number;
  floorPriceBtn?: number;
  volume24hBtn?: number;
  verified: boolean;
  category: string;
  items: NftItem[];
  holders: NftHolder[];
  recentTransfers: NftTransfer[];
}

export const BITNET_NFT_COLLECTIONS: NftCollection[] = [
  {
    "id": "bitnet-punks",
    "name": "BitnetPunks",
    "symbol": "BPUNK",
    "contract": "0xd03B179692303741393ee9A26E34e5ef4593741f",
    "standard": "BTS-721 / ERC-721",
    "description": "The first and most popular official 10,000-piece iconic PFP avatar collection on Bitnet L1. Minted on-chain and hosted on IPFS.",
    "bannerImage": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/714.png",
    "iconImage": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/686.png",
    "totalSupply": 10000,
    "minted": 714,
    "holdersCount": 4,
    "volume24hBtn": 0,
    "verified": true,
    "category": "PFP & Avatar",
    "items": [
      {
        "id": 714,
        "name": "Bpunks #714",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/714.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Beard",
            "value": "Mustache"
          },
          {
            "trait_type": "Eyewear",
            "value": "Small Shades"
          },
          {
            "trait_type": "Headwear",
            "value": "Fedora"
          },
          {
            "trait_type": "Necklace",
            "value": "Silver Chain"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 713,
        "name": "Bpunks #713",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/713.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Beard",
            "value": "Muttonchops"
          },
          {
            "trait_type": "Headwear",
            "value": "Cap Forward"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 712,
        "name": "Bpunks #712",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/712.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Beard",
            "value": "Goat"
          },
          {
            "trait_type": "Headwear",
            "value": "Wild Hair"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 711,
        "name": "Bpunks #711",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/711.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Headwear",
            "value": "Cowboy Hat"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 710,
        "name": "Bpunks #710",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/710.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Eyewear",
            "value": "3D Glasses"
          },
          {
            "trait_type": "Headwear",
            "value": "Frumpy Hair"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 709,
        "name": "Bpunks #709",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/709.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Headwear",
            "value": "Hoodie"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 708,
        "name": "Bpunks #708",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/708.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Beard",
            "value": "Chinstrap"
          },
          {
            "trait_type": "Headwear",
            "value": "Fedora"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 707,
        "name": "Bpunks #707",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/707.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Eyewear",
            "value": "Cassic Shades"
          },
          {
            "trait_type": "Headwear",
            "value": "Top Hat"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 706,
        "name": "Bpunks #706",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/706.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Beard",
            "value": "Handlebars"
          },
          {
            "trait_type": "Earring",
            "value": "Earring"
          },
          {
            "trait_type": "Headwear",
            "value": "Vampire Hair"
          },
          {
            "trait_type": "Mouth Prop",
            "value": "Pipe"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 705,
        "name": "Bpunks #705",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/705.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Earring",
            "value": "Earring"
          },
          {
            "trait_type": "Headwear",
            "value": "Headband"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 704,
        "name": "Bpunks #704",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/704.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Beard",
            "value": "Normal Beard Black"
          },
          {
            "trait_type": "Eyewear",
            "value": "Eye Mask"
          },
          {
            "trait_type": "Headwear",
            "value": "Shaved Head"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 703,
        "name": "Bpunks #703",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/703.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Beard",
            "value": "Shadow Beard"
          },
          {
            "trait_type": "Earring",
            "value": "Earring"
          },
          {
            "trait_type": "Eyewear",
            "value": "Cassic Shades"
          },
          {
            "trait_type": "Headwear",
            "value": "Cap Forward"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 702,
        "name": "Bpunks #702",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/702.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Beard",
            "value": "Front Beard"
          },
          {
            "trait_type": "Earring",
            "value": "Earring"
          },
          {
            "trait_type": "Eyewear",
            "value": "Nerd Glasses"
          },
          {
            "trait_type": "Headwear",
            "value": "Purple Hair"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 701,
        "name": "Bpunks #701",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/701.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Headwear",
            "value": "Crazy Hair"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 700,
        "name": "Bpunks #700",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/700.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Beard",
            "value": "Muttonchops"
          },
          {
            "trait_type": "Eyewear",
            "value": "Eye Mask"
          },
          {
            "trait_type": "Headwear",
            "value": "Police Cap"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 699,
        "name": "Bpunks #699",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/699.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Beard",
            "value": "Shadow Beard"
          },
          {
            "trait_type": "Eyewear",
            "value": "Regular Shades"
          },
          {
            "trait_type": "Headwear",
            "value": "Vampire Hair"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 698,
        "name": "Bpunks #698",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/698.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Eyewear",
            "value": "Eye Patch"
          },
          {
            "trait_type": "Headwear",
            "value": "Purple Hair"
          },
          {
            "trait_type": "Mouth Prop",
            "value": "Cigarette"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 697,
        "name": "Bpunks #697",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/697.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Eyewear",
            "value": "Big Shades"
          },
          {
            "trait_type": "Headwear",
            "value": "Headband"
          },
          {
            "trait_type": "Mouth Prop",
            "value": "Cigarette"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 696,
        "name": "Bpunks #696",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/696.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Earring",
            "value": "Earring"
          },
          {
            "trait_type": "Eyewear",
            "value": "Small Shades"
          },
          {
            "trait_type": "Headwear",
            "value": "Cowboy Hat"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 695,
        "name": "Bpunks #695",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/695.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Headwear",
            "value": "Shaved Head"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 694,
        "name": "Bpunks #694",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/694.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Earring",
            "value": "Earring"
          },
          {
            "trait_type": "Eyewear",
            "value": "Nerd Glasses"
          },
          {
            "trait_type": "Headwear",
            "value": "Messy Hair"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 693,
        "name": "Bpunks #693",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/693.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Beard",
            "value": "Luxurious Beard"
          },
          {
            "trait_type": "Headwear",
            "value": "Top Hat"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 692,
        "name": "Bpunks #692",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/692.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Beard",
            "value": "Shadow Beard"
          },
          {
            "trait_type": "Eyewear",
            "value": "Big Shades"
          },
          {
            "trait_type": "Headwear",
            "value": "Messy Hair"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 691,
        "name": "Bpunks #691",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/691.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Headwear",
            "value": "Mohawk Dark"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 690,
        "name": "Bpunks #690",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/690.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Eyewear",
            "value": "Regular Shades"
          },
          {
            "trait_type": "Mouth Prop",
            "value": "Cigarette"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 689,
        "name": "Bpunks #689",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/689.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Beard",
            "value": "Goat"
          },
          {
            "trait_type": "Earring",
            "value": "Earring"
          },
          {
            "trait_type": "Headwear",
            "value": "Bandana"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 688,
        "name": "Bpunks #688",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/688.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xf527F750242F47bA226eb1f90E6Dea399F573E0E",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Beard",
            "value": "Normal Beard Black"
          },
          {
            "trait_type": "Eyewear",
            "value": "Eye Patch"
          },
          {
            "trait_type": "Headwear",
            "value": "Dorag"
          },
          {
            "trait_type": "Mouth Prop",
            "value": "Vape"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 687,
        "name": "Bpunks #687",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/687.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xf527F750242F47bA226eb1f90E6Dea399F573E0E",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Beard",
            "value": "Front Beard Dark"
          },
          {
            "trait_type": "Earring",
            "value": "Earring"
          },
          {
            "trait_type": "Headwear",
            "value": "Crazy Hair"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 686,
        "name": "Bpunks #686",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/686.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0x003f9f694516f18Ea6Ae5E1315fB02c905Feb1ba",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Headwear",
            "value": "Police Cap"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 685,
        "name": "Bpunks #685",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/685.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0x003f9f694516f18Ea6Ae5E1315fB02c905Feb1ba",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Beard",
            "value": "Normal Beard"
          },
          {
            "trait_type": "Headwear",
            "value": "Peak Spike"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 684,
        "name": "Bpunks #684",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/684.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xbAE74cBA745Ccfb9393B03d568375E28D46D2a67",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Beard",
            "value": "Normal Beard"
          },
          {
            "trait_type": "Eyewear",
            "value": "VR"
          },
          {
            "trait_type": "Headwear",
            "value": "Cap"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 683,
        "name": "Bpunks #683",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/683.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xbAE74cBA745Ccfb9393B03d568375E28D46D2a67",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Beard",
            "value": "Front Beard Dark"
          },
          {
            "trait_type": "Headwear",
            "value": "Peak Spike"
          },
          {
            "trait_type": "Mouth Prop",
            "value": "Cigarette"
          },
          {
            "trait_type": "Type",
            "value": "Zombie"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 682,
        "name": "Bpunks #682",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/682.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Headwear",
            "value": "Cap Forward"
          },
          {
            "trait_type": "Mouth Prop",
            "value": "Cigarette"
          },
          {
            "trait_type": "Necklace",
            "value": "Gold Chain"
          },
          {
            "trait_type": "Type",
            "value": "Masayoshi"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 681,
        "name": "Bpunks #681",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/681.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Earring",
            "value": "Earring"
          },
          {
            "trait_type": "Eyewear",
            "value": "Regular Shades"
          },
          {
            "trait_type": "Headwear",
            "value": "Cap Forward"
          },
          {
            "trait_type": "Mouth Prop",
            "value": "Cigarette"
          },
          {
            "trait_type": "Type",
            "value": "Masayoshi"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 680,
        "name": "Bpunks #680",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/680.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Headwear",
            "value": "Cap Forward"
          },
          {
            "trait_type": "Mouth Prop",
            "value": "Vape"
          },
          {
            "trait_type": "Necklace",
            "value": "Silver Chain"
          },
          {
            "trait_type": "Type",
            "value": "Masayoshi"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 679,
        "name": "Bpunks #679",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/679.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Earring",
            "value": "Earring"
          },
          {
            "trait_type": "Eyewear",
            "value": "Regular Shades"
          },
          {
            "trait_type": "Headwear",
            "value": "Cap Forward"
          },
          {
            "trait_type": "Type",
            "value": "Masayoshi"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 678,
        "name": "Bpunks #678",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/678.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Eyewear",
            "value": "VR"
          },
          {
            "trait_type": "Headwear",
            "value": "Dorag"
          },
          {
            "trait_type": "Type",
            "value": "Masayoshi"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 677,
        "name": "Bpunks #677",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/677.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Earring",
            "value": "Earring"
          },
          {
            "trait_type": "Eyewear",
            "value": "Nerd Glasses"
          },
          {
            "trait_type": "Headwear",
            "value": "Dorag"
          },
          {
            "trait_type": "Mouth Prop",
            "value": "Medical Mask"
          },
          {
            "trait_type": "Necklace",
            "value": "Gold Chain"
          },
          {
            "trait_type": "Type",
            "value": "Masayoshi"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 676,
        "name": "Bpunks #676",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/676.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Eyewear",
            "value": "Big Shades"
          },
          {
            "trait_type": "Headwear",
            "value": "Cap Forward"
          },
          {
            "trait_type": "Mouth Prop",
            "value": "Vape"
          },
          {
            "trait_type": "Necklace",
            "value": "Gold Chain"
          },
          {
            "trait_type": "Type",
            "value": "Masayoshi"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 675,
        "name": "Bpunks #675",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/675.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Eyewear",
            "value": "Nerd Glasses"
          },
          {
            "trait_type": "Headwear",
            "value": "Cap Forward"
          },
          {
            "trait_type": "Mouth Prop",
            "value": "Cigarette"
          },
          {
            "trait_type": "Type",
            "value": "Masayoshi"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 674,
        "name": "Bpunks #674",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/674.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Headwear",
            "value": "Hoodie"
          },
          {
            "trait_type": "Mouth Prop",
            "value": "Gold Cigarette"
          },
          {
            "trait_type": "Necklace",
            "value": "Silver Chain"
          },
          {
            "trait_type": "Type",
            "value": "Masayoshi"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 673,
        "name": "Bpunks #673",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/673.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Eyewear",
            "value": "VR"
          },
          {
            "trait_type": "Headwear",
            "value": "Cap Forward"
          },
          {
            "trait_type": "Type",
            "value": "Masayoshi"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 672,
        "name": "Bpunks #672",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/672.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Eyewear",
            "value": "Horned Rim Glasses"
          },
          {
            "trait_type": "Headwear",
            "value": "Hoodie"
          },
          {
            "trait_type": "Type",
            "value": "Masayoshi"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 671,
        "name": "Bpunks #671",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/671.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Earring",
            "value": "Earring"
          },
          {
            "trait_type": "Eyewear",
            "value": "Horned Rim Glasses"
          },
          {
            "trait_type": "Headwear",
            "value": "Cap Forward"
          },
          {
            "trait_type": "Type",
            "value": "Masayoshi"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 670,
        "name": "Bpunks #670",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/670.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Headwear",
            "value": "Cap Forward"
          },
          {
            "trait_type": "Mouth Prop",
            "value": "Pipe"
          },
          {
            "trait_type": "Necklace",
            "value": "Gold Chain"
          },
          {
            "trait_type": "Type",
            "value": "Masayoshi"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 669,
        "name": "Bpunks #669",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/669.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Earring",
            "value": "Earring"
          },
          {
            "trait_type": "Eyewear",
            "value": "Eye Mask"
          },
          {
            "trait_type": "Headwear",
            "value": "Dorag"
          },
          {
            "trait_type": "Type",
            "value": "Masayoshi"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 668,
        "name": "Bpunks #668",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/668.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Earring",
            "value": "Earring"
          },
          {
            "trait_type": "Headwear",
            "value": "Cap Forward"
          },
          {
            "trait_type": "Mouth Prop",
            "value": "Pipe"
          },
          {
            "trait_type": "Necklace",
            "value": "Silver Chain"
          },
          {
            "trait_type": "Type",
            "value": "Masayoshi"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 667,
        "name": "Bpunks #667",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/667.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Eyewear",
            "value": "VR"
          },
          {
            "trait_type": "Headwear",
            "value": "Cap Forward"
          },
          {
            "trait_type": "Mouth Prop",
            "value": "Cigarette"
          },
          {
            "trait_type": "Type",
            "value": "Masayoshi"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 666,
        "name": "Bpunks #666",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/666.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Eyewear",
            "value": "Regular Shades"
          },
          {
            "trait_type": "Headwear",
            "value": "Cap Forward"
          },
          {
            "trait_type": "Type",
            "value": "Masayoshi"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      },
      {
        "id": 665,
        "name": "Bpunks #665",
        "image": "https://bafybeihtkm7laawttavonnpqkc3ihqrtcejhhfwmirnisfafa2wndt6kem.ipfs.w3s.link/665.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "mintDate": "2024-08-04",
        "traits": [
          {
            "trait_type": "Earring",
            "value": "Earring"
          },
          {
            "trait_type": "Headwear",
            "value": "Cap Forward"
          },
          {
            "trait_type": "Mouth Prop",
            "value": "Pipe"
          },
          {
            "trait_type": "Necklace",
            "value": "Gold Chain"
          },
          {
            "trait_type": "Type",
            "value": "Masayoshi"
          },
          {
            "trait_type": "Background",
            "value": "bitnet"
          }
        ],
      }
    ],
    "holders": [
      {
        "rank": 1,
        "address": "0xBD51ca3e6a08A4a4e07B456aC65aD969e0d2f6bb",
        "quantity": 44,
        "percentage": "88.0%",
        "tokenIds": [
          665,
          666,
          667,
          668,
          669,
          670,
          671,
          672,
          673,
          674,
          675,
          676,
          677,
          678,
          679,
          680,
          681,
          682,
          689,
          690,
          691,
          692,
          693,
          694,
          695,
          696,
          697,
          698,
          699,
          700,
          701,
          702,
          703,
          704,
          705,
          706,
          707,
          708,
          709,
          710,
          711,
          712,
          713,
          714
        ]
      },
      {
        "rank": 2,
        "address": "0x003f9f694516f18Ea6Ae5E1315fB02c905Feb1ba",
        "quantity": 2,
        "percentage": "4.0%",
        "tokenIds": [
          685,
          686
        ]
      },
      {
        "rank": 3,
        "address": "0xbAE74cBA745Ccfb9393B03d568375E28D46D2a67",
        "quantity": 2,
        "percentage": "4.0%",
        "tokenIds": [
          683,
          684
        ]
      },
      {
        "rank": 4,
        "address": "0xf527F750242F47bA226eb1f90E6Dea399F573E0E",
        "quantity": 2,
        "percentage": "4.0%",
        "tokenIds": [
          687,
          688
        ]
      }
    ],
    "recentTransfers": []
  },
  {
    "id": "milestone",
    "name": "Milestone",
    "symbol": "MILE",
    "contract": "0x155fE91Ce99862DF12906EaF199B48872cA5B709",
    "standard": "BTS-721 / ERC-721",
    "description": "Bitnet 6000 wallet milestone. A special 19-piece honorary commemorative badge collection celebrating 6,000 active on-chain wallets on Bitnet L1.",
    "bannerImage": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
    "iconImage": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
    "totalSupply": 19,
    "minted": 19,
    "holdersCount": 19,
    "volume24hBtn": 0,
    "verified": true,
    "category": "Milestone & Commemorative",
    "items": [
      {
        "id": 19,
        "name": "Milestone #19 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0x649D108FCb39a6b952CB1df070F1C086852eD270",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#19 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      },
      {
        "id": 18,
        "name": "Milestone #18 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0x345e3E379bf66EC1b5aBFFEEbA4835d749B870eB",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#18 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      },
      {
        "id": 17,
        "name": "Milestone #17 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xEFbd93D9D7D5244e19156d5D9AFbAEFcC3697435",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#17 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      },
      {
        "id": 16,
        "name": "Milestone #16 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xADF37C0b7bbA758eC954e1ED8dA1398010908B52",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#16 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      },
      {
        "id": 15,
        "name": "Milestone #15 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0x49f7E9aF964863B6A4a2F3A41Dc4ce801e038D2c",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#15 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      },
      {
        "id": 14,
        "name": "Milestone #14 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0x5be1FeE3A2e0F3d21D5861fc7fa1A9683B34012f",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#14 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      },
      {
        "id": 13,
        "name": "Milestone #13 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#13 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      },
      {
        "id": 12,
        "name": "Milestone #12 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xe228141C8217862ff791Ab6674c9d619beE60136",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#12 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      },
      {
        "id": 11,
        "name": "Milestone #11 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xdCA65F7a137CfB8c414E0B6AA7547af3fe058835",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#11 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      },
      {
        "id": 10,
        "name": "Milestone #10 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xF00b039d6715240C3cFf52ab3555d7268Ea587e8",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#10 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      },
      {
        "id": 9,
        "name": "Milestone #9 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xEE9672c193C84F03dA3C13FcE6fE856cA4F7c89c",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#9 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      },
      {
        "id": 8,
        "name": "Milestone #8 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0x16F1b90E49963cBC05EB274dB0deE6Bf8A5E6b8a",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#8 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      },
      {
        "id": 7,
        "name": "Milestone #7 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xf527F750242F47bA226eb1f90E6Dea399F573E0E",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#7 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      },
      {
        "id": 6,
        "name": "Milestone #6 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0x3c0862C0881a90c89c3517Fd52303ca7b996228e",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#6 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      },
      {
        "id": 5,
        "name": "Milestone #5 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0x0da2D0C2cf9E48C9Cea43D3082A9033ffeCe2334",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#5 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      },
      {
        "id": 4,
        "name": "Milestone #4 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xe3bdCB5e4d2d292BA9916759ef1A26F7Ade2eA65",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#4 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      },
      {
        "id": 3,
        "name": "Milestone #3 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0x5E40719Da8cb764614FB790AB0D31Ab82B69CFeb",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#3 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      },
      {
        "id": 2,
        "name": "Milestone #2 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xbAE74cBA745Ccfb9393B03d568375E28D46D2a67",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#2 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      },
      {
        "id": 1,
        "name": "Milestone #1 (6000 Wallets)",
        "image": "https://gateway.pinata.cloud/ipfs/QmaNne9mfy1D1QxSCeZcXZgZa5YEqrYMCEbrdnpTUhcXeH",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0x003f9f694516f18Ea6Ae5E1315fB02c905Feb1ba",
        "mintDate": "2024-09-15",
        "traits": [
          {
            "trait_type": "Milestone",
            "value": "6,000 Active Wallets"
          },
          {
            "trait_type": "Network",
            "value": "Bitnet L1 Mainnet"
          },
          {
            "trait_type": "Edition",
            "value": "#1 / 19"
          },
          {
            "trait_type": "Kategori",
            "value": "Genesis Commemorative Badge"
          }
        ],
      }
    ],
    "holders": [
      {
        "rank": 1,
        "address": "0x003f9f694516f18Ea6Ae5E1315fB02c905Feb1ba",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          1
        ]
      },
      {
        "rank": 2,
        "address": "0x0da2D0C2cf9E48C9Cea43D3082A9033ffeCe2334",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          5
        ]
      },
      {
        "rank": 3,
        "address": "0x16F1b90E49963cBC05EB274dB0deE6Bf8A5E6b8a",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          8
        ]
      },
      {
        "rank": 4,
        "address": "0x345e3E379bf66EC1b5aBFFEEbA4835d749B870eB",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          18
        ]
      },
      {
        "rank": 5,
        "address": "0x3c0862C0881a90c89c3517Fd52303ca7b996228e",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          6
        ]
      },
      {
        "rank": 6,
        "address": "0x49f7E9aF964863B6A4a2F3A41Dc4ce801e038D2c",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          15
        ]
      },
      {
        "rank": 7,
        "address": "0x5be1FeE3A2e0F3d21D5861fc7fa1A9683B34012f",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          14
        ]
      },
      {
        "rank": 8,
        "address": "0x5E40719Da8cb764614FB790AB0D31Ab82B69CFeb",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          3
        ]
      },
      {
        "rank": 9,
        "address": "0x649D108FCb39a6b952CB1df070F1C086852eD270",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          19
        ]
      },
      {
        "rank": 10,
        "address": "0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          13
        ]
      },
      {
        "rank": 11,
        "address": "0xADF37C0b7bbA758eC954e1ED8dA1398010908B52",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          16
        ]
      },
      {
        "rank": 12,
        "address": "0xbAE74cBA745Ccfb9393B03d568375E28D46D2a67",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          2
        ]
      },
      {
        "rank": 13,
        "address": "0xdCA65F7a137CfB8c414E0B6AA7547af3fe058835",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          11
        ]
      },
      {
        "rank": 14,
        "address": "0xe228141C8217862ff791Ab6674c9d619beE60136",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          12
        ]
      },
      {
        "rank": 15,
        "address": "0xe3bdCB5e4d2d292BA9916759ef1A26F7Ade2eA65",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          4
        ]
      },
      {
        "rank": 16,
        "address": "0xEE9672c193C84F03dA3C13FcE6fE856cA4F7c89c",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          9
        ]
      },
      {
        "rank": 17,
        "address": "0xEFbd93D9D7D5244e19156d5D9AFbAEFcC3697435",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          17
        ]
      },
      {
        "rank": 18,
        "address": "0xF00b039d6715240C3cFf52ab3555d7268Ea587e8",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          10
        ]
      },
      {
        "rank": 19,
        "address": "0xf527F750242F47bA226eb1f90E6Dea399F573E0E",
        "quantity": 1,
        "percentage": "5.3%",
        "tokenIds": [
          7
        ]
      }
    ],
    "recentTransfers": []
  },
  {
    "id": "the-village",
    "name": "TheVillage: Founders Edition",
    "symbol": "TVG",
    "contract": "0x2142c6dDBfa7ae9E283d0FbFFFfbe14E502D6265",
    "standard": "BTS-721 / ERC-721",
    "description": "Village is a collection of 128 exclusive dark medieval themed, digitally created avatars on Bitnet L1.",
    "bannerImage": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/58.png",
    "iconImage": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/31.png",
    "totalSupply": 128,
    "minted": 58,
    "holdersCount": 15,
    "volume24hBtn": 0,
    "verified": true,
    "category": "Gaming & Avatar",
    "items": [
      {
        "id": 58,
        "name": "Village: Founders Edition #58",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/58.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0x535b4F102e42bD4458E6cA004B5C1717645Ad637",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Guardian"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "27"
          },
          {
            "trait_type": "Agility",
            "value": "85"
          },
          {
            "trait_type": "Stamina",
            "value": "89"
          },
          {
            "trait_type": "Magic",
            "value": "12"
          }
        ],
      },
      {
        "id": 57,
        "name": "Village: Founders Edition #57",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/57.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0x535b4F102e42bD4458E6cA004B5C1717645Ad637",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Guardian"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "16"
          },
          {
            "trait_type": "Agility",
            "value": "80"
          },
          {
            "trait_type": "Stamina",
            "value": "87"
          },
          {
            "trait_type": "Magic",
            "value": "39"
          }
        ],
      },
      {
        "id": 56,
        "name": "Village: Founders Edition #56",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/56.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0x535b4F102e42bD4458E6cA004B5C1717645Ad637",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Warrior"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "93"
          },
          {
            "trait_type": "Agility",
            "value": "37"
          },
          {
            "trait_type": "Stamina",
            "value": "50"
          },
          {
            "trait_type": "Magic",
            "value": "0"
          }
        ],
      },
      {
        "id": 55,
        "name": "Village: Founders Edition #55",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/55.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0x535b4F102e42bD4458E6cA004B5C1717645Ad637",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Magical"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "33"
          },
          {
            "trait_type": "Agility",
            "value": "80"
          },
          {
            "trait_type": "Stamina",
            "value": "62"
          },
          {
            "trait_type": "Magic",
            "value": "94"
          }
        ],
      },
      {
        "id": 54,
        "name": "Village: Founders Edition #54",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/54.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0x535b4F102e42bD4458E6cA004B5C1717645Ad637",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Magical"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "38"
          },
          {
            "trait_type": "Agility",
            "value": "89"
          },
          {
            "trait_type": "Stamina",
            "value": "51"
          },
          {
            "trait_type": "Magic",
            "value": "90"
          }
        ],
      },
      {
        "id": 53,
        "name": "Village: Founders Edition #53",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/53.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0x535b4F102e42bD4458E6cA004B5C1717645Ad637",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Guardian"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "26"
          },
          {
            "trait_type": "Agility",
            "value": "89"
          },
          {
            "trait_type": "Stamina",
            "value": "94"
          },
          {
            "trait_type": "Magic",
            "value": "36"
          }
        ],
      },
      {
        "id": 52,
        "name": "Village: Founders Edition #52",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/52.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0x535b4F102e42bD4458E6cA004B5C1717645Ad637",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Magical"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "38"
          },
          {
            "trait_type": "Agility",
            "value": "100"
          },
          {
            "trait_type": "Stamina",
            "value": "51"
          },
          {
            "trait_type": "Magic",
            "value": "92"
          }
        ],
      },
      {
        "id": 51,
        "name": "Village: Founders Edition #51",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/51.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0x535b4F102e42bD4458E6cA004B5C1717645Ad637",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Guardian"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "40"
          },
          {
            "trait_type": "Agility",
            "value": "98"
          },
          {
            "trait_type": "Stamina",
            "value": "88"
          },
          {
            "trait_type": "Magic",
            "value": "10"
          }
        ],
      },
      {
        "id": 50,
        "name": "Village: Founders Edition #50",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/50.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0xbAE74cBA745Ccfb9393B03d568375E28D46D2a67",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Guardian"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "35"
          },
          {
            "trait_type": "Agility",
            "value": "84"
          },
          {
            "trait_type": "Stamina",
            "value": "99"
          },
          {
            "trait_type": "Magic",
            "value": "18"
          }
        ],
      },
      {
        "id": 49,
        "name": "Village: Founders Edition #49",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/49.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xbAE74cBA745Ccfb9393B03d568375E28D46D2a67",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Warrior"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "93"
          },
          {
            "trait_type": "Agility",
            "value": "23"
          },
          {
            "trait_type": "Stamina",
            "value": "74"
          },
          {
            "trait_type": "Magic",
            "value": "0"
          }
        ],
      },
      {
        "id": 48,
        "name": "Village: Founders Edition #48",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/48.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0x49f7E9aF964863B6A4a2F3A41Dc4ce801e038D2c",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Magical"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "11"
          },
          {
            "trait_type": "Agility",
            "value": "82"
          },
          {
            "trait_type": "Stamina",
            "value": "66"
          },
          {
            "trait_type": "Magic",
            "value": "100"
          }
        ],
      },
      {
        "id": 47,
        "name": "Village: Founders Edition #47",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/47.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0x49f7E9aF964863B6A4a2F3A41Dc4ce801e038D2c",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Guardian"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "10"
          },
          {
            "trait_type": "Agility",
            "value": "90"
          },
          {
            "trait_type": "Stamina",
            "value": "87"
          },
          {
            "trait_type": "Magic",
            "value": "24"
          }
        ],
      },
      {
        "id": 46,
        "name": "Village: Founders Edition #46",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/46.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xA00568cf40AB35AC6f63CB2299a1840dB9eC96C9",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Warrior"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "86"
          },
          {
            "trait_type": "Agility",
            "value": "33"
          },
          {
            "trait_type": "Stamina",
            "value": "72"
          },
          {
            "trait_type": "Magic",
            "value": "0"
          }
        ],
      },
      {
        "id": 45,
        "name": "Village: Founders Edition #45",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/45.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0xbAE74cBA745Ccfb9393B03d568375E28D46D2a67",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Sentinel"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "34"
          },
          {
            "trait_type": "Agility",
            "value": "73"
          },
          {
            "trait_type": "Stamina",
            "value": "61"
          },
          {
            "trait_type": "Magic",
            "value": "22"
          }
        ],
      },
      {
        "id": 44,
        "name": "Village: Founders Edition #44",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/44.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xbAE74cBA745Ccfb9393B03d568375E28D46D2a67",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Elf"
          },
          {
            "trait_type": "Class",
            "value": "Magical"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "38"
          },
          {
            "trait_type": "Agility",
            "value": "95"
          },
          {
            "trait_type": "Stamina",
            "value": "68"
          },
          {
            "trait_type": "Magic",
            "value": "95"
          }
        ],
      },
      {
        "id": 43,
        "name": "Village: Founders Edition #43",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/43.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0x2930D9315bc3184Ca13A5a2c0A23Ce9B8E7364B4",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Magical"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "31"
          },
          {
            "trait_type": "Agility",
            "value": "87"
          },
          {
            "trait_type": "Stamina",
            "value": "64"
          },
          {
            "trait_type": "Magic",
            "value": "98"
          }
        ],
      },
      {
        "id": 42,
        "name": "Village: Founders Edition #42",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/42.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0xbAE74cBA745Ccfb9393B03d568375E28D46D2a67",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Guardian"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "11"
          },
          {
            "trait_type": "Agility",
            "value": "95"
          },
          {
            "trait_type": "Stamina",
            "value": "88"
          },
          {
            "trait_type": "Magic",
            "value": "19"
          }
        ],
      },
      {
        "id": 41,
        "name": "Village: Founders Edition #41",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/41.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0xbAE74cBA745Ccfb9393B03d568375E28D46D2a67",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Elf"
          },
          {
            "trait_type": "Class",
            "value": "Guardian"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "17"
          },
          {
            "trait_type": "Agility",
            "value": "86"
          },
          {
            "trait_type": "Stamina",
            "value": "93"
          },
          {
            "trait_type": "Magic",
            "value": "31"
          }
        ],
      },
      {
        "id": 40,
        "name": "Village: Founders Edition #40",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/40.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0x535b4F102e42bD4458E6cA004B5C1717645Ad637",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Elf"
          },
          {
            "trait_type": "Class",
            "value": "Sentinel"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "69"
          },
          {
            "trait_type": "Agility",
            "value": "79"
          },
          {
            "trait_type": "Stamina",
            "value": "65"
          },
          {
            "trait_type": "Magic",
            "value": "40"
          }
        ],
      },
      {
        "id": 39,
        "name": "Village: Founders Edition #39",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/39.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xbAE74cBA745Ccfb9393B03d568375E28D46D2a67",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Warrior"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "90"
          },
          {
            "trait_type": "Agility",
            "value": "23"
          },
          {
            "trait_type": "Stamina",
            "value": "50"
          },
          {
            "trait_type": "Magic",
            "value": "0"
          }
        ],
      },
      {
        "id": 38,
        "name": "Village: Founders Edition #38",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/38.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0x87AD92DE95E49564dE8E28cbb01d9512DF779173",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Magical"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "32"
          },
          {
            "trait_type": "Agility",
            "value": "87"
          },
          {
            "trait_type": "Stamina",
            "value": "80"
          },
          {
            "trait_type": "Magic",
            "value": "93"
          }
        ],
      },
      {
        "id": 37,
        "name": "Village: Founders Edition #37",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/37.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0x87AD92DE95E49564dE8E28cbb01d9512DF779173",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Warrior"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "77"
          },
          {
            "trait_type": "Agility",
            "value": "34"
          },
          {
            "trait_type": "Stamina",
            "value": "58"
          },
          {
            "trait_type": "Magic",
            "value": "0"
          }
        ],
      },
      {
        "id": 36,
        "name": "Village: Founders Edition #36",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/36.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0x87AD92DE95E49564dE8E28cbb01d9512DF779173",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Sentinel"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "43"
          },
          {
            "trait_type": "Agility",
            "value": "57"
          },
          {
            "trait_type": "Stamina",
            "value": "67"
          },
          {
            "trait_type": "Magic",
            "value": "38"
          }
        ],
      },
      {
        "id": 35,
        "name": "Village: Founders Edition #35",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/35.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0x92c582175C05a80382698F133BA83119a548169e",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Warrior"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "95"
          },
          {
            "trait_type": "Agility",
            "value": "25"
          },
          {
            "trait_type": "Stamina",
            "value": "69"
          },
          {
            "trait_type": "Magic",
            "value": "0"
          }
        ],
      },
      {
        "id": 34,
        "name": "Village: Founders Edition #34",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/34.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xC00acD79a499A3B6EcBB96aF67075f0e86f7aaF2",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Magical"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "21"
          },
          {
            "trait_type": "Agility",
            "value": "94"
          },
          {
            "trait_type": "Stamina",
            "value": "56"
          },
          {
            "trait_type": "Magic",
            "value": "92"
          }
        ],
      },
      {
        "id": 33,
        "name": "Village: Founders Edition #33",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/33.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xC00acD79a499A3B6EcBB96aF67075f0e86f7aaF2",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Warrior"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "99"
          },
          {
            "trait_type": "Agility",
            "value": "10"
          },
          {
            "trait_type": "Stamina",
            "value": "80"
          },
          {
            "trait_type": "Magic",
            "value": "0"
          }
        ],
      },
      {
        "id": 32,
        "name": "Village: Founders Edition #32",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/32.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0xC00acD79a499A3B6EcBB96aF67075f0e86f7aaF2",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Sentinel"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "58"
          },
          {
            "trait_type": "Agility",
            "value": "63"
          },
          {
            "trait_type": "Stamina",
            "value": "58"
          },
          {
            "trait_type": "Magic",
            "value": "59"
          }
        ],
      },
      {
        "id": 31,
        "name": "Village: Founders Edition #31",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/31.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0x003f9f694516f18Ea6Ae5E1315fB02c905Feb1ba",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Warrior"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "73"
          },
          {
            "trait_type": "Agility",
            "value": "13"
          },
          {
            "trait_type": "Stamina",
            "value": "70"
          },
          {
            "trait_type": "Magic",
            "value": "0"
          }
        ],
      },
      {
        "id": 30,
        "name": "Village: Founders Edition #30",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/30.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0x3c0862C0881a90c89c3517Fd52303ca7b996228e",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Guardian"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "36"
          },
          {
            "trait_type": "Agility",
            "value": "84"
          },
          {
            "trait_type": "Stamina",
            "value": "81"
          },
          {
            "trait_type": "Magic",
            "value": "16"
          }
        ],
      },
      {
        "id": 29,
        "name": "Village: Founders Edition #29",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/29.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0xADF37C0b7bbA758eC954e1ED8dA1398010908B52",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Guardian"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "11"
          },
          {
            "trait_type": "Agility",
            "value": "90"
          },
          {
            "trait_type": "Stamina",
            "value": "84"
          },
          {
            "trait_type": "Magic",
            "value": "19"
          }
        ],
      },
      {
        "id": 28,
        "name": "Village: Founders Edition #28",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/28.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0xA0975545805De0B791eeD69e2C43d09D855428F2",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Guardian"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "40"
          },
          {
            "trait_type": "Agility",
            "value": "96"
          },
          {
            "trait_type": "Stamina",
            "value": "100"
          },
          {
            "trait_type": "Magic",
            "value": "28"
          }
        ],
      },
      {
        "id": 27,
        "name": "Village: Founders Edition #27",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/27.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0xA0975545805De0B791eeD69e2C43d09D855428F2",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Elf"
          },
          {
            "trait_type": "Class",
            "value": "Sentinel"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "67"
          },
          {
            "trait_type": "Agility",
            "value": "61"
          },
          {
            "trait_type": "Stamina",
            "value": "78"
          },
          {
            "trait_type": "Magic",
            "value": "46"
          }
        ],
      },
      {
        "id": 26,
        "name": "Village: Founders Edition #26",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/26.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xe3bdCB5e4d2d292BA9916759ef1A26F7Ade2eA65",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Warrior"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "70"
          },
          {
            "trait_type": "Agility",
            "value": "33"
          },
          {
            "trait_type": "Stamina",
            "value": "69"
          },
          {
            "trait_type": "Magic",
            "value": "0"
          }
        ],
      },
      {
        "id": 25,
        "name": "Village: Founders Edition #25",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/25.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0x1325fE5AaB071FB5a5e6078bd61d3C22e503A680",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Guardian"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "24"
          },
          {
            "trait_type": "Agility",
            "value": "90"
          },
          {
            "trait_type": "Stamina",
            "value": "91"
          },
          {
            "trait_type": "Magic",
            "value": "20"
          }
        ],
      },
      {
        "id": 24,
        "name": "Village: Founders Edition #24",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/24.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0x1325fE5AaB071FB5a5e6078bd61d3C22e503A680",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Guardian"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "27"
          },
          {
            "trait_type": "Agility",
            "value": "90"
          },
          {
            "trait_type": "Stamina",
            "value": "80"
          },
          {
            "trait_type": "Magic",
            "value": "15"
          }
        ],
      },
      {
        "id": 23,
        "name": "Village: Founders Edition #23",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/23.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0x1325fE5AaB071FB5a5e6078bd61d3C22e503A680",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Magical"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "19"
          },
          {
            "trait_type": "Agility",
            "value": "100"
          },
          {
            "trait_type": "Stamina",
            "value": "61"
          },
          {
            "trait_type": "Magic",
            "value": "99"
          }
        ],
      },
      {
        "id": 22,
        "name": "Village: Founders Edition #22",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/22.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0x1325fE5AaB071FB5a5e6078bd61d3C22e503A680",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Elf"
          },
          {
            "trait_type": "Class",
            "value": "Guardian"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "22"
          },
          {
            "trait_type": "Agility",
            "value": "99"
          },
          {
            "trait_type": "Stamina",
            "value": "85"
          },
          {
            "trait_type": "Magic",
            "value": "35"
          }
        ],
      },
      {
        "id": 21,
        "name": "Village: Founders Edition #21",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/21.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xA0975545805De0B791eeD69e2C43d09D855428F2",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "God"
          },
          {
            "trait_type": "Class",
            "value": "Warrior"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "90"
          },
          {
            "trait_type": "Agility",
            "value": "32"
          },
          {
            "trait_type": "Stamina",
            "value": "52"
          },
          {
            "trait_type": "Magic",
            "value": "0"
          }
        ],
      },
      {
        "id": 20,
        "name": "Village: Founders Edition #20",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/20.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0x1325fE5AaB071FB5a5e6078bd61d3C22e503A680",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "God"
          },
          {
            "trait_type": "Class",
            "value": "Guardian"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "29"
          },
          {
            "trait_type": "Agility",
            "value": "87"
          },
          {
            "trait_type": "Stamina",
            "value": "94"
          },
          {
            "trait_type": "Magic",
            "value": "18"
          }
        ],
      },
      {
        "id": 19,
        "name": "Village: Founders Edition #19",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/19.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0x1325fE5AaB071FB5a5e6078bd61d3C22e503A680",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "God"
          },
          {
            "trait_type": "Class",
            "value": "Warrior"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "80"
          },
          {
            "trait_type": "Agility",
            "value": "15"
          },
          {
            "trait_type": "Stamina",
            "value": "64"
          },
          {
            "trait_type": "Magic",
            "value": "0"
          }
        ],
      },
      {
        "id": 18,
        "name": "Village: Founders Edition #18",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/18.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0x1325fE5AaB071FB5a5e6078bd61d3C22e503A680",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "God"
          },
          {
            "trait_type": "Class",
            "value": "Warrior"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "96"
          },
          {
            "trait_type": "Agility",
            "value": "27"
          },
          {
            "trait_type": "Stamina",
            "value": "57"
          },
          {
            "trait_type": "Magic",
            "value": "0"
          }
        ],
      },
      {
        "id": 17,
        "name": "Village: Founders Edition #17",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/17.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xe228141C8217862ff791Ab6674c9d619beE60136",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Warrior"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "84"
          },
          {
            "trait_type": "Agility",
            "value": "34"
          },
          {
            "trait_type": "Stamina",
            "value": "59"
          },
          {
            "trait_type": "Magic",
            "value": "0"
          }
        ],
      },
      {
        "id": 16,
        "name": "Village: Founders Edition #16",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/16.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0x1325fE5AaB071FB5a5e6078bd61d3C22e503A680",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Warrior"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "72"
          },
          {
            "trait_type": "Agility",
            "value": "22"
          },
          {
            "trait_type": "Stamina",
            "value": "67"
          },
          {
            "trait_type": "Magic",
            "value": "0"
          }
        ],
      },
      {
        "id": 15,
        "name": "Village: Founders Edition #15",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/15.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0x1325fE5AaB071FB5a5e6078bd61d3C22e503A680",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Guardian"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "23"
          },
          {
            "trait_type": "Agility",
            "value": "81"
          },
          {
            "trait_type": "Stamina",
            "value": "96"
          },
          {
            "trait_type": "Magic",
            "value": "20"
          }
        ],
      },
      {
        "id": 14,
        "name": "Village: Founders Edition #14",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/14.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0xe228141C8217862ff791Ab6674c9d619beE60136",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Sentinel"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "63"
          },
          {
            "trait_type": "Agility",
            "value": "72"
          },
          {
            "trait_type": "Stamina",
            "value": "67"
          },
          {
            "trait_type": "Magic",
            "value": "23"
          }
        ],
      },
      {
        "id": 13,
        "name": "Village: Founders Edition #13",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/13.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0x1325fE5AaB071FB5a5e6078bd61d3C22e503A680",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Guardian"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "15"
          },
          {
            "trait_type": "Agility",
            "value": "96"
          },
          {
            "trait_type": "Stamina",
            "value": "90"
          },
          {
            "trait_type": "Magic",
            "value": "18"
          }
        ],
      },
      {
        "id": 12,
        "name": "Village: Founders Edition #12",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/12.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0x1325fE5AaB071FB5a5e6078bd61d3C22e503A680",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Warrior"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "75"
          },
          {
            "trait_type": "Agility",
            "value": "26"
          },
          {
            "trait_type": "Stamina",
            "value": "64"
          },
          {
            "trait_type": "Magic",
            "value": "0"
          }
        ],
      },
      {
        "id": 11,
        "name": "Village: Founders Edition #11",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/11.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xe228141C8217862ff791Ab6674c9d619beE60136",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Warrior"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "87"
          },
          {
            "trait_type": "Agility",
            "value": "30"
          },
          {
            "trait_type": "Stamina",
            "value": "63"
          },
          {
            "trait_type": "Magic",
            "value": "0"
          }
        ],
      },
      {
        "id": 10,
        "name": "Village: Founders Edition #10",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/10.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0x1325fE5AaB071FB5a5e6078bd61d3C22e503A680",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Elf"
          },
          {
            "trait_type": "Class",
            "value": "Magical"
          },
          {
            "trait_type": "Clan",
            "value": "Volsung"
          },
          {
            "trait_type": "Strength",
            "value": "28"
          },
          {
            "trait_type": "Agility",
            "value": "85"
          },
          {
            "trait_type": "Stamina",
            "value": "65"
          },
          {
            "trait_type": "Magic",
            "value": "93"
          }
        ],
      },
      {
        "id": 9,
        "name": "Village: Founders Edition #9",
        "image": "https://ipfs.io/ipfs/Qmcxp3McC75i9CJv7hCuv6m2h5fcLJZraZsP6CgdqHuV6W/9.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xe228141C8217862ff791Ab6674c9d619beE60136",
        "mintDate": "2024-09-20",
        "traits": [
          {
            "trait_type": "Race",
            "value": "Human"
          },
          {
            "trait_type": "Class",
            "value": "Magical"
          },
          {
            "trait_type": "Clan",
            "value": "Wulfings"
          },
          {
            "trait_type": "Strength",
            "value": "33"
          },
          {
            "trait_type": "Agility",
            "value": "97"
          },
          {
            "trait_type": "Stamina",
            "value": "68"
          },
          {
            "trait_type": "Magic",
            "value": "92"
          }
        ],
      }
    ],
    "holders": [
      {
        "rank": 1,
        "address": "0x1325fE5AaB071FB5a5e6078bd61d3C22e503A680",
        "quantity": 12,
        "percentage": "24.0%",
        "tokenIds": [
          10,
          12,
          13,
          15,
          16,
          18,
          19,
          20,
          22,
          23,
          24,
          25
        ]
      },
      {
        "rank": 2,
        "address": "0x535b4F102e42bD4458E6cA004B5C1717645Ad637",
        "quantity": 9,
        "percentage": "18.0%",
        "tokenIds": [
          40,
          51,
          52,
          53,
          54,
          55,
          56,
          57,
          58
        ]
      },
      {
        "rank": 3,
        "address": "0xbAE74cBA745Ccfb9393B03d568375E28D46D2a67",
        "quantity": 7,
        "percentage": "14.0%",
        "tokenIds": [
          39,
          41,
          42,
          44,
          45,
          49,
          50
        ]
      },
      {
        "rank": 4,
        "address": "0xe228141C8217862ff791Ab6674c9d619beE60136",
        "quantity": 4,
        "percentage": "8.0%",
        "tokenIds": [
          9,
          11,
          14,
          17
        ]
      },
      {
        "rank": 5,
        "address": "0x87AD92DE95E49564dE8E28cbb01d9512DF779173",
        "quantity": 3,
        "percentage": "6.0%",
        "tokenIds": [
          36,
          37,
          38
        ]
      },
      {
        "rank": 6,
        "address": "0xA0975545805De0B791eeD69e2C43d09D855428F2",
        "quantity": 3,
        "percentage": "6.0%",
        "tokenIds": [
          21,
          27,
          28
        ]
      },
      {
        "rank": 7,
        "address": "0xC00acD79a499A3B6EcBB96aF67075f0e86f7aaF2",
        "quantity": 3,
        "percentage": "6.0%",
        "tokenIds": [
          32,
          33,
          34
        ]
      },
      {
        "rank": 8,
        "address": "0x49f7E9aF964863B6A4a2F3A41Dc4ce801e038D2c",
        "quantity": 2,
        "percentage": "4.0%",
        "tokenIds": [
          47,
          48
        ]
      },
      {
        "rank": 9,
        "address": "0x003f9f694516f18Ea6Ae5E1315fB02c905Feb1ba",
        "quantity": 1,
        "percentage": "2.0%",
        "tokenIds": [
          31
        ]
      },
      {
        "rank": 10,
        "address": "0x2930D9315bc3184Ca13A5a2c0A23Ce9B8E7364B4",
        "quantity": 1,
        "percentage": "2.0%",
        "tokenIds": [
          43
        ]
      },
      {
        "rank": 11,
        "address": "0x3c0862C0881a90c89c3517Fd52303ca7b996228e",
        "quantity": 1,
        "percentage": "2.0%",
        "tokenIds": [
          30
        ]
      },
      {
        "rank": 12,
        "address": "0x92c582175C05a80382698F133BA83119a548169e",
        "quantity": 1,
        "percentage": "2.0%",
        "tokenIds": [
          35
        ]
      },
      {
        "rank": 13,
        "address": "0xA00568cf40AB35AC6f63CB2299a1840dB9eC96C9",
        "quantity": 1,
        "percentage": "2.0%",
        "tokenIds": [
          46
        ]
      },
      {
        "rank": 14,
        "address": "0xADF37C0b7bbA758eC954e1ED8dA1398010908B52",
        "quantity": 1,
        "percentage": "2.0%",
        "tokenIds": [
          29
        ]
      },
      {
        "rank": 15,
        "address": "0xe3bdCB5e4d2d292BA9916759ef1A26F7Ade2eA65",
        "quantity": 1,
        "percentage": "2.0%",
        "tokenIds": [
          26
        ]
      }
    ],
    "recentTransfers": []
  },
  {
    "id": "xenwave",
    "name": "Xenwave Community Collection",
    "symbol": "XCC",
    "contract": "0x34F75c8Cbe518BBBD6363E4f840C26bB54c9c5eE",
    "standard": "BTS-721 / ERC-721",
    "description": "Historical artwork created by the Bitnet community, featuring the original BTN symbol, STRAT, and PixelCat NFT collection.",
    "bannerImage": "https://ipfs.io/ipfs/QmSvqxFK5Xy25ArC3r9Mw4PG8D7xoRftNDw8SioUbNLQ2e",
    "iconImage": "https://ipfs.io/ipfs/QmRmxP1er1dKo8dJS2b4y9fnDh6kemvU435uytfhX8FdH8",
    "totalSupply": 7,
    "minted": 7,
    "holdersCount": 4,
    "volume24hBtn": 0,
    "verified": true,
    "category": "Topluluk & Tarihsel",
    "items": [
      {
        "id": 6,
        "name": "BITNET PRICE 10/09/2024",
        "image": "https://ipfs.io/ipfs/QmQQjYW62PxTKpYh3EVwgPfasKWt6gwqDpdNgXYL6YRp9n",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xADF37C0b7bbA758eC954e1ED8dA1398010908B52",
        "mintDate": "2024-08-02",
        "traits": [
          {
            "trait_type": "Koleksiyon",
            "value": "Xenwave Community"
          },
          {
            "trait_type": "Description",
            "value": "Data on BTN on 10/09/2024"
          }
        ],
      },
      {
        "id": 5,
        "name": "STRAT",
        "image": "https://ipfs.io/ipfs/QmXCNYgm779txz4cwpbscZqWa4LzjuzYZZ3L3UME2QdtqF",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xADF37C0b7bbA758eC954e1ED8dA1398010908B52",
        "mintDate": "2024-08-02",
        "traits": [
          {
            "trait_type": "Koleksiyon",
            "value": "Xenwave Community"
          },
          {
            "trait_type": "Description",
            "value": "First NFT with the STRAT symbol\nCreation date 10/09/2024"
          }
        ],
      },
      {
        "id": 4,
        "name": "‎",
        "image": "https://ipfs.io/ipfs/QmdWrzJ7FZrbTeZDejjzT5coArgwXEj5uZEph2BoapXPDT",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xf3a6cbc139C490ECD81370E2424BF8cc604f3536",
        "mintDate": "2024-08-02",
        "traits": [
          {
            "trait_type": "Koleksiyon",
            "value": "Xenwave Community"
          },
          {
            "trait_type": "Description",
            "value": "知能"
          }
        ],
      },
      {
        "id": 3,
        "name": "First NFT token Bitnet symbol",
        "image": "https://ipfs.io/ipfs/QmSvqxFK5Xy25ArC3r9Mw4PG8D7xoRftNDw8SioUbNLQ2e",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xADF37C0b7bbA758eC954e1ED8dA1398010908B52",
        "mintDate": "2024-08-02",
        "traits": [
          {
            "trait_type": "Koleksiyon",
            "value": "Xenwave Community"
          },
          {
            "trait_type": "Description",
            "value": "First NFT token Bitnet symbol, created on 02/08/2024"
          }
        ],
      },
      {
        "id": 2,
        "name": "The PixelCat #2",
        "image": "https://ipfs.io/ipfs/QmYiTuWzoPc4DNLiw4a2AZNtSYbnW7F1YjMBmfpU6MZCWt",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0xA0975545805De0B791eeD69e2C43d09D855428F2",
        "mintDate": "2024-08-02",
        "traits": [
          {
            "trait_type": "Koleksiyon",
            "value": "Xenwave Community"
          },
          {
            "trait_type": "Description",
            "value": "Just a fun pixelated cat NFT."
          }
        ],
      },
      {
        "id": 1,
        "name": "The PixelCat",
        "image": "https://ipfs.io/ipfs/QmRmxP1er1dKo8dJS2b4y9fnDh6kemvU435uytfhX8FdH8",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xB10093FFCdDc3f7b9c556baCF30573b5Ad3CDe08",
        "mintDate": "2024-08-02",
        "traits": [
          {
            "trait_type": "Koleksiyon",
            "value": "Xenwave Community"
          },
          {
            "trait_type": "Description",
            "value": "Just a fun pixelated cat NFT."
          }
        ],
      },
      {
        "id": 0,
        "name": "The One That Did Not Make It #1",
        "image": "https://ipfs.io/ipfs/QmXScMFrgAgGJ4ayQBwxVJw1YhgUCXpVF8SyyiHPcEwGNL",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0xA0975545805De0B791eeD69e2C43d09D855428F2",
        "mintDate": "2024-08-02",
        "traits": [
          {
            "trait_type": "Koleksiyon",
            "value": "Xenwave Community"
          },
          {
            "trait_type": "Description",
            "value": "A special NFT initially created to be part of \"The Village: Founders Edition\" but that did not make to the final collection set."
          }
        ],
      }
    ],
    "holders": [
      {
        "rank": 1,
        "address": "0xADF37C0b7bbA758eC954e1ED8dA1398010908B52",
        "quantity": 3,
        "percentage": "42.9%",
        "tokenIds": [
          3,
          5,
          6
        ]
      },
      {
        "rank": 2,
        "address": "0xA0975545805De0B791eeD69e2C43d09D855428F2",
        "quantity": 2,
        "percentage": "28.6%",
        "tokenIds": [
          0,
          2
        ]
      },
      {
        "rank": 3,
        "address": "0xB10093FFCdDc3f7b9c556baCF30573b5Ad3CDe08",
        "quantity": 1,
        "percentage": "14.3%",
        "tokenIds": [
          1
        ]
      },
      {
        "rank": 4,
        "address": "0xf3a6cbc139C490ECD81370E2424BF8cc604f3536",
        "quantity": 1,
        "percentage": "14.3%",
        "tokenIds": [
          4
        ]
      }
    ],
    "recentTransfers": []
  },
  {
    "id": "baby-chimp-gang",
    "name": "BabyChimpGang (Apes)",
    "symbol": "BCGT",
    "contract": "0xa0a92050d3082Ee4Cf97a5f167f3DCeE1184F8db",
    "standard": "BTS-721 / ERC-721",
    "description": "Popular Ape character collection deployed on the Bitnet L1 network.",
    "bannerImage": "https://ipfs.io/ipfs/Qmb8PE5W831R7ySQuyqrawrLGFQQdqCbxYUMrhmYcEFpYC/8.png",
    "iconImage": "https://ipfs.io/ipfs/Qmb8PE5W831R7ySQuyqrawrLGFQQdqCbxYUMrhmYcEFpYC/6.png",
    "totalSupply": 9,
    "minted": 9,
    "holdersCount": 3,
    "volume24hBtn": 0,
    "verified": true,
    "category": "Ape & Karakter",
    "items": [
      {
        "id": 8,
        "name": "BabyChimp-0 #8",
        "image": "https://ipfs.io/ipfs/Qmb8PE5W831R7ySQuyqrawrLGFQQdqCbxYUMrhmYcEFpYC/8.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0x480E81C95a20c6e8Ef95337A62d5D144db67c292",
        "mintDate": "2024-08-28",
        "traits": [
          {
            "trait_type": "Background",
            "value": "yellow"
          },
          {
            "trait_type": "Pattern",
            "value": "None"
          },
          {
            "trait_type": "Fur",
            "value": "off white"
          },
          {
            "trait_type": "Eyes",
            "value": "dumb"
          },
          {
            "trait_type": "Clothing",
            "value": "tanktop"
          }
        ],
      },
      {
        "id": 7,
        "name": "BabyChimp-0 #7",
        "image": "https://ipfs.io/ipfs/Qmb8PE5W831R7ySQuyqrawrLGFQQdqCbxYUMrhmYcEFpYC/7.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0x480E81C95a20c6e8Ef95337A62d5D144db67c292",
        "mintDate": "2024-08-28",
        "traits": [
          {
            "trait_type": "Background",
            "value": "FTM-blue"
          },
          {
            "trait_type": "Pattern",
            "value": "BCG pattern-white"
          },
          {
            "trait_type": "Fur",
            "value": "off white"
          },
          {
            "trait_type": "Eyes",
            "value": "happy"
          },
          {
            "trait_type": "Clothing",
            "value": "None"
          }
        ],
      },
      {
        "id": 6,
        "name": "BabyChimp-0 #6",
        "image": "https://ipfs.io/ipfs/Qmb8PE5W831R7ySQuyqrawrLGFQQdqCbxYUMrhmYcEFpYC/6.png",
        "rarity": "Legendary",
        "rarityColor": "bg-amber-500 text-white",
        "owner": "0x480E81C95a20c6e8Ef95337A62d5D144db67c292",
        "mintDate": "2024-08-28",
        "traits": [
          {
            "trait_type": "Background",
            "value": "FTM-blue"
          },
          {
            "trait_type": "Pattern",
            "value": "None"
          },
          {
            "trait_type": "Fur",
            "value": "off white"
          },
          {
            "trait_type": "Eyes",
            "value": "squint"
          },
          {
            "trait_type": "Clothing",
            "value": "leather jacket"
          }
        ],
      },
      {
        "id": 5,
        "name": "BabyChimp-0 #5",
        "image": "https://ipfs.io/ipfs/Qmb8PE5W831R7ySQuyqrawrLGFQQdqCbxYUMrhmYcEFpYC/5.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0x480E81C95a20c6e8Ef95337A62d5D144db67c292",
        "mintDate": "2024-08-28",
        "traits": [
          {
            "trait_type": "Background",
            "value": "orange"
          },
          {
            "trait_type": "Pattern",
            "value": "None"
          },
          {
            "trait_type": "Fur",
            "value": "light black"
          },
          {
            "trait_type": "Eyes",
            "value": "bored"
          },
          {
            "trait_type": "Clothing",
            "value": "long sleeve punk"
          }
        ],
      },
      {
        "id": 4,
        "name": "BabyChimp-0 #4",
        "image": "https://ipfs.io/ipfs/Qmb8PE5W831R7ySQuyqrawrLGFQQdqCbxYUMrhmYcEFpYC/4.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0x8946CF4a73302de7eB05D54c085f06463421a923",
        "mintDate": "2024-08-28",
        "traits": [
          {
            "trait_type": "Background",
            "value": "grey"
          },
          {
            "trait_type": "Pattern",
            "value": "None"
          },
          {
            "trait_type": "Fur",
            "value": "gold"
          },
          {
            "trait_type": "Eyes",
            "value": "stoned"
          },
          {
            "trait_type": "Clothing",
            "value": "leather jacket"
          }
        ],
      },
      {
        "id": 3,
        "name": "BabyChimp-0 #3",
        "image": "https://ipfs.io/ipfs/Qmb8PE5W831R7ySQuyqrawrLGFQQdqCbxYUMrhmYcEFpYC/3.png",
        "rarity": "Epic",
        "rarityColor": "bg-purple-600 text-white",
        "owner": "0x8946CF4a73302de7eB05D54c085f06463421a923",
        "mintDate": "2024-08-28",
        "traits": [
          {
            "trait_type": "Background",
            "value": "rainbow"
          },
          {
            "trait_type": "Pattern",
            "value": "None"
          },
          {
            "trait_type": "Fur",
            "value": "deep purple"
          },
          {
            "trait_type": "Eyes",
            "value": "bored"
          },
          {
            "trait_type": "Clothing",
            "value": "basketball dress"
          }
        ],
      },
      {
        "id": 2,
        "name": "BabyChimp-0 #2",
        "image": "https://ipfs.io/ipfs/Qmb8PE5W831R7ySQuyqrawrLGFQQdqCbxYUMrhmYcEFpYC/2.png",
        "rarity": "Rare",
        "rarityColor": "bg-sky-600 text-white",
        "owner": "0x8946CF4a73302de7eB05D54c085f06463421a923",
        "mintDate": "2024-08-28",
        "traits": [
          {
            "trait_type": "Background",
            "value": "green"
          },
          {
            "trait_type": "Pattern",
            "value": "None"
          },
          {
            "trait_type": "Fur",
            "value": "off white"
          },
          {
            "trait_type": "Eyes",
            "value": "confused"
          },
          {
            "trait_type": "Clothing",
            "value": "tanktop"
          }
        ],
      }
    ],
    "holders": [
      {
        "rank": 1,
        "address": "0x480E81C95a20c6e8Ef95337A62d5D144db67c292",
        "quantity": 4,
        "percentage": "57.1%",
        "tokenIds": [
          5,
          6,
          7,
          8
        ]
      },
      {
        "rank": 2,
        "address": "0x8946CF4a73302de7eB05D54c085f06463421a923",
        "quantity": 3,
        "percentage": "42.9%",
        "tokenIds": [
          2,
          3,
          4
        ]
      }
    ],
    "recentTransfers": []
  }
];
