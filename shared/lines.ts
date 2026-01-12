export interface GoLine {
  id: string;
  name: string;
  color: string;
  stationCodes: string[];
}

export const GO_LINES: GoLine[] = [
  {
    id: "LW",
    name: "Lakeshore West",
    color: "#98002E",
    stationCodes: ["UN", "EX", "MI", "LO", "PO", "CL", "OA", "BO", "AP", "BU", "AL", "HA", "WR", "SCTH", "NI"],
  },
  {
    id: "LE",
    name: "Lakeshore East",
    color: "#98002E",
    stationCodes: ["UN", "DA", "SC", "EG", "GU", "RO", "PIN", "AJ", "WH", "OS"],
  },
  {
    id: "ML",
    name: "Milton",
    color: "#F47B20",
    stationCodes: ["UN", "KP", "DI", "CO", "ER", "SR", "ME", "LS", "ML"],
  },
  {
    id: "KT",
    name: "Kitchener",
    color: "#00853E",
    stationCodes: ["UN", "BL", "WE", "ET", "MA", "BE", "BR", "MO", "GE", "AC", "GL", "KI"],
  },
  {
    id: "BA",
    name: "Barrie",
    color: "#003768",
    stationCodes: ["UN", "DW", "RU", "MP", "KC", "AU", "NE", "EA", "BD", "AD", "BA"],
  },
  {
    id: "RH",
    name: "Richmond Hill",
    color: "#009ADD",
    stationCodes: ["UN", "OR", "OL", "LA", "GO", "BM", "RI"],
  },
  {
    id: "ST",
    name: "Stouffville",
    color: "#794500",
    stationCodes: ["UN", "KE", "AG", "MK", "UI", "CE", "MR", "MJ", "ST", "LI"],
  },
];

export function getLineForStation(stationCode: string): GoLine | undefined {
  return GO_LINES.find((line) => line.stationCodes.includes(stationCode));
}

export function getLinesForStation(stationCode: string): GoLine[] {
  return GO_LINES.filter((line) => line.stationCodes.includes(stationCode));
}

export function getStationCodesForLine(lineId: string): string[] {
  const line = GO_LINES.find((l) => l.id === lineId);
  return line?.stationCodes || [];
}
