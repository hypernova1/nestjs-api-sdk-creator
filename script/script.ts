import * as ts from 'typescript';
import * as fs from 'fs';

interface DocEntry {
  name?: string;
  fileName?: string;
  documentation?: string;
  type?: string;
  constructors?: DocEntry[];
  parameters?: DocEntry[];
  returnType?: string;
}

async function run() {
  const filePath = 'src/app.controller.ts';
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

        console.log(callExpression.arguments);

        const argument: ts.StringLiteral = callExpression.arguments.find(
          (argument) => ts.isStringLiteral(argument),
        );

        if (argument) {
          console.log(argument);
          apiPath = argument.text;
        }
      }
    }
    // console.log(apiPath);
  }
}

run();
