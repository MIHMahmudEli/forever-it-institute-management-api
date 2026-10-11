import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: 'Forever IT Institute Management API',
      version: '1.0.0',
      tagline: 'দক্ষতা গড়ুন, গড়ুন সফল ভবিষ্যৎ',
      website: 'www.foreveritbd.com',
      status: 'online',
    };
  }
}
