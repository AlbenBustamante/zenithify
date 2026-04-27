import { Component, signal, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent, ButtonComponent, InputComponent, ModalComponent, BadgeComponent } from '../../shared/ui/components';
import { Bookmark } from '../../core/domain/entities';
import { SupabaseBookmarkRepository } from '../../core/infrastructure/supabase/adapters';
import { CreateBookmarkUseCase, UpdateBookmarkUseCase, DeleteBookmarkUseCase, ListBookmarksUseCase } from '../../core/application/use-cases/bookmark/bookmark.use-cases';

@Component({
  selector: 'app-bookmarks',
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, BadgeComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Marcadores</h1>
        <app-button (clicked)="openCreateModal()">+ Nuevo Marcador</app-button>
      </div>

      <app-input
        type="text"
        placeholder="Buscar marcadores..."
        [prefix]="'🔍'"
        (input)="onSearch($event)"
      />

      @if (bookmarks().length === 0) {
        <app-card>
          <div class="text-center text-gray-500 py-8">
            <p>No hay marcadores</p>
            <app-button variant="ghost" (clicked)="openCreateModal()" class="mt-2">Agregar tu primer marcador</app-button>
          </div>
        </app-card>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (bookmark of bookmarks(); track bookmark.id) {
            <app-card>
              <div class="flex items-start justify-between">
                <div class="flex items-start gap-3">
                  <img [src]="bookmark.faviconUrl || '/favicon.ico'" class="w-8 h-8 rounded" alt="" />
                  <div>
                    <p class="font-medium text-gray-900">{{ bookmark.title }}</p>
                    <a [href]="bookmark.url" target="_blank" class="text-sm text-primary-600 hover:text-primary-500 truncate block max-w-[200px]">
                      {{ bookmark.url }}
                    </a>
                  </div>
                </div>
              </div>
              @if (bookmark.tags.length > 0) {
                <div class="flex flex-wrap gap-1 mt-3">
                  @for (tag of bookmark.tags; track tag) {
                    <app-badge variant="default" size="sm">{{ tag }}</app-badge>
                  }
                </div>
              }
              <div class="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                <app-button variant="ghost" size="sm" (clicked)="openEditModal(bookmark)">Editar</app-button>
                <app-button variant="ghost" size="sm" (clicked)="confirmDelete(bookmark)">Eliminar</app-button>
              </div>
            </app-card>
          }
        </div>
      }
    </div>

    <app-modal [isOpen]="isModalOpen()" [title]="editingBookmark() ? 'Editar Marcador' : 'Nuevo Marcador'" (close)="closeModal()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <app-input formControlName="title" label="Título" placeholder="Nombre del sitio"
          [error]="form.controls['title'].invalid && form.controls['title'].touched ? 'Título requerido' : ''" />

        <app-input formControlName="url" label="URL" type="url" placeholder="https://ejemplo.com"
          [error]="form.controls['url'].invalid && form.controls['url'].touched ? 'URL requerida' : ''" />

        <app-input formControlName="description" label="Descripción" placeholder="Descripción opcional" />

        <app-input formControlName="tags" label="Tags (separados por coma)" placeholder="trabajo, personal, important" />

        <div class="flex justify-end gap-3 mt-6">
          <app-button variant="secondary" type="button" (clicked)="closeModal()">Cancelar</app-button>
          <app-button type="submit" [loading]="isLoading()" [disabled]="form.invalid">
            {{ editingBookmark() ? 'Actualizar' : 'Guardar' }}
          </app-button>
        </div>
      </form>
    </app-modal>

    <app-modal [isOpen]="isDeleteModalOpen()" title="Eliminar Marcador" (close)="closeDeleteModal()">
      <p class="text-gray-700">¿Estás seguro de que deseas eliminar este marcador?</p>
      <div class="flex justify-end gap-3 mt-6">
        <app-button variant="secondary" (clicked)="closeDeleteModal()">Cancelar</app-button>
        <app-button variant="danger" (clicked)="onDelete()" [loading]="isLoading()">Eliminar</app-button>
      </div>
    </app-modal>
  `,
})
export class BookmarksComponent implements OnInit {
  private fb = inject(FormBuilder);
  private bookmarkRepo = inject(SupabaseBookmarkRepository);
  private createBookmarkUC = inject(CreateBookmarkUseCase);
  private updateBookmarkUC = inject(UpdateBookmarkUseCase);
  private deleteBookmarkUC = inject(DeleteBookmarkUseCase);
  private listBookmarksUC = inject(ListBookmarksUseCase);

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
  editingBookmark = signal<Bookmark | null>(null);
  deletingBookmark = signal<Bookmark | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadBookmarks();
  }

  async loadBookmarks(): Promise<void> {
    const filter = this.searchTerm() ? { search: this.searchTerm() } : undefined;
    const bookmarks = await this.bookmarkRepo.findAll(filter);
    this.bookmarks.set(bookmarks);
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
        await this.createBookmarkUC.execute(dto, '', false);
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
      await this.deleteBookmarkUC.execute(this.deletingBookmark()!.id, '');
      this.closeDeleteModal();
      await this.loadBookmarks();
    } catch (error) {
      console.error('Error deleting bookmark:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}