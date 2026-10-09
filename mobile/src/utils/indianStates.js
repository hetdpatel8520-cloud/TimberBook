export const INDIAN_STATES = [
  { code: '33', name: 'Tamil Nadu' },
  { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '32', name: 'Kerala' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '36', name: 'Telangana' },
  { code: '08', name: 'Rajasthan' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '07', name: 'Delhi' },
  { code: '19', name: 'West Bengal' },
  { code: '03', name: 'Punjab' },
  { code: '06', name: 'Haryana' },
  { code: '21', name: 'Odisha' },
  { code: '10', name: 'Bihar' },
  { code: '20', name: 'Jharkhand' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '30', name: 'Goa' },
  { code: '05', name: 'Uttarakhand' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '18', name: 'Assam' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '34', name: 'Puducherry' },
  { code: '04', name: 'Chandigarh' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '31', name: 'Lakshadweep' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '38', name: 'Ladakh' }
];

export function getStateCodeByName(stateName) {
  if (!stateName) return '33';
  const found = INDIAN_STATES.find(s => s.name.toLowerCase() === stateName.trim().toLowerCase());
  return found ? found.code : '33';
}

export function isValidGstin(gstin) {
  if (!gstin) return false;
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin.trim().toUpperCase());
}

export function isValidPan(pan) {
  if (!pan) return false;
  const regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return regex.test(pan.trim().toUpperCase());
}
