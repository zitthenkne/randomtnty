import { makeId } from "./utils.js";

export const SCHEMA_VERSION = 2;

export function createEntry(label, overrides = {}) {
  return {
    id: makeId(),
    label,
    subtitle: "",
    weight: 1,
    sliceColor: null,
    textColor: null,
    image: null,
    imageMode: "image-text",
    enabled: true,
    eliminated: false,
    winCount: 0,
    meta: {},
    ...overrides
  };
}

export const TEAM_PICKER_NAMES = [
  "Luffy",
  "Zoro",
  "Sanji",
  "Naruto",
  "Sasuke",
  "Goku",
  "Conan",
  "Tanjiro",
  "Gojo"
];

export const DEFAULT_ENTRIES = [];

export const MULTI_WHEEL_PRESETS = [
  {
    key: "who_what_where",
    title: "Ai - Làm gì - Ở đâu?",
    wheels: [
      {
        id: "w1",
        title: "Ai? (Nhân vật)",
        themePreset: "tnty",
        entries: ["Luffy 👒", "Zoro ⚔", "Sanji 🍳", "Nami 🍊", "Naruto 🍥", "Sasuke ⚡", "Conan 👓", "Tanjiro 🌊"]
      },
      {
        id: "w2",
        title: "Làm gì? (Hành động)",
        themePreset: "ocean",
        entries: ["Hát một bài", "Nhảy một điệu", "Kể một câu chuyện vui", "Chống đẩy 10 cái", "Mời cả nhóm trà sữa", "Tạo dáng siêu mẫu", "Gửi lời chúc dễ thương", "Bắt chước tiếng con vật"]
      },
      {
        id: "w3",
        title: "Ở đâu? (Địa điểm)",
        themePreset: "sunset",
        entries: ["Tại sân khấu", "Tại sảnh CLB", "Trước cả lớp", "Tại quán cà phê", "Tại công viên", "Trên livestream", "Tại phòng trực"]
      }
    ]
  },
  {
    key: "winner_prize",
    title: "Người nhận giải & Phần quà",
    wheels: [
      {
        id: "w1",
        title: "Người nhận giải",
        themePreset: "tnty",
        entries: ["Người chơi A", "Người chơi B", "Người chơi C", "Người chơi D", "Người chơi E", "Người chơi F"]
      },
      {
        id: "w2",
        title: "Giải thưởng",
        themePreset: "rainbow",
        entries: ["Giải Đặc Biệt 🏆", "Giải Nhất 🥇", "Giải Nhì 🥈", "Giải Ba 🥉", "Voucher 100k", "Móc khóa TNTY", "Áo thun Man in Red", "Chúc may mắn lần sau"]
      }
    ]
  },
  {
    key: "tnty_challenge",
    title: "Thành viên TNTY & Thử thách vui",
    wheels: [
      {
        id: "w1",
        title: "Ban chuyên trách",
        themePreset: "tnty",
        entries: ["Ban Hậu cần", "Ban Truyền thông", "Ban Chuyên môn", "Ban Văn nghệ", "Ban Đối ngoại", "Ban Điều hành"]
      },
      {
        id: "w2",
        title: "Nhiệm vụ sinh hoạt",
        themePreset: "candy",
        entries: ["Làm MC chương trình", "Hát ca khúc truyền thống", "Quay 1 video TikTok vui", "Tổ chức trò chơi Icebreaker", "Dọn dẹp sau sinh hoạt", "Chụp 10 tấm ảnh kỉ niệm"]
      },
      {
        id: "w3",
        title: "Phần thưởng",
        themePreset: "pastel",
        entries: ["100 Điểm rèn luyện", "Tràng pháo tay giòn giã", "1 Ly Trà sữa full topping", "Huy hiệu Man in Red", "Miễn trực 1 buổi", "Ôm thắm thiết một cái"]
      }
    ]
  },
  {
    key: "lunch_decision",
    title: "Hôm nay ăn gì - Uống gì - Ai bao?",
    wheels: [
      {
        id: "w1",
        title: "Hôm nay ăn gì?",
        themePreset: "pastel",
        entries: ["Cơm tấm", "Bún bò Huế", "Phở bò", "Mì cay 7 cấp", "Pizza", "Bánh mì chảo", "Gà rán", "Lẩu Thái"]
      },
      {
        id: "w2",
        title: "Uống gì?",
        themePreset: "retro",
        entries: ["Trà sữa trân châu", "Cà phê muối", "Trà đào cam sả", "Nước ép cam", "Trà tắc khổng lồ", "Sinh tố bơ", "Nước lọc"]
      },
      {
        id: "w3",
        title: "Ai bao / Ai trả tiền?",
        themePreset: "casino",
        entries: ["Campuchia (Chia đều)", "Người quay bao", "Người ngồi bên phải bao", "Quỹ CLB tài trợ", "Bốc thăm ngẫu nhiên", "Oẳn tù tì ai thua trả"]
      }
    ]
  }
];

