/**
 * Tính phí ship trên server — logic khớp với my-guitar-client/src/helpers/shippingHelper.js
 */

const STORE_LOCATION = { lat: 10.850128, lng: 106.771458 };

const DISTRICT_COORDS = {
  'Quận 1': { lat: 10.7769, lng: 106.7009 },
  'Quận 3': { lat: 10.7847, lng: 106.6901 },
  'Bình Thạnh': { lat: 10.8142, lng: 106.7078 },
  'Thủ Đức': { lat: 10.8496, lng: 106.7714 },
  'Quận 7': { lat: 10.7340, lng: 106.7218 },
};

const VALID_SHIP_METHODS = new Set(['economy', 'standard', 'express']);

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function geocodeAddressMock(address = '') {
  const districtKey = Object.keys(DISTRICT_COORDS).find((d) =>
    String(address).toLowerCase().includes(d.toLowerCase()),
  );
  return districtKey ? DISTRICT_COORDS[districtKey] : DISTRICT_COORDS['Quận 1'];
}

function calculateDistanceToStore(address) {
  const geo = geocodeAddressMock(address);
  return haversineDistance(
    STORE_LOCATION.lat,
    STORE_LOCATION.lng,
    geo.lat,
    geo.lng,
  );
}

export function calculateShippingMethods(distanceKm = 0, subtotal = 0) {
  let economyFee;
  let standardFee;
  let expressFee;

  if (distanceKm <= 5) {
    economyFee = 15000;
    standardFee = 25000;
    expressFee = 50000;
  } else if (distanceKm <= 15) {
    economyFee = 25000;
    standardFee = 35000;
    expressFee = 70000;
  } else {
    const extra = Math.ceil(distanceKm - 15);
    economyFee = 35000 + extra * 2000;
    standardFee = 45000 + extra * 2500;
    expressFee = 80000 + extra * 3000;
  }

  if (subtotal >= 500_000) {
    economyFee = Math.max(0, economyFee - 15000);
  }

  return [
    { id: 'economy', name: 'Tiết kiệm', eta: '2–4 ngày', fee: economyFee },
    { id: 'standard', name: 'Nhanh', eta: '24–48 giờ', fee: standardFee },
    { id: 'express', name: 'Hỏa tốc', eta: '2–4 giờ (nội thành)', fee: expressFee },
  ];
}

/**
 * @param {{ mode?: string, shipMethod?: string, shippingAddress?: object, subtotal?: number }} opts
 */
export function calculateShippingFee({ mode, shipMethod, shippingAddress, subtotal = 0 }) {
  if (mode === 'pickup') return 0;

  const addressStr = [
    shippingAddress?.address,
    shippingAddress?.district,
    shippingAddress?.city,
  ]
    .filter(Boolean)
    .join(', ');

  const distanceKm = calculateDistanceToStore(addressStr);
  const methods = calculateShippingMethods(distanceKm, subtotal);
  const methodId = VALID_SHIP_METHODS.has(shipMethod) ? shipMethod : 'standard';
  const selected = methods.find((m) => m.id === methodId) || methods[1] || methods[0];
  return selected?.fee ?? 0;
}
