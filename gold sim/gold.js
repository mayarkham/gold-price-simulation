const priceData = {
  souq:   [41.25, 41.30, 41.50, 41.60, 41.45, 41.80, 41.90, 42.00],
  madina: [41.10, 41.25, 41.35, 41.40, 41.70, 41.85, 41.95],
  combined: [
    41.25, 41.30, 41.50, 41.60, 41.45, 41.80, 41.90, 42.00,
    41.10, 41.25, 41.35, 41.40, 41.70, 41.85, 41.95
  ]
};

let chart;

// Compute drift (mu) and volatility (sigma) from log returns
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

// Simulate Geometric Brownian Motion paths
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

// Main simulation function triggered by user interaction
function runSimulation() {
  const market = document.getElementById("market").value;
  const days = parseInt(document.getElementById("days").value);
  const paths = parseInt(document.getElementById("paths").value);

  const prices = priceData[market];
  const { mu, sigma } = computeMuSigma(prices);
  const S0 = prices[prices.length - 1];

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

  let trendMessage;
  if (trendSymbol.includes("Upward")) {
    trendMessage = "Gold prices are expected to rise over the forecast period.";
  } else if (trendSymbol.includes("Downward")) {
    trendMessage = "Gold prices are expected to fall during the forecast period.";
  } else {
    trendMessage = "Gold prices are likely to remain stable throughout the forecast.";
  }

  const statsBox = document.getElementById("statsBox");
  statsBox.classList.remove("hidden");

  statsBox.innerHTML = `
<b>📊 Simulation Summary</b><br/>
<strong>Market:</strong> ${market.charAt(0).toUpperCase() + market.slice(1)}<br/>
<strong>Initial Price (S₀):</strong> ${S0.toFixed(2)} JOD<br/>
<strong>Drift (μ):</strong> ${mu.toFixed(5)}<br/>
<strong>Volatility (σ):</strong> ${sigma.toFixed(5)}<br/>
<strong>Trend:</strong> ${trendSymbol}<br/>
${trendMessage}<br/><br/>

<b>📈 Final Day Price Overview</b><br/>
<strong>Maximum Price:</strong> ${maxPrice} JOD<br/>
<strong>Minimum Price:</strong> ${minPrice} JOD<br/>
<strong>Average Price:</strong> ${meanPrice} JOD<br/><br/>

<b>🛠 Simulation Details</b><br/>
<strong>Forecast Duration:</strong> ${days} days<br/>
<strong>Simulated Paths:</strong> ${paths}
`;
}
