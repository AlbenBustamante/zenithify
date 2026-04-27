import { Bookmark } from '../../domain/entities';
import { CreateBookmarkDto, UpdateBookmarkDto, BookmarkFilters } from '../inbound/bookmark-port';

export interface BookmarkRepositoryPort {
  create(bookmark: CreateBookmarkDto): Promise<Bookmark>;
  update(id: string, bookmark: UpdateBookmarkDto): Promise<Bookmark>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Bookmark | null>;
  findAll(filters?: BookmarkFilters): Promise<Bookmark[]>;
}