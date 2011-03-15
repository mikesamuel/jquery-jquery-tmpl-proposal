var march14 = new Date(2011, 2 /*March */, 14, 13, 59, 30);
var march14Am = new Date(2011, 2 /*March */, 14, 7, 59, 30);

function testDateFormat() {
  assertEquals('2011-03-14', (march14.formatToString('yyyy-MM-dd')));
  assertEquals('2011 Mar, 14', (march14.formatToString('yyyy MMM, dd')));
  assertEquals('2011 March, 14', (march14.formatToString('yyyy MMMMMM, dd')));
  assertEquals('2011 March, 14', (march14.formatToString('yyyy MMMMMM, dd')));
  assertEquals('13:59:30', (march14.formatToString('HH:mm:ss')));
  assertEquals('07:59:30', (march14Am.formatToString('HH:mm:ss')));
  assertEquals('7:59:30', (march14Am.formatToString('H:mm:ss')));
}

function testSimpleNumberFormat() {
  assertEquals('4', 4..formatToString());
  assertEquals('-4', (-4).formatToString());
  assertEquals('0.5', 0.5.formatToString());
}

function testNumberFormatPrecision() {
  assertEquals('0.3333', (1 / 3).formatToString('.4'));
  assertEquals('0.50000', (.5).formatToString('.5'));
  assertEquals('1.333', (4 / 3).formatToString('.4'));
  assertEquals('1.5000', (1.5).formatToString('.5'));
  assertEquals('12300', (12345).formatToString('.3'));
  assertEquals('12345.0', (12345).formatToString('.6'));
}

function testNumberFormatOtherBases() {
  assertEquals('A1', 161..formatToString('X'));
  assertEquals('a1', 161..formatToString('x'));
  assertEquals('0xa1', 161..formatToString('#x'));
  assertEquals('241', 161..formatToString('o'));
  assertEquals('0241', 161..formatToString('#o'));
  assertEquals('10100001', 161..formatToString('b'));
}

function testNumberFormatWidth() {
  assertEquals('    5', 5..formatToString('5'));
  assertEquals('   -5', (-5).formatToString('5'));
  assertEquals('-5   ', (-5).formatToString('-5'));
  assertEquals('00005', (5).formatToString('05'));
  assertEquals('-0005', (-5).formatToString('05'));
}

function testString() {
  assertEquals('', ''.formatToString());
  assertEquals('foo', 'foo'.formatToString());
  assertEquals('  foo', 'foo'.formatToString(-5));
  assertEquals('foo  ', 'foo'.formatToString(5));
}