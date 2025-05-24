let fullPriceData = [];
let chart = null;

// Load price data from CSV
Papa.parse("gold_price_2020_2025.csv", {
  download: true,
  header: true,
  dynamicTyping: true,
  complete: function (results) {
    fullPriceData = results.data
      .map(row => row.Price_JOD)
      .filter(val => typeof val === "number" && !isNaN(val));
  }
});

// Calculate drift (mu) and volatility (sigma)
function computeMuSigma(prices) {
  const logReturns = [];
  for (let i = 1; i < prices.length; i++) {
    logReturns.push(Math.log(prices[i] / prices[i - 1]));
  }

  const mu = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance = logReturns.reduce((sum, r) => sum + (r - mu) ** 2, 0) / logReturns.length;
  const sigma = Math.sqrt(variance);

  return { mu, sigma };
}

// Generate simulated paths using GBM
function simulateGBM(S0, mu, sigma, T, N) {
  const paths = Array.from({ length: N }, () => new Array(T).fill(S0));

  for (let i = 0; i < N; i++) {
    for (let t = 1; t < T; t++) {
      const Z = Math.random() * 2 - 1;
      const drift = mu - 0.5 * sigma ** 2;
      const shock = sigma * Z;
      paths[i][t] = paths[i][t - 1] * Math.exp(drift + shock);
    }
  }

  return paths;
}

// Main simulation function
function runSimulation() {
  const days = parseInt(document.getElementById("days").value);
  const paths = parseInt(document.getElementById("paths").value);
  const confidence = parseInt(document.getElementById("confidence").value);

  // Guard: check if data loaded
  if (!fullPriceData || fullPriceData.length < 2) {
    alert("Price data not loaded yet. Please wait a moment and try again.");
    return;
  }

  const { mu, sigma } = computeMuSigma(fullPriceData);
  const S0 = fullPriceData[fullPriceData.length - 1];
  const results = simulateGBM(S0, mu, sigma, days, paths);

  const labels = Array.from({ length: days }, (_, i) => `Day ${i + 1}`);
  const datasets = results.map((path, i) => ({
    label: `Path ${i + 1}`,
    data: path,
    borderColor: `rgba(75,0,224,0.2)`,
    borderWidth: 1,
    fill: false,
    pointRadius: 0
  }));

  if (chart) chart.destroy();
  chart = new Chart(document.getElementById("priceChart"), {
    type: "line",
    data: { labels, datasets },
    options: {
      plugins: { legend: { display: false } },
      elements: { line: { tension: 0.1 } },
      scales: {
        y: { title: { display: true, text: 'Price (JOD)' }},
        x: { title: { display: true, text: 'Days' }}
      }
    }
  });

  const finalPrices = results.map(path => path[path.length - 1]);
  const maxPrice = Math.max(...finalPrices).toFixed(2);
  const minPrice = Math.min(...finalPrices).toFixed(2);
  const meanPrice = (finalPrices.reduce((a, b) => a + b, 0) / finalPrices.length).toFixed(2);

  let trendSymbol;
  if (meanPrice > S0 * 1.01) {
    trendSymbol = "📈 Upward";
  } else if (meanPrice < S0 * 0.99) {
    trendSymbol = "📉 Downward";
  } else {
    trendSymbol = "↔️ Stable";
  }

  const statsBox = document.getElementById("statsBox");
  statsBox.classList.remove("hidden");

statsBox.innerHTML = `
<b>📊 Simulation Summary</b><br/>
<strong>Initial Price (S₀):</strong> ${S0.toFixed(2)} JOD<br/>
<strong>Drift (μ):</strong> ${mu.toFixed(5)}<br/>
<strong>Volatility (σ):</strong> ${sigma.toFixed(5)}<br/>
<strong>Trend:</strong> ${trendSymbol}<br/>

<b>📈 Final Day Price Overview</b><br/>
<strong>Max Price:</strong> ${maxPrice} JOD<br/>
<strong>Min Price:</strong> ${minPrice} JOD<br/>
<strong>Avg Price:</strong> ${meanPrice} JOD<br/>

<b>🛠 Simulation Details</b><br/>
<strong>Duration:</strong> ${days} days<br/>
<strong>Paths:</strong> ${paths}<br/>
<strong>Confidence:</strong> ${confidence}%
`;

}
