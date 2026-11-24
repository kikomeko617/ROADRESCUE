// Every photo used on the site, in one place (files live in public/images).
// Photos illustrate the service only. The people in them are NOT our helpers: named mechanics
// and drivers always use illustrated avatars. Photographer credits: docs/IMAGE_CREDITS.md

const p = (name) => `/images/${name}.webp`;

// Step 2 "What do you drive?" - one photo per vehicle type
export const BODY_IMAGES = {
  Saloon: p("body-saloon"),
  Hatchback: p("body-hatchback"),
  SUV: p("body-suv"),
  Pickup: p("body-pickup"),
  "Van / Minibus": p("body-van"),
  Truck: p("body-truck"),
};

// Step 2 make tiles: a badge photo per make ("Other", or any make added later, shows letters)
export const MAKE_IMAGES = {
  Toyota: p("make-toyota"),
  Nissan: p("make-nissan"),
  Subaru: p("make-subaru"),
  Honda: p("make-honda"),
  Mitsubishi: p("make-mitsubishi"),
  Mazda: p("make-mazda"),
  Isuzu: p("make-isuzu"),
  Suzuki: p("make-suzuki"),
  "Mercedes-Benz": p("make-mercedes"),
  BMW: p("make-bmw"),
  Volkswagen: p("make-volkswagen"),
  Hyundai: p("make-hyundai"),
  Ford: p("make-ford"),
  "Land Rover": p("make-landrover"),
  Lexus: p("make-lexus"),
  Chevrolet: p("make-chevrolet"),
  Porsche: p("make-porsche"),
};

// Step 1 "What do you need?"
export const NEED_IMAGES = {
  repair: p("need-repair"),
  tow: p("need-tow"),
  driver: p("need-driver"),
  fuel: p("need-fuel"),
  unsure: p("need-unsure"),
};

// Service catalogue, by category
export const CATEGORY_IMAGES = {
  "Battery & electrics": p("cat-battery"),
  Tyres: p("cat-tyres"),
  Engine: p("need-repair"),
  Brakes: p("cat-brakes"),
  Fuel: p("need-fuel"),
  General: p("need-unsure"),
  Towing: p("need-tow"),
  Driver: p("need-driver"),
};

export const STORY_IMAGES = { repair: p("story-repair"), tow: p("story-tow"), driver: p("story-driver") };

export const PEOPLE_IMAGES = [
  { src: p("people-engine"), alt: "Two young mechanics working on an engine part", shape: "wide" },
  { src: p("people-tyre"), alt: "A man changing a car tyre at the roadside", shape: "tall" },
  { src: p("people-woman"), alt: "A smiling woman mechanic working under a car bonnet", shape: "tall" },
  { src: p("people-hilux"), alt: "Two mechanics in hard hats checking a pickup's engine", shape: "wide" },
];

export const PAGE_IMAGES = {
  hero: p("hero-kampala"), // Kampala at night - a friend's photo
  garages: p("garages-banner"),
  cta: p("cta-kampala"), // Kampala road at night - a friend's photo
  login: p("auth-login"),
  register: p("auth-register"),
};
