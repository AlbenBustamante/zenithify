import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../shared/ui/components/button/button.component';
import { InputComponent } from '../../shared/ui/components/input/input.component';
import { ModalComponent } from '../../shared/ui/components/modal/modal.component';
import { BadgeComponent } from '../../shared/ui/components/badge/badge.component';
import { SkeletonComponent } from '../../shared/ui/components/skeleton/skeleton.component';
import { Bookmark } from '../../core/domain/entities';
import { SupabaseBookmarkRepository } from '../../core/infrastructure/supabase/adapters/supabase-bookmark.repository';
import { SupabaseAuthAdapter } from '../../core/infrastructure/supabase/adapters/supabase-auth.adapter';
import { CreateBookmarkUseCase, UpdateBookmarkUseCase, DeleteBookmarkUseCase, ListBookmarksUseCase } from '../../core/application/use-cases/bookmark/bookmark.use-cases';

@Component({
  selector: 'app-bookmarks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, BadgeComponent, SkeletonComponent],
  templateUrl: './bookmarks.component.html',
})
export class BookmarksComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bookmarkRepo = inject(SupabaseBookmarkRepository);
  private createBookmarkUC = inject(CreateBookmarkUseCase);
  private updateBookmarkUC = inject(UpdateBookmarkUseCase);
  private deleteBookmarkUC = inject(DeleteBookmarkUseCase);
  private listBookmarksUC = inject(ListBookmarksUseCase);
  private authAdapter = inject(SupabaseAuthAdapter);

  form = this.fb.group({
    title: ['', [Validators.required]],
    url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
    description: [''],
    tags: [''],
  });

  bookmarks = signal<Bookmark[]>([]);
  searchTerm = signal('');
  isModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isLoading = signal(false);
  isDataLoading = signal(true);
  editingBookmark = signal<Bookmark | null>(null);
  deletingBookmark = signal<Bookmark | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadBookmarks();
  }

  async loadBookmarks(): Promise<void> {
    try {
      const filter = this.searchTerm() ? { search: this.searchTerm() } : undefined;
      const bookmarks = await this.bookmarkRepo.findAll(filter);
      this.bookmarks.set(bookmarks);
    } finally {
      this.isDataLoading.set(false);
    }
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.loadBookmarks();
  }

  openCreateModal(): void {
    this.editingBookmark.set(null);
    this.form.reset();
    this.isModalOpen.set(true);
  }

  openEditModal(bookmark: Bookmark): void {
    this.editingBookmark.set(bookmark);
    this.form.patchValue({
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description ?? '',
      tags: bookmark.tags.join(', '),
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingBookmark.set(null);
  }

  confirmDelete(bookmark: Bookmark): void {
    this.deletingBookmark.set(bookmark);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.deletingBookmark.set(null);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.isLoading.set(true);
    try {
      const currentUser = await this.authAdapter.getCurrentUser();
      if (!currentUser) {
        console.error('No user logged in');
        return;
      }
      const tags = this.form.value.tags
        ? this.form.value.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t)
        : [];

      const dto = {
        title: this.form.value.title!,
        url: this.form.value.url!,
        description: this.form.value.description || undefined,
        tags,
      };

      if (this.editingBookmark()) {
        await this.updateBookmarkUC.execute(this.editingBookmark()!.id, dto);
      } else {
        await this.createBookmarkUC.execute(dto, currentUser.id, false);
      }
      this.closeModal();
      await this.loadBookmarks();
    } catch (error) {
      console.error('Error saving bookmark:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onDelete(): Promise<void> {
    if (!this.deletingBookmark()) return;
    this.isLoading.set(true);
    try {
      const currentUser = await this.authAdapter.getCurrentUser();
      if (!currentUser) {
        console.error('No user logged in');
        return;
      }
      await this.deleteBookmarkUC.execute(this.deletingBookmark()!.id, currentUser.id);
      this.closeDeleteModal();
      await this.loadBookmarks();
    } catch (error) {
      console.error('Error deleting bookmark:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}