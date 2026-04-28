import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../shared/ui/components/button/button.component';
import { InputComponent } from '../../shared/ui/components/input/input.component';
import { ModalComponent } from '../../shared/ui/components/modal/modal.component';
import { BadgeComponent } from '../../shared/ui/components/badge/badge.component';
import { Bookmark } from '../../core/domain/entities';
import { SupabaseBookmarkRepository } from '../../core/infrastructure/supabase/adapters/supabase-bookmark.repository';
import { CreateBookmarkUseCase, UpdateBookmarkUseCase, DeleteBookmarkUseCase, ListBookmarksUseCase } from '../../core/application/use-cases/bookmark/bookmark.use-cases';

@Component({
  selector: 'app-bookmarks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, BadgeComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-stone-100 px-4 py-8">
      <div class="max-w-7xl mx-auto space-y-8">

        <header class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 animate-slide-up">
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <span class="w-1 h-8 bg-rose-500 rounded-full"></span>
              <h1 class="text-4xl font-bold text-slate-900 tracking-tight">Marcadores</h1>
            </div>
            <p class="text-slate-500 text-sm">Guarda tus enlaces importantes</p>
          </div>
          <app-button (clicked)="openCreateModal()">
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Marcador
          </app-button>
        </header>

        <div class="relative max-w-md animate-slide-up stagger-1">
          <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar marcadores..."
            [value]="searchTerm()"
            (input)="onSearch($event)"
            class="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 bg-white/80 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
          />
        </div>

        @if (bookmarks().length === 0) {
          <app-card class="animate-slide-up stagger-2">
            <div class="text-center py-12">
              <div class="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-100 flex items-center justify-center">
                <svg class="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <p class="text-slate-400 text-sm mb-6">No hay marcadores</p>
              <app-button variant="secondary" (clicked)="openCreateModal()">Agregar tu primer marcador</app-button>
            </div>
          </app-card>
        } @else {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            @for (bookmark of bookmarks(); track bookmark.id; let i = $index) {
              <div class="animate-slide-up" [class]="'stagger-' + (i + 2)">
                <app-card>
                  <div class="flex items-start gap-4">
                    <img [src]="bookmark.faviconUrl || '/favicon.ico'" class="w-12 h-12 rounded-xl bg-slate-100 p-1" alt="" />
                    <div class="flex-1 min-w-0">
                      <p class="font-semibold text-slate-800 truncate">{{ bookmark.title }}</p>
                      <a [href]="bookmark.url" target="_blank" class="text-xs text-primary-600 hover:text-primary-700 truncate block mt-0.5">
                        {{ bookmark.url }}
                      </a>
                    </div>
                  </div>
                  @if (bookmark.tags.length > 0) {
                    <div class="flex flex-wrap gap-2 mt-4">
                      @for (tag of bookmark.tags; track tag) {
                        <app-badge variant="default" size="sm">{{ tag }}</app-badge>
                      }
                    </div>
                  }
                  <div class="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100">
                    <app-button variant="ghost" size="sm" (clicked)="openEditModal(bookmark)">Editar</app-button>
                    <app-button variant="ghost" size="sm" (clicked)="confirmDelete(bookmark)">Eliminar</app-button>
                  </div>
                </app-card>
              </div>
            }
          </div>
        }
      </div>
    </div>

    <app-modal [isOpen]="isModalOpen()" [title]="editingBookmark() ? 'Editar Marcador' : 'Nuevo Marcador'" (close)="closeModal()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
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
      <p class="text-slate-600">¿Estás seguro de que deseas eliminar este marcador?</p>
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