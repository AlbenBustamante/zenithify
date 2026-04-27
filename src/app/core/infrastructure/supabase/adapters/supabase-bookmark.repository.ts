import { Injectable, inject } from '@angular/core';
import { BookmarkRepositoryPort } from '../../../application/ports/outbound/bookmark-repository-port';
import { Bookmark } from '../../../domain/entities';
import { SupabaseClientService } from '../supabase-client.service';
import { EntityMapper, BookmarkRow } from '../mappers/entity-mapper';
import { CreateBookmarkDto, UpdateBookmarkDto, BookmarkFilters } from '../../../application/ports/inbound/bookmark-port';

@Injectable({ providedIn: 'root' })
export class SupabaseBookmarkRepository implements BookmarkRepositoryPort {
  private supabase = inject(SupabaseClientService).getClient();
  private table = 'bookmarks';

  async create(dto: CreateBookmarkDto): Promise<Bookmark> {
    const user = await this.getCurrentUser();
    const { data, error } = await this.supabase
      .from(this.table)
      .insert({
        user_id: user.id,
        title: dto.title,
        url: dto.url,
        description: dto.description ?? null,
        category_id: dto.categoryId ?? null,
        tags: dto.tags ?? [],
      })
      .select()
      .single();

    if (error) throw error;
    return EntityMapper.toBookmark(data as BookmarkRow);
  }

  async update(id: string, dto: UpdateBookmarkDto): Promise<Bookmark> {
    const updates: Record<string, unknown> = {};
    if (dto.title !== undefined) updates['title'] = dto.title;
    if (dto.url !== undefined) updates['url'] = dto.url;
    if (dto.description !== undefined) updates['description'] = dto.description;
    if (dto.categoryId !== undefined) updates['category_id'] = dto.categoryId;
    if (dto.tags !== undefined) updates['tags'] = dto.tags;

    const { data, error } = await this.supabase
      .from(this.table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return EntityMapper.toBookmark(data as BookmarkRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }

  async findById(id: string): Promise<Bookmark | null> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return EntityMapper.toBookmark(data as BookmarkRow);
  }

  async findAll(filters?: BookmarkFilters): Promise<Bookmark[]> {
    let query = this.supabase.from(this.table).select('*');

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,url.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return (data as BookmarkRow[]).map(EntityMapper.toBookmark);
  }

  private async getCurrentUser() {
    const { data } = await this.supabase.auth.getUser();
    if (!data.user) throw new Error('Not authenticated');
    return data.user;
  }
}