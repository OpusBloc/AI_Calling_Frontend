export const formatIndianValue = (value: number): string => {
  if (value >= 1_00_00_000) {
    // Crores
    return `₹${(value / 1_00_00_000).toFixed(2)}Cr`;
  }

  if (value >= 1_00_000) {
    // Lakhs
    return `₹${(value / 1_00_000).toFixed(2)}L`;
  }

  if (value >= 1_000) {
    // Thousands
    return `₹${(value / 1_000).toFixed(1)}K`;
  }

  // Below 1000
  return `₹${value.toLocaleString("en-IN")}`;
};
