import { buildAnalysisDataset } from "../lib/research/dataset-builder";
import { runFullAnalysis } from "../lib/research/hypothesis-analysis";

(async () => {
  const rows = await buildAnalysisDataset({ includeSynthetic: true });
  const r = runFullAnalysis(rows);
  console.log("N:", r.n);
  console.log("Verdict:", r.hypothesis.verdict);
  console.log("Reason:", r.hypothesis.reason);
  console.log("R²:", r.regression?.rSquared);
  console.log("MAPE medio:", r.descriptive.mapeHours.mean.toFixed(2));
  console.log("Accuracy rate (≤15%):", (r.descriptive.accuracyRate * 100).toFixed(1) + "%");
  if (r.regression) {
    console.log("\nTop 3 features (|coef|):");
    const top = [...r.regression.coefficients]
      .sort((a, b) => Math.abs(b.coef) - Math.abs(a.coef))
      .slice(0, 3);
    top.forEach((c) => console.log(`  ${c.feature}: coef=${c.coef.toFixed(3)} p≈${c.pValueApprox.toFixed(3)}`));
  }
})();
