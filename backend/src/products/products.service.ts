import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async findAll(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Product>> {
    const [items, total] = await this.productsRepository.findAndCount({
      where: { isActive: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { id: 'ASC' },
    });

    return { items, total, page, limit };
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { slug, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }
}
