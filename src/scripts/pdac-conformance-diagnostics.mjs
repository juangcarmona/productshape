const comparedDiagnosticFields = ['severity', 'code', 'file', 'artifact', 'field', 'target'];

/**
 * An expected diagnostic asserts only the compared fields it carries. Optional fields emitted by
 * an implementation do not make a narrower expectation fail.
 */
function matchesExpectedDiagnostic(expected, actual) {
  return comparedDiagnosticFields.every(
    (field) => !Object.hasOwn(expected, field) || expected[field] === actual[field],
  );
}

/**
 * Compare expected and emitted diagnostics as multisets with subset-shaped expectations.
 *
 * A greedy matcher is not sufficient because a broad expectation may consume the only diagnostic
 * that satisfies a narrower one. This augmenting-path search finds a maximum one-to-one pairing.
 */
export function sameDiagnosticMultiset(expected, actual) {
  if (expected.length !== actual.length) return false;

  const actualToExpected = new Map();
  const augment = (expectedIndex, visited) => {
    for (let actualIndex = 0; actualIndex < actual.length; actualIndex += 1) {
      if (
        visited.has(actualIndex) ||
        !matchesExpectedDiagnostic(expected[expectedIndex], actual[actualIndex])
      ) {
        continue;
      }
      visited.add(actualIndex);
      const incumbent = actualToExpected.get(actualIndex);
      if (incumbent === undefined || augment(incumbent, visited)) {
        actualToExpected.set(actualIndex, expectedIndex);
        return true;
      }
    }
    return false;
  };

  for (let expectedIndex = 0; expectedIndex < expected.length; expectedIndex += 1) {
    if (!augment(expectedIndex, new Set())) return false;
  }
  return true;
}
