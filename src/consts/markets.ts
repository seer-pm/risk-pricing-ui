import { Address } from "viem";

import LucideActivity from "@/assets/svg/lucide-activity.svg";
import LucideDatabase from "@/assets/svg/lucide-database.svg";
import LucideGem from "@/assets/svg/lucide-gem.svg";
import LucideLandMark from "@/assets/svg/lucide-landmark.svg";
import LucideScale from "@/assets/svg/lucide-scale.svg";
import LucideShield from "@/assets/svg/lucide-shield.svg";

export const positionExplainerLink =
  "https://kleros.notion.site/Kleros-Foresight-Advanced-Guide-What-Actually-Happens-After-Your-First-Prediction-30d9a9db4f0880f8a44ecb13d34ad3c6#30d9a9db4f0881969c23e8152ab1146d";

export const appGuideLink =
  "https://kleros.notion.site/Kleros-Foresight-Beginner-User-Guide-30d9a9db4f088064a588f7d5acc2751f";

export const faqLink =
  "https://kleros.notion.site/Kleros-Foresight-Beginner-User-Guide-30d9a9db4f088064a588f7d5acc2751f#30d9a9db4f088138a266e870c56159e0";

export const beginnerUserGuide =
  "https://jagged-ironclad-e1b.notion.site/Default-Risk-Prediction-Markets-Beginner-User-Guide-35da95a2cc7d80fba056c16d17e99303?source=copy_link";

export const advancedUserGuide =
  "https://jagged-ironclad-e1b.notion.site/Default-Risk-Prediction-Markets-Under-the-hood-35da95a2cc7d80429390eda234554ec8?source=copy_link";

export const tgLink = "https://t.me/+HrYn_tzqTGFlYTc0";

// TODO: update to latest
export const projectsChosen = 5;

export const parentMarket: Address =
  "0x6f7ae2815e7e13c14a6560f4b382ae78e7b1493e";

export const parentConditionId =
  "0x0d6c99d7eb9fa657236905b6cf464eaa938371ae5ce8cf153af450321377241d";

export const invalidMarket: Address =
  "0x45F2d1Bfa638E0A5f04dFacAAdbDbd0c2044eae8";

// in unix timestamp, seconds
export const startTime: number = 1771871400;
export const endTime: number = 1790812799; //Wed Sep 30 2026 23:59:59 UTC (end of Q3 2026)
export const endDate: string = "Friday 3rd April 18:00 UTC";
export interface IDetails {
  imdbURL?: string;
  posterURL?: string;
  summary: string;
}

export interface IMarket {
  name: string;
  color: string;
  upToken: Address;
  downToken: Address;
  underlyingToken: Address;
  invalidToken: Address;
  minValue: number;
  maxValue: number;
  precision: number;
  marketId: Address;
  parentMarketOutcome: number;
  details: IDetails;
  conditionId: `0x${string}`;
}

export interface RiskAssetData {
  metrics_rating: string;
  address: string;
  rating_type: string;
  avg_risk_score: number;
  risk_profiles: RiskProfile[];
}

export interface RiskProfile {
  score: number | null;
  content: string;
  max_score: number;
  metric_name: string;
  display_order: number;
}

export const marketMetadata = {
  name: "Risk Pricing Predictions",
  question:
    "What is the yearly Probability of Default (PD) for the following DeFi assets during Q3 2026?",
};

export const RISK_PRICING_MARKET_ID =
  "0x7d386b7c41b8dab6179fc79cf7986a795305b815";

