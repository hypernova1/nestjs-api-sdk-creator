import * as ts from 'typescript';
import { __String, Program, TypeChecker } from 'typescript';

const httpMethods = ['Get', 'Post', 'Delete', 'Patch', 'Put'];

class ApiSdkCreator {
  private readonly program: Program;
  private readonly checker: TypeChecker;

  constructor(private readonly filePath: string) {
    this.program = ts.createProgram([filePath], {});
    this.checker = this.program.getTypeChecker();
  }

  async run() {
    ts.forEachChild(this.program.getSourceFile(this.filePath), (node) =>
      this.visit(node),
    );
  }

  private visit(node: ts.Node) {
    if (!ts.isClassDeclaration(node)) {
      return;
    }

    const classDecorators =
      node.modifiers?.filter((modifier) => ts.isDecorator(modifier)) || [];

    let version: string | undefined;
    let apiPath: string | undefined;
    for (const decorator of classDecorators) {
      const expression = decorator.expression;
      if (ts.isCallExpression(expression)) {
        // 컨트롤러 데코레이터 정보 읽어오기
        if (this.isControllerDecorator(expression)) {
          apiPath = this.extractPathArgument(expression);
          const properties = this.extractObjectLiteralProperties(expression);
          version = properties.version;
          apiPath = properties.path;
        }

        // 메서드 데코레이터 정보 읽어오기
      }
    }

    const methods = node.members.filter((member) =>
      ts.isMethodDeclaration(member),
    );
    for (const method of methods) {
      if (!ts.isIdentifier(method.name)) {
        continue;
      }
      const methodName = method.name.escapedText.toString();

      const apiData = this.extractApiData(method);
      this.extractParameterData(method);
      this.extractReturnType(method);

      console.log(methodName);
      console.log(apiData.httpMethod);
      console.log(apiData.apiPaths);
    }
  }

  private extractApiData(method: ts.MethodDeclaration): {
    httpMethod?: string;
    apiPaths: string[];
  } {
    let apiPaths: string[] = [];
    let httpMethod: string | undefined;
    const methodDecorators = method.modifiers.filter((modifier) =>
      ts.isDecorator(modifier),
    );
    for (const methodDecorator of methodDecorators) {
      const expression = methodDecorator.expression;
      if (!ts.isCallExpression(expression)) {
        continue;
      }

      httpMethod = this.extractHttpMethod(expression.expression);
      apiPaths = this.extractApiPaths(expression);
    }
    return { httpMethod, apiPaths };
  }

  private extractReturnType(method: ts.MethodDeclaration) {
    const symbol = this.checker.getSymbolAtLocation(method.name);
    if (symbol) {
      const type = this.checker.getTypeOfSymbolAtLocation(symbol, method);
      const returnType = this.checker.getReturnTypeOfSignature(
        type.getCallSignatures()[0],
      );

      if (this.checker.typeToString(returnType).startsWith('Promise')) {
        const typeArguments = returnType
          .getSymbol()
          ?.members?.get('resolve' as __String)?.declarations?.[0];
        const [promiseInnerType] = this.checker.getTypeArguments(
          returnType as ts.TypeReference,
        );
        // console.log(typeArguments);
        console.log(promiseInnerType);
      }
    }
  }

  private extractHttpMethod(data: ts.Node): string | null {
    let httpMethod: string | null = null;
    if (!ts.isIdentifier(data)) {
      return null;
    }
    if (httpMethods.includes(data.escapedText.toString())) {
      httpMethod = data.escapedText.toString();
    }
    return httpMethod;
  }

  private extractApiPaths(expression: ts.CallExpression) {
    const stringLiteral = expression.arguments.find((arg) =>
      ts.isStringLiteral(arg),
    );
    const arrayLiteralExpression = expression.arguments.find((arg) =>
      ts.isArrayLiteralExpression(arg),
    );
    if (stringLiteral) {
      return [stringLiteral.text];
    } else if (arrayLiteralExpression) {
      const stringLiterals = arrayLiteralExpression.elements.filter((element) =>
        ts.isStringLiteral(element),
      );
      return stringLiterals.map((stringLiteral) => stringLiteral.text);
    }

    return ['/'];
  }

  private extractParameterData(method: ts.MethodDeclaration) {
    const parameters = method.parameters;
    for (const parameter of parameters) {
      if (parameter.type) {
        const type = this.checker.getTypeFromTypeNode(parameter.type);
        const typeString = this.checker.typeToString(type);
      }
    }
  }

  // 특정 데코레이터가 Controller인지 확인하는 함수
  private isControllerDecorator(callExpression: ts.CallExpression): boolean {
    if (ts.isIdentifier(callExpression.expression)) {
      return callExpression.expression.escapedText === 'Controller';
    }
    return false;
  }

  // 문자열 인자 추출 함수
  private extractPathArgument(
    callExpression: ts.CallExpression,
  ): string | undefined {
    const argument = callExpression.arguments.find((arg) =>
      ts.isStringLiteral(arg),
    );
    return argument ? (argument as ts.StringLiteral).text : undefined;
  }

  // ObjectLiteralExpression에서 속성 추출 함수
  private extractObjectLiteralProperties(callExpression: ts.CallExpression): {
    version?: string;
    path?: string;
  } {
    const objectLiteralExpression = callExpression.arguments.find((arg) =>
      ts.isObjectLiteralExpression(arg),
    );
    if (!objectLiteralExpression) {
      return {};
    }

    const properties: { version?: string; path?: string } = {};
    const propertyAssignments = objectLiteralExpression.properties.filter(
      (property) => ts.isPropertyAssignment(property),
    );

    for (const propertyAssignment of propertyAssignments) {
      const propertyName = propertyAssignment.name;
      const initializer = propertyAssignment.initializer;

      if (ts.isIdentifier(propertyName) && ts.isStringLiteral(initializer)) {
        const name = propertyName.escapedText;
        if (name === 'version') {
          properties.version = initializer.text;
        } else if (name === 'path') {
          properties.path = initializer.text;
        }
      }
    }

    return properties;
  }
}

new ApiSdkCreator('src/app.controller.ts')
  .run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
