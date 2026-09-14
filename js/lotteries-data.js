/**
 * Diccionario oficial de animalitos y ruletas venezolanas (00 al 99)
 * Utilizado para mostrar el nombre del animal junto al número
 */
const ANIMALITOS_DICT = {
  "00": { name: "BALLENA", icon: "🐋" },
  "0":  { name: "DELFÍN", icon: "🐬" },
  "01": { name: "CARNERO", icon: "🐏" }, "1": { name: "CARNERO", icon: "🐏" },
  "02": { name: "TORO", icon: "🐂" }, "2": { name: "TORO", icon: "🐂" },
  "03": { name: "CIEMPIÉS", icon: "🐛" }, "3": { name: "CIEMPIÉS", icon: "🐛" },
  "04": { name: "ALACRÁN", icon: "🦂" }, "4": { name: "ALACRÁN", icon: "🦂" },
  "05": { name: "LEÓN", icon: "🦁" }, "5": { name: "LEÓN", icon: "🦁" },
  "06": { name: "RANA", icon: "🐸" }, "6": { name: "RANA", icon: "🐸" },
  "07": { name: "PERICO", icon: "🦜" }, "7": { name: "PERICO", icon: "🦜" },
  "08": { name: "RATÓN", icon: "🐀" }, "8": { name: "RATÓN", icon: "🐀" },
  "09": { name: "ÁGUILA", icon: "🦅" }, "9": { name: "ÁGUILA", icon: "🦅" },
  "10": { name: "TIGRE", icon: "🐅" },
  "11": { name: "GATO", icon: "🐈" },
  "12": { name: "CABALLO", icon: "🐎" },
  "13": { name: "MONO", icon: "🐒" },
  "14": { name: "PALOMA", icon: "🕊️" },
  "15": { name: "ZORRO", icon: "🦊" },
  "16": { name: "OSO", icon: "🐻" },
  "17": { name: "PAVO", icon: "🦃" },
  "18": { name: "BURRO", icon: "🫏" },
  "19": { name: "CHIVO", icon: "🐐" },
  "20": { name: "COCHINO", icon: "🐖" },
  "21": { name: "GALLO", icon: "🐓" },
  "22": { name: "CAMELLO", icon: "🐫" },
  "23": { name: "CEBRA", icon: "🦓" },
  "24": { name: "IGUANA", icon: "🦎" },
  "25": { name: "GALLINA", icon: "🐔" },
  "26": { name: "VACA", icon: "🐄" },
  "27": { name: "PERRO", icon: "🐕" },
  "28": { name: "ZAMURO", icon: "🦅" },
  "29": { name: "ELEFANTE", icon: "🐘" },
  "30": { name: "CAIMÁN", icon: "🐊" },
  "31": { name: "LAPA", icon: "🦔" },
  "32": { name: "ARDILLA", icon: "🐿️" },
  "33": { name: "PESCADO", icon: "🐟" },
  "34": { name: "VENADO", icon: "🦌" },
  "35": { name: "JIRAFA", icon: "🦒" },
  "36": { name: "CULEBRA", icon: "🐍" },
  "37": { name: "TORTUGA", icon: "🐢" },
  "38": { name: "BÚHO", icon: "🦉" },
  "39": { name: "LECHUZA", icon: "🦉" },
  "40": { name: "AVISPA", icon: "🐝" },
  "41": { name: "CANGURO", icon: "🦘" },
  "42": { name: "TUCÁN", icon: "🦜" },
  "43": { name: "MARIPOSA", icon: "🦋" },
  "44": { name: "CHIGÜIRE", icon: "🦫" },
  "45": { name: "GARZA", icon: "🦤" },
  "46": { name: "PUMA", icon: "🐆" },
  "47": { name: "PAVO REAL", icon: "🦚" },
  "48": { name: "PUERCOESPÍN", icon: "🦔" },
  "49": { name: "PEREZA", icon: "🦥" },
  "50": { name: "CANARIO", icon: "🐤" },
  "51": { name: "PELÍCANO", icon: "🦤" },
  "52": { name: "PULPO", icon: "🐙" },
  "53": { name: "CARACOL", icon: "🐌" },
  "54": { name: "GRILLO", icon: "🦗" },
  "55": { name: "OSO HORMIGUERO", icon: "🐜" },
  "56": { name: "TIBURÓN", icon: "🦈" },
  "57": { name: "PATO", icon: "🦆" },
  "58": { name: "HORMIGA", icon: "🐜" },
  "59": { name: "PANTERA", icon: "🐆" },
  "60": { name: "CAMALEÓN", icon: "🦎" },
  "61": { name: "CARNERO", icon: "🐏" },
  "62": { name: "CACHICAMO", icon: "🦔" },
  "63": { name: "CANGREJO", icon: "🦀" },
  "64": { name: "GAVILÁN", icon: "🦅" },
  "65": { name: "ARAÑA", icon: "🕷️" },
  "66": { name: "LOBO", icon: "🐺" },
  "67": { name: "AVESTRUZ", icon: "🦤" },
  "68": { name: "JAGUAR", icon: "🐆" },
  "69": { name: "CONEJO", icon: "🐇" },
  "70": { name: "BISONTE", icon: "🦬" },
  "71": { name: "GUACAMAYA", icon: "🦜" },
  "72": { name: "GORILA", icon: "🦍" },
  "73": { name: "BÚFALO", icon: "🐃" },
  "74": { name: "TURPIAL", icon: "🐦" },
  "75": { name: "FLAMENCO", icon: "🦩" },
  "76": { name: "RINOCERONTE", icon: "🦏" },
  "77": { name: "PINGÜINO", icon: "🐧" },
  "78": { name: "ANTÍLOPE", icon: "🦌" },
  "79": { name: "CALAMAR", icon: "🦑" },
  "80": { name: "MURCIÉLAGO", icon: "🦇" },
  "81": { name: "CISNE", icon: "🦢" },
  "82": { name: "HIPOPÓTAMO", icon: "🦛" },
  "83": { name: "COLIBRÍ", icon: "🐦" },
  "84": { name: "FOCA", icon: "🦭" },
  "85": { name: "HIENA", icon: "🐕" },
  "86": { name: "BUEY", icon: "🐂" },
  "87": { name: "CABRA", icon: "🐐" },
  "88": { name: "KOALA", icon: "🐨" },
  "89": { name: "LINCE", icon: "🐱" },
  "90": { name: "HURÓN", icon: "🦡" },
  "91": { name: "MORROCOY", icon: "🐢" },
  "92": { name: "CISNE", icon: "🦢" },
  "93": { name: "GAVIOTA", icon: "🕊️" },
  "94": { name: "PANDA", icon: "🐼" },
  "95": { name: "ESCARABAJO", icon: "🪲" },
  "96": { name: "BÚFALO", icon: "🐃" },
  "97": { name: "LORO", icon: "🦜" },
  "98": { name: "COCODRILO", icon: "🐊" },
  "99": { name: "GUÁCHARO", icon: "🦅" }
};

