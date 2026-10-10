import { useEffect, useState } from 'react';
import NavBar from './NavBar';
import MenuItem from './MenuItem';
import { MENU_ITEMS, MENU_CATEGORIES } from '../data/menu';
import { MenuItemType } from '../data/types';

interface MenuPageProps {
  setPage: (page: string) => void;
}

export default function MenuPage({ setPage }: MenuPageProps) {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [menuItems, setMenuItems] = useState<MenuItemType[]>(MENU_ITEMS);

  useEffect(() => {
    let active = true;
    fetch('/api/menu')
      .then(async (response) => {
        if (!response.ok) throw new Error('Menu could not be loaded.');
        return response.json();
      })
      .then((data) => {
        if (active && Array.isArray(data.items) && data.items.length) {
          setMenuItems(data.items as MenuItemType[]);
        }
      })
      .catch(() => {
        // The menu bundled at build time is the fallback if the API is unreachable.
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredItems = menuItems.filter(
    (item) => (item.isAvailable === undefined ? true : item.isAvailable) && (activeFilter === 'ALL' ? true : item.category === activeFilter),
  );

  const displayCategories = activeFilter === 'ALL'
    ? MENU_CATEGORIES.filter((c) => c !== 'ALL')
    : [activeFilter];

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-12 h-full min-h-[calc(100vh-2rem)]">
      {/* Left Hero - Fixed on Desktop */}
      <div className="relative w-full lg:w-[40%] rounded-3xl overflow-hidden h-[40vh] lg:h-[calc(100vh-3rem)] lg:sticky lg:top-6">
        <img 
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop" 
          alt="Delicious Food Spread" 
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-black/20"></div>
        
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
          <NavBar setPage={setPage} compact={true} />
        </div>

        <div className="absolute bottom-8 md:bottom-12 left-0 w-full text-center z-10 px-4">
          <h1 className="font-forum text-5xl sm:text-6xl md:text-8xl lg:text-9xl text-white tracking-widest break-words">MENU</h1>
        </div>
      </div>

      {/* Right Scrollable Menu */}
      <div className="w-full lg:w-[60%] py-4 lg:py-8 lg:pr-8 xl:pr-16">
        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-12 lg:mb-16">
          {MENU_CATEGORIES.map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveFilter(tab)}
              className={`px-4 md:px-6 py-2 md:py-2.5 rounded-full border text-xs font-bold tracking-widest uppercase transition-colors ${
                activeFilter === tab 
                  ? 'border-stone-900 bg-stone-900 text-white' 
                  : 'border-stone-300 text-stone-600 hover:border-stone-900 hover:text-stone-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Menu Sections */}
        {displayCategories.map(category => {
          const itemsInCategory = filteredItems.filter(item => item.category === category);
          
          if (itemsInCategory.length === 0) return null;

          // Group by subcategory
          const subCategories = Array.from(new Set(itemsInCategory.map(item => item.subCategory)));

          return (
            <div key={category} className="mb-16 lg:mb-20">
              <div className="flex items-center justify-center gap-4 md:gap-6 mb-8 md:mb-12">
                <div className="h-px w-8 md:w-12 bg-stone-300"></div>
                <h2 className="font-forum text-3xl md:text-4xl tracking-widest">{category}</h2>
                <div className="h-px w-8 md:w-12 bg-stone-300"></div>
              </div>

              {subCategories.map(subCategory => {
                const subItems = itemsInCategory.filter(item => item.subCategory === subCategory);
                return (
                  <div key={subCategory} className="mb-12">
                    <h3 className="font-forum text-xl tracking-widest text-stone-500 mb-6 uppercase">{subCategory}</h3>
                    <div className="flex flex-col gap-12 md:gap-16">
                      {subItems.map(item => (
                        <MenuItem 
                          key={item.id}
                          title={item.title} 
                          price={item.price} 
                          description={item.description || ''}
                          image={item.image}
                          isVegan={item.isVegan}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
