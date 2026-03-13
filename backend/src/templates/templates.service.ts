import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from './entities/template.entity';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private templateRepo: Repository<Template>,
  ) {}

  async findAll(): Promise<Template[]> {
    return this.templateRepo.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: string): Promise<Template> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException(`Template ${id} not found`);
    return template;
  }

  async create(data: Partial<Template>): Promise<Template> {
    const template = this.templateRepo.create(data);
    return this.templateRepo.save(template);
  }

  async update(id: string, data: Partial<Template>): Promise<Template> {
    const template = await this.findOne(id);
    Object.assign(template, data);
    return this.templateRepo.save(template);
  }

  async remove(id: string): Promise<void> {
    const template = await this.findOne(id);
    await this.templateRepo.remove(template);
  }
}
