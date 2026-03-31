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
  return `${institutionCode}/${academicYear}/${courseLevel}/${branchCode}/${quotaCategory}/${padToFourDigits(
    sequenceNumber,
  )}`;
}

module.exports = { formatAdmissionNumber, padToFourDigits };