export const markets: Array<IMarket> = [
  {
    name: "Judge Dredd (1995)",
    color: "#E6194B",
    upToken: "0x0ee25eb2e22c01fa832dd5fea5637fba4cd5e870",
    downToken: "0x4abea4bf9e35f4e957695374c388cee9f83ca1d0",
    underlyingToken: "0xb72a1271caa3d84d3fbbbcbb0f63ee358b94f96a",
    invalidToken: "0x11463F43181eB643bA8a584756CCB27a9B8f7B98",
    minValue: 0,
    maxValue: 100,
    precision: 100,
    marketId: "0x105d957043ee12f7705efa072af11e718f8c5b83",
    parentMarketOutcome: 0,
    conditionId:
      "0x3d963acd72df546f58bf4ea76fda6957c830e6e3f8965517c396fc76dc2c08a3",
    details: {
      imdbURL:
        "https://www.imdb.com/title/tt0113492/?ref_=nv_sr_srsg_0_tt_8_nm_0_in_0_q_judge%2520dredd",
      posterURL:
        "https://resizing.flixster.com/BsX7kI5BwBsc9xSQPEt5ddA3PI4=/206x305/v2/https://resizing.flixster.com/-XZAfHZM39UwaGJIFWKAE8fS0ak=/v3/t/assets/p16918_p_v8_ae.jpg",
      summary:
        "In a dystopian future, Joseph Dredd, the most famous Judge (a police officer with instant field judiciary powers), is convicted for a crime he did not commit and must face his murderous counterpart.",
    },
  },
  {
    name: "Bacurau (2019)",
    color: "#3CB44B",
    upToken: "0x028ec9938471bbad5167c2e5281144a94d1acbe9",
    downToken: "0x53f82c3f6836dcba9d35450d906286a6ea089a26",
    underlyingToken: "0xcb1f243baaf93199742e09dc98b16fc8b714b67c",
    invalidToken: "0x971bd2446cc32dFa26410Cc46978AA0c371Bc48e",
    minValue: 0,
    maxValue: 100,
    precision: 100,
    marketId: "0x68af0afe82dda5c9c26e6a458a143caad35708d6",
    parentMarketOutcome: 1,
    conditionId:
      "0xa4cc97a4e4f6e02c546a5b3bb49e2c411dcb4c6dcd478cef9cd0c86605c59878",
    details: {
      imdbURL:
        "https://www.imdb.com/title/tt2762506/?ref_=nv_sr_srsg_0_tt_7_nm_1_in_0_q_bacura",
      posterURL:
        "https://resizing.flixster.com/MUNwK1o6mdxwkgj-2v86bWf6xXM=/206x305/v2/https://resizing.flixster.com/-cGVSNCtYaLQDwteIiI9LUMoqJ0=/ems.cHJkLWVtcy1hc3NldHMvbW92aWVzL2Y3NWE5YWNjLTRlNzktNGEzYi05NTg5LWNhOTBiYTJlODM1OC53ZWJw",
      summary:
        "After the death of her grandmother, Teresa comes home to her matriarchal village in a near-future Brazil to find a succession of sinister events that mobilizes all of its residents.",
    },
  },
  {
    name: "The Hitchhiker's Guide to the Galaxy (2005)",
    color: "#FFD93D",
    upToken: "0xad2248b8eaa3e3a405c1ba79dd436947f8b427df",
    downToken: "0xdd510abc6a848662371c3455717949035cc24019",
    underlyingToken: "0xfb06c25e59302d8a0318d6df41a2f29deeea1c8a",
    invalidToken: "0x43D6E82de1E64531b5E47891b186227edA566344",
    minValue: 0,
    maxValue: 100,
    precision: 100,
    marketId: "0xfdd8af90af2722d5fe39adf1002fbd069b8a76c0",
    parentMarketOutcome: 2,
    conditionId:
      "0xe97f19928d4143377d3cb97043c90408ccb9c51788447f42d2df9d65694c8171",
    details: {
      imdbURL:
        "https://www.imdb.com/title/tt0371724/?ref_=nv_sr_srsg_0_tt_7_nm_1_in_0_q_the%2520hitch",
      posterURL:
        "https://resizing.flixster.com/otfSVWc26cetfV0acq5Z5-E9A60=/206x305/v2/https://resizing.flixster.com/-XZAfHZM39UwaGJIFWKAE8fS0ak=/v3/t/assets/p35755_p_v8_am.jpg",
      summary: `Mere seconds before the Earth is to be demolished by an alien construction crew, journeyman Arthur Dent is swept off the planet by his friend Ford Prefect, a researcher penning a new edition of "The Hitchhiker's Guide to the Galaxy."`,
    },
  },
  {
    name: "Everything, Everywhere, All At Once (2022)",
    color: "#6BCB77",
    upToken: "0xfa020fcd05e0b91dae83a2a08c5b5533edf8c851",
    downToken: "0x372d0798ffe8c3aa982a15258c0fea22c6a768df",
    underlyingToken: "0xe85d556d1aaae2f6027336e468e9c981251a4bef",
    invalidToken: "0x3Aa738505C22e670a074e60566bD7264e7D682B1",
    minValue: 0,
    maxValue: 100,
    precision: 100,
    marketId: "0x1f2e76d66047e7f8e0deea373a0c04ffecab31df",
    parentMarketOutcome: 3,
    conditionId:
      "0xdc8f8277da182ee2d5293c754a1cfb8d3761720259cf17a65df61b7cb6983721",
    details: {
      imdbURL: "https://www.imdb.com/title/tt6710474/?ref_=fn_all_ttl_1",
      posterURL:
        "https://resizing.flixster.com/I2Z0zDTKJdvO7Akh819HROIhZQ4=/206x305/v2/https://resizing.flixster.com/mx-agGjjsUK1QMyuv3AJhHI3hgo=/ems.cHJkLWVtcy1hc3NldHMvbW92aWVzLzA3ZjU2MGU1LWMxODItNDlkMC1hYzJhLTY2YzMwOGZkMDhiZi5qcGc=",
      summary:
        "A middle-aged Chinese immigrant is swept up into an insane adventure in which she alone can save existence by exploring other universes and connecting with the lives she could have led.",
    },
  },
  {
    name: "12 angry men (1957)",
    color: "#4D96FF",
    upToken: "0x7ee3806d16dc6a76bef2b11880b70cc70f74fa1a",
    downToken: "0x34f8572eab463606a014c37ff68b78ac9361cacc",
    underlyingToken: "0xb3933fd994af5db7ae985a0d62ed2dda918a839b",
    invalidToken: "0x12c91f543a48F58e3E54c398f19BEc4b62aFD617",
    minValue: 0,
    maxValue: 100,
    precision: 100,
    marketId: "0x2338ca7d59b7e15bd03dd81cf5f5bb59b6c6c6d4",
    parentMarketOutcome: 4,
    conditionId:
      "0xf857ab39ef39d99f00d38ab07a5676406dfd5382f6d2177c44642e147d8dd0ad",
    details: {
      imdbURL:
        "https://www.imdb.com/title/tt0050083/?ref_=nv_sr_srsg_0_tt_8_nm_0_in_0_q_12%2520angry",
      posterURL:
        "https://resizing.flixster.com/FDNKxkwCqhqdzh-IvaGBfzqRb74=/206x305/v2/https://resizing.flixster.com/-XZAfHZM39UwaGJIFWKAE8fS0ak=/v3/t/assets/p2084_p_v8_ar.jpg",
      summary:
        "The jury in a New York City murder trial is frustrated by a single member whose skeptical caution forces them to more carefully consider the evidence before jumping to a hasty verdict.",
    },
  },
  {
    name: "Alien (1979)",
    color: "#845EC2",
    upToken: "0x37e70bae5e87327feece73a7c227446571f92137",
    downToken: "0x31e3d82a613e5aeea7c3a65c3d657cacaaaf2674",
    underlyingToken: "0x6d0407b5ae419fdd92ffdc64abf04c5f28950e02",
    invalidToken: "0xe54422171C40aA14B0fc935DEA7AFb85BE15357d",
    minValue: 0,
    maxValue: 100,
    precision: 100,
    marketId: "0x9a274ea86665d872fc58c8f26fd97a18b844c6ac",
    parentMarketOutcome: 5,
    conditionId:
      "0x8054990ae8221c8a08581381a0d2e3e5f23144a4d18a2398858be52dd94cc8c9",
    details: {
      imdbURL:
        "https://www.imdb.com/title/tt0078748/?ref_=nv_sr_srsg_3_tt_8_nm_0_in_0_q_alien",
      posterURL:
        "https://resizing.flixster.com/5R4bkJZC-W_K-YjmIMKAXCbts5Y=/206x305/v2/https://resizing.flixster.com/-XZAfHZM39UwaGJIFWKAE8fS0ak=/v3/t/assets/p2571_p_v8_aw.jpg",
      summary:
        "After investigating a mysterious transmission of unknown origin, the crew of a commercial spacecraft encounters a deadly lifeform.",
    },
  },
  {
    name: "Demolition Man (1993)",
    color: "#FF9671",
    upToken: "0x53a9011c5570bfb8148954c4f49a6625dc44077b",
    downToken: "0x64974d3bf944fafec6fa19a900f3679a716b3a86",
    underlyingToken: "0x20025021e440edd39d486f3c6a1d7adb9c269faf",
    invalidToken: "0x406B8Ee2DF07c644414E852542dAB98BdDf39234",
    minValue: 0,
    maxValue: 100,
    precision: 100,
    marketId: "0xc25af7d4a5cb36bb3ce9faf652a5f7f989a1d57a",
    parentMarketOutcome: 6,
    conditionId:
      "0xe35db6fb9992ab689e21751f036ccc9a8548b71dec3089874cf4a19a13cd34bb",
    details: {
      imdbURL:
        "https://www.imdb.com/title/tt0106697/?ref_=nv_sr_srsg_0_tt_8_nm_0_in_0_q_demolition%2520man",
      posterURL:
        "https://resizing.flixster.com/e3iHOpnnUZKRPz_xHJVoLz8TkGM=/206x305/v2/https://resizing.flixster.com/-XZAfHZM39UwaGJIFWKAE8fS0ak=/v3/t/assets/p15098_p_v10_ab.jpg",
      summary:
        "A police officer is brought out of suspended animation in prison to pursue an old ultra-violent nemesis who is loose in a non-violent future society.",
    },
  },
  {
    name: "Barbie (2023)",
    color: "#0081CF",
    upToken: "0xaed0fad91e7149ec84bb4d0a2a77be819169275f",
    downToken: "0x044e1b6d8aacbda5699423578bd200484f7473c3",
    underlyingToken: "0x67d0f938ea12e7e30b8ccc24dd031d656cc3927d",
    invalidToken: "0xA9099Baa3b74c1d602aCe8CeaC5933a16A0456C5",
    minValue: 0,
    maxValue: 100,
    precision: 100,
    marketId: "0xd31d05158722f64b6a49e25bccc47d3203eecbe9",
    parentMarketOutcome: 7,
    conditionId:
      "0x3c102db4f274983b648bd27a4092866e1b81dbc08b8738a5c694a8d8c3948a81",
    details: {
      imdbURL:
        "https://www.imdb.com/title/tt1517268/?ref_=nv_sr_srsg_1_tt_6_nm_1_in_0_q_barbie",
      posterURL:
        "https://resizing.flixster.com/r409CsU-O1gEcAP0VtU6tDD9sKI=/206x305/v2/https://resizing.flixster.com/-XZAfHZM39UwaGJIFWKAE8fS0ak=/v3/t/assets/p13472534_p_v8_am.jpg",
      summary:
        "Barbie and Ken are having the time of their lives in the seemingly perfect world of Barbie Land. However, when they get a chance to go to the outside world, they soon discover the joys and perils of living among regular humans.",
    },
  },
  {
    name: "Eduardo e Mônica (2020)",
    color: "#FFC75F",
    upToken: "0x9d64a3e7e55880f3c8f9c584ed32397bb6f0b9f6",
    downToken: "0xe9d025d3cbd783d6a92626b650a32f7cbaca0e7d",
    underlyingToken: "0x58ce7a53abeca1db90cec0e6b7dcbe3a36d986c4",
    invalidToken: "0xcA4c82fd178aaf4b72ECe35774ce04B7Aa2E5361",
    minValue: 0,
    maxValue: 100,
    precision: 100,
    marketId: "0x13d48a73811c01f574e1bfa4c58b7d95d2f590e4",
    parentMarketOutcome: 8,
    conditionId:
      "0x2dcf754f36437ea0c298e5d27a0f3904dc2335a6e239b15a104f3ca7787c5926",
    details: {
      imdbURL:
        "https://www.imdb.com/title/tt8747460/?ref_=nv_sr_srsg_0_tt_2_nm_0_in_0_q_Eduardo%2520e%2520M%25C3%25B4nica%2520(2020)",
      posterURL:
        "https://resizing.flixster.com/IaXbRF4gIPh9jireK_4VCPNfdKc=/200x0/v2/https://resizing.flixster.com/-XZAfHZM39UwaGJIFWKAE8fS0ak=/v3/t/assets/p18824656_k_v8_aa.jpg",
      summary:
        "On an unusual day, a series of coincidences lead Eduardo to meet Monica at a party. Curiosity is aroused between the two and, despite not being alike, they fall madly in love. This love needs to mature and learn to overcome differences.",
    },
  },
  {
    name: "Thor: The Dark World (2013)",
    color: "#00C9A7",
    upToken: "0x0c569fbc021119b778ea160efd718a5d592ef46c",
    downToken: "0xd8d2dfe1912239451b5a4a0462006e95393f2151",
    underlyingToken: "0x72ec9aade867b5b41705c6a83f66bc56485669b5",
    invalidToken: "0xFa2e53b2E33309CEE9255b440f143308F92BbA83",
    minValue: 0,
    maxValue: 100,
    precision: 100,
    marketId: "0x878a332b5efc0a4bf983036beece050352baa73d",
    parentMarketOutcome: 9,
    conditionId:
      "0xb223aad8405c321b761e3cba872e556c1de3a8b552a38249d626bc5aff7c6ba2",
    details: {
      imdbURL:
        "https://www.imdb.com/title/tt1981115/?ref_=nv_sr_srsg_0_tt_8_nm_0_in_0_q_thor%2520the%2520dark",
      posterURL:
        "https://resizing.flixster.com/HtozfP_2NYit3_l7s-cbtsiuWps=/206x305/v2/https://resizing.flixster.com/-XZAfHZM39UwaGJIFWKAE8fS0ak=/v3/t/assets/p9530219_p_v13_aa.jpg",
      summary:
        "When the Dark Elves attempt to plunge the universe into darkness, Thor must embark on a perilous and personal journey that will reunite him with doctor Jane Foster.",
    },
  },
  {
    name: "Talk to me (2022)",
    color: "#C34A36",
    upToken: "0xf3c17e909bd1f9367ecdc786d137465d7ee96b6a",
    downToken: "0xf99be182b6b0e6d994509ecdced281b94100435f",
    underlyingToken: "0x2b3a8ac53ba42da13f542a867d2859642fb1db44",
    invalidToken: "0x94b6580034e1FFf008Ac8370dF69E180740469b0",
    minValue: 0,
    maxValue: 100,
    precision: 100,
    marketId: "0xee4a77447069f32f555f3d75aaba18a4acb54ac4",
    parentMarketOutcome: 10,
    conditionId:
      "0x715f9e8ccc373f85e2f9ec02bba8d23c5f87090b729750ca8adac5b0f969213e",
    details: {
      imdbURL:
        "https://www.imdb.com/title/tt10638522/?ref_=nv_sr_srsg_0_tt_8_nm_0_in_0_q_talk%2520to%2520me",
      posterURL:
        "https://resizing.flixster.com/ejS3S8JOBfvZr_fQ_--6SyKKJpQ=/206x305/v2/https://resizing.flixster.com/9WxKriao1BmRamIaqig2k8hd5uM=/ems.cHJkLWVtcy1hc3NldHMvbW92aWVzL2YyZDQwYTM2LWZmYzEtNGUwMC05NzRkLTA3ODM0NThiNDE4Ny5qcGc=",
      summary:
        "When a group of friends discover how to conjure spirits using an embalmed hand, they become hooked on the new thrill, until one of them goes too far and unleashes terrifying supernatural forces.",
    },
  },
  {
    name: "Fast & Furious 6 (2013)",
    color: "#9B51E0",
    upToken: "0x850d2ffa4475296cfbbd76247894a773e3b1be6c",
    downToken: "0xb28c716f63b0dd272f62e25765a914baeebab8c2",
    underlyingToken: "0x71c3df5edcab48cfb6a1a99255eff063f33b6265",
    invalidToken: "0xb3cE80d6b30DcC4d605B290f4dC1Fc3B8C2bcC3b",
    minValue: 0,
    maxValue: 100,
    precision: 100,
    marketId: "0x38a2923cc391b9cd926e5a2d07462dc7d189c407",
    parentMarketOutcome: 11,
    conditionId:
      "0x27f341cdecacbd7ff0e4bb7b28add74ddaa388ff9f16bc749e2828a71fe6a5f6",
    details: {
      imdbURL:
        "https://www.imdb.com/title/tt1905041/?ref_=nv_sr_srsg_0_tt_8_nm_0_in_0_q_fast%2520%2526%2520furious%25206",
      posterURL:
        "https://resizing.flixster.com/dJUU6CNK8IBSjsImW4nXCxxUVwU=/206x305/v2/https://resizing.flixster.com/-XZAfHZM39UwaGJIFWKAE8fS0ak=/v3/t/assets/p9573130_p_v7_ab.jpg",
      summary:
        "Hobbs has Dominic and Brian reassemble their crew to take down a team of mercenaries, but Dominic unexpectedly gets sidetracked with facing his presumed deceased girlfriend, Letty.",
    },
  },
  {
    name: "Elysium (2013)",
    color: "#2D4059",
    upToken: "0xe9427a7a32daad2d29db2aad809b2a44060d8fc8",
    downToken: "0x75b5cd86828f7c9009e30619a83b1b2da67f1342",
    underlyingToken: "0xf52e0e144b73a0d5748bc53667efe3ba62fe5695",
    invalidToken: "0x69641B6664a493ecF467D4D9aAB595A8b9Cc4a66",
    minValue: 0,
    maxValue: 100,
    precision: 100,
    marketId: "0xc0dab34c6c2008391bdc742cec0bd0afb60d4d59",
    parentMarketOutcome: 12,
    conditionId:
      "0x2d2ee6e67d4ffa2c2a14898a29d0afe3d3cdd8ad362811aad64770a90553cb3a",
    details: {
      imdbURL:
        "https://www.imdb.com/title/tt1535108/?ref_=nv_sr_srsg_0_tt_8_nm_0_in_0_q_elysium",
      posterURL:
        "https://resizing.flixster.com/WlkdhZWddtMIv8U2Tmlb74rmBZ4=/206x305/v2/https://resizing.flixster.com/-XZAfHZM39UwaGJIFWKAE8fS0ak=/v3/t/assets/p9360879_p_v10_ar.jpg",
      summary:
        "In the year 2154, the very wealthy live on a man-made space station while the rest of the population resides on a ruined Earth. A man takes on a mission that could bring equality to the polarized worlds.",
    },
  },
  {
    name: "Session 9 (2001)",
    color: "#F9F871",
    upToken: "0xe080c03ad6bc9f8fd5b45b5d3bf14ebcfa1ec0b5",
    downToken: "0x76cce8491785789c2c5542f043ec6c35b12cd909",
    underlyingToken: "0x1086a95c224dd586809a7f4d875b4f09d2ac9290",
    invalidToken: "0x4F2b7EC3aAC8Bb0Ffb272a4B27B758D2FFC31bc6",
    minValue: 0,
    maxValue: 100,
    precision: 100,
    marketId: "0xa7cf69c4c93d2f6811a394e92320979c3cf86b37",
    parentMarketOutcome: 13,
    conditionId:
      "0x6bc6c6fd532a02ec128e7c8dfe3e496295f677c861405a88b7da503f1882eef8",
    details: {
      imdbURL:
        "https://www.imdb.com/title/tt0261983/?ref_=nv_sr_srsg_0_tt_8_nm_0_in_0_q_session%25209",
      posterURL:
        "https://resizing.flixster.com/pMiw8blJew0YXddZivo7mtYlUDg=/206x305/v2/https://resizing.flixster.com/-XZAfHZM39UwaGJIFWKAE8fS0ak=/v3/t/assets/p28177_p_v13_ac.jpg",
      summary:
        "Tensions rise within an asbestos cleaning crew as they work in an abandoned mental hospital with a horrific past that seems to be coming back.",
    },
  },
  {
    name: "Mamma Mia! (2008)",
    color: "#B0A8B9",
    upToken: "0xfa82984fc8ddeb71fdb2e6e471f30995178ad5f0",
    downToken: "0x5d528dbec7e37927d8af41bfb1b54e7641dd3ccb",
    underlyingToken: "0x11ed86c399f455819f495cda1256e9b52afd0971",
    invalidToken: "0x756de0795875f925AC95ba37472D26bC4375c6a4",
    minValue: 0,
    maxValue: 100,
    precision: 100,
    marketId: "0x96638d67ac5bc5f8223f9e2d60e92f4d8dcf3147",
    parentMarketOutcome: 14,
    conditionId:
      "0x6e5b27306498d2917cdde6a3ea4791cd5a6fe8d8bf33d491c97524c431eda325",
    details: {
      imdbURL:
        "https://www.imdb.com/title/tt0795421/?ref_=nv_sr_srsg_0_tt_7_nm_1_in_0_q_mamma%2520mia",
      posterURL:
        "https://resizing.flixster.com/sD29k0EMFXDWY0DPiFoQsaxqDNU=/206x305/v2/https://resizing.flixster.com/-XZAfHZM39UwaGJIFWKAE8fS0ak=/v3/t/assets/p176344_p_v8_al.jpg",
      summary:
        "Donna, an independent hotelier, is preparing for her daughter's wedding with the help of two old friends. Meanwhile Sophie, the spirited bride, has a plan. She invites three men from her mother's past in hope of meeting her real father.",
    },
  },
  {
    name: "Ethereum (2022)",
    color: "#FF8066",
    upToken: "0xf8313845248f2392a39bdcd50be0781c7cf497c1",
    downToken: "0x3befdfbd7c2a7139acafc3005369d30ff2cd8f9a",
    underlyingToken: "0x78c2edb5639af0ed4351f001c728c9026820887e",
    invalidToken: "0x8eB59F4590fF6a0037a159ea1601D9d309aEa598",
    minValue: 0,
    maxValue: 100,
    precision: 100,
    marketId: "0x002c70343ddef063d0ad8da91104934318800d30",
    parentMarketOutcome: 15,
    conditionId:
      "0x2b9e73d1da8dc051ffe4972114f59e61ad1bfd65fda93d88bcfb6644ffb07f4b",
    details: {
      imdbURL:
        "https://www.imdb.com/title/tt22069858/?ref_=nv_sr_srsg_2_tt_8_nm_0_in_0_q_ethereum",
      posterURL:
        "https://play-lh.googleusercontent.com/ARlYF4lUWeSFL9CgcKmHIesZwjsRjB0qkCKyIcLYckxYdrAkmvz1RKLQ_RFPRQuedofL8xOeCBtz-MIStG8=w240-h480-rw",
      summary:
        "Learn About the hottest cryptocurrency around, Ethereum. This amazing documentary explores the history of Ethereum, a decentralized, open-source blockchain with smart contract functionality.",
    },
  },
];

