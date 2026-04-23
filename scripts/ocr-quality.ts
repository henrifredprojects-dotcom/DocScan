type OCRSample = {
  id: string;
  required_fields_complete: boolean;
  corrected_by_user: boolean;
  review_seconds: number;
};

function computeKpis(samples: OCRSample[]) {
  if (samples.length === 0) {
    return {
      coverageRequiredFields: 0,
      manualCorrectionRate: 0,
      avgReviewSeconds: 0,
    };
  }

  const complete = samples.filter((s) => s.required_fields_complete).length;
  const corrected = samples.filter((s) => s.corrected_by_user).length;
  const reviewTotal = samples.reduce((acc, current) => acc + current.review_seconds, 0);

  return {
    coverageRequiredFields: Number(((complete / samples.length) * 100).toFixed(2)),
    manualCorrectionRate: Number(((corrected / samples.length) * 100).toFixed(2)),
    avgReviewSeconds: Number((reviewTotal / samples.length).toFixed(2)),
  };
}

const mockDataset: OCRSample[] = [
  { id: "A", required_fields_complete: true, corrected_by_user: true, review_seconds: 22 },
  { id: "B", required_fields_complete: true, corrected_by_user: false, review_seconds: 19 },
  { id: "C", required_fields_complete: false, corrected_by_user: true, review_seconds: 43 },
];

const kpis = computeKpis(mockDataset);
console.log("DocScan OCR KPI snapshot");
console.log(JSON.stringify(kpis, null, 2));
