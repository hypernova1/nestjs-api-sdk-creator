import * as ts from 'typescript';
import * as fs from 'fs';


async function run() {
  const filePath = 'src/app2.controller.ts';
  const sourceCode = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
  );

  ts.forEachChild(sourceFile, visit);

  function visit(node: ts.Node) {
    if (!ts.isClassDeclaration(node)) {
      return;
    }

    const classDecorators = node.modifiers.filter((modifier) =>
      ts.isDecorator(modifier),
    );

    // console.log(node.members);

    let version: string | undefined;
    let apiPath: string | undefined;
    for (const decorator of classDecorators) {
      const expression = decorator.expression;
      if (ts.isCallExpression(expression)) {
        const callExpression = expression;

        if (ts.isIdentifier(callExpression.expression)) {
          const identifier = callExpression.expression;
          const decoratorName = identifier.escapedText;
          if (decoratorName !== 'Controller') {
            continue;
          }
        }

        const argument: ts.StringLiteral = callExpression.arguments.find(
          (argument) => ts.isStringLiteral(argument),
        );


        const objectLiteralExpression = callExpression.arguments.find((arg) => ts.isObjectLiteralExpression(arg));
        if (objectLiteralExpression) {
          const propertyAssignments = objectLiteralExpression.properties.filter((property) => ts.isPropertyAssignment(property))
          for (const propertyAssignment of propertyAssignments) {
            let type: 'version' | 'path' | undefined;
            const propertyName = propertyAssignment.name;
            if (ts.isIdentifier(propertyName)) {
              const escapedText = propertyName.escapedText;
              if (escapedText === 'version') {
                type = 'version';
              } else if (escapedText === 'path') {
                type = 'path';
              }
            }
            const initializer = propertyAssignment.initializer;

            if (ts.isStringLiteral(initializer)) {
              if (type === 'version') {
                version = initializer.text;
              } else if (type === 'path') {
                apiPath = initializer.text;
              }
            }
          }
        }

        if (argument) {
          apiPath = argument.text;
        }
      }
    }
    console.log(version);
    console.log(apiPath);
  }
}

run();
