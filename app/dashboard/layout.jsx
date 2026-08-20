"use client"
import { SignedIn } from '@clerk/nextjs'
import { Menu } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import SideNav from './_components/SideNav'

function layout({children}) {
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
      if (!isOpen) return;
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') setIsOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    return (
    <SignedIn>
        <div>
            <div className='md:hidden flex items-center p-4 border-b'>
                <button onClick={() => setIsOpen(true)} aria-label='Open menu' aria-expanded={isOpen}>
                    <Menu />
                </button>
            </div>

            {isOpen && (
                <div
                    className='fixed inset-0 bg-black/50 z-40 md:hidden'
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <SideNav onNavigate={() => setIsOpen(false)} />
            </div>

            <div className='md:ml-64'>
                {children}
            </div>
        </div>

   </SignedIn> // once the user is signed in then show the children
  )
}

export default layout
