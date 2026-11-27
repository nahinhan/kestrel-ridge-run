// Kestrel Ridge Run — tuning numbers in one place.
// Every value here is a gameplay constant, not code that runs the game.
export const CONFIG = {
  title: 'Kestrel Ridge Run',
  // Flight model
  maxSpeed: 92, // m/s at full throttle (~331 km/h)
  cruiseSpeed: 55,
  stallSpeed: 20,
  maxPitch: 0.55, // radians, nose up / down
  maxRoll: 1.0, // radians of bank
  turnRate: 0.85, // yaw radians per second at full bank and cruise speed
  climbPenalty: 26, // m/s lost at full climb, gained in a dive
  // Fuel and mission
  fuelStart: 100,
  fuelDrain: 0.9, // percent per second at full throttle
  fuelPerRing: 25,
  ringCount: 8,
  ringRadius: 12,
  ringScore: 150,
  landingScore: 500,
  // World
  worldSize: 1200,
  waterLevel: 0.8,
  ceiling: 250,
  // Runway: a flat strip along Z at x = 0, from z = 300 to z = 540.
  runway: { x: 0, zStart: 300, zEnd: 540, halfWidth: 11, height: 4 },
};
