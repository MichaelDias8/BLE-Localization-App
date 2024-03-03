 // Function to calculate mean
 export const calculateMean = (data) => {
    if(!data) return 0;
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, val) => acc + val, 0);
    return sum / data.length;
  };
  
  // Function to calculate variance
  export const calculateVariance = (data, mean) => {
    if (data.length === 0) return 0;
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
    return variance;
  };