import { Controller, Get, Post, Param } from '@nestjs/common';
import { CharactersService } from './characters.service';

@Controller('characters')
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Get()
  list() {
    return this.charactersService.list();
  }

  @Post(':slug/provision')
  provision(@Param('slug') slug: string) {
    return this.charactersService.provision(slug);
  }
}
