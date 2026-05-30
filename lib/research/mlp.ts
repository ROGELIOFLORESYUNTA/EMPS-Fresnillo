/**
 * MLP (Multi-Layer Perceptron) minimal puro TypeScript.
 *
 * Reemplazo de brain.js (no instalado por requerir compilacion nativa).
 * Suficiente para demostracion academica con N<100 casos.
 *
 * Arquitectura:
 *   input layer  → hidden layer (sigmoid) → output (linear regression)
 *   loss: MSE   |   optimizer: SGD simple
 *
 * Disclaimer academico (para el panel UI): con N<100 sobreajusta. La
 * evidencia principal del articulo es la regresion multivariable.
 */

export interface MLPConfig {
  inputSize: number;
  hiddenSize: number;
  learningRate: number;
  epochs: number;
}

interface MLPState {
  W1: number[][]; // hiddenSize x inputSize
  b1: number[]; // hiddenSize
  W2: number[]; // hiddenSize (a 1 salida)
  b2: number;
  cfg: MLPConfig;
}

function randn(): number {
  // Box-Muller
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function initMLP(cfg: MLPConfig): MLPState {
  const scale = Math.sqrt(2 / cfg.inputSize);
  const W1: number[][] = [];
  for (let h = 0; h < cfg.hiddenSize; h++) {
    const row: number[] = [];
    for (let i = 0; i < cfg.inputSize; i++) row.push(randn() * scale);
    W1.push(row);
  }
  const b1 = new Array(cfg.hiddenSize).fill(0);
  const W2: number[] = [];
  for (let h = 0; h < cfg.hiddenSize; h++) W2.push(randn() * scale);
  return { W1, b1, W2, b2: 0, cfg };
}

function forward(state: MLPState, x: number[]): { hidden: number[]; y: number } {
  const hidden: number[] = [];
  for (let h = 0; h < state.cfg.hiddenSize; h++) {
    let z = state.b1[h];
    for (let i = 0; i < state.cfg.inputSize; i++) z += state.W1[h][i] * x[i];
    hidden.push(sigmoid(z));
  }
  let y = state.b2;
  for (let h = 0; h < state.cfg.hiddenSize; h++) y += state.W2[h] * hidden[h];
  return { hidden, y };
}

/**
 * Entrena un MLP con SGD básico durante cfg.epochs iteraciones completas.
 * Retorna el estado entrenado + historial de loss MSE por epoch.
 */
export function trainMLP(
  X: number[][],
  y: number[],
  cfg: MLPConfig,
): { state: MLPState; lossHistory: number[] } {
  if (X.length === 0 || X[0].length !== cfg.inputSize) {
    throw new Error("Tamano de entrada no coincide con cfg.inputSize");
  }
  const state = initMLP(cfg);
  const lossHistory: number[] = [];

  for (let epoch = 0; epoch < cfg.epochs; epoch++) {
    let totalLoss = 0;
    // Shuffle index
    const idx = X.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    for (const i of idx) {
      const { hidden, y: pred } = forward(state, X[i]);
      const err = pred - y[i];
      totalLoss += err * err;

      // Backprop
      // dL/dy = 2 * err
      // dy/db2 = 1
      // dy/dW2[h] = hidden[h]
      // dhidden[h] = W2[h] * (2*err) * hidden[h] * (1 - hidden[h])  (sigmoid')
      const dy = 2 * err;
      state.b2 -= cfg.learningRate * dy;
      for (let h = 0; h < cfg.hiddenSize; h++) {
        const dW2h = dy * hidden[h];
        const dHidden = dy * state.W2[h] * hidden[h] * (1 - hidden[h]);
        state.W2[h] -= cfg.learningRate * dW2h;
        state.b1[h] -= cfg.learningRate * dHidden;
        for (let k = 0; k < cfg.inputSize; k++) {
          state.W1[h][k] -= cfg.learningRate * dHidden * X[i][k];
        }
      }
    }
    lossHistory.push(totalLoss / X.length);
  }
  return { state, lossHistory };
}

export function predictMLP(state: MLPState, X: number[][]): number[] {
  return X.map((x) => forward(state, x).y);
}