export const DEFAULT_STATE = {
  schemaVersion: SCHEMA_VERSION,
  title: "My Wheel",
  description: "",
  entries: DEFAULT_ENTRIES,
  tournament: {
    rounds: [],
    winnerId: null,
    winnerLabel: "",
    generatedAt: 0
  },
  results: [],
  multiWheel: {
    enabled: false,
    wheelCount: 2,
    activeWheelIndex: 0,
    wheels: [
      {
        id: "mw-1",
        title: "Vòng 1: Nhân vật",
        themePreset: "tnty",
        entries: [
          createEntry("Luffy 👒"),
          createEntry("Zoro ⚔"),
          createEntry("Sanji 🍳"),
          createEntry("Naruto 🍥"),
          createEntry("Sasuke ⚡"),
          createEntry("Goku 🔥")
        ]
      },
      {
        id: "mw-2",
        title: "Vòng 2: Thử thách",
        themePreset: "ocean",
        entries: [
          createEntry("Hát một bài"),
          createEntry("Nhảy điệu vui"),
          createEntry("Chống đẩy 10 cái"),
          createEntry("Kể chuyện cười"),
          createEntry("Bắt chước tiếng mèo"),
          createEntry("Tạo dáng chụp ảnh")
        ]
      },
      {
        id: "mw-3",
        title: "Vòng 3: Phần thưởng",
        themePreset: "sunset",
        entries: [
          createEntry("1 Ly trà sữa"),
          createEntry("Tràng pháo tay"),
          createEntry("Huy hiệu TNTY"),
          createEntry("Miễn trực 1 buổi"),
          createEntry("Điểm rèn luyện +10")
        ]
      },
      {
        id: "mw-4",
        title: "Vòng 4: Địa điểm",
        themePreset: "candy",
        entries: [
          createEntry("Tại sân khấu"),
          createEntry("Tại sảnh CLB"),
          createEntry("Tại công viên"),
          createEntry("Tại quán ăn")
        ]
      }
    ]
  },
  settings: {
    mode: "normal",
    spinDuration: 5,
    spinTurns: 8,
    easingCurve: "cubic-out",
    manualStop: false,
    randomInitialAngle: true,
    showWeights: false,
    mysteryWheel: false,
    teamCount: 2,
    numberMin: 1,
    numberMax: 20,
    numberStep: 1,
    numberCount: 3,
    seedEnabled: false,
    seedValue: "",
    seedCursor: 0,
    celebrationMode: "confetti",
    cinematicMode: false,
    hapticsEnabled: true,
    idleAnimationEnabled: true,
    tournamentMode: false,
    performanceModeAuto: true,
    performanceOverview: false,
    confettiEnabled: true,
    reduceMotionOverride: false
  },
  theme: {
    preset: "tnty",
    sliceColors: [],
    backgroundColor: "#2b0a0d",
    borderColor: "#ffffff22",
    borderWidth: 2,
    pointerStyle: "classic",
    centerStyle: "image",
    centerImage: "logo_clb.png",
    centerText: "",
    centerColor: null,
    fontFamily: "auto",
    pageTheme: "light",
    backgroundType: "default",
    backgroundSolid: "#2b0a0d",
    backgroundGradientFrom: "#2b0a0d",
    backgroundGradientTo: "#6f1d27",
    backgroundGradientAngle: 150,
    backgroundImage: null,
    eventPreset: "default"
  },
  audio: {
    tickSound: "click",
    winSound: "fanfare",
    spinSound: "whoosh",
    masterVolume: 0.7,
    tickEnabled: true,
    winEnabled: true,
    spinEnabled: false
  },
  ui: {
    language: "vi",
    activeTab: "entries",
    firstRunHintDismissed: false
  }
};

export const SUPPORTED_LANGUAGES = [
  { code: "vi", label: "Tiếng Việt" }
];

export const HREFLANG_CODES = ["vi"];