export const RiskAssetDetailsMapping: { [key: string]: RiskAssetData } = {
  steth: {
    metrics_rating: "A+",
    address: "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
    rating_type: "Derivative - Liquid Staking",
    avg_risk_score: 4.75,
    risk_profiles: [
      {
        score: 4.8,
        content:
          "stETH maintains a 1:1 collateralization ratio against ETH held natively on the Ethereum Beacon Chain. The Lido insurance fund holds approximately ~$15M, providing negligible first-loss coverage relative to TVL. Disbursement requires a DAO governance vote with no automatic trigger.",
        max_score: 5,
        metric_name: "Asset Quality",
        display_order: 1,
      },
      {
        score: 4.8,
        content:
          "Decentralized. Lido DAO governs via Aragon, with contract upgrades executed by the Aragon Agent smart contract following a successful LDO vote (5% quorum, simple majority) and a minimum 4-day delay before execution; no human multisig sits in the execution path. Dual Governance, deployed July 2025, grants stETH holders veto rights: opposition above 1% of supply extends delays by 5–45 days; above 10%, governance suspends entirely via Rage Quit. Validator operations remain concentrated, with the Curated Module accounting for ~92% of staked ETH, and on-chain participation structurally low.",
        max_score: 5,
        metric_name: "Governance",
        display_order: 2,
      },
      {
        score: 4.8,
        content:
          "stETH is designed to track ETH 1:1. Over the trailing 365 days, annualized volatility versus ETH stood at around 2%, with zero trading days recording a deviation exceeding 1%. The most notable stress event in the period was a ~0.3% deviation in July 2025, driven by a surge in the validator withdrawal queue following a large leveraged-unwind episode. 30-day average trading volume exceeds $1 million.",
        max_score: 5,
        metric_name: "Peg Track Record",
        display_order: 3,
      },
      {
        score: 4.3,
        content:
          "Lido has undergone 90+ independent security reviews on Ethereum mainnet, with formal verification completed by Certora (V2 and Dual Governance modules) and Runtime Verification (Dual Governance mechanism design). The most recent formal verification engagement concluded in February 2025, placing audit recency at the maximum tier. All identified critical and high-severity findings were remediated prior to deployment. A $2M maximum Immunefi bug bounty covers core contracts. Contract maturity exceeds 60 months with no material exploit recorded.",
        max_score: 5,
        metric_name: "Protocol Security",
        display_order: 4,
      },
      {
        score: 4.8,
        content:
          "ETH backing stETH is held natively on the Ethereum Beacon Chain and is verifiable on-chain in real time against circulating stETH supply without reliance on third-party attestation or off-chain reporting. No external custodian is involved. Reserve management is entirely passive: deposited ETH is delegated to Lidos curated node operator set with no active trading, rehypothecation, or yield optimization applied to principal.",
        max_score: 5,
        metric_name: "Reserves Management",
        display_order: 5,
      },
      {
        score: null,
        content:
          "No entity holds reserves on behalf of holders; ETH sits natively on the Ethereum Beacon Chain, with no human counterparty to claim against. The Samuels v. Lido DAO lawsuit is a residual legal-classification risk against the LDO token, not stETH holders.",
        max_score: 5,
        metric_name: "Regulatory/Legal Profile",
        display_order: 6,
      },
    ],
  },
  "eth+": {
    metrics_rating: "A",
    address: "0xe72b141df173b999ae7c1adcbf60cc9833ce56a8",
    rating_type: "Derivative - Index",
    avg_risk_score: 4.43,
    risk_profiles: [
      {
        score: 4.1,
        content:
          "ETH+ is collateralized by LSTs (currently wstETH, weETH, rETH, sfrxETH, ETHx) held in Reserve Protocol smart contracts with no external custodians. Effective collateralization is approximately 102%, and approximately 0.25% of ETH+ market cap providing mechanistic first-loss capital. Holders have redemption autonomy at the protocol layer, but not contractual redemption rights.",
        max_score: 5,
        metric_name: "Asset Quality",
        display_order: 1,
      },
      {
        score: 4.4,
        content:
          "Decentralized. Governance operates through on-chain RSR staker voting with a 72-hour execution delay and an approximate eight-day end-to-end cycle. Five roles are defined: owner, pauser, short freezer, long freezer, and guardian. No role can directly mint, seize user funds, or upgrade logic outside the timelocked process. Freeze roles are time-limited and self-consuming; the guardian may veto but not initiate actions. No formal incident response playbook has been published, though the March 2023 USDC depeg event on sibling RTokens demonstrated the recollateralization mechanism performing as designed under live stress. Guardian signer composition and threshold are not published in narrative documentation and require direct on-chain inspection.",
        max_score: 5,
        metric_name: "Governance",
        display_order: 2,
      },
      {
        score: 4,
        content:
          "ETH+ recorded annualized price volatility of approximately 18.4% over the trailing year, against ETH. The LST-basket-to-ETH exchange rate registered no material deviations over the same period. Thirty-day average secondary trading volume exceeds $1M daily.",
        max_score: 5,
        metric_name: "Peg Track Record",
        display_order: 3,
      },
      {
        score: 4.3,
        content:
          "Reserve Protocol has undergone approximately nine core audit engagements including Trail of Bits, Code4rena, Halborn, Solidified, Ackee Blockchain, Trust Security, and Oak Security (March 2026), with no critical findings reaching production. A $10M Immunefi bug bounty is active across core contracts and LST collateral plugins. No security incident has affected bsdETH or Reserve Protocol since the October 2022 mainnet launch. The primary residual gap is the absence of full formal mathematical verification.",
        max_score: 5,
        metric_name: "Protocol Security",
        display_order: 4,
      },
      {
        score: 4.8,
        content:
          "All reserves are held on-chain and verifiable in real time with no reliance on attestations or third-party reporting. Basket rebalancing is executed through on-chain governance with Dutch auction settlement. Approximately 90% of staking yield accrues to ETH+ holders; of the remaining 10%, 3% flows to staked RSR and 7% to RSR buy-and-burn. In a collateral default event, staked RSR is mechanistically seized and auctioned on-chain without requiring a governance vote; unstaking carries a mandatory 14-day delay. Redemptions are permissionless at T+0, subject to an hourly throttle, and remain available even when issuance is paused.",
        max_score: 5,
        metric_name: "Reserves Management",
        display_order: 5,
      },
      {
        score: null,
        content:
          "No entity holds reserves on behalf of holders; LST collateral sits in on-chain smart contracts that mechanically enforce redemption, with no human counterparty to claim against. LST-issuer custody risk is captured in the Asset Quality section.",
        max_score: 5,
        metric_name: "Regulatory/Legal Profile",
        display_order: 6,
      },
    ],
  },
  bsdeth: {
    metrics_rating: "A-",
    address: "0x61d6eaf4e96e69b45240a5b22815b43360e28ce3",
    rating_type: "Derivative - Index",
    avg_risk_score: 4.17,
    risk_profiles: [
      {
        score: 3.9,
        content:
          "Approximately $2M in reserves are held equally across wstETH, cbETH, and wsuperOETHb in Reserve Protocol smart contracts on Base, with 100% collateralization enforced by design. 0.25% of bsdETH market cap serves as cushion providing a degree of over-collateralization above the floor. Underlying ETH custody rests with the LST issuers (Coinbase, Lido node operators, and Origin Protocol respectively) with no bank-trust-style legal segregation at any layer.",
        max_score: 5,
        metric_name: "Asset Quality",
        display_order: 1,
      },
      {
        score: 4.4,
        content:
          "Decentralized. Governance operates through on-chain RSR staker voting with a 72-hour execution delay and an approximate eight-day end-to-end cycle. Five roles are defined: owner, pauser, short freezer, long freezer, and guardian. No role can directly mint, seize user funds, or upgrade logic outside the timelocked process. Freeze roles are time-limited and self-consuming; the guardian may veto but not initiate actions. No formal incident response playbook has been published, though the March 2023 USDC depeg event on sibling RTokens demonstrated the recollateralization mechanism performing as designed under live stress. Guardian signer composition and threshold are not published in narrative documentation and require direct on-chain inspection.",
        max_score: 5,
        metric_name: "Governance",
        display_order: 2,
      },
      {
        score: 3,
        content:
          "bsdETH recorded no basket deviation events against ETH peg since February 2024 deployment, and on-chain redemption has been uninterrupted throughout. Annualized price volatility against ETH averages approximately 30%. Secondary daily market volume averages below $1M over trailing 30 days.",
        max_score: 5,
        metric_name: "Peg Track Record",
        display_order: 3,
      },
      {
        score: 3.9,
        content:
          "Reserve Protocol has undergone approximately nine core audit engagements including Trail of Bits, Code4rena, Halborn, Solidified, Ackee Blockchain, Trust Security, and Oak Security (March 2026), with no critical findings reaching production. A $10M Immunefi bug bounty is active across core contracts and LST collateral plugins. No security incident has affected bsdETH or Reserve Protocol since the October 2022 mainnet launch. The primary residual gap is the absence of full formal verification.",
        max_score: 5,
        metric_name: "Protocol Security",
        display_order: 4,
      },
      {
        score: 4.8,
        content:
          "All reserves are held on-chain and verifiable in real time with no reliance on attestations or third-party reporting. Basket rebalancing is executed through on-chain governance with Dutch auction settlement. Approximately 90% of staking yield accrues to bsdETH holders and 10% to staked RSR. In a collateral default event, staked RSR is mechanistically seized and auctioned on-chain without requiring a governance vote; unstaking carries a mandatory 14-day delay. Redemptions are permissionless at T+0, subject to an hourly throttle, and remain available even when issuance is paused.",
        max_score: 5,
        metric_name: "Reserves Management",
        display_order: 5,
      },
      {
        score: null,
        content:
          "No entity holds reserves on behalf of holders; LST collateral sits in on-chain smart contracts that mechanically enforce redemption, with no human counterparty to claim against. LST-issuer custody risk is captured in the Asset Quality section.",
        max_score: 5,
        metric_name: "Regulatory/Legal Profile",
        display_order: 6,
      },
    ],
  },
  pyusd: {
    metrics_rating: "A+",
    address: "0x6c3ea9036406852006290770bedfcaba0e23a0e8",
    rating_type: "Stablecoin - RWA Backed",
    avg_risk_score: 3.93,
    risk_profiles: [
      {
        score: 4.8,
        content:
          "Fully collateralized by short-term U.S. Treasury bills, overnight repurchase agreements, and FDIC-insured cash deposits, custodied by BNY Mellon. Reserves are subject to monthly third-party attestation by KPMG LLP.",
        max_score: 5,
        metric_name: "Asset Quality",
        display_order: 1,
      },
      {
        score: 1.5,
        content:
          "Centralized. Paxos governs PYUSD through privileged roles (supply controller, pauser, asset protection, and proxy admin) enforced by an internal multisig with an undisclosed threshold and no on-chain timelocks over mints, freezes, or upgrades. Privilege scope is fully centralized with weak contract-level constraints, as evidenced by the October 2025 $300 trillion erroneous mint resolved via manual burn in 22 minutes with no peg deviation or customer fund impact.",
        max_score: 5,
        metric_name: "Governance",
        display_order: 2,
      },
      {
        score: 4,
        content:
          "Peg stability is underpinned by direct 1:1 mint and redemption at par with Paxos for verified institutional counterparties, with retail access via PayPal and Venmo. Exceptional peg since August 2023 launch: average annualized volatility of ~0.65%, peg deviation exceeding 50bps observed on fewer than 1% of trading days since launch. Price history covers above one year; daily trading volume averages above $1M over the past 30 days.",
        max_score: 5,
        metric_name: "Peg Track Record",
        display_order: 3,
      },
      {
        score: 4.8,
        content:
          "The contract is a simple, straightforward upgradeable proxy with a limited, well-audited function set, reducing attack surface materially. Four independent audits by Trail of Bits and Zellic were performed. A $1M bug bounty via Cantina covers PYUSD alongside Paxoss broader contract suite.",
        max_score: 5,
        metric_name: "Protocol Security",
        display_order: 4,
      },
      {
        score: 3.7,
        content:
          "PYUSD reserves are managed directly by Paxos Trust Company (founded 2012, 13+ years operational history). KPMG LLP conducts monthly attestations in accordance with AICPA standards. Reserves are legally segregated under NYDFS trust charter requirements, providing bankruptcy-remote protection for holders. Monthly reserve reports disclose full compositional breakdown across T-bills, overnight repos, and FDIC-insured cash, custodied by BNY Mellon. No on-chain Proof-of-Reserves mechanism exists; reserve verification is constrained to the monthly attestation cycle and lacks real-time verifiability.",
        max_score: 5,
        metric_name: "Reserves Management",
        display_order: 5,
      },
      {
        score: 4.8,
        content:
          "PYUSD operates under a multi-jurisdictional regulatory framework spanning the US, Singapore, and Europe. Paxos holds an NYDFS limited-purpose trust charter and received conditional OCC national trust bank approval in December 2025, a MAS Major Payment Institution license, MAS Single-Currency Stablecoin framework approval, and FIN-FSA EMI authorization for MiCA-compliant issuance via Paxos Issuance Europe Oy. Bankruptcy remoteness is established at both issuer level under NYDFS Part 200 and custodian level through FDIC pass-through coverage and segregated custodial accounts. Direct redemption at par is restricted to KYCd Paxos customers.",
        max_score: 5,
        metric_name: "Regulatory/Legal Profile",
        display_order: 6,
      },
    ],
  },
  rlusd: {
    metrics_rating: "A+",
    address: "0x8292bb45bf1ee4d140127049757c2e0ff06317ed",
    rating_type: "Stablecoin - RWA Backed",
    avg_risk_score: 4.05,
    risk_profiles: [
      {
        score: 4.8,
        content:
          "Collateralized by short-term U.S. Treasury bills, government money-market funds, overnight Treasury reverse repos, and FDIC-insured bank deposits. Collateralization stood at ~104–106% as of April 2026, with ~$1,370M in circulation against ~$1,454M in reserves. Assets are custodied in BNY Mellon primarily. Reserve yields accrue entirely to Ripple and are not contractually ring-fenced as a loss-absorption buffer for token holders.",
        max_score: 5,
        metric_name: "Asset Quality",
        display_order: 1,
      },
      {
        score: 1.4,
        content:
          "Centralized. All privileged roles (Minter, Burner, Pauser, Clawbacker, Upgrader, and Role Admin) are held by Ripple/SCTC accounts through a weighted multi-signature structure with undisclosed signer count, threshold, and identities. No on-chain timelock exists; upgrades, freezes, and clawbacks can execute on the next block after the multi-sig assembles. Ripple retains unilateral authority to freeze, burn, or clawback tokens from any wallet. No public incident playbook governs when or how these powers are exercised, despite Ripple holding SOC 2 Type II and ISO 27001 security certifications.",
        max_score: 5,
        metric_name: "Governance",
        display_order: 2,
      },
      {
        score: 4.8,
        content:
          "Exceptional peg stability since December 2024 launch: annualized volatility sits at approximately 0.60%, effectively zero recorded days breaking 1% peg deviation. Price history exceeds 1.5 years. Thirty-day average trading volume surpasses $1 million.",
        max_score: 5,
        metric_name: "Peg Track Record",
        display_order: 3,
      },
      {
        score: 4.8,
        content:
          "RLUSD is a simple contract, an ERC-20 upgradeable proxy on Ethereum, and a native token on XRPL requiring no custom smart contract code. One OpenZeppelin audit was completed prior to the August 2024 deployment (~18–20 months old), with no publicly disclosed re-audit following a July 2025 upgrade. Ripple runs a private Bugcrowd bug bounty with no published maximum payout.",
        max_score: 5,
        metric_name: "Protocol Security",
        display_order: 4,
      },
      {
        score: 3.7,
        content:
          "RLUSD reserves are managed directly by Standard Custody & Trust Company (SCTC), a wholly-owned Ripple subsidiary with 7+ years of operational experience. ~$1,454M held in segregated custody at BNY Mellon (assumed primary custodianship on July 2025; ~$53 trillion AUA; 200+ years in operation). Composition restricted by NYDFS to short-duration T-Bills, government money-market funds, overnight repos, and FDIC-insured deposits. Monthly attestations under AICPA standards; February 2026 report attested by Deloitte. No on-chain Proof-of-Reserves; reserve verification is constrained to the monthly attestation cycle with no real-time on-chain visibility.",
        max_score: 5,
        metric_name: "Reserves Management",
        display_order: 5,
      },
      {
        score: 4.8,
        content:
          "Holds key regulatory licenses including the NYDFS Limited Purpose Trust Company Charter, NYDFS BitLicense, and MAS Major Payment Institution license (with expanded digital payment token services scope, December 2025), plus a conditional OCC National Trust Bank Charter (December 2025). The NYDFS Trust Charter mandates reserve segregation for RLUSD holders; bankruptcy remoteness confirmed at issuer and custodian levels. User Terms disclaim direct property rights for token holders; direct redemption available only to onboarded institutional customers.",
        max_score: 5,
        metric_name: "Regulatory/Legal Profile",
        display_order: 6,
      },
    ],
  },
  usdc: {
    metrics_rating: "A+",
    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    rating_type: "Stablecoin - RWA Backed",
    avg_risk_score: 3.88,
    risk_profiles: [
      {
        score: 4.8,
        content:
          "Reserves are entirely passive U.S. dollar instruments, approximately 88% in the Circle Reserve Fund (BlackRock-managed, BNY Mellon-custodied), holding predominantly overnight Treasury repo and short-dated Treasuries; the remainder as cash deposits at G-SIB banking partners. No insurance fund or subordinated tranche exists; any reserve shortfall falls directly on holders. The sole loss-absorption backstop is Circles corporate balance sheet.",
        max_score: 5,
        metric_name: "Asset Quality",
        display_order: 1,
      },
      {
        score: 1.5,
        content:
          "Centralized. Circle holds unilateral authority to blacklist, pause, mint, burn, and upgrade contract logic with zero timelock; changes execute in the same block as the admin transaction. Seven privileged roles are defined; the ProxyAdmin and Owner are Gnosis Safe multisigs with undisclosed M-of-N thresholds. No DAO, token-holder vote, or published incident runbook exists. Privilege scope is unrestricted by any on-chain mechanism.",
        max_score: 5,
        metric_name: "Governance",
        display_order: 2,
      },
      {
        score: 4.8,
        content:
          "Annualized price volatility is below 1%, with effectively zero days breaching the 99th-percentile deviation threshold under normal conditions. The sole material stress event was March 2023, when SVB exposure drove an intraday depeg to $0.87, recovered within one business day via FDIC intervention. Daily secondary market volume exceeds $8 billion. Price history tracks back to late 2018.",
        max_score: 5,
        metric_name: "Peg Track Record",
        display_order: 3,
      },
      {
        score: 4.8,
        content:
          "The contract is a simple upgradeable proxy with a limited, well-established function set, which materially limits on-chain attack surface. Four core audits cover the FiatToken contracts through 2023; no audit has been published since. No formal verification has been performed. The HackerOne bug bounty caps smart contract payouts at $5,000. No on-chain exploit has occurred since the August 2018 deployment. The April 2026 CCTP incident, in which $232 million in USDC moved freely following the Drift hack, was an operational compliance failure, not a contract vulnerability.",
        max_score: 5,
        metric_name: "Protocol Security",
        display_order: 4,
      },
      {
        score: 3.9,
        content:
          "Reserves are managed directly by Circle (founded 2013, 12+ years operational history), with the ~88% Circle Reserve Fund administered by BlackRock Advisors (35+ years of institutional asset management experience) and custodied at BNY Mellon under Investment Company Act segregation. Deloitte publishes monthly AICPA-standard attestations, supplemented by weekly composition disclosures and daily BlackRock portfolio data. Attestation is not a full audit. No on-chain Proof-of-Reserves exists; reserve verification depends on monthly attestation and self-reported disclosures rather than real-time on-chain visibility. The residual ~12% cash at banking partners is an unsecured deposit claim; FDIC coverage is negligible at this scale.",
        max_score: 5,
        metric_name: "Reserves Management",
        display_order: 5,
      },
      {
        score: 3.5,
        content:
          "Circle holds approximately 55 regulatory authorizations, including NYDFS BitLicense, 46 state MTLs, a conditional OCC trust bank approval, France ACPR EMI enabling MiCAR-compliant issuance, UK FCA EMI, Singapore MAS MPI, Bermuda DABA Class F, and ADGM FSP. At minimum six are stablecoin-specific. Custodian-level asset segregation and bankruptcy remoteness are conferred; issuer-level bankruptcy remoteness is legally argued but court-untested. The GENIUS Act, effective approximately 2027, would codify statutory holder priority. Direct redemption is restricted to KYC-verified institutional Circle Mint users.",
        max_score: 5,
        metric_name: "Regulatory/Legal Profile",
        display_order: 6,
      },
    ],
  },
  usd1: {
    metrics_rating: "A",
    address: "0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d",
    rating_type: "Stablecoin - RWA Backed",
    avg_risk_score: 3.85,
    risk_profiles: [
      {
        score: 4.8,
        content:
          "Reserves comprise U.S. money-market funds (in a segregated qualified trust account at BitGo Bank & Trust, N.A., and cash at unnamed U.S. commercial banks. Confirmed at 1:1 collateralization, as of the December 2025 Crowe LLP attestation. The cash tranche carries uninsured counterparty exposure above FDIC limits; no equity buffer exists above par.",
        max_score: 5,
        metric_name: "Asset Quality",
        display_order: 1,
      },
      {
        score: 1.5,
        content:
          "Centralized. BitGo holds freeze, issuance-pause, and proxy upgrade authority through a multisig with undisclosed signer count, threshold, and timelock with no publicly verifiable constraints. No public incident response plan; WLFIs February 2026 peg deviation incident was reactive and informal. Redemption is T+2 and gated to eligible BitGo customers. Holders have contractual rather than legal beneficiary rights over reserves, though BitGos OCC trust structure provides meaningful asset segregation and bankruptcy remoteness (weakest on the uninsured cash tranche).",
        max_score: 5,
        metric_name: "Governance",
        display_order: 2,
      },
      {
        score: 4.8,
        content:
          "~12 months of history since March 2025 launch. Annualized volatility in the 0–5% range with fewer than 2% of trading days recording notable deviation. On February 23, 2026, a social engineering campaign drove an intraday low of ~$0.98; peg recovered within 30–60 minutes with reserves and redemptions unaffected. Average trading volume sits above $1 million over the trailing 30 days.",
        max_score: 5,
        metric_name: "Peg Track Record",
        display_order: 3,
      },
      {
        score: 4.6,
        content:
          "Upgradeable ERC-20 proxy contract with no oracle dependencies or cross-contract composability: a deliberately minimal architecture limited to mint/burn, transfer, and compliance functions (pause/freeze). One PeckShield audit conducted at launch in early 2025; full report not publicly released. No formal verification, bug bounty, or disclosed ProxyAdmin/timelock status. No protocol-level exploit has occurred.",
        max_score: 5,
        metric_name: "Protocol Security",
        display_order: 4,
      },
      {
        score: 3.9,
        content:
          "USD1 reserves are managed directly by World Liberty Financial / BitGo Trust (BitGo founded 2013, 12+ years operational history). WLFI itself was founded in 2024, under one year of reserve management experience at launch. Crowe LLP issues monthly agreed-upon examination reports under 2025 AICPA criteria (an attestation procedure, not a full audit) published on BitGos website. No on-chain Proof-of-Reserves mechanism is live despite earlier public representations; reserve verification depends on monthly examination reports rather than real-time on-chain visibility.",
        max_score: 5,
        metric_name: "Reserves Management",
        display_order: 5,
      },
      {
        score: 3.5,
        content:
          "BitGo Bank & Trust, N.A. holds an OCC national trust bank charter (December 2025) explicitly authorizing USD1 issuance. At the group level, BitGo Technologies LLC is FinCEN-registered with state money-transmitter licenses; BitGo New York Trust Company is NYDFS-regulated. WLFI holds no public financial licenses. Reserves are held in a segregated qualified trust titled for the benefit of USD1 holders under federal banking law, with legally enforceable bankruptcy-remote protection at the custodian level. Direct redemption rights are available to KYCd BitGo customers; secondary market holders hold contractual exposure only and must redeem through intermediaries. The uninsured cash tranche above FDIC limits remains the weaker link.",
        max_score: 5,
        metric_name: "Regulatory/Legal Profile",
        display_order: 6,
      },
    ],
  },
  usds: {
    metrics_rating: "A-",
    address: "0xdc035d45d973e3ec169d2276ddab16f1e407384f",
    rating_type: "Stablecoin - Alternative Assets",
    avg_risk_score: 4.03,
    risk_profiles: [
      {
        score: 4,
        content:
          "USDS collateral is diversified across four categories: stablecoins (predominantly USDC), lending markets (stablecoins lent against ETH and wstETH on SparkLend, USDT and USDC on Morpho, and BTC and syrupUSDC in OTC venues via Anchorage and Maple), T-Bills (JTRSY and BUIDL-I), and private credit (JAAA, STAC, ACRDX). T-Bills and stablecoins carry the lowest risk; lending markets introduce counterparty and liquidation risk through active deployment against crypto and institutional collateral; private credit carries the highest individual risk, with Legacy RWA positions carrying limited disclosure. Reserve assets are actively deployed rather than held idle, compounding credit exposure beyond static collateral quality. Blended collateralization exceeds par; no dedicated insurance buffer exists above that level.",
        max_score: 5,
        metric_name: "Asset Quality",
        display_order: 1,
      },
      {
        score: 4.6,
        content:
          "Decentralized. USDS governance runs through decentralized SKY token voting; no single entity or multisig holds unilateral control. The collective DAO holds broad powers including protocol pause, parameter modification, and contract upgrades, all subject to a mandatory 48-hour execution delay. An emergency shutdown mechanism and a SKY token minting backstop provide bad debt recapitalization capacity. The surplus buffer stands at ~0.5% of total supply, representing thin first-loss coverage ahead of the backstop.",
        max_score: 5,
        metric_name: "Governance",
        display_order: 2,
      },
      {
        score: 4.8,
        content:
          "USDS maintains annualized price volatility of 0.67% with deviations exceeding 99 basis points on 0.55% of trading days; both consistent with its nine-year DAI/USDS lineage. A built-in 1:1 zero-fee instant conversion mechanism to USDC acts as a mechanical peg stabilizer, underpinned by over $1M in daily trading volume and price history exceeding one year. No peg failures or contract freezes have occurred in the protocols history.",
        max_score: 5,
        metric_name: "Peg Track Record",
        display_order: 3,
      },
      {
        score: 4.3,
        content:
          "USDS inherits over eight years of continuous mainnet operation from the MakerDAO/DAI codebase, with 19 core-contract audit reports from ChainSecurity, Trail of Bits, Cantina, and others, supplemented by Certora formal verification. The most recent audits are dated August 2025. A $10 million Immunefi bug bounty is active. No exploits or security incidents have been recorded.",
        max_score: 5,
        metric_name: "Protocol Security",
        display_order: 4,
      },
      {
        score: 4.2,
        content:
          "Crypto collateral is fully on-chain and verifiable in real time. RWA allocations are reported by arrangers including BlockTower, Centrifuge, and Monetalis on monthly and quarterly cadences with no independent Big-4 audit. Skys reserve management track record spans under three years across all categories. Redemption operates through a 1:1 zero-fee instant swap to USDC; no contractual redemption right against the issuer exists for token holders.",
        max_score: 5,
        metric_name: "Reserves Management",
        display_order: 5,
      },
      {
        score: 2.3,
        content:
          "Sky Protocol holds zero financial regulatory licenses and zero stablecoin-specific authorizations globally. Bankruptcy remoteness is absent; USDS holders are not named beneficiaries of any trust structure. Token holders carry no enforceable redemption rights, no asset segregation, and no beneficial ownership representation in the Terms of Service.",
        max_score: 5,
        metric_name: "Regulatory/Legal Profile",
        display_order: 6,
      },
    ],
  },
  usdt: {
    metrics_rating: "A-",
    address: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    rating_type: "Stablecoin - RWA Backed",
    avg_risk_score: 3.49,
    risk_profiles: [
      {
        score: 4.6,
        content:
          "USDT maintains a 1:1 peg to USD through reserve backing held by Tether and redemption mechanics. Reserves total approximately $191.8B against $183.5B in liabilities, yielding a 4.5% equity buffer of approximately $8.2B, as attested by BDO Italia for Q1 2026. They comprise U.S. Treasury bills and repos custodied primarily at Cantor Fitzgerald, precious metals at an undisclosed vault, Bitcoin at undisclosed custodians, public equities, secured loans, and cash.",
        max_score: 5,
        metric_name: "Asset Quality",
        display_order: 1,
      },
      {
        score: 1.4,
        content:
          "Centralized. All privileged functions (mint, burn, pause, blacklist, clawback, and upgrade) are held by a single owner role with no separation of duties, controlled by a 3-of-6 multisig with no on-chain timelock. Signer identities are undisclosed. A May 2025 third-party analysis report found that a 10–44 minute signing latency allowed $78.1M in USDT to evade blacklisting cumulatively over the contracts history. Tether has demonstrated operational resilience under stress, processing approximately $18B in redemptions during the May 2022 Terra collapse without suspension, but protocol stability reflects operational discipline rather than structural safeguards.",
        max_score: 5,
        metric_name: "Governance",
        display_order: 2,
      },
      {
        score: 4.8,
        content:
          "USDT has maintained proximity to $1.00 across multiple systemic stress events. The May 2022 Terra collapse produced a brief dip to $0.9485 with approximately $18B redeemed; the March 2023 SVB crisis produced no material deviation; a minor dip to $0.998 in January 2025 resolved within days. USDT attracted safe-haven inflows during the October 2025 liquidation cascade that depegged competing stablecoins. Annualized volatility averaged 0.96% and only 0.27% of trading days recording a deviation above the 99th percentile over the trailing year. Price history exceeds one year with over $1M in average daily trading volume. Direct redemption is restricted to verified institutional counterparties subject to a $100,000 minimum and KYC requirements; retail holders depend on secondary-market liquidity.",
        max_score: 5,
        metric_name: "Peg Track Record",
        display_order: 3,
      },
      {
        score: 4.8,
        content:
          "The Ethereum contract is a simple, single-file Solidity deployment unchanged since November 2017. It has received one substantive third-party audit (Callisto Network in 2019) with three low-severity findings remaining unremediated. No formal verification exists. Tethers self-hosted bug bounty caps payouts at approximately $10,000 and scopes only the web platform, not on-chain contracts.",
        max_score: 5,
        metric_name: "Protocol Security",
        display_order: 4,
      },
      {
        score: 3.7,
        content:
          "Reserves are passively managed internally by Tether, in operation since 2014, with yield derived from Treasury coupons, repo interest, secured-lending spreads, and mark-to-market on Bitcoin and gold; Tether reported approximately $10.1B in net profit for 2025. Treasury and repo custody is concentrated at Cantor Fitzgerald (~4–5 years as primary custodian), which also holds an equity stake in Tether, a related-party relationship that warrants monitoring. Quarterly ISAE 3000R limited assurance reports are issued by BDO Italia, supplemented by a daily self-reported dashboard with no cryptographic verification. A full audit engagement with KPMG was announced in March 2026 but had not been completed as of the current date. No on-chain Proof-of-Reserves; reserve verification is constrained to quarterly assurance and a self-reported dashboard.",
        max_score: 5,
        metric_name: "Reserves Management",
        display_order: 5,
      },
      {
        score: 1.6,
        content:
          "Tether holds a FinCEN MSB registration (AML filing, not prudential) and an El Salvador CNAD Stablecoin Issuer authorization, its sole stablecoin-specific license. No MiCA, FCA, MAS, BaFin, FINMA, or VARA authorization is held; EU exchange delistings followed MiCA non-compliance from late 2024 through Q1 2025. Cantor Fitzgerald provides asset segregation at the custodian level. Tethers Terms of Service explicitly denies asset segregation; tokenholders are unsecured contractual creditors under El Salvador insolvency law with no trust structure, SPV, or statutory ring-fencing protecting reserve assets.",
        max_score: 5,
        metric_name: "Regulatory/Legal Profile",
        display_order: 6,
      },
    ],
  },
};

