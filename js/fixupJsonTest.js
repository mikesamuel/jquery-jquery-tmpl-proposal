function testFixupJson() {
  var s = (
      '{ value: 42, color: red, name: \'John Doe\','
      + ' "bars": [\'foo1\', \'foo2\'], foo: \'bar\' }');
  assertEquals(
      [
       '{',
       '  "value": 42,',
       '  "color": "red",',
       '  "name": "John Doe",',
       '  "bars": [',
       '    "foo1", "foo2"',
       '  ],',
       '  "foo": "bar"',
       '}'
      ].join('\n'),
      fixupJson(s));
}
