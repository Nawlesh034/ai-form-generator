"use client"
import { SignedIn, SignIn } from '@clerk/nextjs'
import React from 'react'
import SideNav from './_components/SideNav'



function layout({children}) {
  return (
    <SignedIn>
        <div>
            <div className='md:w-64 fixed'>
                <SideNav/>
                
            </div>
            <div className='md:ml-64'>
                {children}
                </div>
        </div>
 
   </SignedIn> // once the user is signed in then show the children
  )
}

export default layout