export const RiskAssetAddresses = [
  "0xa2e3356610840701bdf5611a53974510ae27e2e1",
  "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
  "0xe72b141df173b999ae7c1adcbf60cc9833ce56a8",
  "0x61d6eaf4e96e69b45240a5b22815b43360e28ce3",
  "0xae78736cd615f374d3085123a210448e74fc6393",
  "0xD9A442856C234a39a81a089C06451EBAa4306a72",
  "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8",
  "0x8292bb45bf1ee4d140127049757c2e0ff06317ed",
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d",
  "0xdC035D45d973E3EC169d2276DDab16f1e407384F",
  "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
  "0x7a56e1c57c7475ccf742a1832b028f0456652f97",
  "0x18084fba666a33d37592fa2633fd49a74dd93a88",
  "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
  "0x8236a87084f8b84306f72007f36f2618a5634494",
  "0xf1143f3a8d76f1ca740d29d5671d365f66c44ed1",
  "0x2C0aDFF8e114f3cA106051144353aC703D24B901",
  "0x6a9da2d710Bb9b700aCde7Cb81F10F1ff8C89041",
  "0x5a0f93d040de44e78f251b03c43be9cf317dcf64",
  "0x8c213ee79581ff4984583c6a801e5263418c4b86",
  "0x238a700eD6165261Cf8b2e544ba797BC11e466Ba",
  "0x9a005c9a89bd72a4bd27721e7a09a3c11d2b03c4",
];

// Keyed by metric name rather than position: the risk panel reorders metrics
// for display, and an asset can report metrics outside this set.
export const RiskProfileIcon: Record<string, typeof LucideGem | undefined> = {
  "Asset Quality": LucideGem,
  Governance: LucideShield,
  "Peg Track Record": LucideLandMark,
  "Protocol Security": LucideActivity,
  "Reserves Management": LucideDatabase,
  "Regulatory/Legal Profile": LucideScale,
};
