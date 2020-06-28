import { parseYamlToDocument, replaceSourceWithRef } from '../../__tests__/utils';
import { outdent } from 'outdent';
import { validateDocument } from '../../validate';
import { LintConfig } from '../..';
import path = require('path');

describe('oas3 boolean-parameter-prefixes', () => {
  it('should report on unresolved $ref', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/test':
            put:
              requestBody:
                $ref: 'invalid.yaml'
      `,
      path.join(__dirname, 'foobar.yaml'),
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({
        extends: [],
        rules: {
          'no-unresolved-refs': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1test/put/requestBody",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Can't resolve $ref: ENOENT: no such file or directory, open 'invalid.yaml'",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should report on unresolved $ref yaml error', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/test':
            put:
              requestBody:
                $ref: 'fixtures/invalid-yaml.yaml'
      `,
      path.join(__dirname, 'foobar.yaml'),
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({
        extends: [],
        rules: {
          'no-unresolved-refs': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": undefined,
              "reportOnKey": false,
              "source": "fixtures/invalid-yaml.yaml",
              "start": Object {
                "col": 1,
                "line": 2,
              },
            },
          ],
          "message": "Failed to parse: unexpected end of the stream within a single quoted scalar in \\"fixtures/invalid-yaml.yaml\\" at line 2, column 1:",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": Array [],
        },
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1test/put/requestBody",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Can't resolve $ref: unexpected end of the stream within a single quoted scalar in \\"fixtures/invalid-yaml.yaml\\" at line 2, column 1:",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });

  it('should report on unresolved $ref yaml error', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/test':
            put:
              requestBody:
                $ref: 'fixtures/ref.yaml'
      `,
      path.join(__dirname, 'foobar.yaml'),
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({
        extends: [],
        rules: {
          'no-unresolved-refs': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`Array []`);
  });

  it('should report on unresolved localr ref', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/test':
            put:
              requestBody:
                $ref: '#/components/requestBodies/a'
      `,
      path.join(__dirname, 'foobar.yaml'),
    );

    const results = await validateDocument({
      document,
      config: new LintConfig({
        extends: [],
        rules: {
          'no-unresolved-refs': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": Array [
            Object {
              "pointer": "#/paths/~1test/put/requestBody",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Can't resolve $ref",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": Array [],
        },
      ]
    `);
  });
});