// Diccionario de signos zodiacales y sus símbolos astronómicos
const ZODIAC_ICONS = {
  "ARIES": "♈",
  "TAURO": "♉",
  "GÉMINIS": "♊", "GEMINIS": "♊", "GEM": "♊",
  "CÁNCER": "♋", "CANCER": "♋", "CAN": "♋",
  "LEO": "♌",
  "VIRGO": "♍", "VIR": "♍",
  "LIBRA": "♎", "LIB": "♎",
  "ESCORPIO": "♏", "ESCORPION": "♏", "ESC": "♏",
  "SAGITARIO": "♐", "SAG": "♐",
  "CAPRICORNIO": "♑", "CAP": "♑",
  "ACUARIO": "♒", "ACU": "♒",
  "PISCIS": "♓", "PIS": "♓"
};

// Horas estándar para animalitos y ruletas (8 AM a 7 PM)
const HORARIOS_ANIMALITOS = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", 
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", 
  "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM"
];

// Configuración de los juegos presentes en las fotos de la agencia
const LOTTERIES_CONFIG = {
  triples: [
    {
      id: "chance",
      name: "Triple Chance",
      badge: "CHANCE",
      color: "#f97316",
      accent: "rgba(249, 115, 22, 0.15)",
      draws: [
        { time: "1:00 PM", label: "1:00 PM" },
        { time: "4:30 PM", label: "4:30 PM" },
        { time: "7:00 PM", label: "7:00 PM" }
      ],
      fields: ["A", "B", "C (Signo)"]
    },
    {
      id: "tachira",
      name: "Triple Táchira",
      badge: "TÁCHIRA",
      color: "#eab308",
      accent: "rgba(234, 179, 8, 0.15)",
      draws: [
        { time: "1:15 PM", label: "1:15 PM" },
        { time: "4:45 PM", label: "4:45 PM" },
        { time: "10:10 PM", label: "10:10 PM" }
      ],
      fields: ["A", "B", "C (Signo)"]
    },
    {
      id: "caracas",
      name: "Triple Caracas",
      badge: "CARACAS",
      color: "#ef4444",
      accent: "rgba(239, 68, 68, 0.15)",
      draws: [
        { time: "1:00 PM", label: "1:00 PM" },
        { time: "4:30 PM", label: "4:30 PM" },
        { time: "7:00 PM", label: "7:00 PM" }
      ],
      fields: ["A", "B", "C (Signo)"]
    },
    {
      id: "zulia",
      name: "Triple Zulia",
      badge: "ZULIA",
      color: "#3b82f6",
      accent: "rgba(59, 130, 246, 0.15)",
      draws: [
        { time: "12:45 PM", label: "12:45 PM" },
        { time: "4:45 PM", label: "4:45 PM" },
        { time: "7:45 PM", label: "7:45 PM" }
      ],
      fields: ["A", "B", "C (Signo)"]
    },
    {
      id: "zamorano",
      name: "Triple Zamorano",
      badge: "ZAMORANO",
      color: "#10b981",
      accent: "rgba(16, 185, 129, 0.15)",
      draws: [
        { time: "12:00 PM", label: "12:00 PM" },
        { time: "2:00 PM", label: "2:00 PM" },
        { time: "4:00 PM", label: "4:00 PM" },
        { time: "7:00 PM", label: "7:00 PM" }
      ],
      fields: ["Triple", "Astro / Signo"]
    }
  ],

  animalitos: [
    {
      id: "lotto_activo",
      name: "Lotto Activo",
      short: "ACTIVO",
      color: "#22c55e",
      bgHeader: "rgba(34, 197, 94, 0.15)",
      type: "animal"
    },
    {
      id: "la_granjita",
      name: "La Granjita",
      short: "GRANJITA",
      color: "#84cc16",
      bgHeader: "rgba(132, 204, 22, 0.15)",
      type: "animal"
    },
    {
      id: "selva_plus",
      name: "Selva Plus",
      short: "SELVA PLUS",
      color: "#14b8a6",
      bgHeader: "rgba(20, 184, 166, 0.15)",
      type: "animal"
    },
    {
      id: "guacharo_millonario",
      name: "Guácharo Millonario",
      short: "GUÁCHARO M.",
      color: "#f59e0b",
      bgHeader: "rgba(245, 158, 11, 0.15)",
      type: "animal"
    },
    {
      id: "monje",
      name: "El Monje",
      short: "MONJE",
      color: "#a855f7",
      bgHeader: "rgba(168, 85, 247, 0.15)",
      type: "animal"
    },
    {
      id: "guacharo_activo",
      name: "Guácharo Activo",
      short: "G. ACTIVO",
      color: "#eab308",
      bgHeader: "rgba(234, 179, 8, 0.15)",
      type: "animal"
    },
    {
      id: "el_ruco",
      name: "El Ruco",
      short: "EL RUCO",
      color: "#06b6d4",
      bgHeader: "rgba(6, 182, 212, 0.15)",
      type: "zodiac"
    },
    {
      id: "la_ruca",
      name: "La Ruca Vzla",
      short: "LA RUCA",
      color: "#ec4899",
      bgHeader: "rgba(236, 72, 153, 0.15)",
      type: "zodiac",
      noDraws: ["8:00 AM"]
    },
    {
      id: "el_dorado",
      name: "El Dorado",
      short: "DORADO",
      color: "#fbbf24",
      bgHeader: "rgba(251, 191, 36, 0.15)",
      type: "number",
      noDraws: ["8:00 AM", "12:00 PM", "7:00 PM"]
    },
    {
      id: "facil",
      name: "Fácil",
      short: "FÁCIL",
      color: "#38bdf8",
      bgHeader: "rgba(56, 189, 248, 0.15)",
      type: "number"
    },
    {
      id: "la_ricachona",
      name: "La Ricachona",
      short: "RICACHONA",
      color: "#f43f5e",
      bgHeader: "rgba(244, 63, 94, 0.15)",
      type: "number"
    }
  ]
};

