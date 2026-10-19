// Fictional seating layout, hand-authored and shared by every venue in the data. Section ids are the values used in
// Listing.section, so a section filter means the same seats at every venue.
export type Point = readonly [x: number, y: number];

export type VenueSection = {
  id: string;
  label: string;
  level: "floor" | "lower" | "upper";
  points: readonly Point[];
};

export type VenueLayout = {
  name: string;
  viewBox: string;
  stage: readonly Point[];
  sections: readonly VenueSection[];
};

const rect = (x1: number, y1: number, x2: number, y2: number): Point[] => [
  [x1, y1],
  [x2, y1],
  [x2, y2],
  [x1, y2],
];

export const LAYOUT: VenueLayout = {
  name: "Arena layout",
  viewBox: "0 0 800 460",
  stage: rect(300, 20, 500, 70),
  sections: [
    { id: "F1", label: "Floor 1", level: "floor", points: rect(310, 90, 395, 230) },
    { id: "F2", label: "Floor 2", level: "floor", points: rect(405, 90, 490, 230) },

    { id: "101", label: "101", level: "lower", points: rect(190, 80, 270, 170) },
    { id: "102", label: "102", level: "lower", points: rect(190, 170, 270, 260) },
    { id: "103", label: "103", level: "lower", points: [[190, 260], [270, 260], [325, 340], [190, 340]] },
    { id: "104", label: "104", level: "lower", points: [[270, 260], [400, 260], [400, 340], [325, 340]] },
    { id: "105", label: "105", level: "lower", points: [[400, 260], [530, 260], [475, 340], [400, 340]] },
    { id: "106", label: "106", level: "lower", points: [[530, 260], [610, 260], [610, 340], [475, 340]] },
    { id: "107", label: "107", level: "lower", points: rect(530, 170, 610, 260) },
    { id: "108", label: "108", level: "lower", points: rect(530, 80, 610, 170) },

    { id: "201", label: "201", level: "upper", points: rect(110, 60, 180, 250) },
    {
      id: "202",
      label: "202",
      level: "upper",
      points: [[110, 250], [180, 250], [180, 350], [300, 350], [300, 440], [110, 440]],
    },
    { id: "203", label: "203", level: "upper", points: rect(300, 350, 400, 440) },
    { id: "204", label: "204", level: "upper", points: rect(400, 350, 500, 440) },
    {
      id: "205",
      label: "205",
      level: "upper",
      points: [[500, 350], [620, 350], [620, 250], [690, 250], [690, 440], [500, 440]],
    },
    { id: "206", label: "206", level: "upper", points: rect(620, 60, 690, 250) },
  ],
};

// Fictional venue names. Events are spread across them; all use LAYOUT.
export const VENUES = ["Harbour Arena", "Northgate Hall", "Riverside Dome", "Elm Park Pavilion", "Castlebrook Arena"] as const;

export const SECTION_IDS = LAYOUT.sections.map((s) => s.id);
