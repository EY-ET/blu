import { FormEvent, useEffect, useRef, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { MENU_CATEGORIES } from '../data/menu';
import { AdminMenuItemType } from '../data/types';
import { uploadMenuImage } from '../lib/menuImage';
import { SessionExpiredError, authedFetch } from '../lib/adminAuth';

interface MenuAdminViewProps {
  onSessionExpired: () => void;
}

type ItemDraft = {
  id?: string;
  category: string;
  subCategory: string;
  title: string;
  description: string;
  price: string;
  image: string;
  isVegan: boolean;
  isAvailable: boolean;
};

const EMPTY_DRAFT: ItemDraft = {
  category: 'BREAKFAST',
  subCategory: '',
  title: '',
  description: '',
  price: '',
  image: '',
  isVegan: false,
  isAvailable: true,
};

export default function MenuAdminView({ onSessionExpired }: MenuAdminViewProps) {
  const [items, setItems] = useState<AdminMenuItemType[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleError = (actionError: unknown) => {
    if (actionError instanceof SessionExpiredError) onSessionExpired();
    else setError(actionError instanceof Error ? actionError.message : 'Something went wrong.');
  };

  const loadItems = () => {
    setLoading(true);
    authedFetch('/api/menu?all=1')
      .then(async (response) => {
        if (!response.ok) throw new Error('Menu could not be loaded.');
        return response.json();
      })
      .then((data) => setItems(data.items))
      .catch(handleError)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryOrder = MENU_CATEGORIES.filter((category) => category !== 'ALL');
  const grouped = categoryOrder.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
  const uncategorized = items.filter((item) => !categoryOrder.includes(item.category));

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        category: draft.category,
        subCategory: draft.subCategory,
        title: draft.title,
        description: draft.description,
        price: draft.price,
        image: draft.image,
        isVegan: draft.isVegan,
        isAvailable: draft.isAvailable,
      };
      const isEdit = Boolean(draft.id);
      const response = await authedFetch('/api/menu', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: draft.id, ...payload } : payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The item could not be saved.');
      setNotice(isEdit ? 'Item updated.' : 'Item added to the menu.');
      setDraft(null);
      loadItems();
    } catch (saveError) {
      handleError(saveError);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async (item: AdminMenuItemType) => {
    setError('');
    setNotice('');
    try {
      const response = await authedFetch('/api/menu', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, isAvailable: !item.isAvailable }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The item could not be updated.');
      setItems((previous) => previous.map((existing) => (existing.id === item.id ? { ...existing, isAvailable: !item.isAvailable } : existing)));
      setNotice(result.item.isAvailable ? `"${item.title}" is back on the menu.` : `"${item.title}" is hidden from guests.`);
    } catch (toggleError) {
      handleError(toggleError);
    }
  };

  const handleDelete = async (item: AdminMenuItemType) => {
    if (!window.confirm(`Delete "${item.title}" permanently?`)) return;
    setError('');
    setNotice('');
    try {
      const response = await authedFetch(`/api/menu?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The item could not be deleted.');
      setItems((previous) => previous.filter((existing) => existing.id !== item.id));
      setNotice(`Deleted "${item.title}".`);
    } catch (deleteError) {
      handleError(deleteError);
    }
  };

  const handleImagePick = async (event: FormEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file || !draft) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadMenuImage(file);
      setDraft((current) => (current ? { ...current, image: url } : current));
    } catch (uploadError) {
      handleError(uploadError);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const inputClass = 'w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-colors bg-stone-50/50';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-forum text-3xl md:text-4xl text-stone-900">Menu Items</h2>
          <p className="text-stone-600 text-sm mt-1">{items.length} items · edits appear on the guest menu within a minute</p>
        </div>
        <button
          type="button"
          onClick={() => { setDraft(EMPTY_DRAFT); setError(''); setNotice(''); }}
          className="flex items-center gap-2 bg-stone-900 text-white px-5 py-3 rounded-xl font-bold tracking-widest uppercase text-sm hover:bg-stone-800 transition-colors"
        >
          <Plus size={16} /> Add item
        </button>
      </div>

      {notice && <p className="text-green-700 mb-4" role="status">{notice}</p>}
      {error && <p className="text-red-700 mb-4" role="alert">{error}</p>}
      {loading && <p className="text-stone-500">Loading menu…</p>}

      {draft && (
        <form onSubmit={handleSave} className="bg-white border border-stone-200 rounded-2xl p-5 mb-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-forum text-2xl text-stone-900">{draft.id ? 'Edit item' : 'New item'}</h3>
            <button type="button" onClick={() => setDraft(null)} aria-label="Close form" className="text-stone-400 hover:text-stone-900"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-stone-500 mb-2">Category *</label>
              <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={inputClass}>
                {categoryOrder.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-stone-500 mb-2">Subcategory</label>
              <input value={draft.subCategory} onChange={(e) => setDraft({ ...draft, subCategory: e.target.value })} className={inputClass} placeholder="e.g. BBQ & Grill" maxLength={80} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-stone-500 mb-2">Title *</label>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required className={inputClass} maxLength={120} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-stone-500 mb-2">Price</label>
              <input value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} className={inputClass} placeholder="e.g. 450 ETB" maxLength={80} />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-stone-500 mb-2">Image</label>
              <div className="flex items-center gap-3">
                {draft.image && <img src={draft.image} alt="Item preview" referrerPolicy="no-referrer" className="w-12 h-12 rounded-lg object-cover border border-stone-200" />}
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImagePick} disabled={uploading} className="text-sm text-stone-600 file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-stone-900 file:text-white" />
                {uploading && <Loader2 size={18} className="animate-spin text-stone-500" />}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-stone-500 mb-2">Description</label>
            <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} className={`${inputClass} resize-none`} maxLength={1000} />
          </div>
          <div className="flex flex-wrap gap-6 items-center">
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" checked={draft.isVegan} onChange={(e) => setDraft({ ...draft, isVegan: e.target.checked })} className="accent-green-600 w-4 h-4" />
              Vegan
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" checked={draft.isAvailable} onChange={(e) => setDraft({ ...draft, isAvailable: e.target.checked })} className="accent-stone-900 w-4 h-4" />
              Available on guest menu
            </label>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setDraft(null)} className="px-5 py-3 rounded-xl border border-stone-300 text-stone-700">Cancel</button>
            <button type="submit" disabled={saving || uploading} className="bg-stone-900 text-white px-6 py-3 rounded-xl font-bold tracking-widest uppercase text-sm hover:bg-stone-800 transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : draft.id ? 'Save changes' : 'Add to menu'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-3 max-h-[58vh] overflow-y-auto">
        {[...grouped, ...(uncategorized.length ? [{ category: 'OTHER', items: uncategorized }] : [])].map((group) => (
          <div key={group.category}>
            <h3 className="font-forum text-lg tracking-widest text-stone-500 uppercase my-4">{group.category}</h3>
            {group.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 border border-stone-200 rounded-xl p-3 mb-2 bg-white">
                <img src={item.image} alt="" referrerPolicy="no-referrer" className="w-14 h-14 rounded-lg object-cover border border-stone-100 bg-stone-100 shrink-0" loading="lazy" />
                <div className="flex-grow min-w-0">
                  <p className="font-bold text-stone-900 truncate">{item.title} {item.isVegan && <span className="text-green-600 text-xs align-middle">VEGAN</span>}</p>
                  <p className="text-sm text-stone-500 truncate">{item.subCategory || '—'} · {item.price || '—'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleAvailability(item)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase border transition-colors ${item.isAvailable ? 'border-green-600 text-green-700 bg-green-50' : 'border-stone-400 text-stone-500 bg-stone-100'}`}
                >
                  {item.isAvailable ? 'Available' : 'Hidden'}
                </button>
                <button type="button" onClick={() => { setDraft({ id: item.id, category: item.category, subCategory: item.subCategory, title: item.title, description: item.description, price: item.price, image: item.image, isVegan: item.isVegan, isAvailable: item.isAvailable }); setError(''); setNotice(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-sm underline text-stone-700">Edit</button>
                <button type="button" onClick={() => handleDelete(item)} className="text-sm underline text-red-700">Delete</button>
              </div>
            ))}
          </div>
        ))}
        {!items.length && !loading && !error && <p className="text-stone-500 text-center">No menu items yet. Use "Add item" to create the menu.</p>}
      </div>
    </div>
  );
}
