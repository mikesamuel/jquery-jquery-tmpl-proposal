function assertEquals(msg, a, b) {
  if (arguments.length === 2) {
    b = arguments[1];
    a = arguments[0];
    msg = null;
  }
  if (a !== b) {
    if (typeof console !== 'undefined') {
      console.error(
        '%s: Expected\n\t(%o : %s)\nbut was\n\t(%o : %s)',
        msg || 'Inequal',
        a, typeof a, b, typeof b);
      console.trace();
    }
    throw new Error(
        (msg || 'Inequal') + ': Expected\n\t(' + a + ' : ' + (typeof a) + ')\nbut was\n\t('
        + b + ' : ' + (typeof b) + ')');
  }
}

function assertTrue(msg, cond) {
  if (arguments.length === 1) {
    cond = arguments[0];
    msg = null;
  }
  if (cond !== true) {
    if (typeof console !== 'undefined') {
      console.error(
        '%s: Condition was not true\n\t(%o : %s)',
        msg || 'Inequal',
        cond, typeof cond);
      console.trace();
    }
    throw new Error(
        (msg || 'Inequal') + ': Condition was not true\n\t(' + cond + ' : ' + (typeof cond) + ')');
  }
}
