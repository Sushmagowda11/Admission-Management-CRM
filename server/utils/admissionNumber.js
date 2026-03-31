function padToFourDigits(value) {
  const numericValue = Number(value) || 0;
  return String(numericValue).padStart(4, '0');
}

function formatAdmissionNumber({
  institutionCode,
  academicYear,
  courseLevel,
  branchCode,
  quotaCategory,
  sequenceNumber,
}) {
  // Example: INST/2026/UG/CSE/KCET/0001
  return `${institutionCode}/${academicYear}/${courseLevel}/${branchCode}/${quotaCategory}/${padToFourDigits(
    sequenceNumber,
  )}`;
}

module.exports = { formatAdmissionNumber, padToFourDigits };

