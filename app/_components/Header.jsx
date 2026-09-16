"use client"
import ThemeToggle from '@/components/Themetoggle'
import { Button } from '@/components/ui/button'
import { SignInButton, UserButton, useUser } from '@clerk/nextjs'
import { User2Icon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import BackButton from './BackButton'


function Header() {
  const {isSignedIn}=useUser();
  const path=usePathname();
  return (!path.includes('aiform')&&(
    <div className="p-3 px-5 border-b border-base-300 bg-base-100 shadow-sm">
        <div className='flex justify-between items-center '>
            <Image src={'/screen.png'} width={50} height={50} alt='logo' />
            <div className='flex items-center gap-5'>
              {path !== "/" && <BackButton />}
          <ThemeToggle/>
      
        {isSignedIn?<div className='flex items-center gap-5'><Link href={'/dashboard'}><Button variant='outline' >Dashboard</Button></Link><UserButton/></div>:<SignInButton><Button>Get Started</Button></SignInButton>}
        </div>
        
        </div></div>
  )
  )
}

export default Header

//hook can be use in clinet side