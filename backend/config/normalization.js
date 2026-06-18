const normalizeString = (value = "") => String(value).trim().replace(/\s+/g, " ");

const normalizeLookupKey = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9()&]+/g, "");

const yearAliases = {
  "1": ["1", "1st", "first", "firstyear", "1year", "i"],
  "2": ["2", "2nd", "second", "secondyear", "2year", "ii"],
  "3": ["3", "3rd", "third", "thirdyear", "3year", "iii"],
  "4": ["4", "4th", "fourth", "fourthyear", "4year", "iv"]
};

const departmentAliases = {
  CSE: [
    "cse",
    "cs",
    "computerscience",
    "computerscienceengineering",
    "computerscienceandengineering"
  ],
  CSD: [
    "csd",
    "computersciencedatascience",
    "computerscienceanddatascience",
    "cse(ds)",
    "cseds",
    "cse-ds",
    "cs&ds",
    "computerscience&datascience"
  ],
  CSM: [
    "csm",
    "computersciencemachinelearning",
    "computerscienceandmachinelearning",
    "cse(ml)",
    "cseml",
    "cse-ml",
    "cs&ml",
    "computerscience&machinelearning"
  ],
  ECE: [
    "ece",
    "electronicsandcommunicationengineering",
    "electronicscommunicationengineering",
    "electronicsandcommunication",
    "ecm",
    "ec"
  ],
  EEE: [
    "eee",
    "electricalandelectronicsengineering",
    "electricalelectronicsengineering",
    "electricalandelectronics"
  ],
  MECH: [
    "mech",
    "mechanical",
    "mechanicalengineering"
  ],
  CIVIL: [
    "civil",
    "civilengineering"
  ],
  IT: [
    "it",
    "informationtechnology"
  ],
  AIML: [
    "aiml",
    "ai/ml",
    "ai&ml",
    "artificialintelligenceandmachinelearning",
    "artificialintelligencemachinelearning"
  ],
  AIDS: [
    "aids",
    "ai/ds",
    "ai&ds",
    "artificialintelligenceanddatascience",
    "artificialintelligencedatascience"
  ],
  CSBS: [
    "csbs",
    "computerscienceandbusinesssystems",
    "computersciencebusinesssystems"
  ],
  EIE: [
    "eie",
    "electronicsandinstrumentationengineering",
    "electronicsinstrumentationengineering"
  ],
  IOT: [
    "iot",
    "internetofthings",
    "cse(iot)",
    "cseiot"
  ],
  MCA: [
    "mca",
    "masterofcomputerapplications"
  ],
  MBA: [
    "mba",
    "masterofbusinessadministration"
  ]
};

const buildAliasMap = (groups) => {
  const aliasMap = new Map();
  Object.entries(groups).forEach(([canonical, aliases]) => {
    aliases.forEach((alias) => {
      aliasMap.set(normalizeLookupKey(alias), canonical);
    });
  });
  return aliasMap;
};

const yearMap = buildAliasMap(yearAliases);
const departmentMap = buildAliasMap(departmentAliases);

export const normalizeAcademicYear = (value = "") => {
  const cleaned = normalizeString(value);
  if (!cleaned) return "";

  const compact = normalizeLookupKey(cleaned);
  if (yearMap.has(compact)) {
    return yearMap.get(compact);
  }

  const numberMatch = cleaned.match(/\d+/);
  if (numberMatch) {
    const number = numberMatch[0];
    if (["1", "2", "3", "4"].includes(number)) {
      return number;
    }
  }

  return cleaned.toUpperCase();
};

export const normalizeDepartment = (value = "") => {
  const cleaned = normalizeString(value);
  if (!cleaned) return "";

  const compact = normalizeLookupKey(cleaned);
  if (departmentMap.has(compact)) {
    return departmentMap.get(compact);
  }

  return cleaned.toUpperCase();
};
