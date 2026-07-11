// Property catalog for the UNDERWORLD: EMPIRE property system
export const DISTRICTS = [
  "Downtown", "Harbor", "Industrial", "Suburbs",
  "Old Town", "Financial District", "Red Light", "Outskirts",
];

export const PROPERTY_CATALOG = [
  { name: "Riverside Apartment", property_type: "apartment", district: "Suburbs", purchase_price: 25000, income_per_hour: 180, upkeep_per_hour: 20, staff_count: 0, legitimacy: "legitimate", emoji: "🏢" },
  { name: "Dockside Warehouse", property_type: "warehouse", district: "Harbor", purchase_price: 90000, income_per_hour: 520, upkeep_per_hour: 60, staff_count: 4, legitimacy: "front", emoji: "🏭" },
  { name: "Penthouse Safehouse", property_type: "safehouse", district: "Downtown", purchase_price: 140000, income_per_hour: 0, upkeep_per_hour: 30, staff_count: 1, legitimacy: "illicit", emoji: "🏚️" },
  { name: "Bellmont Luxury Estate", property_type: "luxury_home", district: "Suburbs", purchase_price: 320000, income_per_hour: 900, upkeep_per_hour: 120, staff_count: 6, legitimacy: "legitimate", emoji: "🏡" },
  { name: "The Grand Hotel", property_type: "hotel", district: "Downtown", purchase_price: 480000, income_per_hour: 1500, upkeep_per_hour: 200, staff_count: 20, legitimacy: "legitimate", emoji: "🏨" },
  { name: "Neon Pulse Nightclub", property_type: "nightclub", district: "Red Light", purchase_price: 220000, income_per_hour: 1100, upkeep_per_hour: 140, staff_count: 12, legitimacy: "front", emoji: "🕺" },
  { name: "Steelworks Factory", property_type: "factory", district: "Industrial", purchase_price: 360000, income_per_hour: 1300, upkeep_per_hour: 180, staff_count: 25, legitimacy: "front", emoji: "⚙️" },
  { name: "Royal Flush Casino", property_type: "casino", district: "Downtown", purchase_price: 750000, income_per_hour: 2800, upkeep_per_hour: 350, staff_count: 40, legitimacy: "legitimate", emoji: "🎰" },
  { name: "Westside Garage", property_type: "garage", district: "Industrial", purchase_price: 60000, income_per_hour: 280, upkeep_per_hour: 30, staff_count: 3, legitimacy: "front", emoji: "🔧" },
  { name: "Private Airstrip", property_type: "airport", district: "Outskirts", purchase_price: 950000, income_per_hour: 0, upkeep_per_hour: 200, staff_count: 8, legitimacy: "illicit", emoji: "✈️" },
  { name: "Isla Oculta", property_type: "private_island", district: "Outskirts", purchase_price: 2500000, income_per_hour: 4200, upkeep_per_hour: 900, staff_count: 15, legitimacy: "illicit", emoji: "🏝️" },
  { name: "Skyline Office Tower", property_type: "office_tower", district: "Financial District", purchase_price: 1200000, income_per_hour: 3600, upkeep_per_hour: 480, staff_count: 50, legitimacy: "legitimate", emoji: "🏬" },
  { name: "Luigi's Trattoria", property_type: "restaurant", district: "Old Town", purchase_price: 85000, income_per_hour: 460, upkeep_per_hour: 50, staff_count: 8, legitimacy: "legitimate", emoji: "🍝" },
  { name: "Corner Gas Station", property_type: "gas_station", district: "Outskirts", purchase_price: 70000, income_per_hour: 360, upkeep_per_hour: 40, staff_count: 5, legitimacy: "front", emoji: "⛽" },
];