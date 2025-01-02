import { Body, Controller, Get, Injectable } from '@nestjs/common';
import { AppService } from './app.service';
import { RequestDto } from './dto/request.dto';
import ResponseDto from './dto/response.dto';

// @Controller('/hello')
@Controller({
  version: '1',
  path: '/api/hello',
})
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/test')
  async test(@Body() requestDto: RequestDto) {
    return {
      foo1: '1',
      bar2: 1,
      data: [
        {
          id: 1,
          test: 'bar',
        },
      ],
    } as ResponseDto;
  }
}