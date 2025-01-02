export default class ResponseDto {
  foo1: string;
  bar2: number;
  data: Foo[];
}

class Foo {
  id: number;
  test: string;
}