// Plantilla limpia para cada día: todo inicia en blanco hasta que la lotería lo cante
const INITIAL_DATA = {
  updatedAt: new Date().toISOString(),
  date: (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })(),
  agency: "Agencia de Loterías",
  triples: {
    chance: {
      "1:00 PM": { A: "", B: "", C: "" },
      "4:30 PM": { A: "", B: "", C: "" },
      "7:00 PM": { A: "", B: "", C: "" }
    },
    tachira: {
      "1:15 PM": { A: "", B: "", C: "" },
      "4:45 PM": { A: "", B: "", C: "" },
      "10:10 PM": { A: "", B: "", C: "" }
    },
    caracas: {
      "1:00 PM": { A: "", B: "", C: "" },
      "4:30 PM": { A: "", B: "", C: "" },
      "7:00 PM": { A: "", B: "", C: "" }
    },
    zulia: {
      "12:45 PM": { A: "", B: "", C: "" },
      "4:45 PM": { A: "", B: "", C: "" },
      "7:45 PM": { A: "", B: "", C: "" }
    },
    zamorano: {
      "12:00 PM": { A: "", B: "" },
      "2:00 PM":  { A: "", B: "" },
      "4:00 PM":  { A: "", B: "" },
      "7:00 PM":  { A: "", B: "" }
    }
  },
  chance_en_linea: {
    "9:00 AM": { A: "", B: "", C: "" },
    "10:00 AM": { A: "", B: "", C: "" },
    "11:00 AM": { A: "", B: "", C: "" },
    "12:00 PM": { A: "", B: "", C: "" },
    "1:00 PM": { A: "", B: "", C: "" },
    "2:00 PM": { A: "", B: "", C: "" },
    "3:00 PM": { A: "", B: "", C: "" },
    "4:00 PM": { A: "", B: "", C: "" },
    "5:00 PM": { A: "", B: "", C: "" },
    "6:00 PM": { A: "", B: "", C: "" },
    "7:00 PM": { A: "", B: "", C: "" }
  },
  animalitos: {
    lotto_activo: { "8:00 AM": "", "9:00 AM": "", "10:00 AM": "", "11:00 AM": "", "12:00 PM": "", "1:00 PM": "", "2:00 PM": "", "3:00 PM": "", "4:00 PM": "", "5:00 PM": "", "6:00 PM": "", "7:00 PM": "" },
    la_granjita: { "8:00 AM": "", "9:00 AM": "", "10:00 AM": "", "11:00 AM": "", "12:00 PM": "", "1:00 PM": "", "2:00 PM": "", "3:00 PM": "", "4:00 PM": "", "5:00 PM": "", "6:00 PM": "", "7:00 PM": "" },
    selva_plus: { "8:00 AM": "", "9:00 AM": "", "10:00 AM": "", "11:00 AM": "", "12:00 PM": "", "1:00 PM": "", "2:00 PM": "", "3:00 PM": "", "4:00 PM": "", "5:00 PM": "", "6:00 PM": "", "7:00 PM": "" },
    guacharo_millonario: { "8:00 AM": "", "9:00 AM": "", "10:00 AM": "", "11:00 AM": "", "12:00 PM": "", "1:00 PM": "", "2:00 PM": "", "3:00 PM": "", "4:00 PM": "", "5:00 PM": "", "6:00 PM": "", "7:00 PM": "" },
    monje: { "8:00 AM": "", "9:00 AM": "", "10:00 AM": "", "11:00 AM": "", "12:00 PM": "", "1:00 PM": "", "2:00 PM": "", "3:00 PM": "", "4:00 PM": "", "5:00 PM": "", "6:00 PM": "", "7:00 PM": "" },
    guacharo_activo: { "8:00 AM": "", "9:00 AM": "", "10:00 AM": "", "11:00 AM": "", "12:00 PM": "", "1:00 PM": "", "2:00 PM": "", "3:00 PM": "", "4:00 PM": "", "5:00 PM": "", "6:00 PM": "", "7:00 PM": "" },
    el_ruco: { "8:00 AM": "", "9:00 AM": "", "10:00 AM": "", "11:00 AM": "", "12:00 PM": "", "1:00 PM": "", "2:00 PM": "", "3:00 PM": "", "4:00 PM": "", "5:00 PM": "", "6:00 PM": "", "7:00 PM": "" },
    la_ruca: { "8:00 AM": "--", "9:00 AM": "", "10:00 AM": "", "11:00 AM": "", "12:00 PM": "", "1:00 PM": "", "2:00 PM": "", "3:00 PM": "", "4:00 PM": "", "5:00 PM": "", "6:00 PM": "", "7:00 PM": "" },
    el_dorado: { "8:00 AM": "--", "9:00 AM": "", "10:00 AM": "", "11:00 AM": "", "12:00 PM": "--", "1:00 PM": "", "2:00 PM": "", "3:00 PM": "", "4:00 PM": "", "5:00 PM": "", "6:00 PM": "", "7:00 PM": "--" },
    facil: { "8:00 AM": "", "9:00 AM": "", "10:00 AM": "", "11:00 AM": "", "12:00 PM": "", "1:00 PM": "", "2:00 PM": "", "3:00 PM": "", "4:00 PM": "", "5:00 PM": "", "6:00 PM": "", "7:00 PM": "" },
    la_ricachona: { "8:00 AM": "", "9:00 AM": "", "10:00 AM": "", "11:00 AM": "", "12:00 PM": "", "1:00 PM": "", "2:00 PM": "", "3:00 PM": "", "4:00 PM": "", "5:00 PM": "", "6:00 PM": "", "7:00 PM": "" }
  }
};

const HORARIOS_CHANCE = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
  "7:00 PM"
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LOTTERIES_CONFIG, HORARIOS_ANIMALITOS, HORARIOS_CHANCE, ANIMALITOS_DICT, INITIAL_DATA };
}

