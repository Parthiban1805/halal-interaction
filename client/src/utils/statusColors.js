export const LEAD_STATUS_COLORS = {
  'New': '#304A9A',
  'Not Picking': '#94A3B8',
  'Sent WhatsApp': '#38A9E0',
  'Call Later': '#F59E0B',
  'Spoken': '#8B5CF6',
  'Pitched Membership': '#BBE7B1',
  'Following Up': '#86D46B',
  'Payment Pending': '#45A85A',
  'Won': '#16803A',
  'Lost': '#DC6262',
  'On Hold': '#6B7280',
  'Wrong Number': '#273244'
};

export const getLeadStatusColor = (status) => LEAD_STATUS_COLORS[status] || '#94A3B8';

export const getLeadStatusBg = (status) => {
  const hex = getLeadStatusColor(status);
  // Convert hex to rgb
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.15)`;
};
