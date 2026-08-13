"use client"
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { db } from '@/config';
import { JsonForms } from '@/config/schema';
import { useUser } from '@clerk/nextjs';
import { desc, eq } from 'drizzle-orm';
import { BarChart2, LibraryBig, MessageSquareQuote, Plus } from 'lucide-react'
import Link from 'next/link';
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { extractJson } from '@/lib/utils'

export default function SideNav() {
    const menuList=[
        {
            id:1,
            name:'My Forms',
            icon:LibraryBig,
            path:'/dashboard'
        },
        {
            id:1,
            name:'Responses',
            icon:MessageSquareQuote,
            path:'/dashboard/responses'
        },
        {
            id:1,
            name:'Analytics',
            icon:BarChart2,
            path:'/dashboard/analytics'
        },
        {
            id:1,
            name:'Upgrade',
            icon:Plus,
            path:'/dashboard/upgrade'
        },
       
    ]
    const {user}=useUser();
    const path =usePathname();
    const[formList,setFormList]=useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [Percentage,setPercentage]=useState(0)

    const getFormList = async () => {
        try {
            const result = await db.select().from(JsonForms)
                .where(eq(JsonForms.CreatedBy, user?.primaryEmailAddress?.emailAddress))
                .orderBy(desc(JsonForms.id));
                
            const perc=(result.length/3)*100;
            // console.log(perc)
            setPercentage(perc)

            const cleanedForms = result.map(form => {
                const parsedJson = extractJson(form.jsonForm);
                return {
                    ...form,
                    jsonForm: parsedJson
                };
            }).filter(form => form.jsonForm !== null);

            setFormList(cleanedForms);
        } catch (error) {
            console.error("Error fetching forms:", error);
            setError("Failed to load forms.");
        } finally {
            setLoading(false);
        }
    };
    useEffect(()=>{
       user&& getFormList();
    },[user])
  return (
    <div className='h-screen shadow-md border p-5 '><div>{menuList.map((menu,index)=>(<Link href={menu.path} key={index} className={`flex items-center gap-3 p-3 mb-3 hover:bg-primary hover:text-white rounded-lg cursor-pointer  ${path==menu.path?"bg-primary text-white":"text-gray-400"} `}><menu.icon/>
    {menu.name}</Link>))}</div>
    <div className='fixed  bottom-10 p-4 w-64'>
        <Button className="">+ Create Form</Button>
        <div className='my-4 mr-4 '> 
        <Progress value={Percentage} />
        <h2 className='text-sm mt-2 text-gray-800'><strong className=''>{formList?.length}</strong> Out of <strong>3</strong> File Created</h2>
        <h2 className='text-sm mt-2 text-gray-800'>Upgrade your plan for unlimted AI form build</h2>
        </div>
    </div>
    </div>
  )
}
