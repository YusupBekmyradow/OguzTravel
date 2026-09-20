import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Categories')
// Login required. No page permission yet: categories are read by several
// pages (cash flow forms, the category page, filters).
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  @Post('/add-category')
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.categoryService.addCategory(createCategoryDto, lang);
  }

  @Get('/get-all-category')
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.categoryService.getAllCategories(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      search,
      lang,
    );
  }


  @Patch('/update-category')
  async update(
    @Body() updateCategoryDto: UpdateCategoryDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.categoryService.updateCategory(updateCategoryDto, lang);
  }


  @Delete('/delete-category')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' },
      },
    },
  })
  async remove(
    @Body('guid') guid: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.categoryService.deleteCategory(guid, lang);
  }
}
