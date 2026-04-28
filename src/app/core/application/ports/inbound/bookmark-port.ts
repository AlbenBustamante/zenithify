import { Bookmark } from '../../../domain/entities';

export interface CreateBookmarkDto {
  title: string;
  url: string;
  description?: string;
  categoryId?: string;
  tags?: string[];
}

export interface UpdateBookmarkDto {
  title?: string;
  url?: string;
  description?: string;
  categoryId?: string;
  tags?: string[];
}

export interface BookmarkFilters {
  categoryId?: string;
  tags?: string[];
  search?: string;
}

export interface BookmarkPort {
  create(bookmark: CreateBookmarkDto): Promise<Bookmark>;
  update(id: string, bookmark: UpdateBookmarkDto): Promise<Bookmark>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Bookmark | null>;
  findAll(filters?: BookmarkFilters): Promise<Bookmark[]>;
}