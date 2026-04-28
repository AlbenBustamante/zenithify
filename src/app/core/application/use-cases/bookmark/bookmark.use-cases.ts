import { inject, Injectable } from '@angular/core';
import { BOOKMARK_PORT, QUOTA_REPOSITORY_PORT } from '../../ports/ports.tokens';
import { CreateBookmarkDto, UpdateBookmarkDto, BookmarkFilters } from '../../ports/inbound/bookmark-port';
import { QuotaRepositoryPort } from '../../ports/outbound/quota-repository-port';
import { Bookmark } from '../../../domain/entities';
import { QuotaEnforcementService } from '../../../domain/services';
import { FREEMIUM_LIMITS, QuotaStatusVO } from '../../../domain/value-objects';

@Injectable()
export class CreateBookmarkUseCase {
  private bookmarkPort = inject(BOOKMARK_PORT);
  private quotaRepo = inject(QUOTA_REPOSITORY_PORT);
  private quotaService = inject(QuotaEnforcementService);

  async execute(dto: CreateBookmarkDto, userId: string, isPremium: boolean): Promise<Bookmark> {
    const quota = await this.quotaRepo.findByUserId(userId);
    if (!quota) throw new Error('Quota not found');

    const quotaStatus = this.quotaService.checkQuota(quota, 'bookmark', isPremium);
    if (quotaStatus.isExceeded) {
      throw new Error(`Freemium limit reached. Upgrade to premium to add more bookmarks.`);
    }

    const bookmark = await this.bookmarkPort.create(dto);
    await this.quotaRepo.incrementQuota(userId, 'bookmark');
    return bookmark;
  }
}

@Injectable()
export class UpdateBookmarkUseCase {
  private bookmarkPort = inject(BOOKMARK_PORT);

  async execute(id: string, dto: UpdateBookmarkDto): Promise<Bookmark> {
    return this.bookmarkPort.update(id, dto);
  }
}

@Injectable()
export class DeleteBookmarkUseCase {
  private bookmarkPort = inject(BOOKMARK_PORT);
  private quotaRepo = inject(QUOTA_REPOSITORY_PORT);

  async execute(id: string, userId: string): Promise<void> {
    const bookmark = await this.bookmarkPort.findById(id);
    if (!bookmark) throw new Error('Bookmark not found');

    await this.bookmarkPort.delete(id);
    await this.quotaRepo.decrementQuota(userId, 'bookmark');
  }
}

@Injectable()
export class ListBookmarksUseCase {
  private bookmarkPort = inject(BOOKMARK_PORT);

  async execute(filters?: BookmarkFilters): Promise<Bookmark[]> {
    return this.bookmarkPort.findAll(filters);
  }
}